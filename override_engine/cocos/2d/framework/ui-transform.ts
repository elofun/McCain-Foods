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
 * @module ui
 */

import { ccclass, help, executeInEditMode, executionOrder, menu, tooltip, displayOrder, serializable, disallowMultiple, visible } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { Component } from '../../core/components';
import { SystemEventType } from '../../core/platform/event-manager/event-enum';
import { EventListener } from '../../core/platform/event-manager/event-listener';
import { Mat4, Rect, Size, Vec2, Vec3 } from '../../core/math';
import { AABB } from '../../core/geometry';
import { Node } from '../../core/scene-graph';
import { legacyCC } from '../../core/global-exports';
import { Director, director } from '../../core/director';
import { warnID } from '../../core/platform/debug';

const _vec2a = new Vec2();
const _vec2b = new Vec2();
const _mat4_temp = new Mat4();
const _matrix = new Mat4();
const _worldMatrix = new Mat4();
const _zeroMatrix = new Mat4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const _rect = new Rect();
/**
 * @en
 * The component of transform in UI.
 *
 * @zh
 * UI ???????????????
 */
@ccclass('cc.UITransform')
@help('i18n:cc.UITransform')
@executionOrder(110)
@menu('UI/UITransform')
@disallowMultiple
@executeInEditMode
export class UITransform extends Component {
    /**
     * @en
     * Size of the UI node.
     *
     * @zh
     * ???????????????
     */
    @displayOrder(0)
    @tooltip('i18n:ui_transform.conten_size')
    // @constget
    get contentSize (): Readonly<Size> {
        return this._contentSize;
    }

    set contentSize (value) {
        if (this._contentSize.equals(value)) {
            return;
        }

        let clone: Size;
        if (EDITOR) {
            clone = new Size(this._contentSize);
        }

        this._contentSize.set(value);
        if (EDITOR) {
            // @ts-expect-error EDITOR condition
            this.node.emit(SystemEventType.SIZE_CHANGED, clone);
        } else {
            this.node.emit(SystemEventType.SIZE_CHANGED);
        }
        this._markRenderDataDirty();
    }

    get width () {
        return this._contentSize.width;
    }

    set width (value) {
        if (this._contentSize.width === value) {
            return;
        }

        let clone: Size;
        if (EDITOR) {
            clone = new Size(this._contentSize);
        }

        this._contentSize.width = value;
        if (EDITOR) {
            // @ts-expect-error EDITOR condition
            this.node.emit(SystemEventType.SIZE_CHANGED, clone);
        } else {
            this.node.emit(SystemEventType.SIZE_CHANGED);
        }
        this._markRenderDataDirty();
    }

    get height () {
        return this._contentSize.height;
    }

    set height (value) {
        if (this.contentSize.height === value) {
            return;
        }

        let clone: Size;
        if (EDITOR) {
            clone = new Size(this._contentSize);
        }

        this._contentSize.height = value;
        if (EDITOR) {
            // @ts-expect-error EDITOR condition
            this.node.emit(SystemEventType.SIZE_CHANGED, clone);
        } else {
            this.node.emit(SystemEventType.SIZE_CHANGED);
        }
        this._markRenderDataDirty();
    }

    /**
     * @en
     * Anchor point of the UI node.
     *
     * @zh
     * ???????????????
     */
    @displayOrder(1)
    @tooltip('i18n:ui_transform.anchor_point')
    // @constget
    get anchorPoint (): Readonly<Vec2> {
        return this._anchorPoint;
    }

    set anchorPoint (value) {
        if (this._anchorPoint.equals(value)) {
            return;
        }

        this._anchorPoint.set(value);
        this.node.emit(SystemEventType.ANCHOR_CHANGED, this._anchorPoint);
        this._markRenderDataDirty();
    }

    get anchorX () {
        return this._anchorPoint.x;
    }

    set anchorX (value) {
        if (this._anchorPoint.x === value) {
            return;
        }

        this._anchorPoint.x = value;
        this.node.emit(SystemEventType.ANCHOR_CHANGED, this._anchorPoint);
        this._markRenderDataDirty();
    }

