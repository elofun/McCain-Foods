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
 * @module ui
 */

import { ccclass, help, executionOrder, menu, tooltip, type, slide, range, visible, override, serializable, editable } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { EventHandler as ComponentEventHandler } from '../core/components';
import { EventTouch, SystemEventType } from '../core/platform';
import { Vec2, Vec3 } from '../core/math';
import { ccenum } from '../core/value-types/enum';
import { Layout } from './layout';
import { PageViewIndicator } from './page-view-indicator';
import { ScrollView, EventType as ScrollEventType } from './scroll-view';
import { ScrollBar } from './scroll-bar';
import { warnID, logID } from '../core/platform/debug';
import { extendsEnum } from '../core/data/utils/extends-enum';
import { Node } from '../core/scene-graph';
import { legacyCC } from '../core/global-exports';

const _tempVec2 = new Vec2();

/**
 * @en Enum for Page View Size Mode.
 *
 * @zh ?????????????????????????????????????????????
 */
enum SizeMode {
    /**
     * @en Each page is unified in size
     * @zh ????????????????????????
     */
    Unified = 0,
    /**
     * @en Each page is in free size
     * @zh ????????????????????????
     */
    Free = 1,
}

ccenum(SizeMode);

/**
 * @en Enum for Page View Direction.
 *
 * @zh ????????????????????????
 */
enum Direction {
    /**
     * @en Horizontal scroll.
     * @zh ????????????
     */
    Horizontal = 0,
    /**
     * @en Vertical scroll.
     * @zh ????????????
     */
    Vertical = 1,
}

ccenum(Direction);

/**
 * @en Enum for ScrollView event type.
 *
 * @zh ????????????????????????
 */
enum EventType {
    PAGE_TURNING = 'page-turning',
}

/**
 * @en
 * The PageView control.
 *
 * @zh
 * ??????????????????
 */
@ccclass('cc.PageView')
@help('i18n:cc.PageView')
@executionOrder(110)
@menu('UI/PageView')
export class PageView extends ScrollView {
    /**
     * @en
     * Specify the size type of each page in PageView.
     *
     * @zh
     * ???????????????????????????????????????
     */
    @type(SizeMode)
    @tooltip('i18n:pageview.sizeMode')
    get sizeMode () {
        return this._sizeMode;
    }

    set sizeMode (value) {
        if (this._sizeMode === value) {
            return;
        }

        this._sizeMode = value;
        this._syncSizeMode();
    }

    /**
     * @en
     * The page view direction.
     *
     * @zh
     * ????????????????????????
     */
    @type(Direction)
    @tooltip('i18n:pageview.direction')
    get direction () {
        return this._direction;
    }

    set direction (value) {
        if (this._direction === value) {
            return;
        }

        this._direction = value;
        this._syncScrollDirection();
    }

    /**
     * @en
     * The scroll threshold value, when drag exceeds this value,
     * release the next page will automatically scroll, less than the restore.
     *
     * @zh
     * ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
     */
    @slide
    @range([0, 1, 0.01])
    @tooltip('i18n:pageview.scrollThreshold')
    get scrollThreshold () {
        return this._scrollThreshold;
    }

    set scrollThreshold (value) {
        if (this._scrollThreshold === value) {
            return;
        }

        this._scrollThreshold = value;
    }

    /**
     * @en
     * Change the PageTurning event timing of PageView.
     *
     * @zh
     * ?????? PageView PageTurning ????????????????????????
     */
    @slide
    @range([0, 1, 0.01])
    @tooltip('i18n:pageview.pageTurningEventTiming')
    get pageTurningEventTiming () {
        return this._pageTurningEventTiming;
    }

    set pageTurningEventTiming (value) {
        if (this._pageTurningEventTiming === value) {
            return;
        }

        this._pageTurningEventTiming = value;
    }

    /**
     * @en
     * The Page View Indicator.
     *
     * @zh
     * ???????????????????????????
     */
    @type(PageViewIndicator)
    @tooltip('i18n:pageview.indicator')
    get indicator () {
        return this._indicator;
    }

    set indicator (value) {
        if (this._indicator === value) {
            return;
        }

        this._indicator = value;
        if (this.indicator) {
            this.indicator.setPageView(this);
        }
    }

