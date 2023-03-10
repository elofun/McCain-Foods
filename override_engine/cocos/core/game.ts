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
 * @module core
 */

import { EDITOR, JSB, PREVIEW, RUNTIME_BASED } from 'internal:constants';
import { system } from 'pal/system';
import { IAssetManagerOptions } from './asset-manager/asset-manager';
import { EventTarget } from './event/event-target';
import * as debug from './platform/debug';
import inputManager from './platform/event-manager/input-manager';
import { Device, DeviceInfo } from './gfx';
import { sys } from './platform/sys';
import { macro } from './platform/macro';
import { ICustomJointTextureLayout } from '../3d/skeletal-animation/skeletal-animation-utils';
import { legacyCC, VERSION } from './global-exports';
import { IPhysicsConfig } from '../physics/framework/physics-config';
import { bindingMappingInfo } from './pipeline/define';
import { SplashScreen } from './splash-screen';
import { RenderPipeline } from './pipeline';
import { Node } from './scene-graph/node';
import { BrowserType } from '../../pal/system/enum-type';

interface ISceneInfo {
    url: string;
    uuid: string;
}

/**
 * @zh
 * ???????????????
 * @en
 * Game configuration.
 */
export interface IGameConfig {
    /**
     * @zh
     * ?????? debug ???????????????????????????????????????????????????
     * @en
     * Set debug mode, only valid in non-browser environment.
     */
    debugMode?: debug.DebugMode;

    /**
     * @zh
     * ??? showFPS ??? true ???????????????????????????????????? fps ??????????????????????????????
     * @en
     * Left bottom corner fps information will show when "showFPS" equals true, otherwise it will be hide.
     */
    showFPS?: boolean;

    /**
     * @zh
     * ??????????????? Chrome DevTools ?????????????????????????????????????????????????????????????????????????????????????????????????????????
     * @en
     * Expose class name to chrome debug tools, the class intantiate performance is a little bit slower when exposed.
     */
    exposeClassName?: boolean;

    /**
     * @zh
     * ????????????????????????????????????????????????FPS?????????????????????????????????????????????
     * @en
     * Set the wanted frame rate for your game, but the real fps depends on your game implementation and the running environment.
     */
    frameRate?: number;

    /**
     * @zh
     * Web ???????????? Canvas Element ID??????????????? web ??????
     * @en
     * Sets the id of your canvas element on the web page, it's useful only on web.
     */
    id?: string | HTMLElement;

    /**
     * @zh
     * ???????????????
     * ???????????????????????????????????? web ??????
     * - 0 - ???????????????????????????
     * - 1 - ???????????? canvas ?????????
     * - 2 - ???????????? WebGL ???????????????????????? Android ???????????????????????????????????????
     * @en
     * Sets the renderer type, only useful on web:
     * - 0 - Automatically chosen by engine.
     * - 1 - Forced to use canvas renderer.
     * - 2 - Forced to use WebGL renderer, but this will be ignored on mobile browsers.
     */
    renderMode?: 0 | 1 | 2;

    /**
     * @zh
     * ???????????????????????????
     * @en
     * Include available scenes in the current bundle.
     */
    scenes?: ISceneInfo[];

    /**
     * For internal use.
     */
    registerSystemEvent?: boolean;

    /**
     * For internal use.
     */
    collisionMatrix?: never[];

    /**
     * For internal use.
     */
    groupList?: any[];

    /**
     * For internal use.
     */
    jsList?: string[];

    /**
     * Render pipeline resources
     */
    renderPipeline?: string;

    /**
     * Asset Manager initialization options
     */
    assetOptions?: IAssetManagerOptions;

    /**
     * GPU instancing options
     */
    customJointTextureLayouts?: ICustomJointTextureLayout[];

    /**
     * Physics system config
     */
    physics?: IPhysicsConfig;
}

/**
 * @en An object to boot the game.
 * @zh ???????????????????????????????????????????????????????????????
 */