    get anchorY () {
        return this._anchorPoint.y;
    }

    set anchorY (value) {
        if (this._anchorPoint.y === value) {
            return;
        }

        this._anchorPoint.y = value;
        this.node.emit(SystemEventType.ANCHOR_CHANGED, this._anchorPoint);
        this._markRenderDataDirty();
    }

    /**
     * @en
     * Render sequence.
     * Note: UI rendering is only about priority.
     *
     * @zh
     * ???????????????????????????????????????????????????????????????????????????????????????
     * @deprecated
     */
    get priority () {
        return this._priority;
    }

    set priority (value) {
        if (this._priority === value) {
            return;
        }

        if (this.node.getComponent('cc.RenderRoot2D')) {
            warnID(6706);
            return;
        }

        this._priority = value;
        if (this.node.parent) {
            UITransform.insertChangeMap(this.node.parent);
        }
    }

    protected _priority = 0;

    /**
     * @en Get the visibility bit-mask of the rendering camera
     * @zh ??????????????????????????????????????????
     * @deprecated since v3.0
     */
    get visibility () {
        const camera = director.root!.batcher2D.getFirstRenderCamera(this.node);
        return camera ? camera.visibility : 0;
    }

    /**
     * @en Get the priority of the rendering camera
     * @zh ??????????????????????????????????????????
     */
    get cameraPriority () {
        const camera = director.root!.batcher2D.getFirstRenderCamera(this.node);
        return camera ? camera.priority : 0;
    }

    public static EventType = SystemEventType;

    @serializable
    protected _contentSize = new Size(100, 100);
    @serializable
    protected _anchorPoint = new Vec2(0.5, 0.5);

    public __preload () {
        this.node._uiProps.uiTransformComp = this;
    }

    public onLoad () {
        if (this.node.parent) {
            UITransform.insertChangeMap(this.node.parent);
        }
    }

    public onEnable () {
        this.node.on(SystemEventType.PARENT_CHANGED, this._parentChanged, this);
        this._markRenderDataDirty();
    }

    public onDisable () {
        this.node.off(SystemEventType.PARENT_CHANGED, this._parentChanged, this);
    }

    public onDestroy () {
        this.node._uiProps.uiTransformComp = null;
    }

    /**
     * @en
     * Sets the untransformed size of the ui transform.<br/>
     * The contentSize remains the same no matter if the node is scaled or rotated.<br/>
     * @zh
     * ???????????? UI Transform ????????????????????????????????????????????????????????????????????????
     *
     * @param size - The size of the UI transformation.
     * @example
     * ```ts
     * import { Size } from 'cc';
     * node.setContentSize(new Size(100, 100));
     * ```
     */
    public setContentSize(size: Size) : void;

    /**
     * @en
     * Sets the untransformed size of the ui transform.<br/>
     * The contentSize remains the same no matter if the node is scaled or rotated.<br/>
     * @zh
     * ???????????? UI Transform ????????????????????????????????????????????????????????????????????????
     *
     * @param width - The width of the UI transformation.
     * @param height - The height of the UI transformation.
     * @example
     * ```ts
     * import { Size } from 'cc';
     * node.setContentSize(100, 100);
     * ```
     */
    public setContentSize(width: number, height: number) : void;

    public setContentSize (size: Size | number, height?: number) {
        const locContentSize = this._contentSize;
        let clone: Size;
        if (height === undefined) {
            size = size as Size;
            if ((size.width === locContentSize.width) && (size.height === locContentSize.height)) {
                return;
            }

            if (EDITOR) {
                clone = new Size(this._contentSize);
            }

            locContentSize.width = size.width;
            locContentSize.height = size.height;
        } else {
            if ((size === locContentSize.width) && (height === locContentSize.height)) {
                return;
            }

            if (EDITOR) {
                clone = new Size(this._contentSize);
            }

            locContentSize.width = size as number;
            locContentSize.height = height;
        }

        if (EDITOR) {
            // @ts-expect-error EDITOR condition
            this.node.emit(SystemEventType.SIZE_CHANGED, clone);
        } else {
            this.node.emit(SystemEventType.SIZE_CHANGED);
        }

        this._markRenderDataDirty();
    }

