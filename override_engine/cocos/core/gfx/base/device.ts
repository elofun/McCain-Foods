/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

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
 * @module gfx
 */

import { ccenum } from '../../value-types/enum';
import {
    API, Feature, Filter, Format, MemoryStatus, SurfaceTransform, Rect,
    CommandBufferInfo, BufferInfo, BufferViewInfo, TextureInfo, TextureViewInfo, SamplerInfo, DescriptorSetInfo,
    ShaderInfo, InputAssemblerInfo, RenderPassInfo, FramebufferInfo, DescriptorSetLayoutInfo, PipelineLayoutInfo,
    QueueInfo, BufferTextureCopy, DeviceInfo, DeviceCaps, GlobalBarrierInfo, TextureBarrierInfo,
} from './define';
import { Buffer } from './buffer';
import { CommandBuffer } from './command-buffer';
import { DescriptorSet } from './descriptor-set';
import { DescriptorSetLayout } from './descriptor-set-layout';
import { PipelineLayout } from './pipeline-layout';
import { Framebuffer } from './framebuffer';
import { InputAssembler } from './input-assembler';
import { PipelineState, PipelineStateInfo } from './pipeline-state';
import { Queue } from './queue';
import { RenderPass } from './render-pass';
import { Sampler } from './sampler';
import { Shader } from './shader';
import { Texture } from './texture';
import { GlobalBarrier } from './global-barrier';
import { TextureBarrier } from './texture-barrier';

ccenum(Format);

/**
 * @en GFX Device.
 * @zh GFX ?????????
 */
export abstract class Device {
    /**
     * @en The HTML canvas element.
     * @zh HTML ?????????
     */
    get canvas (): HTMLCanvasElement {
        return this._canvas as HTMLCanvasElement;
    }

    /**
     * @en The HTML canvas element for 2D rendering.
     * @zh ?????? 2D ????????? HTML ?????????
     */
    get canvas2D (): HTMLCanvasElement {
        return this._canvas2D as HTMLCanvasElement;
    }

    /**
     * @en Current rendering API.
     * @zh ?????? GFX ??????????????? API???
     */
    get gfxAPI (): API {
        return this._gfxAPI;
    }

    /**
     * @en GFX default queue.
     * @zh GFX ???????????????
     */
    get queue (): Queue {
        return this._queue as Queue;
    }

    /**
     * @en GFX default command buffer.
     * @zh GFX ?????????????????????
     */
    get commandBuffer (): CommandBuffer {
        return this._cmdBuff as CommandBuffer;
    }

    /**
     * @en Device pixel ratio.
     * @zh DPR ??????????????????
     */
    get devicePixelRatio (): number {
        return this._devicePixelRatio;
    }

    /**
     * @en Device pixel width.
     * @zh ?????????????????????
     */
    get width (): number {
        return this._width;
    }

    /**
     * @en Device pixel height.
     * @zh ?????????????????????
     */
    get height (): number {
        return this._height;
    }

    /**
     * @en Device native width.
     * @zh ??????????????????????????????
     */
    get nativeWidth (): number {
        return this._nativeWidth;
    }

    /**
     * @en Device native height.
     * @zh ??????????????????????????????
     */
    get nativeHeight (): number {
        return this._nativeHeight;
    }

    /**
     * @en Renderer description.
     * @zh ??????????????????
     */
    get renderer (): string {
        return this._renderer;
    }

    /**
     * @en Vendor description.
     * @zh ???????????????
     */
    get vendor (): string {
        return this._vendor;
    }

    /**
     * @en Device color format.
     * @zh ???????????????
     */
    get colorFormat (): Format {
        return this._colorFmt;
    }

    /**
     * @en Device depth stencil format.
     * @zh ?????????????????????
     */
    get depthStencilFormat (): Format {
        return this._depthStencilFmt;
    }

    /**
     * @en Number of draw calls currently recorded.
     * @zh ?????????????????????
     */
    get numDrawCalls (): number {
        return this._numDrawCalls;
    }

    /**
     * @en Number of instances currently recorded.
     * @zh ?????? Instance ?????????
     */
    get numInstances (): number {
        return this._numInstances;
    }

    /**
     * @en Number of triangles currently recorded.
     * @zh ????????????????????????
     */
    get numTris (): number {
        return this._numTris;
    }

    /**
     * @en Total memory size currently allocated.
     * @zh ???????????????
     */
    get memoryStatus (): MemoryStatus {
        return this._memoryStatus;
    }

    /**
     * @en Current device capabilities.
     * @zh ???????????????????????????
     */
    get capabilities (): DeviceCaps {
        return this._caps;
    }

    /**
     * @en The surface transform to be applied in projection matrices.
     * @zh ????????????????????????????????????????????????
     */
    get surfaceTransform () {
        return this._transform;
    }

    protected _canvas: HTMLCanvasElement | null = null;
    protected _canvas2D: HTMLCanvasElement | null = null;
    protected _gfxAPI = API.UNKNOWN;
    protected _transform = SurfaceTransform.IDENTITY;
    protected _deviceName = '';
    protected _renderer = '';
    protected _vendor = '';
    protected _version = '';
    protected _features = new Array<boolean>(Feature.COUNT);
    protected _queue: Queue | null = null;
    protected _cmdBuff: CommandBuffer | null = null;
    protected _devicePixelRatio = 1.0;
    protected _width = 0;
    protected _height = 0;
    protected _nativeWidth = 0;
    protected _nativeHeight = 0;
    protected _colorFmt = Format.UNKNOWN;
    protected _depthStencilFmt = Format.UNKNOWN;
    protected _numDrawCalls = 0;
    protected _numInstances = 0;
    protected _numTris = 0;
    protected _memoryStatus = new MemoryStatus();
    protected _caps = new DeviceCaps();