    get curPageIdx () {
        return this._curPageIdx;
    }

    public static SizeMode = SizeMode;
    public static Direction = Direction;
    public static EventType = extendsEnum(EventType, ScrollEventType);

    /**
     * @en
     * Auto page turning velocity threshold. When users swipe the PageView quickly,
     * it will calculate a velocity based on the scroll distance and time,
     * if the calculated velocity is larger than the threshold, then it will trigger page turning.
     *
     * @zh
     * ??????????????????????????????
     * ??????????????????????????????????????????????????????????????????????????????????????????????????????
     * ?????????????????????????????????????????????????????????????????????????????????
     */
    @serializable
    @tooltip('i18n:pageview.autoPageTurningThreshold')
    public autoPageTurningThreshold = 100;

    @type(ScrollBar)
    @override
    @visible(false)
    get verticalScrollBar () {
        return super.verticalScrollBar;
    }

    set verticalScrollBar (value) {
        super.verticalScrollBar = value;
    }

    @type(ScrollBar)
    @override
    @visible(false)
    get horizontalScrollBar () {
        return super.horizontalScrollBar;
    }

    set horizontalScrollBar (value) {
        super.horizontalScrollBar = value;
    }

    @override
    @serializable
    @visible(false)
    public horizontal = true;

    @override
    @serializable
    @visible(false)
    public vertical = true;

    @override
    @serializable
    @visible(false)
    public cancelInnerEvents = true;

    @type([ComponentEventHandler])
    @serializable
    @override
    @visible(false)
    public scrollEvents: ComponentEventHandler[] = [];

    /**
     * @en The time required to turn over a page. unit: second
     * @zh ????????????????????????????????????????????????
     */
    @serializable
    @editable
    public pageTurningSpeed = 0.3;

    /**
     * @en PageView events callback
     * @zh ?????????????????????????????????
     */
    @type([ComponentEventHandler])
    @serializable
    @tooltip('i18n:pageview.pageEvents')
    public pageEvents: ComponentEventHandler[] = [];

    @serializable
    protected _sizeMode = SizeMode.Unified;
    @serializable
    protected _direction = Direction.Horizontal;
    @serializable
    protected _scrollThreshold = 0.5;
    @serializable
    protected _pageTurningEventTiming = 0.1;
    @serializable
    protected _indicator: PageViewIndicator | null = null;

    protected _curPageIdx = 0;
    protected _lastPageIdx = 0;
    protected _pages: Node[] = [];
    protected _initContentPos = new Vec3();
    protected _scrollCenterOffsetX: number[] = []; // ?????????????????????????????????????????????X???
    protected _scrollCenterOffsetY: number[] = []; // ?????????????????????????????????????????????Y???
    protected _touchBeganPosition = new Vec2();
    protected _touchEndPosition = new Vec2();

    public onEnable () {
        super.onEnable();
        this.node.on(SystemEventType.SIZE_CHANGED, this._updateAllPagesSize, this);
        if (!EDITOR || legacyCC.GAME_VIEW) {
            this.node.on(PageView.EventType.SCROLL_ENG_WITH_THRESHOLD, this._dispatchPageTurningEvent, this);
        }
    }

    public onDisable () {
        super.onDisable();
        this.node.off(SystemEventType.SIZE_CHANGED, this._updateAllPagesSize, this);
        if (!EDITOR || legacyCC.GAME_VIEW) {
            this.node.off(PageView.EventType.SCROLL_ENG_WITH_THRESHOLD, this._dispatchPageTurningEvent, this);
        }
    }

    public onLoad () {
        this._initPages();
        if (this.indicator) {
            this.indicator.setPageView(this);
        }
    }

    /**
     * @en
     * Returns current page index.
     *
     * @zh
     * ???????????????????????????
     *
     * @returns ?????????????????????
     */
    public getCurrentPageIndex () {
        return this._curPageIdx;
    }

    /**
     * @en
     * Set current page index.
     *
     * @zh
     * ???????????????????????????
     * @param index ?????????
     */
    public setCurrentPageIndex (index: number) {
        this.scrollToPage(index, 1);
    }

    /**
     * @en
     * Returns all pages of pageview.
     *
     * @zh
     * ?????????????????????????????????
     *
     * @returns ???=?????????????????????
     */
    public getPages () {
        return this._pages;
    }