    /**
     * @en
     * Sets the anchor point in percent. <br/>
     * anchor point is the point around which all transformations and positioning manipulations take place. <br/>
     * It's like a pin in the node where it is "attached" to its parent. <br/>
     * The anchorPoint is normalized, like a percentage. (0,0) means the bottom-left corner and (1,1) means the top-right corner.<br/>
     * But you can use values higher than (1,1) and lower than (0,0) too.<br/>
     * The default anchor point is (0.5,0.5), so it starts at the center of the node.
     *
     * @zh
     * ???????????????????????????<br>
     * ?????????????????????????????????????????????????????????????????????????????????????????????????????????<br>
     * ????????????????????????????????????????????????(0???0) ??????????????????(1???1) ??????????????????<br>
     * ???????????????????????????1???1???????????????????????????0???0??????????????????<br>
     * ?????????????????????0.5???0.5????????????????????????????????????????????????<br>
     * ?????????Creator ??????????????????????????????????????????????????????????????????????????????
     *
     * @param point - ????????????????????? x ?????????
     * @param y - ?????? y ?????????
     * @example
     * ```ts
     * import { Vec2 } from 'cc';
     * node.setAnchorPoint(new Vec2(1, 1));
     * node.setAnchorPoint(1, 1);
     * ```
     */
    public setAnchorPoint (point: Vec2 | number, y?: number) {
        const locAnchorPoint = this._anchorPoint;
        if (y === undefined) {
            point = point as Vec2;
            if ((point.x === locAnchorPoint.x) && (point.y === locAnchorPoint.y)) {
                return;
            }
            locAnchorPoint.x = point.x;
            locAnchorPoint.y = point.y;
        } else {
            if ((point === locAnchorPoint.x) && (y === locAnchorPoint.y)) {
                return;
            }
            locAnchorPoint.x = point as number;
            locAnchorPoint.y = y;
        }

        // this.setLocalDirty(LocalDirtyFlag.POSITION);
        // if (this._eventMask & ANCHOR_ON) {
        this.node.emit(SystemEventType.ANCHOR_CHANGED, this._anchorPoint);
        this._markRenderDataDirty();
        // }
    }

    /**
     * @zh
     * ??????????????????????????????
     *
     * @param point - ????????????
     * @param listener - ??????????????????
     */
    public isHit (point: Vec2, listener?: EventListener) {
        const w = this._contentSize.width;
        const h = this._contentSize.height;
        const cameraPt = _vec2a;
        const testPt = _vec2b;

        const cameras = this._getRenderScene().cameras;
        for (let i = 0; i < cameras.length; i++) {
            const camera = cameras[i];
            if (!(camera.visibility & this.node.layer)) continue;

            // ???????????????????????????????????????????????????????????????
            camera.node.getWorldRT(_mat4_temp);
            const m12 = _mat4_temp.m12;
            const m13 = _mat4_temp.m13;
            const center = legacyCC.visibleRect.center;
            _mat4_temp.m12 = center.x - (_mat4_temp.m00 * m12 + _mat4_temp.m04 * m13);
            _mat4_temp.m13 = center.y - (_mat4_temp.m01 * m12 + _mat4_temp.m05 * m13);
            Mat4.invert(_mat4_temp, _mat4_temp);
            Vec2.transformMat4(cameraPt, point, _mat4_temp);

            this.node.getWorldMatrix(_worldMatrix);
            Mat4.invert(_mat4_temp, _worldMatrix);
            if (Mat4.strictEquals(_mat4_temp, _zeroMatrix)) {
                continue;
            }
            Vec2.transformMat4(testPt, cameraPt, _mat4_temp);
            testPt.x += this._anchorPoint.x * w;
            testPt.y += this._anchorPoint.y * h;
            let hit = false;
            if (testPt.x >= 0 && testPt.y >= 0 && testPt.x <= w && testPt.y <= h) {
                hit = true;
                if (listener && listener.mask) {
                    const mask = listener.mask;
                    let parent: any = this.node;
                    const length = mask ? mask.length : 0;
                    // find mask parent, should hit test it
                    for (let i = 0, j = 0; parent && j < length; ++i, parent = parent.parent) {
                        const temp = mask[j];
                        if (i === temp.index) {
                            if (parent === temp.comp.node) {
                                const comp = temp.comp;
                                if (comp && comp._enabled && !(comp as any).isHit(cameraPt)) {
                                    hit = false;
                                    break;
                                }

                                j++;
                            } else {
                                // mask parent no longer exists
                                mask.length = j;
                                break;
                            }
                        } else if (i > temp.index) {
                            // mask parent no longer exists
                            mask.length = j;
                            break;
                        }
                    }
                }
            }
            if (hit) {
                return true;
            }
        }
        return false;
    }

