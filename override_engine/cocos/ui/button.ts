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
 * @module ui
 */

import { ccclass, help, executionOrder, menu, requireComponent, tooltip, displayOrder, type, rangeMin, rangeMax, serializable, executeInEditMode } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { SpriteFrame } from '../2d/assets';
import { Component, EventHandler as ComponentEventHandler } from '../core/components';
import { UITransform, Renderable2D } from '../2d/framework';
import { EventMouse, EventTouch, SystemEventType } from '../core/platform';
import { Color, Vec3 } from '../core/math';
import { ccenum } from '../core/value-types/enum';
import { lerp } from '../core/math/utils';
import { Node } from '../core/scene-graph/node';
import { Sprite } from '../2d/components/sprite';
import { legacyCC } from '../core/global-exports';
import { TransformBit } from '../core/scene-graph/node-enum';

const _tempColor = new Color();

/**
 * @en Enum for transition type.
 *
 * @zh ???????????????
 */
enum Transition {
    /**
     * @en The none type.
     *
     * @zh ?????????????????????
     */
    NONE = 0,

    /**
     * @en The color type.
     *
     * @zh ???????????????
     */
    COLOR = 1,

    /**
     * @en The sprite type.
     *
     * @zh ???????????????
     */
    SPRITE = 2,
    /**
     * @en The scale type.
     *
     * @zh ???????????????
     */
    SCALE = 3,
}

ccenum(Transition);

enum State {
    NORMAL = 'normal',
    HOVER = 'hover',
    PRESSED = 'pressed',
    DISABLED = 'disabled',
}

/**
 * @en The event types of [[Button]]. All button events are distributed by the owner Node, not the component
 * @zh [[Button]] ????????????????????????????????????????????????????????? Node ????????????????????????????????? node.on ????????????
 */
export enum EventType {
    /**
     * @event click
     * @param {Event.EventCustom} event
     * @param {Button} button - The Button component.
     */
    CLICK = 'click',
}

/**
 * @en
 * Button component. Can be pressed or clicked. Button has 4 Transition types:
 *
 *   - Button.Transition.NONE   // Button will do nothing
 *   - Button.Transition.COLOR  // Button will change target's color
 *   - Button.Transition.SPRITE // Button will change target Sprite's sprite
 *   - Button.Transition.SCALE  // Button will change target node's scale
 *
 * The button can bind events (but you must be on the button's node to bind events).<br/>
 * The following events can be triggered on all platforms.
 *
 *  - cc.Node.EventType.TOUCH_START  // Press
 *  - cc.Node.EventType.TOUCH_MOVE   // After pressing and moving
 *  - cc.Node.EventType.TOUCH_END    // After pressing and releasing
 *  - cc.Node.EventType.TOUCH_CANCEL // Press to cancel
 *
 * The following events are only triggered on the PC platform:
 *
 *   - cc.Node.EventType.MOUSE_DOWN
 *   - cc.Node.EventType.MOUSE_MOVE
 *   - cc.Node.EventType.MOUSE_ENTER
 *   - cc.Node.EventType.MOUSE_LEAVE
 *   - cc.Node.EventType.MOUSE_UP
 *
 * The developer can get the current clicked node with `event.target` from event object which is passed as parameter in the callback function of click event.
 *
 * @zh
 * ????????????????????????????????????????????????<br>
 * ???????????????????????? Transition ???????????????????????????????????????
 *
 *   - Button.Transition.NONE   // ??????????????????
 *   - Button.Transition.COLOR  // ????????????????????????
 *   - Button.Transition.SPRITE // ????????????????????????
 *   - Button.Transition.SCALE // ??????????????????
 *
 * ?????????????????????????????????????????????????????? Node ???????????????????????????<br/>
 * ?????????????????????????????????????????????
 *
 *   - cc.Node.EventType.TOUCH_START  // ???????????????
 *   - cc.Node.EventType.TOUCH_Move   // ?????????????????????
 *   - cc.Node.EventType.TOUCH_END    // ????????????????????????
 *   - cc.Node.EventType.TOUCH_CANCEL // ??????????????????
 *
 * ?????????????????? PC ??????????????????
 *
 *   - cc.Node.EventType.MOUSE_DOWN  // ?????????????????????
 *   - cc.Node.EventType.MOUSE_MOVE  // ???????????????????????????
 *   - cc.Node.EventType.MOUSE_ENTER // ????????????????????????
 *   - cc.Node.EventType.MOUSE_LEAVE // ????????????????????????
 *   - cc.Node.EventType.MOUSE_UP    // ??????????????????
 *
 * ??????????????????????????? **????????????** ????????????????????? event ??? target ?????????????????????????????????
 *
 * @example
 * ```ts
 * import { log, Node } from 'cc';
 * // Add an event to the button.
 * button.node.on(Node.EventType.TOUCH_START, (event) => {
 *     log("This is a callback after the trigger event");
 * });
 * // You could also add a click event
 * // Note: In this way, you can't get the touch event info, so use it wisely.
 * button.node.on(Node.EventType.CLICK, (button) => {
 *    //The event is a custom event, you could get the Button component via first argument
 * })
 * ```
 */
