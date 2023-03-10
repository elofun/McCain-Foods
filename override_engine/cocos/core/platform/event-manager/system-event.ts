/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

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
 * @module event
 */

import { EDITOR } from 'internal:constants';
import { EventTarget } from '../../event/event-target';
import { EventAcceleration, EventKeyboard, EventMouse, EventTouch } from './events';
import { SystemEventType } from './event-enum';
import { EventListener } from './event-listener';
import eventManager from './event-manager';
import inputManager from './input-manager';
import { Touch } from './touch';
import { legacyCC } from '../../global-exports';
import { logID, warnID } from '../debug';

let keyboardListener: EventListener | null = null;
let accelerationListener: EventListener | null = null;
let touchListener: EventListener | null = null;
let mouseListener: EventListener | null = null;

/**
* @en
* The System event, it currently supports keyboard events and accelerometer events.<br/>
* You can get the `SystemEvent` instance with `systemEvent`.<br/>
* @zh
* ??????????????????????????????????????????????????????????????????<br/>
* ??????????????? `systemEvent` ????????? `SystemEvent` ????????????<br/>
* @example
* ```
* import { systemEvent, SystemEvent } from 'cc';
* systemEvent.on(SystemEvent.EventType.DEVICEMOTION, this.onDeviceMotionEvent, this);
* systemEvent.off(SystemEvent.EventType.DEVICEMOTION, this.onDeviceMotionEvent, this);
* ```
*/

export class SystemEvent extends EventTarget {
    public static EventType = SystemEventType;
    constructor () {
        super();
    }
    /**
     * @en
     * Sets whether to enable the accelerometer event listener or not.
     *
     * @zh
     * ?????????????????????????????????
     */
    public setAccelerometerEnabled (isEnabled: boolean) {
        if (EDITOR) {
            return;
        }

        // for iOS 13+
        if (isEnabled && window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission().then((response) => {
                logID(3520, response);
                inputManager.setAccelerometerEnabled(response === 'granted');
            }).catch((error) => {
                warnID(3521, error.message);
                inputManager.setAccelerometerEnabled(false);
            });
        } else {
            inputManager.setAccelerometerEnabled(isEnabled);
        }
    }

    /**
     * @en
     * Sets the accelerometer interval value.
     *
     * @zh
     * ??????????????????????????????
     */
    public setAccelerometerInterval (interval: number) {
        if (EDITOR) {
            return;
        }
        inputManager.setAccelerometerInterval(interval);
    }

    public on (type: SystemEventType.KEY_DOWN | SystemEventType.KEY_UP, callback: (event: EventKeyboard) => void, target?: unknown): typeof callback;
    public on (type: SystemEventType.MOUSE_DOWN | SystemEventType.MOUSE_ENTER | SystemEventType.MOUSE_LEAVE |
                     SystemEventType.MOUSE_MOVE | SystemEventType.MOUSE_UP | SystemEventType.MOUSE_WHEEL,
               callback: (event: EventMouse) => void, target?: unknown): typeof callback;
    public on (type: SystemEventType.TOUCH_START | SystemEventType.TOUCH_MOVE | SystemEventType.TOUCH_END | SystemEventType.TOUCH_CANCEL,
               callback: (touch: Touch, event: EventTouch) => void, target?: unknown): typeof callback;
    public on (type: SystemEventType.DEVICEMOTION, callback: (event: EventAcceleration) => void, target?: unknown): typeof callback;
    /**
     * @en
     * Register an callback of a specific system event type.
     * @zh
     * ?????????????????????????????????
     *
     * @param type - The event type
     * @param callback - The event listener's callback
     * @param target - The event listener's target and callee
     */
    public on<TFunction extends (...any) => void> (type: string, callback: TFunction, target?, once?: boolean) {
        if (EDITOR && !legacyCC.GAME_VIEW) {
            return callback;
        }
        super.on(type, callback, target, once);

        // Keyboard
        if (type === SystemEventType.KEY_DOWN || type === SystemEventType.KEY_UP) {
            if (!keyboardListener) {
                keyboardListener = EventListener.create({
                    event: EventListener.KEYBOARD,
                    onKeyPressed (keyCode: number, event: EventKeyboard) {
                        event.type = SystemEventType.KEY_DOWN;
                        systemEvent.emit(event.type, event);
                    },
                    onKeyReleased (keyCode: number, event: EventKeyboard) {
                        event.type = SystemEventType.KEY_UP;
                        systemEvent.emit(event.type, event);
                    },
                });
                eventManager.addListener(keyboardListener, 256);
            }
        }

        // Acceleration
        if (type === SystemEventType.DEVICEMOTION) {
            if (!accelerationListener) {
                accelerationListener = EventListener.create({
                    event: EventListener.ACCELERATION,
                    callback (acc: any, event: EventAcceleration) {
                        event.type = SystemEventType.DEVICEMOTION;
                        legacyCC.systemEvent.emit(event.type, event);
                    },
                });
                eventManager.addListener(accelerationListener, 256);
            }
        }

        // touch
        if (type === SystemEventType.TOUCH_START
            || type === SystemEventType.TOUCH_MOVE
            || type === SystemEventType.TOUCH_END
            || type === SystemEventType.TOUCH_CANCEL
        ) {
            if (!touchListener) {
                touchListener = EventListener.create({
                    event: EventListener.TOUCH_ONE_BY_ONE,
                    onTouchBegan (touch: Touch, event: EventTouch) {
                        event.type = SystemEventType.TOUCH_START;
                        legacyCC.systemEvent.emit(event.type, touch, event);
                        return true;
                    },
                    onTouchMoved (touch: Touch, event: EventTouch) {
                        event.type = SystemEventType.TOUCH_MOVE;
                        legacyCC.systemEvent.emit(event.type, touch, event);
                    },
                    onTouchEnded (touch: Touch, event: EventTouch) {
                        event.type = SystemEventType.TOUCH_END;
                        legacyCC.systemEvent.emit(event.type, touch, event);
                    },
                    onTouchCancelled (touch: Touch, event: EventTouch) {
                        event.type = SystemEventType.TOUCH_CANCEL;
                        legacyCC.systemEvent.emit(event.type, touch, event);
                    },
                });
                eventManager.addListener(touchListener, 256);
            }
        }

        // mouse
        if (type === SystemEventType.MOUSE_DOWN
            || type === SystemEventType.MOUSE_MOVE
            || type === SystemEventType.MOUSE_UP
            || type === SystemEventType.MOUSE_WHEEL
        ) {
            if (!mouseListener) {
                mouseListener = EventListener.create({
                    event: EventListener.MOUSE,
                    onMouseDown (event: EventMouse) {
                        event.type = SystemEventType.MOUSE_DOWN;
                        legacyCC.systemEvent.emit(event.type, event);
                    },
                    onMouseMove (event:EventMouse) {
                        event.type = SystemEventType.MOUSE_MOVE;
                        legacyCC.systemEvent.emit(event.type, event);
                    },
                    onMouseUp (event: EventMouse) {
                        event.type = SystemEventType.MOUSE_UP;
                        legacyCC.systemEvent.emit(event.type, event);
                    },
                    onMouseScroll (event: EventMouse) {
                        event.type = SystemEventType.MOUSE_WHEEL;
                        legacyCC.systemEvent.emit(event.type, event);
                    },
                });
                eventManager.addListener(mouseListener, 256);
            }
        }

        return callback;
    }