    /**
     * @en
     * At the end of the current page view to insert a new view.
     *
     * @zh
     * ??????????????????????????????????????????????????????
     *
     * @param page ????????????
     */
    public addPage (page: Node) {
        if (!page || this._pages.indexOf(page) !== -1 || !this.content) {
            return;
        }
        if (!page._uiProps.uiTransformComp) {
            logID(4301);
            return;
        }
        this.content.addChild(page);
        this._pages.push(page);
        this._updatePageView();
    }

    /**
     * @en
     * Inserts a page in the specified location.
     *
     * @zh
     * ?????????????????????????????????
     *
     * @param page ????????????
     * @param index ???????????????
     */
    public insertPage (page: Node, index: number) {
        if (index < 0 || !page || this._pages.indexOf(page) !== -1 || !this.content) {
            return;
        }
        const pageCount = this._pages.length;
        if (index >= pageCount) {
            this.addPage(page);
        } else {
            if (!page._uiProps.uiTransformComp) {
                logID(4301);
                return;
            }
            this._pages.splice(index, 0, page);
            this.content.insertChild(page, index);
            this._updatePageView();
        }
    }

    /**
     * @en
     * Removes a page from PageView.
     *
     * @zh
     * ?????????????????????
     *
     * @param page ???????????????
     */
    public removePage (page: Node) {
        if (!page || !this.content) { return; }
        const index = this._pages.indexOf(page);
        if (index === -1) {
            warnID(4300, page.name);
            return;
        }
        this.removePageAtIndex(index);
    }

    /**
     * @en
     * Removes a page at index of PageView.
     *
     * @zh
     * ??????????????????????????????
     *
     * @param index ???????????????
     */
    public removePageAtIndex (index: number) {
        const pageList = this._pages;
        if (index < 0 || index >= pageList.length) { return; }
        const page = pageList[index];
        if (!page || !this.content) { return; }
        this.content.removeChild(page);
        pageList.splice(index, 1);
        this._updatePageView();
    }

    /**
     * @en
     * Removes all pages from PageView.
     *
     * @zh
     * ?????????????????????
     */
    public removeAllPages () {
        if (!this.content) { return; }
        const locPages = this._pages;
        for (let i = 0, len = locPages.length; i < len; i++) {
            this.content.removeChild(locPages[i]);
        }
        this._pages.length = 0;
        this._updatePageView();
    }

    /**
     * @en
     * Scroll PageView to index.
     *
     * @zh
     * ?????????????????????
     *
     * @param idx index of page.
     * @param timeInSecond scrolling time.
     */
    public scrollToPage (idx: number, timeInSecond = 0.3) {
        if (idx < 0 || idx >= this._pages.length) {
            return;
        }

        this._curPageIdx = idx;
        this.scrollToOffset(this._moveOffsetValue(idx), timeInSecond, true);
        if (this.indicator) {
            this.indicator._changedState();
        }
    }

    // override the method of ScrollView
    public getScrollEndedEventTiming () {
        return this.pageTurningEventTiming;
    }

    // ??????????????????
    protected _updatePageView () {
        // ?????????????????????????????? content ??????
        if (!this.content) {
            return;
        }
        const layout = this.content.getComponent(Layout);
        if (layout && layout.enabled) {
            layout.updateLayout();
        }

        const pageCount = this._pages.length;
        if (this._curPageIdx >= pageCount) {
            this._curPageIdx = pageCount === 0 ? 0 : pageCount - 1;
            this._lastPageIdx = this._curPageIdx;
        }
        // ????????????
        const contentPos = this._initContentPos;
        for (let i = 0; i < pageCount; ++i) {
            const page = this._pages[i];
            // page.setSiblingIndex(i);
            const pos = page.position;
            if (this.direction === Direction.Horizontal) {
                this._scrollCenterOffsetX[i] = Math.abs(contentPos.x + pos.x);
            } else {
                this._scrollCenterOffsetY[i] = Math.abs(contentPos.y + pos.y);
            }
        }

        // ?????? indicator ???????????????
        if (this.indicator) {
            this.indicator._refresh();
        }
    }