export class Game extends EventTarget {
    /**
     * @en Event triggered when game hide to background.<br>
     * Please note that this event is not 100% guaranteed to be fired on Web platform,<br>
     * on native platforms, it corresponds to enter background event, os status bar or notification center may not trigger this event.
     * @zh ???????????????????????????????????????<br>
     * ??????????????? WEB ????????????????????????????????? 100% ??????????????????????????????????????????????????????<br>
     * ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
     * @example
     * ```ts
     * import { game, audioEngine } from 'cc';
     * game.on(Game.EVENT_HIDE, function () {
     *     audioEngine.pauseMusic();
     *     audioEngine.pauseAllEffects();
     * });
     * ```
     */
    public static EVENT_HIDE = 'game_on_hide';

    /**
     * @en Event triggered when game back to foreground<br>
     * Please note that this event is not 100% guaranteed to be fired on Web platform,<br>
     * on native platforms, it corresponds to enter foreground event.
     * @zh ?????????????????????????????????????????????<br>
     * ??????????????? WEB ????????????????????????????????? 100% ??????????????????????????????????????????????????????<br>
     * ??????????????????????????????????????????????????????????????????
     */
    public static readonly EVENT_SHOW: string = 'game_on_show';

    /**
     * @en Event triggered when system in low memory status.<br>
     * This event is only triggered on native iOS/Android platform.
     * @zh ??????????????????????????????????????????<br>
     * ?????????????????? iOS/Android ???????????????
     */
    public static readonly EVENT_LOW_MEMORY: string = 'game_on_low_memory';

    /**
     * @en Event triggered after game inited, at this point all engine objects and game scripts are loaded
     * @zh ????????????????????????????????????????????????????????????????????????????????????
     */
    public static EVENT_GAME_INITED = 'game_inited';

    /**
     * @en Event triggered after engine inited, at this point you will be able to use all engine classes.<br>
     * It was defined as EVENT_RENDERER_INITED in cocos creator v1.x and renamed in v2.0.
     * Since Cocos Creator v3.0, EVENT_RENDERER_INITED is a new event, look up define for details.
     * @zh ????????????????????????????????????????????????????????????????????????????????????<br>
     * ?????? Cocos Creator v1.x ?????????????????? EVENT_RENDERER_INITED?????? v2.0 ????????? EVENT_ENGINE_INITED
     * ?????? Cocos Creator v3.0 ?????? EVENT_RENDERER_INITED ???????????????????????????????????????
     */
    public static EVENT_ENGINE_INITED = 'engine_inited';

    /**
     * @en Event triggered after renderer inited, at this point you will be able to use all gfx renderer feature.<br>
     * @zh ????????????????????????????????????????????????????????? EVENT_ENGINE_INITED ???????????????????????????????????? gfx ???????????????
     */
    public static readonly EVENT_RENDERER_INITED: string = 'renderer_inited';

    /**
     * @en Event triggered when game restart
     * @zh ??????restart??????????????????
     */
    public static EVENT_RESTART = 'game_on_restart';

    /**
     * @en Web Canvas 2d API as renderer backend.
     * @zh ?????? Web Canvas 2d API ????????????????????????
     */
    public static RENDER_TYPE_CANVAS = 0;
    /**
     * @en WebGL API as renderer backend.
     * @zh ?????? WebGL API ????????????????????????
     */
    public static RENDER_TYPE_WEBGL = 1;
    /**
     * @en OpenGL API as renderer backend.
     * @zh ?????? OpenGL API ????????????????????????
     */
    public static RENDER_TYPE_OPENGL = 2;

    /**
     * @en The outer frame of the game canvas; parent of game container.
     * @zh ????????????????????????container ???????????????
     */
    public frame: Record<string, unknown> | null = null;
    /**
     * @en The container of game canvas.
     * @zh ????????????????????????
     */
    public container: HTMLDivElement | null = null;
    /**
     * @en The canvas of the game.
     * @zh ??????????????????
     */
    public canvas: HTMLCanvasElement | null = null;

    /**
     * @en The renderer backend of the game.
     * @zh ???????????????????????????
     */
    public renderType = -1;