@ccclass('cc.Button')
@help('i18n:cc.Button')
@executionOrder(110)
@menu('UI/Button')
@requireComponent(UITransform)
@executeInEditMode
export class Button extends Component {
    /**
     * @en
     * Transition target.<br/>
     * When Button state changed:
     * - Button.Transition.NONE   // Button will do nothing
     * - Button.Transition.COLOR  // Button will change target's color
     * - Button.Transition.SPRITE // Button will change target Sprite's sprite
     * - Button.Transition.SCALE  // Button will change target node's scale
     *
     * @zh
     * ????????????????????????<br/>
     * ???????????????????????? Transition ???????????????????????????????????????
     * - Button.Transition.NONE   // ??????????????????
     * - Button.Transition.COLOR  // ????????????????????????
     * - Button.Transition.SPRITE // ?????? Sprite ???????????????
     * - Button.Transition.SCALE // ??????????????????
     */
    @type(Node)
    @displayOrder(0)
    @tooltip('i18n:button.target')
    get target () {
        return this._target || this.node;
    }

    set target (value) {
        if (this._target === value) {
            return;
        }
        if (this._target) {
            // need to remove the old target event listeners
            this._unregisterTargetEvent(this._target);
        }
        this._target = value;
        this._applyTarget();
    }

    /**
     * @en
     * Whether the Button is disabled.
     * If true, the Button will trigger event and do transition.
     *
     * @zh
     * ??????????????????????????????????????? false???????????????????????????
     */
    @displayOrder(1)
    @tooltip('i18n:button.interactable')
    get interactable () {
        return this._interactable;
    }

    set interactable (value) {
        // if (EDITOR) {
        //     if (value) {
        //         this._previousNormalSprite = this.normalSprite;
        //     } else {
        //         this.normalSprite = this._previousNormalSprite;
        //     }
        // }
        this._interactable = value;
        this._updateState();

        if (!this._interactable) {
            this._resetState();
        }
    }

    set _resizeToTarget (value: boolean) {
        if (value) {
            this._resizeNodeToTargetNode();
        }
    }

    /**
     * @en
     * Transition type.
     *
     * @zh
     * ????????????????????????????????????
     */
    @type(Transition)
    @displayOrder(2)
    @tooltip('i18n:button.transition')
    get transition () {
        return this._transition;
    }

    set transition (value: Transition) {
        if (this._transition === value) {
            return;
        }

        // Reset to normal data when change transition.
        if (this._transition === Transition.COLOR) {
            this._updateColorTransition(State.NORMAL);
        } else if (this._transition === Transition.SPRITE) {
            this._updateSpriteTransition(State.NORMAL);
        }
        this._transition = value;
        this._updateState();
    }

    // color transition

    /**
     * @en
     * Normal state color.
     *
     * @zh
     * ??????????????????????????????????????????
     */
    @tooltip('i18n:button.normal_color')
    // @constget
    get normalColor (): Readonly<Color> {
        return this._normalColor;
    }

    set normalColor (value) {
        if (this._normalColor === value) {
            return;
        }

        this._normalColor.set(value);
        this._updateState();
    }

    /**
     * @en
     * Pressed state color.
     *
     * @zh
     * ??????????????????????????????????????????
     */
    @tooltip('i18n:button.pressed_color')
    // @constget
    get pressedColor (): Readonly<Color> {
        return this._pressedColor;
    }

    set pressedColor (value) {
        if (this._pressedColor === value) {
            return;
        }

        this._pressedColor.set(value);
    }