    public abstract initialize (info: DeviceInfo): boolean;

    public abstract destroy (): void;

    /**
     * @en Resize the device.
     * @zh ?????????????????????
     * @param width The device width.
     * @param height The device height.
     */
    public abstract resize (width: number, height: number): void;

    /**
     * @en Acquire next swapchain image.
     * @zh ?????????????????????????????????
     */
    public abstract acquire (): void;

    /**
     * @en Present current swapchain image.
     * @zh ??????????????????????????????
     */
    public abstract present (): void;

    /**
     * @en Flush the specified command buffers.
     * @zh ????????????????????????????????????
     */
    public abstract flushCommands (cmdBuffs: CommandBuffer[]): void;

    /**
     * @en Create command buffer.
     * @zh ?????????????????????
     * @param info GFX command buffer description info.
     */
    public abstract createCommandBuffer (info: CommandBufferInfo): CommandBuffer;

    /**
     * @en Create buffer.
     * @zh ???????????????
     * @param info GFX buffer description info.
     */
    public abstract createBuffer (info: BufferInfo | BufferViewInfo): Buffer;

    /**
     * @en Create texture.
     * @zh ???????????????
     * @param info GFX texture description info.
     */
    public abstract createTexture (info: TextureInfo | TextureViewInfo): Texture;

    /**
     * @en Create sampler.
     * @zh ??????????????????
     * @param info GFX sampler description info.
     */
    public abstract createSampler (info: SamplerInfo): Sampler;

    /**
     * @en Create descriptor sets.
     * @zh ????????????????????????
     * @param info GFX descriptor sets description info.
     */
    public abstract createDescriptorSet (info: DescriptorSetInfo): DescriptorSet;

    /**
     * @en Create shader.
     * @zh ??????????????????
     * @param info GFX shader description info.
     */
    public abstract createShader (info: ShaderInfo): Shader;

    /**
     * @en Create input assembler.
     * @zh ???????????????
     * @param info GFX input assembler description info.
     */
    public abstract createInputAssembler (info: InputAssemblerInfo): InputAssembler;

    /**
     * @en Create render pass.
     * @zh ?????????????????????
     * @param info GFX render pass description info.
     */
    public abstract createRenderPass (info: RenderPassInfo): RenderPass;

    /**
     * @en Create frame buffer.
     * @zh ??????????????????
     * @param info GFX frame buffer description info.
     */
    public abstract createFramebuffer (info: FramebufferInfo): Framebuffer;

    /**
     * @en Create descriptor set layout.
     * @zh ???????????????????????????
     * @param info GFX descriptor set layout description info.
     */
    public abstract createDescriptorSetLayout (info: DescriptorSetLayoutInfo): DescriptorSetLayout;

    /**
     * @en Create pipeline layout.
     * @zh ?????????????????????
     * @param info GFX pipeline layout description info.
     */
    public abstract createPipelineLayout (info: PipelineLayoutInfo): PipelineLayout;

    /**
     * @en Create pipeline state.
     * @zh ?????????????????????
     * @param info GFX pipeline state description info.
     */
    public abstract createPipelineState (info: PipelineStateInfo): PipelineState;

    /**
     * @en Create queue.
     * @zh ???????????????
     * @param info GFX queue description info.
     */
    public abstract createQueue (info: QueueInfo): Queue;

    /**
     * @en Create global barrier.
     * @zh ???????????????????????????
     * @param info GFX global barrier description info.
     */
    public abstract createGlobalBarrier (info: GlobalBarrierInfo): GlobalBarrier;

    /**
     * @en Create texture barrier.
     * @zh ???????????????????????????
     * @param info GFX texture barrier description info.
     */
    public abstract createTextureBarrier (info: TextureBarrierInfo): TextureBarrier;

    /**
     * @en Copy buffers to texture.
     * @zh ????????????????????????
     * @param buffers The buffers to be copied.
     * @param texture The texture to copy to.
     * @param regions The region descriptions.
     */
    public abstract copyBuffersToTexture (buffers: ArrayBufferView[], texture: Texture, regions: BufferTextureCopy[]): void;

    /**
     * @en Copy texture images to texture.
     * @zh ????????????????????????
     * @param texImages The texture to be copied.
     * @param texture The texture to copy to.
     * @param regions The region descriptions.
     */
    public abstract copyTexImagesToTexture (texImages: TexImageSource[], texture: Texture, regions: BufferTextureCopy[]): void;

    /**
     * @en Copy frame buffer to buffer.
     * @zh ???????????????????????????
     * @param srcFramebuffer The frame buffer to be copied.
     * @param dstBuffer The buffer to copy to.
     * @param regions The region descriptions.
     */
    public abstract copyFramebufferToBuffer (srcFramebuffer: Framebuffer, dstBuffer: ArrayBuffer, regions: BufferTextureCopy[]): void;

    /**
     * @en Whether the device has specific feature.
     * @zh ?????????????????????
     * @param feature The GFX feature to be queried.
     */
    public hasFeature (feature: Feature): boolean {
        return this._features[feature];
    }
}
