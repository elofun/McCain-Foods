/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

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
 * @module model
 */

import { ccclass, help, executeInEditMode, executionOrder, menu, tooltip, visible, type,
    formerlySerializedAs, serializable, editable, disallowAnimation } from 'cc.decorator';
import { Texture2D } from '../../core/assets';
import { Material } from '../../core/assets/material';
import { Mesh } from '../assets/mesh';
import { Vec4 } from '../../core/math';
import { scene } from '../../core/renderer';
import { MorphModel } from '../models/morph-model';
import { Root } from '../../core/root';
import { TransformBit } from '../../core/scene-graph/node-enum';
import { Enum } from '../../core/value-types';
import { builtinResMgr } from '../../core/builtin';
import { RenderableComponent } from '../../core/components/renderable-component';
import { MorphRenderingInstance } from '../assets/morph';
import { legacyCC } from '../../core/global-exports';
import { assertIsTrue } from '../../core/data/utils/asserts';

/**
 * @en Shadow projection mode.
 * @zh ?????????????????????
 */
const ModelShadowCastingMode = Enum({
    /**
     * @en Disable shadow projection.
     * @zh ??????????????????
     */
    OFF: 0,
    /**
     * @en Enable shadow projection.
     * @zh ?????????????????????
     */
    ON: 1,
});

/**
 * @en Shadow receive mode.
 * @zh ?????????????????????
 */
const ModelShadowReceivingMode = Enum({
    /**
     * @en Disable shadow projection.
     * @zh ??????????????????
     */
    OFF: 0,
    /**
     * @en Enable shadow projection.
     * @zh ?????????????????????
     */
    ON: 1,
});

/**
 * @en model light map settings.
 * @zh ?????????????????????
 */
@ccclass('cc.ModelLightmapSettings')
class ModelLightmapSettings {
    @serializable
    public texture: Texture2D|null = null;
    @serializable
    public uvParam: Vec4 = new Vec4();
    @serializable
    protected _bakeable = false;
    @serializable
    protected _castShadow = false;
    @formerlySerializedAs('_recieveShadow')
    protected _receiveShadow = false;
    @serializable
    protected _lightmapSize = 64;

    /**
     * @en bakeable.
     * @zh ??????????????????
     */
    @editable
    get bakeable () {
        return this._bakeable;
    }

    set bakeable (val) {
        this._bakeable = val;
    }

    /**
     * @en cast shadow.
     * @zh ?????????????????????
     */
    @editable
    get castShadow () {
        return this._castShadow;
    }

    set castShadow (val) {
        this._castShadow = val;
    }

    /**
     * @en receive shadow.
     * @zh ?????????????????????
     */
    @editable
    get receiveShadow () {
        return this._receiveShadow;
    }

    set receiveShadow (val) {
        this._receiveShadow = val;
    }

    /**
     * @en lightmap size.
     * @zh ???????????????
     */
    @editable
    get lightmapSize () {
        return this._lightmapSize;
    }

    set lightmapSize (val) {
        this._lightmapSize = val;
    }
}

/**
 * @en Mesh renderer component
 * @zh ????????????????????????
 */
@ccclass('cc.MeshRenderer')
@help('i18n:cc.MeshRenderer')
@executionOrder(100)
@menu('Mesh/MeshRenderer')
@executeInEditMode
export class MeshRenderer extends RenderableComponent {
    public static ShadowCastingMode = ModelShadowCastingMode;
    public static ShadowReceivingMode = ModelShadowReceivingMode;

    @serializable
    @editable
    @disallowAnimation
    public lightmapSettings = new ModelLightmapSettings();

    @serializable
    protected _mesh: Mesh | null = null;

    @serializable
    protected _shadowCastingMode = ModelShadowCastingMode.OFF;

    @serializable
    protected _shadowReceivingMode = ModelShadowReceivingMode.ON;

    /**
     * @en Shadow projection mode.
     * @zh ?????????????????????
     */
    @type(ModelShadowCastingMode)
    @tooltip('i18n:model.shadow_casting_model')
    @disallowAnimation
    get shadowCastingMode () {
        return this._shadowCastingMode;
    }

    set shadowCastingMode (val) {
        this._shadowCastingMode = val;
        this._updateCastShadow();
    }

    /**
     * @en receive shadow.
     * @zh ?????????????????????
     */
    @type(ModelShadowReceivingMode)
    @tooltip('i18n:model.shadow_receiving_model')
    @disallowAnimation
    get receiveShadow () {
        return this._shadowReceivingMode;
    }

    set receiveShadow (val) {
        this._shadowReceivingMode = val;
        this._updateReceiveShadow();
    }

    /**
     * @en The mesh of the model.
     * @zh ????????????????????????
     */
    @type(Mesh)
    @tooltip('i18n:model.mesh')
    get mesh () {
        return this._mesh;
    }