    // ???????????????????????????
    protected _updateAllPagesSize () {
        const viewTrans = this.view;
        if (!this.content || !viewTrans) {
            return;
        }

        if (this._sizeMode !== SizeMode.Unified) {
            return;
        }
        const locPages = (EDITOR && !legacyCC.GAME_VIEW) ? this.content.children : this._pages;
        const selfSize = viewTrans.contentSize;
        for (let i = 0, len = locPages.length; i < len; i++) {
            locPages[i]._uiProps.uiTransformComp!.setContentSize(selfSize);
        }
    }

    protected _handleReleaseLogic () {
        this._autoScrollToPage();
        if (this._scrolling) {
            this._scrolling = false;
            if (!this._autoScrolling) {
                this._dispatchEvent(PageView.EventType.SCROLL_ENDED);
            }
        }
    }

    protected _onTouchBegan (event: EventTouch, captureListeners: any) {
        event.touch!.getUILocation(_tempVec2);
        Vec2.set(this._touchBeganPosition, _tempVec2.x, _tempVec2.y);
        super._onTouchBegan(event, captureListeners);
    }

    protected _onTouchMoved (event: EventTouch, captureListeners: any) {
        super._onTouchMoved(event, captureListeners);
    }

    protected _onTouchEnded (event: EventTouch, captureListeners: any) {
        event.touch!.getUILocation(_tempVec2);
        Vec2.set(this._touchEndPosition, _tempVec2.x, _tempVec2.y);
        super._onTouchEnded(event, captureListeners);
    }

    protected _onTouchCancelled (event: EventTouch, captureListeners: any) {
        event.touch!.getUILocation(_tempVec2);
        Vec2.set(this._touchEndPosition, _tempVec2.x, _tempVec2.y);
        super._onTouchCancelled(event, captureListeners);
    }

    protected _onMouseWheel () { }

    protected _syncScrollDirection () {
        this.horizontal = this.direction === Direction.Horizontal;
        this.vertical = this.direction === Direction.Vertical;
    }

    protected _syncSizeMode () {
        const viewTrans = this.view;
        if (!this.content || !viewTrans) { return; }
        const layout = this.content.getComponent(Layout);
        if (layout) {
            if (this._sizeMode === SizeMode.Free && this._pages.length > 0) {
                const firstPageTrans = this._pages[0]._uiProps.uiTransformComp!;
                const lastPageTrans = this._pages[this._pages.length - 1]._uiProps.uiTransformComp!;
                if (this.direction === Direction.Horizontal) {
                    layout.paddingLeft = (viewTrans.width - firstPageTrans.width) / 2;
                    layout.paddingRight = (viewTrans.width - lastPageTrans.width) / 2;
                } else if (this.direction === Direction.Vertical) {
                    layout.paddingTop = (viewTrans.height - firstPageTrans.height) / 2;
                    layout.paddingBottom = (viewTrans.height - lastPageTrans.height) / 2;
                }
            }
            layout.updateLayout();
        }
    }

    // ???????????????
    protected _initPages () {
        if (!this.content) { return; }
        this._initContentPos = this.content.position;
        const children = this.content.children;
        for (let i = 0; i < children.length; ++i) {
            const page = children[i];
            if (this._pages.indexOf(page) >= 0) { continue; }
            this._pages.push(page);
        }
        this._syncScrollDirection();
        this._syncSizeMode();
        this._updatePageView();
    }

    protected _dispatchPageTurningEvent () {
        if (this._lastPageIdx === this._curPageIdx) { return; }
        this._lastPageIdx = this._curPageIdx;
        ComponentEventHandler.emitEvents(this.pageEvents, this, EventType.PAGE_TURNING);
        this.node.emit(EventType.PAGE_TURNING, this);
    }

    // ????????????
    protected _isQuicklyScrollable (touchMoveVelocity: Vec3) {
        if (this.direction === Direction.Horizontal) {
            if (Math.abs(touchMoveVelocity.x) > this.autoPageTurningThreshold) {
                return true;
            }
        } else if (this.direction === Direction.Vertical) {
            if (Math.abs(touchMoveVelocity.y) > this.autoPageTurningThreshold) {
                return true;
            }
        }
        return false;
    }