    public eventTargetOn = super.on;
    public eventTargetOnce = super.once;

    /**
     * @en
     * The current game configuration,
     * please be noticed any modification directly on this object after the game initialization won't take effect.
     * @zh
     * ?????????????????????
     * ????????????????????????????????????????????????????????????????????????
     */
    public config: NormalizedGameConfig = {} as NormalizedGameConfig;

    /**
     * @en Callback when the scripts of engine have been load.
     * @zh ??????????????????????????????????????????
     * @method onStart
     */
    public onStart: Game.OnStart | null = null;

    /**
     * @en Indicates whether the engine and the renderer has been initialized
     * @zh ??????????????????????????????????????????
     */
    public get inited () {
        return this._inited;
    }

    public get frameTime () {
        return this._frameTime;
    }

    public collisionMatrix = [];
    public groupList: any[] = [];

    public _persistRootNodes = {};

    // states
    public _paused = true; // whether the game is paused
    public _configLoaded = false; // whether config loaded
    public _isCloning = false;    // deserializing or instantiating

    private _inited = false;
    private _engineInited = false; // whether the engine has inited
    private _rendererInitialized = false;
    private _gfxDevice: Device | null = null;

    private _intervalId: number | null = null; // interval target of main

    private declare _lastTime: number;
    private declare _frameTime: number;

    // @Methods

    //  @Game play control

    /**
     * @en Set frame rate of game.
     * @zh ?????????????????????
     */
    public setFrameRate (frameRate: number | string) {
        const config = this.config;
        if (typeof frameRate !== 'number') {
            frameRate = parseInt(frameRate, 10);
            if (Number.isNaN(frameRate)) {
                frameRate = 60;
            }
        }
        config.frameRate = frameRate;
        this._paused = true;
        this._setAnimFrame();
        this._runMainLoop();
    }

    /**
     * @en Get frame rate set for the game, it doesn't represent the real frame rate.
     * @zh ????????????????????????????????????????????????????????????
     * @return frame rate
     */
    public getFrameRate (): number {
        return this.config.frameRate || 0;
    }

    /**
     * @en Run the game frame by frame.
     * @zh ???????????????????????????
     */
    public step () {
        legacyCC.director.mainLoop();
    }

    /**
     * @en Pause the game main loop. This will pause:<br>
     * game logic execution, rendering process, event manager, background music and all audio effects.<br>
     * This is different with `director.pause` which only pause the game logic execution.<br>
     * @zh ??????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? `director.pause` ?????????
     */
    public pause () {
        if (this._paused) { return; }
        this._paused = true;
        // Pause main loop
        if (this._intervalId) {
            window.cAF(this._intervalId);
            this._intervalId = 0;
        }
    }

    /**
     * @en Resume the game from pause. This will resume:<br>
     * game logic execution, rendering process, event manager, background music and all audio effects.<br>
     * @zh ??????????????????????????????????????????????????????????????????????????????????????????????????????
     */
    public resume () {
        if (!this._paused) { return; }
        // Resume main loop
        this._runMainLoop();
    }

    /**
     * @en Check whether the game is paused.
     * @zh ???????????????????????????
     */
    public isPaused (): boolean {
        return this._paused;
    }

    /**
     * @en Restart game.
     * @zh ??????????????????
     */
    public restart (): Promise<void> {
        const afterDrawPromise = new Promise<void>((resolve) => legacyCC.director.once(legacyCC.Director.EVENT_AFTER_DRAW, () => resolve()) as void);
        return afterDrawPromise.then(() => {
            for (const id in this._persistRootNodes) {
                this.removePersistRootNode(this._persistRootNodes[id]);
            }

            // Clear scene
            legacyCC.director.getScene().destroy();
            legacyCC.Object._deferredDestroy();

            legacyCC.director.reset();
            this.pause();
            return this._setRenderPipelineNShowSplash().then(() => {
                this.resume();
                this._safeEmit(Game.EVENT_RESTART);
            });
        });
    }

    /**
     * @en End game, it will close the game window
     * @zh ????????????
     */
    public end () {
        if (this._gfxDevice) {
            this._gfxDevice.destroy();
            this._gfxDevice = null;
        }
        window.close();
    }

