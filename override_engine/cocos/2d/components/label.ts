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

import { ccclass, help, executionOrder, menu, tooltip, displayOrder, visible, multiline, type, serializable, editable } from 'cc.decorator';
import { EDITOR } from 'internal:constants';
import { BitmapFont, Font, SpriteFrame } from '../assets';
import { ImageAsset, Texture2D } from '../../core/assets';
import { ccenum } from '../../core/value-types/enum';
import { Batcher2D } from '../renderer/batcher-2d';
import { FontAtlas } from '../assets/bitmap-font';
import { CanvasPool, ISharedLabelData, LetterRenderTexture } from '../assembler/label/font-utils';
import { InstanceMaterialType, Renderable2D } from '../framework/renderable-2d';
import { TextureBase } from '../../core/assets/texture-base';
import { PixelFormat } from '../../core/assets/asset-enum';

/**
 * @en Enum for horizontal text alignment.
 *
 * @zh ???????????????????????????
 */
export enum HorizontalTextAlignment {
    /**
     * @en Alignment left for text.
     *
     * @zh ????????????
     */
    LEFT = 0,
    /**
     * @en Alignment center for text.
     *
     * @zh ???????????????
     */
    CENTER = 1,
    /**
     * @en Alignment right for text.
     *
     * @zh ????????????
     */
    RIGHT = 2,
}

ccenum(HorizontalTextAlignment);

/**
 * @en Enum for vertical text alignment.
 *
 * @zh ???????????????????????????
 */
export enum VerticalTextAlignment {
    /**
     * @en Alignment top for text.
     *
     * @zh ????????????
     */
    TOP = 0,
    /**
     * @en Alignment center for text.
     *
     * @zh ???????????????
     */
    CENTER = 1,
    /**
     * @en Alignment bottom for text.
     *
     * @zh ????????????
     */
    BOTTOM = 2,
}

ccenum(VerticalTextAlignment);

/**
 * @en Enum for Overflow.
 *
 * @zh ?????????????????????
 */
export enum Overflow {
    /**
     * @en None.
     *
     * @zh ?????????????????????
     */
    NONE = 0,
    /**
     * @en In CLAMP mode, when label content goes out of the bounding box, it will be clipped.
     *
     * @zh CLAMP ????????????????????????????????????????????????????????????????????????
     */
    CLAMP = 1,
    /**
     * @en In SHRINK mode, the font size will change dynamically to adapt the content size.
     * This mode may takes up more CPU resources when the label is refreshed.
     *
     * @zh SHRINK ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? CPU ?????????
     */
    SHRINK = 2,
    /**
     * @en In RESIZE_HEIGHT mode, you can only change the width of label and the height is changed automatically.
     *
     * @zh ??? RESIZE_HEIGHT ?????????????????????????????????????????????????????????????????????
     */
    RESIZE_HEIGHT = 3,
}

ccenum(Overflow);

/**
 * @en Enum for cache mode.
 *
 * @zh ???????????????????????????
 */
export enum CacheMode {
    /**
     * @en Do not do any caching.
     *
     * @zh ?????????????????????
     */
    NONE = 0,
    /**
     * @en In BITMAP mode, cache the label as a static image and add it to the dynamic atlas for batch rendering,
     * and can batching with Sprites using broken images.
     *
     * @zh BITMAP ???????????? label ???????????????????????????????????????????????????????????????????????????????????????????????? Sprite ???????????????
     * ???????????????????????? Chrome ?????????????????????????????????????????????????????????
     */
    BITMAP = 1,
    /**
     * @en In CHAR mode, split text into characters and cache characters into a dynamic atlas which the size of 1024 * 1024.
     *
     * @zh CHAR ????????????????????????????????????????????????????????????????????????????????? 1024 * 1024 ????????????????????????????????????????????????????????????
     * ??????????????????????????????????????????????????????????????? SHRINK ?????????????????????????????????????????????
     */
    CHAR = 2,
}

ccenum(CacheMode);

