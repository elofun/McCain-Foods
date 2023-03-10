/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @packageDocumentation
 * @hidden
 */

import { TEST } from 'internal:constants';
import { Pool } from '../memop';
import { array, createMap } from '../utils/js';
import { CCObject, isValid } from '../data/object';
import { legacyCC } from '../global-exports';

const fastRemoveAt = array.fastRemoveAt;

function empty () { }

class CallbackInfo {
    public callback: AnyFunction = empty;
    public target: unknown | undefined = undefined;
    public once = false;

    public set (callback: AnyFunction, target?: unknown, once?: boolean) {
        this.callback = callback || empty;
        this.target = target;
        this.once = !!once;
    }

    public reset () {
        this.target = undefined;
        this.callback = empty;
        this.once = false;
    }

    public check () {
        // Validation
        if (this.target instanceof CCObject && !isValid(this.target, true)) {
            return false;
        } else {
            return true;
        }
    }
}

const callbackInfoPool = new Pool(() => new CallbackInfo(), 32);
/**
 * @zh ???????????????????????????????????????
 * @en A simple list of event callbacks
 */
export class CallbackList {
    public callbackInfos: Array<CallbackInfo | null> = [];
    public isInvoking = false;
    public containCanceled = false;

    /**
     * @zh ???????????????????????????????????????????????????????????????
     * @en Remove the event listeners with the given callback from the list
     *
     * @param cb - The callback to be removed
     */
    public removeByCallback (cb: AnyFunction) {
        for (let i = 0; i < this.callbackInfos.length; ++i) {
            const info = this.callbackInfos[i];
            if (info && info.callback === cb) {
                info.reset();
                callbackInfoPool.free(info);
                fastRemoveAt(this.callbackInfos, i);
                --i;
            }
        }
    }
    /**
     * @zh ????????????????????????????????????????????????????????????
     * @en Remove the event listeners with the given target from the list
     * @param target
     */
    public removeByTarget (target: unknown) {
        for (let i = 0; i < this.callbackInfos.length; ++i) {
            const info = this.callbackInfos[i];
            if (info && info.target === target) {
                info.reset();
                callbackInfoPool.free(info);
                fastRemoveAt(this.callbackInfos, i);
                --i;
            }
        }
    }

    /**
     * @zh ???????????????????????????
     * @en Remove the event listener at the given index
     * @param index
     */
    public cancel (index: number) {
        const info = this.callbackInfos[index];
        if (info) {
            info.reset();
            if (this.isInvoking) {
                this.callbackInfos[index] = null;
            } else {
                fastRemoveAt(this.callbackInfos, index);
            }
            callbackInfoPool.free(info);
        }
        this.containCanceled = true;
    }

    /**
     * @zh ?????????????????????
     * @en Cancel all event listeners
     */
    public cancelAll () {
        for (let i = 0; i < this.callbackInfos.length; i++) {
            const info = this.callbackInfos[i];
            if (info) {
                info.reset();
                callbackInfoPool.free(info);
                this.callbackInfos[i] = null;
            }
        }
        this.containCanceled = true;
    }

    /**
     * @zh ??????????????????????????????????????????????????????????????????????????????????????????
     * @en Delete all canceled callbacks and compact array
     */
    public purgeCanceled () {
        for (let i = this.callbackInfos.length - 1; i >= 0; --i) {
            const info = this.callbackInfos[i];
            if (!info) {
                fastRemoveAt(this.callbackInfos, i);
            }
        }
        this.containCanceled = false;
    }

    /**
     * @zh ??????????????????????????????
     * @en Clear all data
     */
    public clear () {
        this.cancelAll();
        this.callbackInfos.length = 0;
        this.isInvoking = false;
        this.containCanceled = false;
    }
}

const MAX_SIZE = 16;
const callbackListPool = new Pool<CallbackList>(() => new CallbackList(), MAX_SIZE);

export interface ICallbackTable {
    [x: string]: CallbackList | undefined;
}

/**
 * @zh CallbacksInvoker ????????????????????????Key??????????????????????????????????????????????????????
 * @en CallbacksInvoker is used to manager and invoke event listeners with different event keys,
 * each key is mapped to a CallbackList.
 */
export class CallbacksInvoker {
    public _callbackTable: ICallbackTable = createMap(true);

    /**
     * @zh ????????????????????????????????????????????????????????????????????????????????????
     * @en Register an event listener to a given event key with callback and target.
     *
     * @param key - Event type
     * @param callback - Callback function when event triggered
     * @param target - Callback callee
     * @param once - Whether invoke the callback only once (and remove it)
     */
    public on (key: string, callback: AnyFunction, target?: unknown, once?: boolean) {
        if (!this.hasEventListener(key, callback, target)) {
            let list = this._callbackTable[key];
            if (!list) {
                list = this._callbackTable[key] = callbackListPool.alloc();
            }
            const info = callbackInfoPool.alloc();
            info.set(callback, target, once);
            list.callbackInfos.push(info);
        }
        return callback;
    }