    /**
     * @en
     * Register an callback of a specific event type on the game object.<br>
     * This type of event should be triggered via `emit`.<br>
     * @zh
     * ?????? game ???????????????????????????????????????????????????????????? `emit` ?????????<br>
     *
     * @param type - A string representing the event type to listen for.
     * @param callback - The callback that will be invoked when the event is dispatched.<br>
     *                              The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     * @param once - After the first invocation, whether the callback should be unregistered.
     * @return - Just returns the incoming callback so you can save the anonymous function easier.
     */
    public on (type: string, callback: () => void, target?: any, once?: boolean): any {
        // Make sure EVENT_ENGINE_INITED callbacks to be invoked
        if ((this._engineInited && type === Game.EVENT_ENGINE_INITED)
        || (this._inited && type === Game.EVENT_GAME_INITED)
        || (this._rendererInitialized && type === Game.EVENT_RENDERER_INITED)) {
            callback.call(target);
        }
        return this.eventTargetOn(type, callback, target, once);
    }

    /**
     * @en
     * Register an callback of a specific event type on the game object,<br>
     * the callback will remove itself after the first time it is triggered.<br>
     * @zh
     * ?????? game ?????????????????????????????????????????????????????????????????????????????????
     *
     * @param type - A string representing the event type to listen for.
     * @param callback - The callback that will be invoked when the event is dispatched.<br>
     *                              The callback is ignored if it is a duplicate (the callbacks are unique).
     * @param target - The target (this object) to invoke the callback, can be null
     */
    public once (type: string, callback: () => void, target?: any): any {
        // Make sure EVENT_ENGINE_INITED callbacks to be invoked
        if (this._engineInited && type === Game.EVENT_ENGINE_INITED) {
            return callback.call(target);
        }
        return this.eventTargetOnce(type, callback, target);
    }

    /**
     * @en Init game with configuration object.
     * @zh ???????????????????????????????????????
     * @param config - Pass configuration object
     */
    public init (config: IGameConfig) {
        this._initConfig(config);
        // Init assetManager
        if (this.config.assetOptions) {
            legacyCC.assetManager.init(this.config.assetOptions);
        }

        return this._initEngine().then(() => {
            if (!EDITOR) {
                this._initEvents();
            }

            if (legacyCC.director.root.dataPoolManager) {
                legacyCC.director.root.dataPoolManager.jointTexturePool.registerCustomTextureLayouts(config.customJointTextureLayouts);
            }
            return this._engineInited;
        });
    }

    /**
     * @en Run game with configuration object and onStart function.
     * @zh ?????????????????????????????????????????? onStart ????????????
     * @param onStart - function to be executed after game initialized
     */
    public run (onStart?: Game.OnStart): Promise<void>;

    public run (configOrCallback?: Game.OnStart | IGameConfig, onStart?: Game.OnStart) {
        // To compatible with older version,
        // we allow the `run(config, onstart?)` form. But it's deprecated.
        let initPromise: Promise<boolean> | undefined;
        if (typeof configOrCallback !== 'function' && configOrCallback) {
            initPromise = this.init(configOrCallback);
            this.onStart = onStart ?? null;
        } else {
            this.onStart = configOrCallback ?? null;
        }

        return Promise.resolve(initPromise).then(() => {
            // register system events
            if (!EDITOR && game.config.registerSystemEvent) {
                inputManager.registerSystemEvent();
            }

            return this._setRenderPipelineNShowSplash();
        });
    }