/**
 * @zh
 * Type ?????????
 */
/**
 * @zh
 * TTF?????????
 */
/**
 * @zh
 * ???????????????
 */
/**
 * @zh
 * ???????????????
 */

/**
 * @en
 * The Label Component.
 *
 * @zh
 * ?????????????????????
 */
@ccclass('cc.Label')
@help('i18n:cc.Label')
@executionOrder(110)
@menu('2D/Label')
export class Label extends Renderable2D {
    /**
     * @en
     * Content string of label.
     *
     * @zh
     * ??????????????????????????????
     */
    @displayOrder(4)
    @tooltip('i18n:label.string')
    @multiline
    get string () {
        return this._string;
    }
    set string (value) {
        value += '';
        if (this._string === value) {
            return;
        }

        this._string = value;
        this.updateRenderData();
    }

    /**
     * @en
     * Horizontal Alignment of label.
     *
     * @zh
     * ????????????????????????????????????
     */
    @type(HorizontalTextAlignment)
    @displayOrder(5)
    @tooltip('i18n:label.horizontal_align')
    get horizontalAlign () {
        return this._horizontalAlign;
    }

    set horizontalAlign (value) {
        if (this._horizontalAlign === value) {
            return;
        }

        this._horizontalAlign = value;
        this.updateRenderData();
    }

    /**
     * @en
     * Vertical Alignment of label.
     *
     * @zh
     * ????????????????????????????????????
     */
    @type(VerticalTextAlignment)
    @displayOrder(6)
    @tooltip('i18n:label.vertical_align')
    get verticalAlign () {
        return this._verticalAlign;
    }

    set verticalAlign (value) {
        if (this._verticalAlign === value) {
            return;
        }

        this._verticalAlign = value;
        this.updateRenderData();
    }

    /**
     * @en
     * The actual rendering font size in shrink mode.
     *
     * @zh
     * SHRINK ????????????????????????????????????????????????
     */
    get actualFontSize () {
        return this._actualFontSize;
    }

    set actualFontSize (value) {
        this._actualFontSize = value;
    }

    /**
     * @en
     * Font size of label.
     *
     * @zh
     * ?????????????????????
     */
    @displayOrder(7)
    @tooltip('i18n:label.font_size')
    get fontSize () {
        return this._fontSize;
    }

    set fontSize (value) {
        if (this._fontSize === value) {
            return;
        }

        this._fontSize = value;
        this.updateRenderData();
    }

    /**
     * @en
     * Font family of label, only take effect when useSystemFont property is true.
     *
     * @zh
     * ??????????????????, ?????? useSystemFont ????????? true ??????????????????
     */
    @displayOrder(8)
    @visible(function (this: Label) { return !this._isSystemFontUsed; })
    @tooltip('i18n:label.font_family')
    get fontFamily () {
        return this._fontFamily;
    }

    set fontFamily (value) {
        if (this._fontFamily === value) {
            return;
        }

        this._fontFamily = value;
        this.updateRenderData();
    }

    /**
     * @en
     * Line Height of label.
     *
     * @zh
     * ???????????????
     */
    @displayOrder(8)
    @tooltip('i18n:label.line_height')
    get lineHeight () {
        return this._lineHeight;
    }
    set lineHeight (value) {
        if (this._lineHeight === value) {
            return;
        }

        this._lineHeight = value;
        this.updateRenderData();
    }

    /**
     * @en
     * Overflow of label.
     *
     * @zh
     * ?????????????????????????????????????????????
     */
    @type(Overflow)
    @displayOrder(9)
    @tooltip('i18n:label.overflow')
    get overflow () {
        return this._overflow;
    }

    set overflow (value) {
        if (this._overflow === value) {
            return;
        }

        this._overflow = value;
        this.updateRenderData();
    }

    /**
     * @en
     * Whether auto wrap label when string width is large than label width.
     *
     * @zh
     * ?????????????????????
     */
    @displayOrder(10)
    @tooltip('i18n:label.wrap')
    get enableWrapText () {
        return this._enableWrapText;
    }
    set enableWrapText (value) {
        if (this._enableWrapText === value) {
            return;
        }

        this._enableWrapText = value;
        this.updateRenderData();
    }