    /**
     * @en
     * Hover state color.
     *
     * @zh
     * ??????????????????????????????????????????
     */
    @tooltip('i18n:button.hover_color')
    // @constget
    get hoverColor (): Readonly<Color> {
        return this._hoverColor;
    }

    set hoverColor (value) {
        if (this._hoverColor === value) {
            return;
        }

        this._hoverColor.set(value);
    }
    /**
     * @en
     * Disabled state color.
     *
     * @zh
     * ??????????????????????????????????????????
     */
    @tooltip('i18n:button.disabled_color')
    // @constget
    get disabledColor (): Readonly<Color> {
        return this._disabledColor;
    }

    set disabledColor (value) {
        if (this._disabledColor === value) {
            return;
        }

        this._disabledColor.set(value);
        this._updateState();
    }

    /**
     * @en
     * Color and Scale transition duration.
     *
     * @zh
     * ?????????????????????????????????????????????
     */
    @rangeMin(0)
    @rangeMax(10)
    @tooltip('i18n:button.duration')
    get duration () {
        return this._duration;
    }

    set duration (value) {
        if (this._duration === value) {
            return;
        }

        this._duration = value;
    }

    /**
     * @en
     * When user press the button, the button will zoom to a scale.
     * The final scale of the button equals (button original scale * zoomScale)
     * NOTE: Setting zoomScale less than 1 is not adviced, which could fire the touchCancel event if the touch point is out of touch area after scaling.
     * if you need to do so, you should set target as another background node instead of the button node.
     *
     * @zh
     * ???????????????????????????????????????????????????????????????????????? Button ?????? scale * zoomScale???
     * ?????????????????? zoomScale ???????????? 1, ????????????????????????????????????????????????, ???????????? touchCancel ?????????
     * ??????????????????????????????????????? target ?????????????????????????????????????????????????????????
     */
    @tooltip('i18n:button.zoom_scale')
    get zoomScale () {
        return this._zoomScale;
    }

    set zoomScale (value) {
        if (this._zoomScale === value) {
            return;
        }

        this._zoomScale = value;
    }

    // sprite transition
    /**
     * @en
     * Normal state sprite.
     *
     * @zh
     * ????????????????????????????????? Sprite???
     */
    @type(SpriteFrame)
    @tooltip('i18n:button.normal_sprite')
    get normalSprite () {
        return this._normalSprite;
    }

    set normalSprite (value: SpriteFrame | null) {
        if (this._normalSprite === value) {
            return;
        }

        this._normalSprite = value;
        const sprite = this.node.getComponent(Sprite);
        if (sprite) {
            sprite.spriteFrame = value;
        }

        this._updateState();
    }

    /**
     * @en
     * Pressed state sprite.
     *
     * @zh
     * ????????????????????????????????? Sprite???
     */
    @type(SpriteFrame)
    @tooltip('i18n:button.pressed_sprite')
    get pressedSprite () {
        return this._pressedSprite;
    }

    set pressedSprite (value: SpriteFrame | null) {
        if (this._pressedSprite === value) {
            return;
        }

        this._pressedSprite = value;
        this._updateState();
    }

    /**
     * @en
     * Hover state sprite.
     *
     * @zh
     * ????????????????????????????????? Sprite???
     */
    @type(SpriteFrame)
    @tooltip('i18n:button.hover_sprite')
    get hoverSprite () {
        return this._hoverSprite;
    }

    set hoverSprite (value: SpriteFrame | null) {
        if (this._hoverSprite === value) {
            return;
        }

        this._hoverSprite = value;
        this._updateState();
    }

    /**
     * @en
     * Disabled state sprite.
     *
     * @zh
     * ????????????????????????????????? Sprite???
     */
    @type(SpriteFrame)
    @tooltip('i18n:button.disabled_sprite')
    get disabledSprite () {
        return this._disabledSprite;
    }

    set disabledSprite (value: SpriteFrame | null) {
        if (this._disabledSprite === value) {
            return;
        }

        this._disabledSprite = value;
        this._updateState();
    }