    //  @ Persist root node section
    /**
     * @en
     * Add a persistent root node to the game, the persistent node won't be destroyed during scene transition.<br>
     * The target node must be placed in the root level of hierarchy, otherwise this API won't have any effect.
     * @zh
     * ?????????????????????????????????????????????????????????????????????<br>
     * ???????????????????????????????????????????????????????????????
     * @param node - The node to be made persistent
     */
    public addPersistRootNode (node: Node) {
        if (!legacyCC.Node.isNode(node) || !node.uuid) {
            debug.warnID(3800);
            return;
        }
        const id = node.uuid;
        if (!this._persistRootNodes[id]) {
            const scene = legacyCC.director._scene;
            if (legacyCC.isValid(scene)) {
                if (!node.parent) {
                    node.parent = scene;
                } else if (!(node.parent instanceof legacyCC.Scene)) {
                    debug.warnID(3801);
                    return;
                } else if (node.parent !== scene) {
                    debug.warnID(3802);
                    return;
                } else {
                    node._originalSceneId = scene.uuid;
                }
            }
            this._persistRootNodes[id] = node;
            node._persistNode = true;
            legacyCC.assetManager._releaseManager._addPersistNodeRef(node);
        }
    }

    /**
     * @en Remove a persistent root node.
     * @zh ????????????????????????
     * @param node - The node to be removed from persistent node list
     */
    public removePersistRootNode (node: Node) {
        const id = node.uuid || '';
        if (node === this._persistRootNodes[id]) {
            delete this._persistRootNodes[id];
            node._persistNode = false;
            node._originalSceneId = '';
            legacyCC.assetManager._releaseManager._removePersistNodeRef(node);
        }
    }

    /**
     * @en Check whether the node is a persistent root node.
     * @zh ???????????????????????????????????????
     * @param node - The node to be checked
     */
    public isPersistRootNode (node: { _persistNode: any; }): boolean {
        return !!node._persistNode;
    }

    //  @Engine loading

    private _initEngine () {
        this._initDevice();
        return Promise.resolve(legacyCC.director._init()).then(() => {
            // Log engine version
            debug.log(`Cocos Creator v${VERSION}`);
            this.emit(Game.EVENT_ENGINE_INITED);
            this._engineInited = true;
            legacyCC.internal.dynamicAtlasManager.enabled = !macro.CLEANUP_IMAGE_CACHE;
        });
    }

    // @Methods

    //  @Time ticker section
    private _setAnimFrame () {
        this._lastTime = performance.now();
        const frameRate = this.config.frameRate;
        this._frameTime = 1000 / frameRate;
        if (JSB) {
            // @ts-expect-error JSB Call
            jsb.setPreferredFramesPerSecond(frameRate);
            window.rAF = window.requestAnimationFrame;
            window.cAF = window.cancelAnimationFrame;
        } else {
            if (this._intervalId) {
                window.cAF(this._intervalId);
                this._intervalId = 0;
            }

            const rAF = window.requestAnimationFrame = window.requestAnimationFrame
                     || window.webkitRequestAnimationFrame
                     || window.mozRequestAnimationFrame
                     || window.oRequestAnimationFrame
                     || window.msRequestAnimationFrame;
            if (frameRate !== 60 && frameRate !== 30) {
                // @ts-expect-error Compatibility
                window.rAF = rAF ? this._stTimeWithRAF : this._stTime;
                window.cAF = this._ctTime;
            } else {
                window.rAF = rAF || this._stTime;
                window.cAF = window.cancelAnimationFrame
                    || window.cancelRequestAnimationFrame
                    || window.msCancelRequestAnimationFrame
                    || window.mozCancelRequestAnimationFrame
                    || window.oCancelRequestAnimationFrame
                    || window.webkitCancelRequestAnimationFrame
                    || window.msCancelAnimationFrame
                    || window.mozCancelAnimationFrame
                    || window.webkitCancelAnimationFrame
                    || window.ocancelAnimationFrame
                    || this._ctTime;
            }
        }
    }

    private _stTimeWithRAF (callback) {
        const currTime = performance.now();
        const elapseTime = Math.max(0, (currTime - game._lastTime));
        const timeToCall = Math.max(0, game._frameTime - elapseTime);
        const id = window.setTimeout(() => {
            window.requestAnimationFrame(callback);
        }, timeToCall);
        game._lastTime = currTime + timeToCall;
        return id;
    }