    /**
     * @en
     * The font of label.
     *
     * @zh
     * ???????????????
     */
    @type(Font)
    @displayOrder(11)
    @visible(function (this: Label) { return !this._isSystemFontUsed; })
    @tooltip('i18n:label.font')
    get font () {
        // return this._N$file;
        return this._font;
    }

    set font (value) {
        if (this._font === value) {
            return;
        }

        // if delete the font, we should change isSystemFontUsed to true
        this._isSystemFontUsed = !value;

        if (EDITOR && value) {
            this._userDefinedFont = value;
        }

        // this._N$file = value;
        this._font = value;
        // if (value && this._isSystemFontUsed)
        //     this._isSystemFontUsed = false;

        if (this._renderData) {
            this.destroyRenderData();
            this._renderData = null;
        }

        this._fontAtlas = null;
        this.updateRenderData(true);
    }

    /**
     * @en
     * Whether use system font name or not.
     *
     * @zh
     * ???????????????????????????
     */
    @displayOrder(12)
    @tooltip('i18n:label.system_font')
    get useSystemFont () {
        return this._isSystemFontUsed;
    }

    set useSystemFont (value) {
        if (this._isSystemFontUsed === value) {
            return;
        }

        this.destroyRenderData();
        this._renderData = null;

        if (EDITOR) {
            if (!value && this._isSystemFontUsed && this._userDefinedFont) {
                this.font = this._userDefinedFont;
                this.spacingX = this._spacingX;
                return;
            }
        }

        this._isSystemFontUsed = !!value;
        if (value) {
            this.font = null;
        }
        this._flushAssembler();
        this.updateRenderData();
    }

    /**
     * @en
     * The cache mode of label. This mode only supports system fonts.
     *
     * @zh
     * ??????????????????, ?????????????????????????????????
     */
    @type(CacheMode)
    @displayOrder(13)
    @tooltip('i18n:label.cache_mode')
    get cacheMode () {
        return this._cacheMode;
    }

    set cacheMode (value) {
        if (this._cacheMode === value) {
            return;
        }

        if (this._cacheMode === CacheMode.BITMAP && !(this._font instanceof BitmapFont) && this._ttfSpriteFrame) {
            this._ttfSpriteFrame._resetDynamicAtlasFrame();
        }

        if (this._cacheMode === CacheMode.CHAR) {
            this._ttfSpriteFrame = null;
        }

        this._cacheMode = value;
        this.updateRenderData(true);
    }

    get spriteFrame () {
        return this._texture;
    }

    get ttfSpriteFrame () {
        return this._ttfSpriteFrame;
    }

    /**
     * @en
     * Whether the font is bold.
     *
     * @zh
     * ?????????????????????
     */
    @displayOrder(15)
    @tooltip('i18n:label.font_bold')
    get isBold () {
        return this._isBold;
    }

    set isBold (value) {
        if (this._isBold === value) {
            return;
        }

        this._isBold = value;
        this.updateRenderData();
    }

    /**
     * @en
     * Whether the font is italic.
     *
     * @zh
     * ?????????????????????
     */
    @displayOrder(16)
    @tooltip('i18n:label.font_italic')
    get isItalic () {
        return this._isItalic;
    }

    set isItalic (value) {
        if (this._isItalic === value) {
            return;
        }

        this._isItalic = value;
        this.updateRenderData();
    }

    /**
     * @en
     * Whether the font is underline.
     *
     * @zh
     * ???????????????????????????
     */
    @displayOrder(17)
    @tooltip('i18n:label.font_underline')
    get isUnderline () {
        return this._isUnderline;
    }

    set isUnderline (value) {
        if (this._isUnderline === value) {
            return;
        }

        this._isUnderline = value;
        this.updateRenderData();
    }