    public static Transition = Transition;
    public static EventType = EventType;
    /**
     * @en
     * If Button is clicked, it will trigger event's handler.
     *
     * @zh
     * ??????????????????????????????
     */
    @type([ComponentEventHandler])
    @serializable
    @displayOrder(20)
    @tooltip('i18n:button.click_events')
    public clickEvents: ComponentEventHandler[] = [];
    @serializable
    protected _interactable = true;
    @serializable
    protected _transition = Transition.NONE;
    @serializable
    protected _normalColor: Color = Color.WHITE.clone();
    @serializable
    protected _hoverColor: Color = new Color(211, 211, 211, 255);
    @serializable
    protected _pressedColor: Color = Color.WHITE.clone();
    @serializable
    protected _disabledColor: Color = new Color(124, 124, 124, 255);
    @serializable
    protected _normalSprite: SpriteFrame | null = null;
    @serializable
    protected _hoverSprite: SpriteFrame | null = null;
    @serializable
    protected _pressedSprite: SpriteFrame | null = null;
    @serializable
    protected _disabledSprite: SpriteFrame | null = null;
    @serializable
    protected _duration = 0.1;
    @serializable
    protected _zoomScale = 1.2;
    @serializable
    protected _target: Node | null = null;
    private _pressed = false;
    private _hovered = false;
    private _fromColor: Color = new Color();
    private _toColor: Color = new Color();
    private _time = 0;
    private _transitionFinished = true;
    private _fromScale: Vec3 = new Vec3();
    private _toScale: Vec3 = new Vec3();
    private _originalScale: Vec3 | null = null;
    private _sprite: Sprite | null = null;
    private _targetScale: Vec3 = new Vec3();

    public __preload () {
        if (!this.target) {
            this.target = this.node;
        }

        const sprite = this.node.getComponent(Sprite);
        if (sprite) {
            this._normalSprite = sprite.spriteFrame;
        }

        this._applyTarget();
        this._resetState();
    }

    public onEnable () {
        // check sprite frames
        //
        if (!EDITOR || legacyCC.GAME_VIEW) {
            this._registerNodeEvent();
        } else {
            this.node.on(Sprite.EventType.SPRITE_FRAME_CHANGED, (comp: Sprite) => {
                if (this._transition === Transition.SPRITE) {
                    this._setCurrentStateSpriteFrame(comp.spriteFrame);
                } else {
                    // avoid serialization data loss when in no-sprite mode
                    this._normalSprite = null;
                    this._hoverSprite = null;
                    this._pressedSprite = null;
                    this._disabledSprite = null;
                }
            }, this);
        }
    }

    public onDisable () {
        this._resetState();

        if (!EDITOR || legacyCC.GAME_VIEW) {
            this._unregisterNodeEvent();
        } else {
            this.node.off(Sprite.EventType.SPRITE_FRAME_CHANGED);
        }
    }

    public update (dt: number) {
        const target = this.target;
        if (this._transitionFinished || !target) {
            return;
        }

        if (this._transition !== Transition.COLOR && this._transition !== Transition.SCALE) {
            return;
        }

        this._time += dt;
        let ratio = 1.0;
        if (this._duration > 0) {
            ratio = this._time / this._duration;
        }

        if (ratio >= 1) {
            ratio = 1;
        }

        if (this._transition === Transition.COLOR) {
            const renderComp = target._uiProps.uiComp as Renderable2D;
            Color.lerp(_tempColor, this._fromColor, this._toColor, ratio);
            if (renderComp) {
                renderComp.color = _tempColor;
            }
        } else if (this.transition === Transition.SCALE) {
            target.getScale(this._targetScale);
            this._targetScale.x = lerp(this._fromScale.x, this._toScale.x, ratio);
            this._targetScale.y = lerp(this._fromScale.y, this._toScale.y, ratio);
            target.setScale(this._targetScale);
        }

        if (ratio === 1) {
            this._transitionFinished = true;
        }
    }

    protected _resizeNodeToTargetNode () {
        if (!this.target) {
            return;
        }
        const targetTrans = this.target._uiProps.uiTransformComp;
        if (EDITOR && targetTrans) {
            this.node._uiProps.uiTransformComp!.setContentSize(targetTrans.contentSize);
        }
    }

    protected _resetState () {
        this._pressed = false;
        this._hovered = false;
        // Restore button status
        const target = this.target;
        if (!target) {
            return;
        }
        const renderComp = target.getComponent(Renderable2D);
        if (!renderComp) {
            return;
        }

        const transition = this._transition;
        if (transition === Transition.COLOR && this._interactable) {
            renderComp.color = this._normalColor;
        } else if (transition === Transition.SCALE && this._originalScale) {
            target.setScale(this._originalScale);
        }
        this._transitionFinished = true;
    }