    private _stTime (callback: () => void) {
        const currTime = performance.now();
        const elapseTime = Math.max(0, (currTime - game._lastTime));
        const timeToCall = Math.max(0, game._frameTime - elapseTime);
        const id = window.setTimeout(callback, timeToCall);
        game._lastTime = currTime + timeToCall;
        return id;
    }
    private _ctTime (id: number | undefined) {
        window.clearTimeout(id);
    }
    // Run game.
    private _runMainLoop () {
        if (!this._inited || (EDITOR && !legacyCC.GAME_VIEW)) {
            return;
        }
        const config = this.config;
        const director = legacyCC.director;
        const frameRate = config.frameRate;

        debug.setDisplayStats(!!config.showFPS);

        director.startAnimation();

        let callback;
        if (!JSB && !RUNTIME_BASED && frameRate === 30) {
            let skip = true;
            callback = (time: number) => {
                this._intervalId = window.rAF(callback);
                skip = !skip;
                if (skip) {
                    return;
                }
                director.mainLoop(time);
            };
        } else {
            callback = (time: number) => {
                this._intervalId = window.rAF(callback);
                director.mainLoop(time);
            };
        }

        if (this._intervalId) {
            window.cAF(this._intervalId);
            this._intervalId = 0;
        }

        this._intervalId = window.rAF(callback);
        this._paused = false;
    }

    // @Game loading section
    private _initConfig (config: IGameConfig) {
        // Configs adjustment
        if (typeof config.debugMode !== 'number') {
            config.debugMode = debug.DebugMode.NONE;
        }
        config.exposeClassName = !!config.exposeClassName;
        if (typeof config.frameRate !== 'number') {
            config.frameRate = 60;
        }
        const renderMode = config.renderMode;
        if (typeof renderMode !== 'number' || renderMode > 2 || renderMode < 0) {
            config.renderMode = 0;
        }
        if (typeof config.registerSystemEvent !== 'boolean') {
            config.registerSystemEvent = true;
        }
        config.showFPS = !!config.showFPS;

        // Collide Map and Group List
        this.collisionMatrix = config.collisionMatrix || [];
        this.groupList = config.groupList || [];

        debug._resetDebugSetting(config.debugMode);

        this.config = config as NormalizedGameConfig;
        this._configLoaded = true;

        this._setAnimFrame();
    }

    private _determineRenderType () {
        const config = this.config;
        const userRenderMode = parseInt(config.renderMode as any, 10);

        // Determine RenderType
        this.renderType = Game.RENDER_TYPE_CANVAS;
        let supportRender = false;

        if (userRenderMode === 0) {
            if (legacyCC.sys.capabilities.opengl) {
                this.renderType = Game.RENDER_TYPE_WEBGL;
                supportRender = true;
            } else if (legacyCC.sys.capabilities.canvas) {
                this.renderType = Game.RENDER_TYPE_CANVAS;
                supportRender = true;
            }
        } else if (userRenderMode === 1 && legacyCC.sys.capabilities.canvas) {
            this.renderType = Game.RENDER_TYPE_CANVAS;
            supportRender = true;
        } else if (userRenderMode === 2 && legacyCC.sys.capabilities.opengl) {
            this.renderType = Game.RENDER_TYPE_WEBGL;
            supportRender = true;
        }

        if (!supportRender) {
            throw new Error(debug.getError(3820, userRenderMode));
        }
    }