    /**
     * @en The height of underline.
     * @zh ??????????????????
     */
    @visible(function (this: Label) { return this._isUnderline; })
    @editable
    public get underlineHeight () {
        return this._underlineHeight;
    }

    public set underlineHeight (value) {
        if (this._underlineHeight === value) return;
        this._underlineHeight = value;
        this.updateRenderData();
    }

    get assemblerData () {
        return this._assemblerData;
    }

    get fontAtlas () {
        return this._fontAtlas;
    }

    set fontAtlas (value) {
        this._fontAtlas = value;
    }

    get spacingX () {
        return this._spacingX;
    }

    set spacingX (value) {
        if (this._spacingX === value) {
            return;
        }

        this._spacingX = value;
        this.updateRenderData();
    }

    get _bmFontOriginalSize () {
        if (this._font instanceof BitmapFont) {
            return this._font.fontSize;
        } else {
            return -1;
        }
    }

    public static HorizontalAlign = HorizontalTextAlignment;
    public static VerticalAlign = VerticalTextAlignment;
    public static Overflow = Overflow;
    public static CacheMode = CacheMode;
    public static _canvasPool = CanvasPool.getInstance();

    @serializable
    protected _string = 'label';
    @serializable
    protected _horizontalAlign = HorizontalTextAlignment.CENTER;
    @serializable
    protected _verticalAlign = VerticalTextAlignment.CENTER;
    @serializable
    protected _actualFontSize = 0;
    @serializable
    protected _fontSize = 40;
    @serializable
    protected _fontFamily = 'Arial';
    @serializable
    protected _lineHeight = 40;
    @serializable
    protected _overflow: Overflow = Overflow.NONE;
    @serializable
    protected _enableWrapText = true;
    @serializable
    protected _font: Font | null = null;
    @serializable
    protected _isSystemFontUsed = true;
    protected _spacingX = 0;
    @serializable
    protected _isItalic = false;
    @serializable
    protected _isBold = false;
    @serializable
    protected _isUnderline = false;
    @serializable
    protected _underlineHeight = 2;
    @serializable
    protected _cacheMode = CacheMode.NONE;

    // don't need serialize
    // ??????????????????????????? file ??????
    protected _N$file: Font | null = null;
    protected _texture: SpriteFrame | LetterRenderTexture | null = null;
    protected _ttfSpriteFrame: SpriteFrame | null = null;
    protected _userDefinedFont: Font | null = null;
    protected _assemblerData: ISharedLabelData | null = null;
    protected _fontAtlas: FontAtlas | null = null;
    protected _letterTexture: LetterRenderTexture | null = null;

    constructor () {
        super();
        if (EDITOR) {
            this._userDefinedFont = null;
        }

        this._ttfSpriteFrame = null;
    }

    public onEnable () {
        super.onEnable();

        // TODO: Hack for barbarians
        if (!this._font && !this._isSystemFontUsed) {
            this.useSystemFont = true;
        }
        // Reapply default font family if necessary
        if (this._isSystemFontUsed && !this._fontFamily) {
            this.fontFamily = 'Arial';
        }

        this.updateRenderData(true);
    }

    public onDisable () {
        super.onDisable();
    }

    public onDestroy () {
        if (this._assembler && this._assembler.resetAssemblerData) {
            this._assembler.resetAssemblerData(this._assemblerData!);
        }

        this._assemblerData = null;
        if (this._ttfSpriteFrame) {
            const tex = this._ttfSpriteFrame.texture;
            if (tex && this._ttfSpriteFrame.original === null) {
                const tex2d = tex as Texture2D;
                if (tex2d.image) {
                    tex2d.image.destroy();
                }
                tex.destroy();
            }
            this._ttfSpriteFrame = null;
        }

        // texture cannot be destroyed in here, lettertexture image source is public.
        this._letterTexture = null;

        super.onDestroy();
    }