    // ?????? idx ?????????????????????
    protected _moveOffsetValue (idx: number) {
        const offset = new Vec2();
        if (this._sizeMode === SizeMode.Free) {
            if (this.direction === Direction.Horizontal) {
                offset.x = this._scrollCenterOffsetX[idx];
            } else if (this.direction === Direction.Vertical) {
                offset.y = this._scrollCenterOffsetY[idx];
            }
        } else {
            const viewTrans = this.view;
            if (!viewTrans) {
                return offset;
            }
            if (this.direction === Direction.Horizontal) {
                offset.x = idx * viewTrans.width;
            } else if (this.direction === Direction.Vertical) {
                offset.y = idx * viewTrans.height;
            }
        }
        return offset;
    }

    protected _getDragDirection (moveOffset: Vec2) {
        if (this._direction === Direction.Horizontal) {
            if (moveOffset.x === 0) {
                return 0;
            }

            return (moveOffset.x > 0 ? 1 : -1);
        } else {
            // ???????????? Y ???????????????????????????????????????????????? 0
            if (moveOffset.y === 0) {
                return 0;
            }

            return (moveOffset.y < 0 ? 1 : -1);
        }
    }

    // ?????????????????????????????????
    protected _isScrollable (offset: Vec2, index: number, nextIndex: number) {
        if (this._sizeMode === SizeMode.Free) {
            let curPageCenter = 0;
            let nextPageCenter = 0;
            if (this.direction === Direction.Horizontal) {
                curPageCenter = this._scrollCenterOffsetX[index];
                nextPageCenter = this._scrollCenterOffsetX[nextIndex];
                return Math.abs(offset.x) >= Math.abs(curPageCenter - nextPageCenter) * this.scrollThreshold;
            } else if (this.direction === Direction.Vertical) {
                curPageCenter = this._scrollCenterOffsetY[index];
                nextPageCenter = this._scrollCenterOffsetY[nextIndex];
                return Math.abs(offset.y) >= Math.abs(curPageCenter - nextPageCenter) * this.scrollThreshold;
            }
        } else {
            const viewTrans = this.view;
            if (!viewTrans) {
                return false;
            }
            if (this.direction === Direction.Horizontal) {
                return Math.abs(offset.x) >= viewTrans.width * this.scrollThreshold;
            } else if (this.direction === Direction.Vertical) {
                return Math.abs(offset.y) >= viewTrans.height * this.scrollThreshold;
            }
        }
        return false;
    }

    protected _autoScrollToPage () {
        const bounceBackStarted = this._startBounceBackIfNeeded();
        if (bounceBackStarted) {
            const bounceBackAmount = this._getHowMuchOutOfBoundary();
            this._clampDelta(bounceBackAmount);
            if (bounceBackAmount.x > 0 || bounceBackAmount.y < 0) {
                this._curPageIdx = this._pages.length === 0 ? 0 : this._pages.length - 1;
            }
            if (bounceBackAmount.x < 0 || bounceBackAmount.y > 0) {
                this._curPageIdx = 0;
            }

            if (this.indicator) {
                this.indicator._changedState();
            }
        } else {
            const moveOffset = new Vec2();
            Vec2.subtract(moveOffset, this._touchBeganPosition, this._touchEndPosition);
            const index = this._curPageIdx;
            const nextIndex = index + this._getDragDirection(moveOffset);
            const timeInSecond = this.pageTurningSpeed * Math.abs(index - nextIndex);
            if (nextIndex < this._pages.length) {
                if (this._isScrollable(moveOffset, index, nextIndex)) {
                    this.scrollToPage(nextIndex, timeInSecond);
                    return;
                } else {
                    const touchMoveVelocity = this._calculateTouchMoveVelocity();
                    if (this._isQuicklyScrollable(touchMoveVelocity)) {
                        this.scrollToPage(nextIndex, timeInSecond);
                        return;
                    }
                }
            }
            this.scrollToPage(index, timeInSecond);
        }
    }
}

/**
 * @en
 * Note: This event is emitted from the node to which the component belongs.
 * @zh
 * ?????????????????????????????????????????? Node ????????????????????????????????? node.on ????????????
 * @event page-turning
 * @param {Event.EventCustom} event
 * @param {PageView} pageView - The PageView component.
 */