    /**
     * @zh ??????????????????????????????????????????
     * @en Checks whether there is correspond event listener registered on the given event
     * @param key - Event type
     * @param callback - Callback function when event triggered
     * @param target - Callback callee
     */
    public hasEventListener (key: string, callback?: AnyFunction, target?: unknown) {
        const list = this._callbackTable && this._callbackTable[key];
        if (!list) {
            return false;
        }

        // check any valid callback
        const infos = list.callbackInfos;
        if (!callback) {
            // Make sure no cancelled callbacks
            if (list.isInvoking) {
                for (let i = 0; i < infos.length; ++i) {
                    if (infos[i]) {
                        return true;
                    }
                }
                return false;
            } else {
                return infos.length > 0;
            }
        }

        for (let i = 0; i < infos.length; ++i) {
            const info = infos[i];
            if (info && info.check() && info.callback === callback && info.target === target) {
                return true;
            }
        }
        return false;
    }

    /**
     * @zh ????????????????????????????????????????????????????????????????????????????????????????????????
     * @en Removes all callbacks registered in a certain event type or all callbacks registered with a certain target
     * @param keyOrTarget - The event type or target with which the listeners will be removed
     */
    public removeAll (keyOrTarget: string | unknown) {
        if (typeof keyOrTarget === 'string') {
            // remove by key
            const list = this._callbackTable && this._callbackTable[keyOrTarget];
            if (list) {
                if (list.isInvoking) {
                    list.cancelAll();
                } else {
                    list.clear();
                    callbackListPool.free(list);
                    delete this._callbackTable[keyOrTarget];
                }
            }
        } else if (keyOrTarget) {
            // remove by target
            for (const key in this._callbackTable) {
                const list = this._callbackTable[key]!;
                if (list.isInvoking) {
                    const infos = list.callbackInfos;
                    for (let i = 0; i < infos.length; ++i) {
                        const info = infos[i];
                        if (info && info.target === keyOrTarget) {
                            list.cancel(i);
                        }
                    }
                } else {
                    list.removeByTarget(keyOrTarget);
                }
            }
        }
    }

    /**
     * @zh ???????????????????????????????????????????????????????????????
     * @en Remove event listeners registered with the given event key, callback and target
     * @param key - Event type
     * @param callback - The callback function of the event listener, if absent all event listeners for the given type will be removed
     * @param target - The callback callee of the event listener
     */
    public off (key: string, callback?: AnyFunction, target?: unknown) {
        const list = this._callbackTable && this._callbackTable[key];
        if (list) {
            const infos = list.callbackInfos;
            if (callback) {
                for (let i = 0; i < infos.length; ++i) {
                    const info = infos[i];
                    if (info && info.callback === callback && info.target === target) {
                        list.cancel(i);
                        break;
                    }
                }
            } else {
                this.removeAll(key);
            }
        }
    }

    /**
     * @zh ???????????????????????????????????????????????????
     * @en Trigger an event directly with the event name and necessary arguments.
     * @param key - event type
     * @param arg0 - The first argument to be passed to the callback
     * @param arg1 - The second argument to be passed to the callback
     * @param arg2 - The third argument to be passed to the callback
     * @param arg3 - The fourth argument to be passed to the callback
     * @param arg4 - The fifth argument to be passed to the callback
     */
    public emit (key: string, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any) {
        const list: CallbackList = this._callbackTable && this._callbackTable[key]!;
        if (list) {
            const rootInvoker = !list.isInvoking;
            list.isInvoking = true;

            const infos = list.callbackInfos;
            for (let i = 0, len = infos.length; i < len; ++i) {
                const info = infos[i];
                if (info) {
                    const callback = info.callback;
                    const target = info.target;
                    // Pre off once callbacks to avoid influence on logic in callback
                    if (info.once) {
                        this.off(key, callback, target);
                    }
                    // Lazy check validity of callback target,
                    // if target is CCObject and is no longer valid, then remove the callback info directly
                    if (!info.check()) {
                        this.off(key, callback, target);
                    } else if (target) {
                        callback.call(target, arg0, arg1, arg2, arg3, arg4);
                    } else {
                        callback(arg0, arg1, arg2, arg3, arg4);
                    }
                }
            }

            if (rootInvoker) {
                list.isInvoking = false;
                if (list.containCanceled) {
                    list.purgeCanceled();
                }
            }
        }
    }

    /**
     * ?????????????????????
     */
    public clear () {
        for (const key in this._callbackTable) {
            const list = this._callbackTable[key];
            if (list) {
                list.clear();
                callbackListPool.free(list);
                delete this._callbackTable[key];
            }
        }
    }
}

if (TEST) {
    legacyCC._Test.CallbacksInvoker = CallbacksInvoker;
}
