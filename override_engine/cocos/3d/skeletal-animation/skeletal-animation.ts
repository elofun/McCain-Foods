/*
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
 * @module animation
 */

import {
    ccclass, executeInEditMode, executionOrder, help, menu, tooltip, type, serializable, editable,
} from 'cc.decorator';
import { SkinnedMeshRenderer } from '../skinned-mesh-renderer';
import { Mat4 } from '../../core/math';
import { DataPoolManager } from './data-pool-manager';
import { Node } from '../../core/scene-graph/node';
import { AnimationClip } from '../../core/animation/animation-clip';
import { Animation } from '../../core/animation/animation-component';
import { SkelAnimDataHub } from './skeletal-animation-data-hub';
import { SkeletalAnimationState } from './skeletal-animation-state';
import { getWorldTransformUntilRoot } from '../../core/animation/transform-utils';
import { legacyCC } from '../../core/global-exports';
import { AnimationManager } from '../../core/animation/animation-manager';
import { js } from '../../core/utils/js';

@ccclass('cc.SkeletalAnimation.Socket')
export class Socket {
    /**
     * @en Path of the target joint.
     * @zh ?????????????????????????????????
     */
    @serializable
    @editable
    public path = '';

    /**
     * @en Transform output node.
     * @zh ???????????????????????????????????????
     */
    @type(Node)
    public target: Node | null = null;

    constructor (path = '', target: Node | null = null) {
        this.path = path;
        this.target = target;
    }
}

js.setClassAlias(Socket, 'cc.SkeletalAnimationComponent.Socket');

const m4_1 = new Mat4();
const m4_2 = new Mat4();

function collectRecursively (node: Node, prefix = '', out: string[] = []) {
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (!child) { continue; }
        const path = prefix ? `${prefix}/${child.name}` : child.name;
        out.push(path);
        collectRecursively(child, path, out);
    }
    return out;
}

/**
 * @en
 * Skeletal animation component, offers the following features on top of [[Animation]]:
 * * Choice between baked animation and real-time calculation, to leverage efficiency and expressiveness.
 * * Joint socket system: Create any socket node directly under the animation component root node,
 *   find your target joint and register both to the socket list, so that the socket node would be in-sync with the joint.
 * @zh
 * ??????????????????????????????????????????????????????????????????????????????
 * * ??????????????????????????????????????????????????????????????????????????????????????????
 * * ???????????????????????????????????????????????????????????????????????????????????????????????????????????? socket ???????????????????????? Transform ??????????????????????????????
 */
@ccclass('cc.SkeletalAnimation')
@help('i18n:cc.SkeletalAnimation')
@executionOrder(99)
@executeInEditMode
@menu('Animation/SkeletalAnimation')
export class SkeletalAnimation extends Animation {
    public static Socket = Socket;

    /**
     * @en
     * The joint sockets this animation component maintains.<br>
     * Sockets have to be registered here before attaching custom nodes to animated joints.
     * @zh
     * ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
     */
    @type([Socket])
    @tooltip('i18n:animation.sockets')
    get sockets () {
        return this._sockets;
    }

    set sockets (val) {
        if (!this._useBakedAnimation) {
            const animMgr = legacyCC.director.getAnimationManager() as AnimationManager;
            animMgr.removeSockets(this.node, this._sockets);
            animMgr.addSockets(this.node, val);
        }
        this._sockets = val;
        this.rebuildSocketAnimations();
    }

    /**
     * @en
     * Whether to bake animations. Default to true,<br>
     * which substantially increases performance while making all animations completely fixed.<br>
     * Dynamically changing this property will take effect when playing the next animation clip.
     * @zh
     * ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????<br>
     * ???????????????????????????????????????????????????????????????????????????
     */
    @tooltip('i18n:animation.use_baked_animation')
    get useBakedAnimation () {
        return this._useBakedAnimation;
    }

    set useBakedAnimation (val) {
        this._useBakedAnimation = val;
        const comps = this.node.getComponentsInChildren(SkinnedMeshRenderer);
        for (let i = 0; i < comps.length; ++i) {
            const comp = comps[i];
            if (comp.skinningRoot === this.node) {
                comp.setUseBakedAnimation(this._useBakedAnimation);
            }
        }
        if (this._useBakedAnimation) {
            (legacyCC.director.getAnimationManager() as AnimationManager).removeSockets(this.node, this._sockets);
        } else {
            (legacyCC.director.getAnimationManager() as AnimationManager).addSockets(this.node, this._sockets);
        }
    }

    @serializable
    protected _useBakedAnimation = true;

    @type([Socket])
    protected _sockets: Socket[] = [];

    public onDestroy () {
        super.onDestroy();
        (legacyCC.director.root.dataPoolManager as DataPoolManager).jointAnimationInfo.destroy(this.node.uuid);
        (legacyCC.director.getAnimationManager() as AnimationManager).removeSockets(this.node, this._sockets);
    }

    public start () {
        this.sockets = this._sockets;
        this.useBakedAnimation = this._useBakedAnimation;
        super.start();
    }

    public querySockets () {
        const animPaths = (this._defaultClip && Object.keys(SkelAnimDataHub.getOrExtract(this._defaultClip).data).sort()
            .reduce((acc, cur) => (cur.startsWith(acc[acc.length - 1]) ? acc : (acc.push(cur), acc)), [] as string[])) || [];
        if (!animPaths.length) { return ['please specify a valid default animation clip first']; }
        const out: string[] = [];
        for (let i = 0; i < animPaths.length; i++) {
            const path = animPaths[i];
            const node = this.node.getChildByPath(path);
            if (!node) { continue; }
            out.push(path);
            collectRecursively(node, path, out);
        }
        return out;
    }

    public rebuildSocketAnimations () {
        for (const socket of this._sockets) {
            const joint = this.node.getChildByPath(socket.path);
            const { target } = socket;
            if (joint && target) {
                target.name = `${socket.path.substring(socket.path.lastIndexOf('/') + 1)} Socket`;
                target.parent = this.node;
                getWorldTransformUntilRoot(joint, this.node, m4_1);
                Mat4.fromRTS(m4_2, target.rotation, target.position, target.scale);
                if (!Mat4.equals(m4_2, m4_1)) { target.matrix = m4_1; }
            }
        }
        for (const stateName of Object.keys(this._nameToState)) {
            const state = this._nameToState[stateName] as SkeletalAnimationState;
            state.rebuildSocketCurves(this._sockets);
        }
    }

    public createSocket (path: string) {
        const socket = this._sockets.find((s) => s.path === path);
        if (socket) { return socket.target; }
        const joint = this.node.getChildByPath(path);
        if (!joint) { console.warn('illegal socket path'); return null; }
        const target = new Node();
        target.parent = this.node;
        this._sockets.push(new Socket(path, target));
        this.rebuildSocketAnimations();
        return target;
    }

    protected _createState (clip: AnimationClip, name?: string) {
        return new SkeletalAnimationState(clip, name);
    }

    protected _doCreateState (clip: AnimationClip, name: string) {
        const state = super._doCreateState(clip, name) as SkeletalAnimationState;
        state.rebuildSocketCurves(this._sockets);
        return state;
    }
}