    public updateRenderData (force = false) {
        this.markForUpdateRenderData();

        if (force) {
            this._flushAssembler();
            // Hack: Fixed the bug that richText wants to get the label length by _measureText, _assembler.updateRenderData will update the content size immediately.
            if (this.renderData) this.renderData.vertDirty = true;
            this._applyFontTexture();
        }
    }

    protected _render (render: Batcher2D) {
        render.commitComp(this, this._texture, this._assembler!, null);
    }

    protected _updateColor () {
        // hack for all type
        if (this._font instanceof BitmapFont) {
            this._updateWorldAlpha();
            this._colorDirty = false;
        } else {
            this._updateWorldAlpha();
            if (this._colorDirty) {
                this.updateRenderData(false);
                this._colorDirty = false;
            } else if ((this._cacheAlpha !== this.node._uiProps.opacity) && this._renderFlag && this._assembler && this._assembler.updateOpacity) {
                this._assembler.updateOpacity(this);
                this._cacheAlpha = this.node._uiProps.opacity;
            }
        }
    }

    protected _canRender () {
        if (!super._canRender() || !this._string) {
            return false;
        }

        const font = this._font;
        if (font && font instanceof BitmapFont) {
            const spriteFrame = font.spriteFrame;
            // cannot be activated if texture not loaded yet
            if (!spriteFrame || !spriteFrame.textureLoaded()) {
                return false;
            }
        }

        return true;
    }

    protected _flushAssembler () {
        const assembler = Label.Assembler!.getAssembler(this);

        if (this._assembler !== assembler) {
            this.destroyRenderData();
            this._assembler = assembler;
        }

        if (!this._renderData) {
            if (this._assembler && this._assembler.createData) {
                this._renderData = this._assembler.createData(this);
                this._renderData!.material = this.material;
            }
        }
    }

    protected _applyFontTexture () {
        const font = this._font;
        if (font instanceof BitmapFont) {
            const spriteFrame = font.spriteFrame;
            const onBMFontTextureLoaded = () => {
                // TODO: old texture in material have been released by loader
                this._texture = spriteFrame;
                this.changeMaterialForDefine();
                if (this._assembler) {
                    this._assembler.updateRenderData(this);
                }
            };
            // cannot be activated if texture not loaded yet
            if (spriteFrame) {
                if (spriteFrame.loaded || spriteFrame.textureLoaded) {
                    onBMFontTextureLoaded();
                } else {
                    spriteFrame.once('load', onBMFontTextureLoaded, this);
                }
            }
        } else {
            if (this.cacheMode === CacheMode.CHAR) {
                this._letterTexture = this._assembler!.getAssemblerData();
                this._texture = this._letterTexture;
            } else if (!this._ttfSpriteFrame) {
                this._ttfSpriteFrame = new SpriteFrame();
                this._assemblerData = this._assembler!.getAssemblerData();
                const image = new ImageAsset(this._assemblerData!.canvas);
                const tex = image._texture;
                this._ttfSpriteFrame.texture = tex;
            }

            if (this.cacheMode !== CacheMode.CHAR) {
                // this._frame._refreshTexture(this._texture);
                this._texture = this._ttfSpriteFrame;
            }
            this.changeMaterialForDefine();
            this._assembler && this._assembler.updateRenderData(this);
        }
    }

    protected changeMaterialForDefine () {
        if (!this._texture) {
            return;
        }
        let value = false;
        if (this.cacheMode !== CacheMode.CHAR) {
            const spriteFrame = this._texture as SpriteFrame;
            const texture = spriteFrame.texture;
            if (texture instanceof TextureBase) {
                const format = texture.getPixelFormat();
                value = (format === PixelFormat.RGBA_ETC1 || format === PixelFormat.RGB_A_PVRTC_4BPPV1 || format === PixelFormat.RGB_A_PVRTC_2BPPV1);
            }
        }
        if (value) {
            this._instanceMaterialType = InstanceMaterialType.USE_ALPHA_SEPARATED;
        } else {
            this._instanceMaterialType = InstanceMaterialType.ADD_COLOR_AND_TEXTURE;
        }
        this.updateMaterial();
    }
}