    private _initDevice () {
        // Avoid setup to be called twice.
        if (this._rendererInitialized) { return; }

        this.canvas = (this.config as any).adapter.canvas;
        this.frame = (this.config as any).adapter.frame;
        this.container = (this.config as any).adapter.container;

        this._determineRenderType();

        // WebGL context created successfully
        if (this.renderType === Game.RENDER_TYPE_WEBGL) {
            const ctors: Constructor<Device>[] = [];

            if (JSB && window.gfx) {
                this._gfxDevice = gfx.deviceInstance;
            } else {
                let useWebGL2 = (!!window.WebGL2RenderingContext);
                const userAgent = window.navigator.userAgent.toLowerCase();
                if (userAgent.indexOf('safari') !== -1 && userAgent.indexOf('chrome') === -1
                    || system.browserType === BrowserType.UC // UC browser implementation doesn't conform to WebGL2 standard
                ) {
                    useWebGL2 = false;
                }
                if (useWebGL2 && legacyCC.WebGL2Device) {
                    ctors.push(legacyCC.WebGL2Device);
                }
                if (legacyCC.WebGLDevice) {
                    ctors.push(legacyCC.WebGLDevice);
                }

                const opts = new DeviceInfo(
                    this.canvas as HTMLCanvasElement,
                    EDITOR || macro.ENABLE_WEBGL_ANTIALIAS,
                    false,
                    window.devicePixelRatio,
                    sys.windowPixelResolution.width,
                    sys.windowPixelResolution.height,
                    bindingMappingInfo,
                );
                for (let i = 0; i < ctors.length; i++) {
                    this._gfxDevice = new ctors[i]();
                    if (this._gfxDevice.initialize(opts)) { break; }
                }
            }
        }

        if (!this._gfxDevice) {
            // todo fix here for wechat game
            debug.error('can not support canvas rendering in 3D');
            this.renderType = Game.RENDER_TYPE_CANVAS;
            return;
        }

        this.canvas!.oncontextmenu = () => false;
    }

    private _initEvents () {
        system.onShow(this._onShow.bind(this));
        system.onHide(this._onHide.bind(this));
    }

    private _onHide () {
        this.emit(Game.EVENT_HIDE);
        this.pause();
    }

    private _onShow () {
        this.emit(Game.EVENT_SHOW);
        this.resume();
    }

    private _setRenderPipelineNShowSplash () {
        return Promise.resolve(this._setupRenderPipeline()).then(
            () => Promise.resolve(this._showSplashScreen()).then(
                () => {
                    this._inited = true;
                    this._setAnimFrame();
                    this._runMainLoop();
                    this._safeEmit(Game.EVENT_GAME_INITED);
                    if (this.onStart) {
                        this.onStart();
                    }
                },
            ),
        );
    }

    private _setupRenderPipeline () {
        const { renderPipeline } = this.config;
        if (!renderPipeline) {
            return this._setRenderPipeline();
        }
        return new Promise<RenderPipeline>((resolve, reject) => {
            legacyCC.assetManager.loadAny(renderPipeline, (err, asset) => ((err || !(asset instanceof RenderPipeline))
                ? reject(err)
                : resolve(asset)));
        }).then((asset) => {
            this._setRenderPipeline(asset);
        }).catch((reason) => {
            debug.warn(reason);
            debug.warn(`Failed load render pipeline: ${renderPipeline}, engine failed to initialize, will fallback to default pipeline`);
            this._setRenderPipeline();
        });
    }

    private _showSplashScreen () {
        if (!EDITOR && !PREVIEW && legacyCC.internal.SplashScreen) {
            const splashScreen = legacyCC.internal.SplashScreen.instance as SplashScreen;
            splashScreen.main(legacyCC.director.root);
            return new Promise<void>((resolve) => {
                splashScreen.setOnFinish(() => resolve());
                splashScreen.loadFinish = true;
            });
        }
        return null;
    }

    private _setRenderPipeline (rppl?: RenderPipeline) {
        if (!legacyCC.director.root.setRenderPipeline(rppl)) {
            this._setRenderPipeline();
        }

        this._rendererInitialized = true;
        this._safeEmit(Game.EVENT_RENDERER_INITED);
    }

    private _safeEmit (event) {
        if (EDITOR) {
            try {
                this.emit(event);
            } catch (e) {
                debug.warn(e);
            }
        } else {
            this.emit(event);
        }
    }
}

export declare namespace Game {
    export type OnStart = () => void;
}

legacyCC.Game = Game;

/**
 * @en
 * This is a Game instance.
 * @zh
 * ???????????? Game ??????????????????????????????????????????????????????????????????????????????
 */
export const game = legacyCC.game = new Game();

type NormalizedGameConfig = IGameConfig & {
    frameRate: NonNullable<IGameConfig['frameRate']>;
};