    /**
     * @en
     * Converts a Point to node (local) space coordinates.
     *
     * @zh
     * ????????? UI ????????????????????????????????????????????? UI ?????? (??????) ??????????????????????????????????????????????????????
     * ??? UI ??????????????? UI ??????(??????) ???????????????????????? Camera ??? `convertToUINode`???
     *
     * @param worldPoint - ??????????????????
     * @param out - ??????????????????
     * @returns - ???????????????????????????????????????
     * @example
     * ```ts
     * const newVec3 = uiTransform.convertToNodeSpaceAR(cc.v3(100, 100, 0));
     * ```
     */
    public convertToNodeSpaceAR (worldPoint: Vec3, out?: Vec3) {
        this.node.getWorldMatrix(_worldMatrix);
        Mat4.invert(_mat4_temp, _worldMatrix);
        if (!out) {
            out = new Vec3();
        }

        return Vec3.transformMat4(out, worldPoint, _mat4_temp);
    }

    /**
     * @en
     * Converts a Point in node coordinates to world space coordinates.
     *
     * @zh
     * ?????????????????????????????????????????????????????????????????????
     *
     * @param nodePoint - ???????????????
     * @param out - ??????????????????
     * @returns - ?????? UI ??????????????????
     * @example
     * ```ts
     * const newVec3 = uiTransform.convertToWorldSpaceAR(3(100, 100, 0));
     * ```
     */
    public convertToWorldSpaceAR (nodePoint: Vec3, out?: Vec3) {
        this.node.getWorldMatrix(_worldMatrix);
        if (!out) {
            out = new Vec3();
        }

        return Vec3.transformMat4(out, nodePoint, _worldMatrix);
    }

    /**
     * @en
     * Returns a "local" axis aligned bounding box of the node. <br/>
     * The returned box is relative only to its parent.
     *
     * @zh
     * ??????????????????????????????????????????????????????
     *
     * @return - ????????????????????????
     * @example
     * ```ts
     * const boundingBox = uiTransform.getBoundingBox();
     * ```
     */
    public getBoundingBox () {
        Mat4.fromRTS(_matrix, this.node.getRotation(), this.node.getPosition(), this.node.getScale());
        const width = this._contentSize.width;
        const height = this._contentSize.height;
        const rect = new Rect(
            -this._anchorPoint.x * width,
            -this._anchorPoint.y * height,
            width,
            height,
        );
        rect.transformMat4(_matrix);
        return rect;
    }

    /**
     * @en
     * Returns a "world" axis aligned bounding box of the node.<br/>
     * The bounding box contains self and active children's world bounding box.
     *
     * @zh
     * ???????????????????????????????????????????????????????????????AABB??????
     * ???????????????????????????????????????????????????????????????
     *
     * @returns - ????????????????????????????????????
     * @example
     * ```ts
     * const newRect = uiTransform.getBoundingBoxToWorld();
     * ```
     */
    public getBoundingBoxToWorld () {
        if (this.node.parent) {
            this.node.parent.getWorldMatrix(_worldMatrix);
            return this.getBoundingBoxTo(_worldMatrix);
        }
        return this.getBoundingBox();
    }