    /**
     * @en
     * Removes the listeners previously registered with the same type, callback, target and or useCapture,
     * if only type is passed as parameter, all listeners registered with that type will be removed.
     * @zh
     * ????????????????????????????????????????????? useCapture ?????????????????????????????????????????? type??????????????? type ?????????????????????????????????
     *
     * @param type - A string representing the event type being removed.
     * @param callback - The callback to remove.
     * @param target - The target (this object) to invoke the callback, if it's not given, only callback without target will be removed
     */
    public off (type: string, callback?: (...any) => void, target?) {
        if (EDITOR && !legacyCC.GAME_VIEW) {
            return;
        }
        super.off(type, callback, target);

        // Keyboard
        if (keyboardListener && (type === SystemEventType.KEY_DOWN || type === SystemEventType.KEY_UP)) {
            const hasKeyDownEventListener = this.hasEventListener(SystemEventType.KEY_DOWN);
            const hasKeyUpEventListener = this.hasEventListener(SystemEventType.KEY_UP);
            if (!hasKeyDownEventListener && !hasKeyUpEventListener) {
                eventManager.removeListener(keyboardListener);
                keyboardListener = null;
            }
        }

        // Acceleration
        if (accelerationListener && type === SystemEventType.DEVICEMOTION) {
            eventManager.removeListener(accelerationListener);
            accelerationListener = null;
        }

        if (touchListener && (type === SystemEventType.TOUCH_START || type === SystemEventType.TOUCH_MOVE
            || type === SystemEventType.TOUCH_END || type === SystemEventType.TOUCH_CANCEL)
        ) {
            const hasTouchStart = this.hasEventListener(SystemEventType.TOUCH_START);
            const hasTouchMove = this.hasEventListener(SystemEventType.TOUCH_MOVE);
            const hasTouchEnd = this.hasEventListener(SystemEventType.TOUCH_END);
            const hasTouchCancel = this.hasEventListener(SystemEventType.TOUCH_CANCEL);
            if (!hasTouchStart && !hasTouchMove && !hasTouchEnd && !hasTouchCancel) {
                eventManager.removeListener(touchListener);
                touchListener = null;
            }
        }

        if (mouseListener && (type === SystemEventType.MOUSE_DOWN || type === SystemEventType.MOUSE_MOVE
            || type === SystemEventType.MOUSE_UP || type === SystemEventType.MOUSE_WHEEL)
        ) {
            const hasMouseDown = this.hasEventListener(SystemEventType.MOUSE_DOWN);
            const hasMouseMove = this.hasEventListener(SystemEventType.MOUSE_MOVE);
            const hasMouseUp = this.hasEventListener(SystemEventType.MOUSE_UP);
            const hasMouseWheel = this.hasEventListener(SystemEventType.MOUSE_WHEEL);
            if (!hasMouseDown && !hasMouseMove && !hasMouseUp && !hasMouseWheel) {
                eventManager.removeListener(mouseListener);
                mouseListener = null;
            }
        }
    }
}

legacyCC.SystemEvent = SystemEvent;
/**
 * @module cc
 */

/**
 * @en The singleton of the SystemEvent, there should only be one instance to be used globally
 * @zh ??????????????????????????????????????????
 */
export const systemEvent = new SystemEvent();
legacyCC.systemEvent = systemEvent;