    protected _registerNodeEvent () {
        this.node.on(SystemEventType.TOUCH_START, this._onTouchBegan, this);
        this.node.on(SystemEventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(SystemEventType.TOUCH_END, this._onTouchEnded, this);
        this.node.on(SystemEventType.TOUCH_CANCEL, this._onTouchCancel, this);

        this.node.on(SystemEventType.MOUSE_ENTER, this._onMouseMoveIn, this);
        this.node.on(SystemEventType.MOUSE_LEAVE, this._onMouseMoveOut, this);
    }

    protected _registerTargetEvent (target) {
        if (EDITOR && !legacyCC.GAME_VIEW) {
            target.on(Sprite.EventType.SPRITE_FRAME_CHANGED, this._onTargetSpriteFrameChanged, this);
            target.on(SystemEventType.COLOR_CHANGED, this._onTargetColorChanged, this);
        }
        target.on(SystemEventType.TRANSFORM_CHANGED, this._onTargetTransformChanged, this);
    }

    protected _unregisterNodeEvent () {
        this.node.off(SystemEventType.TOUCH_START, this._onTouchBegan, this);
        this.node.off(SystemEventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(SystemEventType.TOUCH_END, this._onTouchEnded, this);
        this.node.off(SystemEventType.TOUCH_CANCEL, this._onTouchCancel, this);

        this.node.off(SystemEventType.MOUSE_ENTER, this._onMouseMoveIn, this);
        this.node.off(SystemEventType.MOUSE_LEAVE, this._onMouseMoveOut, this);
    }

    protected _unregisterTargetEvent (target) {
        if (EDITOR && !legacyCC.GAME_VIEW) {
            target.off(Sprite.EventType.SPRITE_FRAME_CHANGED);
            target.off(SystemEventType.COLOR_CHANGED);
        }
        target.off(SystemEventType.TRANSFORM_CHANGED);
    }

    protected _getTargetSprite (target: Node | null) {
        let sprite: Sprite | null = null;
        if (target) {
            sprite = target.getComponent(Sprite);
        }
        return sprite;
    }

    protected _applyTarget () {
        if (this.target) {
            this._sprite = this._getTargetSprite(this.target);
            if (!this._originalScale) {
                this._originalScale = new Vec3();
            }
            Vec3.copy(this._originalScale, this.target.getScale());
        }
    }

    private _onTargetSpriteFrameChanged (comp: Sprite) {
        if (this._transition === Transition.SPRITE) {
            this._setCurrentStateSpriteFrame(comp.spriteFrame);
        }
    }

    private _setCurrentStateSpriteFrame (spriteFrame: SpriteFrame | null) {
        if (!spriteFrame) {
            return;
        }
        switch (this._getButtonState()) {
        case State.NORMAL:
            this._normalSprite = spriteFrame;
            break;
        case State.HOVER:
            this._hoverSprite = spriteFrame;
            break;
        case State.PRESSED:
            this._pressedSprite = spriteFrame;
            break;
        case State.DISABLED:
            this._disabledSprite = spriteFrame;
            break;
        default:
            break;
        }
    }

    private _onTargetColorChanged (color: Color) {
        if (this._transition === Transition.COLOR) {
            this._setCurrentStateColor(color);
        }
    }

    private _setCurrentStateColor (color: Color) {
        switch (this._getButtonState()) {
        case State.NORMAL:
            this._normalColor = color;
            break;
        case State.HOVER:
            this._hoverColor = color;
            break;
        case State.PRESSED:
            this._pressedColor = color;
            break;
        case State.DISABLED:
            this._disabledColor = color;
            break;
        default:
            break;
        }
    }

    private _onTargetTransformChanged (transformBit: TransformBit) {
        // update originalScale
        if (transformBit | TransformBit.SCALE && this._originalScale
            && this._transition === Transition.SCALE && this._transitionFinished) {
            Vec3.copy(this._originalScale, this.target.getScale());
        }
    }

    // touch event handler
    protected _onTouchBegan (event?: EventTouch) {
        if (!this._interactable || !this.enabledInHierarchy) { return; }

        this._pressed = true;
        this._updateState();
        if (event) {
            event.propagationStopped = true;
        }
    }

    protected _onTouchMove (event?: EventTouch) {
        if (!this._interactable || !this.enabledInHierarchy || !this._pressed) { return; }
        // mobile phone will not emit _onMouseMoveOut,
        // so we have to do hit test when touch moving
        if (!event) {
            return;
        }

        const touch = (event).touch;
        if (!touch) {
            return;
        }

        const hit = this.node._uiProps.uiTransformComp!.isHit(touch.getUILocation());

        if (this._transition === Transition.SCALE && this.target && this._originalScale) {
            if (hit) {
                Vec3.copy(this._fromScale, this._originalScale);
                Vec3.multiplyScalar(this._toScale, this._originalScale, this._zoomScale);
                this._transitionFinished = false;
            } else {
                this._time = 0;
                this._transitionFinished = true;
                this.target.setScale(this._originalScale);
            }
        } else {
            let state;
            if (hit) {
                state = State.PRESSED;
            } else {
                state = State.NORMAL;
            }
            this._applyTransition(state);
        }

        if (event) {
            event.propagationStopped = true;
        }
    }

    protected _onTouchEnded (event?: EventTouch) {
        if (!this._interactable || !this.enabledInHierarchy) {
            return;
        }

        if (this._pressed) {
            ComponentEventHandler.emitEvents(this.clickEvents, event);
            this.node.emit(EventType.CLICK, this);
        }
        this._pressed = false;
        this._updateState();

        if (event) {
            event.propagationStopped = true;
        }
    }

    protected _onTouchCancel (event?: EventTouch) {
        if (!this._interactable || !this.enabledInHierarchy) { return; }

        this._pressed = false;
        this._updateState();
    }

    protected _onMouseMoveIn (event?: EventMouse) {
        if (this._pressed || !this.interactable || !this.enabledInHierarchy) { return; }
        if (this._transition === Transition.SPRITE && !this._hoverSprite) { return; }

        if (!this._hovered) {
            this._hovered = true;
            this._updateState();
        }
    }

    protected _onMouseMoveOut (event?: EventMouse) {
        if (this._hovered) {
            this._hovered = false;
            this._updateState();
        }
    }

    // state handler
    protected _updateState () {
        const state = this._getButtonState();
        this._applyTransition(state);
    }

    protected _getButtonState () {
        let state = State.NORMAL;
        if (!this._interactable) {
            state = State.DISABLED;
        } else if (this._pressed) {
            state = State.PRESSED;
        } else if (this._hovered) {
            state = State.HOVER;
        }
        return state.toString();
    }

    protected _updateColorTransition (state: string) {
        const color = this[`${state}Color`];

        const renderComp = this.target?.getComponent(Renderable2D);
        if (!renderComp) {
            return;
        }

        if (EDITOR || state === State.DISABLED) {
            renderComp.color = color;
        } else {
            this._fromColor = renderComp.color.clone();
            this._toColor = color;
            this._time = 0;
            this._transitionFinished = false;
        }
    }

    protected _updateSpriteTransition (state: string) {
        const sprite = this[`${state}Sprite`];
        if (this._sprite && sprite) {
            this._sprite.spriteFrame = sprite;
        }
    }

    protected _updateScaleTransition (state: string) {
        if (!this._interactable) {
            return;
        }

        if (state === State.PRESSED) {
            this._zoomUp();
        } else {
            this._zoomBack();
        }
    }

    protected _zoomUp () {
        // skip before __preload()
        if (!this._originalScale) {
            return;
        }
        Vec3.copy(this._fromScale, this._originalScale);
        Vec3.multiplyScalar(this._toScale, this._originalScale, this._zoomScale);
        this._time = 0;
        this._transitionFinished = false;
    }

    protected _zoomBack () {
        if (!this.target || !this._originalScale) {
            return;
        }
        Vec3.copy(this._fromScale, this.target.getScale());
        Vec3.copy(this._toScale, this._originalScale);
        this._time = 0;
        this._transitionFinished = false;
    }

    protected _applyTransition (state: string) {
        const transition = this._transition;
        if (transition === Transition.COLOR) {
            this._updateColorTransition(state);
        } else if (transition === Transition.SPRITE) {
            this._updateSpriteTransition(state);
        } else if (transition === Transition.SCALE) {
            this._updateScaleTransition(state);
        }
    }
}