    /**
     * @en
     * Returns the minimum bounding box containing the current bounding box and its child nodes.
     *
     * @zh
     * ????????????????????????????????????????????????????????????????????????
     *
     * @param parentMat - ??????????????????
     * @returns
     */
    public getBoundingBoxTo (parentMat: Mat4) {
        Mat4.fromRTS(_matrix, this.node.getRotation(), this.node.getPosition(), this.node.getScale());
        const width = this._contentSize.width;
        const height = this._contentSize.height;
        const rect = new Rect(
            -this._anchorPoint.x * width,
            -this._anchorPoint.y * height,
            width,
            height,
        );

        Mat4.multiply(_worldMatrix, parentMat, _matrix);
        rect.transformMat4(_worldMatrix);

        // query child's BoundingBox
        if (!this.node.children) {
            return rect;
        }

        const locChildren = this.node.children;
        for (const child of locChildren) {
            if (child && child.active) {
                const uiTransform = child.getComponent(UITransform);
                if (uiTransform) {
                    const childRect = uiTransform.getBoundingBoxTo(parentMat);
                    if (childRect) {
                        Rect.union(rect, rect, childRect);
                    }
                }
            }
        }

        return rect;
    }

    /**
     * @en
     * Compute the corresponding aabb in world space for raycast.
     *
     * @zh
     * ???????????? UI_2D ??????????????????????????? aabb ?????????
     */
    public getComputeAABB (out?: AABB) {
        const width = this._contentSize.width;
        const height = this._contentSize.height;
        _rect.set(
            -this._anchorPoint.x * width,
            -this._anchorPoint.y * height,
            width,
            height,
        );
        _rect.transformMat4(this.node.worldMatrix);
        const px = _rect.x + _rect.width * 0.5;
        const py = _rect.y + _rect.height * 0.5;
        const pz = this.node.worldPosition.z;
        const w = _rect.width / 2;
        const h = _rect.height / 2;
        const l = 0.001;
        if (out != null) {
            AABB.set(out, px, py, pz, w, h, l);
            return out;
        } else {
            return new AABB(px, py, pz, w, h, l);
        }
    }

    protected _parentChanged (node: Node) {
        if (this.node.getComponent('cc.RenderRoot2D')) {
            return;
        }

        if (this.node.parent) {
            UITransform.insertChangeMap(this.node.parent);
        }
    }

    private _markRenderDataDirty () {
        const uiComp = this.node._uiProps.uiComp;
        if (uiComp) {
            uiComp.markForUpdateRenderData();
        }
    }

    private static priorityChangeNodeMap = new Map<string, Node>();

    private static insertChangeMap (node: Node) {
        const key = node.uuid;
        if (!UITransform.priorityChangeNodeMap.has(key)) {
            UITransform.priorityChangeNodeMap.set(key, node);
        }
    }

    private static _sortChildrenSibling (node) {
        const siblings = node.children;
        if (siblings) {
            siblings.sort((a:Node, b:Node) => {
                const aComp = a._uiProps.uiTransformComp;
                const bComp = b._uiProps.uiTransformComp;
                const ca = aComp ? aComp._priority : 0;
                const cb = bComp ? bComp._priority : 0;
                const diff = ca - cb;
                if (diff === 0) return a.getSiblingIndex() - b.getSiblingIndex();
                return diff;
            });
        }
    }

    public static _sortSiblings () {
        UITransform.priorityChangeNodeMap.forEach((node, ID) => {
            UITransform._sortChildrenSibling(node);
            node._updateSiblingIndex();
            node.emit('childrenSiblingOrderChanged');
        });
        UITransform.priorityChangeNodeMap.clear();
    }

    public static _cleanChangeMap () {
        UITransform.priorityChangeNodeMap.clear();
    }
}

// HACK
director.on(Director.EVENT_AFTER_UPDATE, UITransform._sortSiblings);
director.on(Director.EVENT_BEFORE_SCENE_LAUNCH, UITransform._cleanChangeMap);