    set mesh (val) {
        const old = this._mesh;
        this._mesh = val;
        if (this._mesh) { this._mesh.initialize(); }
        this._watchMorphInMesh();
        this._onMeshChanged(old);
        this._updateModels();
        if (this.enabledInHierarchy) {
            this._attachToScene();
        }
        this._updateCastShadow();
        this._updateReceiveShadow();
    }

    get model () {
        return this._model;
    }

    // eslint-disable-next-line func-names
    @visible(function (this: MeshRenderer) {
        return !!(
            this.mesh
            && this.mesh.struct.morph
            && this.mesh.struct.morph.subMeshMorphs.some((subMeshMorph) => !!subMeshMorph)
        );
    })
    @disallowAnimation
    get enableMorph () {
        return this._enableMorph;
    }

    set enableMorph (value) {
        this._enableMorph = value;
    }

    protected _modelType: typeof scene.Model;

    protected _model: scene.Model | null = null;

    private _morphInstance: MorphRenderingInstance | null = null;

    @serializable
    private _enableMorph = true;

    constructor () {
        super();
        this._modelType = scene.Model;
    }

    public onLoad () {
        if (this._mesh) { this._mesh.initialize(); }
        this._watchMorphInMesh();
        this._updateModels();
        this._updateCastShadow();
        this._updateReceiveShadow();
    }

    // Redo, Undo, Prefab restore, etc.
    public onRestore () {
        this._updateModels();
        this._updateCastShadow();
        this._updateReceiveShadow();
    }

    public onEnable () {
        if (!this._model) {
            this._updateModels();
        }
        this._attachToScene();
    }

    public onDisable () {
        if (this._model) {
            this._detachFromScene();
        }
    }

    public onDestroy () {
        if (this._model) {
            legacyCC.director.root.destroyModel(this._model);
            this._model = null;
            this._models.length = 0;
        }
        if (this._morphInstance) {
            this._morphInstance.destroy();
        }
    }

    public setWeights (weights: number[], subMeshIndex: number) {
        if (this._morphInstance) {
            this._morphInstance.setWeights(subMeshIndex, weights);
        }
    }

    public setInstancedAttribute (name: string, value: ArrayLike<number>) {
        if (!this.model) { return; }
        const { attributes, views } = this.model.instancedAttributes;
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i].name === name) {
                views[i].set(value);
                break;
            }
        }
    }

    public _updateLightmap (lightmap: Texture2D|null, uOff: number, vOff: number, uScale: number, vScale: number) {
        this.lightmapSettings.texture = lightmap;
        this.lightmapSettings.uvParam.x = uOff;
        this.lightmapSettings.uvParam.y = vOff;
        this.lightmapSettings.uvParam.z = uScale;
        this.lightmapSettings.uvParam.w = vScale;

        this._onUpdateLightingmap();
    }

    protected _updateModels () {
        if (!this.enabledInHierarchy || !this._mesh) {
            return;
        }

        const model = this._model;
        if (model) {
            model.destroy();
            model.initialize();
            model.node = model.transform = this.node;
        } else {
            this._createModel();
        }

        if (this._model) {
            this._model.createBoundingShape(this._mesh.struct.minPosition, this._mesh.struct.maxPosition);
            this._updateModelParams();
            this._onUpdateLightingmap();
        }
    }

    protected _createModel () {
        const preferMorphOverPlain = !!this._morphInstance;
        // Note we only change to use `MorphModel` if
        // we are required to render morph and the `this._modelType` is exactly the basic `Model`.
        // We do this since the `this._modelType` might be changed in classes derived from `Model`.
        // We shall not overwrite it.
        // Please notice that we do not enforce that
        // derived classes should use a morph-able model type(i.e. model type derived from `MorphModel`).
        // So we should take care of the edge case.
        const modelType = (preferMorphOverPlain && this._modelType === scene.Model) ? MorphModel : this._modelType;
        const model = this._model! = (legacyCC.director.root as Root).createModel(modelType);
        model.visFlags = this.visibility;
        model.node = model.transform = this.node;
        this._models.length = 0;
        this._models.push(this._model);
        if (this._morphInstance && model instanceof MorphModel) {
            model.setMorphRendering(this._morphInstance);
        }
    }

    protected _attachToScene () {
        if (!this.node.scene || !this._model) {
            return;
        }
        const renderScene = this._getRenderScene();
        if (this._model.scene !== null) {
            this._detachFromScene();
        }
        renderScene.addModel(this._model);
    }

    protected _detachFromScene () {
        if (this._model && this._model.scene) {
            this._model.scene.removeModel(this._model);
        }
    }

    protected _updateModelParams () {
        if (!this._mesh || !this._model) { return; }
        this.node.hasChangedFlags |= TransformBit.POSITION;
        this._model.transform.hasChangedFlags |= TransformBit.POSITION;
        this._model.isDynamicBatching = this._isBatchingEnabled();
        const meshCount = this._mesh ? this._mesh.renderingSubMeshes.length : 0;
        const renderingMesh = this._mesh.renderingSubMeshes;
        if (renderingMesh) {
            for (let i = 0; i < meshCount; ++i) {
                let material = this.getRenderMaterial(i);
                if (material && !material.isValid) {
                    material = null;
                }
                const subMeshData = renderingMesh[i];
                if (subMeshData) {
                    this._model.initSubModel(i, subMeshData, material || this._getBuiltinMaterial());
                }
            }
        }
        this._model.enabled = true;
    }

    protected _onUpdateLightingmap () {
        if (this.model !== null) {
            this.model.updateLightingmap(this.lightmapSettings.texture, this.lightmapSettings.uvParam);
        }

        this.setInstancedAttribute('a_lightingMapUVParam', [
            this.lightmapSettings.uvParam.x,
            this.lightmapSettings.uvParam.y,
            this.lightmapSettings.uvParam.z,
            this.lightmapSettings.uvParam.w,
        ]);
    }

    protected _onMaterialModified (idx: number, material: Material | null) {
        if (!this._model || !this._model.inited) { return; }
        this._onRebuildPSO(idx, material || this._getBuiltinMaterial());
    }

    protected _onRebuildPSO (idx: number, material: Material) {
        if (!this._model || !this._model.inited) { return; }
        this._model.isDynamicBatching = this._isBatchingEnabled();
        this._model.setSubModelMaterial(idx, material);
        this._onUpdateLightingmap();
    }

    protected _onMeshChanged (old: Mesh | null) {
    }

    protected _clearMaterials () {
        if (!this._model) { return; }
        const subModels = this._model.subModels;
        for (let i = 0; i < subModels.length; ++i) {
            this._onMaterialModified(i, null);
        }
    }

    protected _getBuiltinMaterial () {
        // classic ugly pink indicating missing material
        return builtinResMgr.get<Material>('missing-material');
    }

    protected _onVisibilityChange (val: number) {
        if (!this._model) { return; }
        this._model.visFlags = val;
    }

    protected _updateCastShadow () {
        if (!this._model) { return; }
        if (this._shadowCastingMode === ModelShadowCastingMode.OFF) {
            this._model.castShadow = false;
        } else {
            assertIsTrue(
                this._shadowCastingMode === ModelShadowCastingMode.ON,
                `ShadowCastingMode ${this._shadowCastingMode} is not supported.`,
            );
            this._model.castShadow = true;
        }
    }

    protected _updateReceiveShadow () {
        if (!this._model) { return; }
        if (this._shadowReceivingMode === ModelShadowReceivingMode.OFF) {
            this._model.receiveShadow = false;
        } else {
            this._model.receiveShadow = true;
        }
    }

    protected _isBatchingEnabled () {
        for (let i = 0; i < this._materials.length; ++i) {
            const mat = this._materials[i];
            if (!mat) { continue; }
            for (let p = 0; p < mat.passes.length; ++p) {
                const pass = mat.passes[p];
                if (pass.batchingScheme) { return true; }
            }
        }
        return false;
    }

    private _watchMorphInMesh () {
        if (this._morphInstance) {
            this._morphInstance.destroy();
            this._morphInstance = null;
        }

        if (!this._enableMorph) {
            return;
        }

        if (!this._mesh
            || !this._mesh.struct.morph
            || !this._mesh.morphRendering) {
            return;
        }

        const { morph } = this._mesh.struct;
        this._morphInstance = this._mesh.morphRendering.createInstance();
        const nSubMeshes = this._mesh.struct.primitives.length;
        for (let iSubMesh = 0; iSubMesh < nSubMeshes; ++iSubMesh) {
            const subMeshMorph = morph.subMeshMorphs[iSubMesh];
            if (!subMeshMorph) {
                continue;
            }
            const initialWeights = subMeshMorph.weights || morph.weights;
            const weights = initialWeights
                ? initialWeights.slice()
                : new Array<number>(subMeshMorph.targets.length).fill(0);
            this._morphInstance.setWeights(iSubMesh, weights);
        }

        if (this._model && this._model instanceof MorphModel) {
            this._model.setMorphRendering(this._morphInstance);
        }
    }

    private _syncMorphWeights (subMeshIndex: number) {
        if (!this._morphInstance) {
            return;
        }
        const subMeshMorphInstance = this._morphInstance[subMeshIndex];
        if (!subMeshMorphInstance || !subMeshMorphInstance.renderResources) {
            return;
        }
        subMeshMorphInstance.renderResources.setWeights(subMeshMorphInstance.weights);
    }
}

export declare namespace MeshRenderer {
    export type ShadowCastingMode = EnumAlias<typeof ModelShadowCastingMode>;
    export type ShadowReceivingMode = EnumAlias<typeof ModelShadowReceivingMode>;
}
