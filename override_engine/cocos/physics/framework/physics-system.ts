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
 * @module physics
 */

import { EDITOR } from 'internal:constants';
import { Vec3 } from '../../core/math';
import { IPhysicsWorld, IRaycastOptions } from '../spec/i-physics-world';
import { createPhysicsWorld } from './instance';
import { director, Director } from '../../core/director';
import { System } from '../../core/components';
import { PhysicsMaterial } from './assets/physics-material';
import { RecyclePool, game, Enum } from '../../core';
import { Ray } from '../../core/geometry';
import { PhysicsRayResult } from './physics-ray-result';
import { IPhysicsConfig, ICollisionMatrix } from './physics-config';
import { CollisionMatrix } from './collision-matrix';
import { PhysicsGroup } from './physics-enum';
import { selector } from './physics-selector';
import { legacyCC } from '../../core/global-exports';

legacyCC.internal.PhysicsGroup = PhysicsGroup;

/**
 * @en
 * Physics system.
 * @zh
 * ???????????????
 */
export class PhysicsSystem extends System {
    static get PHYSICS_NONE () {
        return !selector.id;
    }

    static get PHYSICS_BUILTIN () {
        return selector.id === 'builtin';
    }

    static get PHYSICS_CANNON () {
        return selector.id === 'cannon.js';
    }

    static get PHYSICS_AMMO () {
        return selector.id === 'ammo.js';
    }

    static get PHYSICS_PHYSX () {
        return selector.id === 'physx';
    }

    /**
     * @en
     * Gets the ID of the system.
     * @zh
     * ??????????????????ID???
     */
    static readonly ID = 'PHYSICS';

    /**
     * @en
     * Gets the predefined physics groups.
     * @zh
     * ?????????????????????????????????
     */
    static get PhysicsGroup () {
        return PhysicsGroup;
    }

    /**
     * @en
     * Gets the physical system instance.
     * @zh
     * ???????????????????????????
     */
    static get instance (): PhysicsSystem {
        return PhysicsSystem._instance;
    }

    private static readonly _instance: PhysicsSystem;

    /**
     * @en
     * Gets or sets whether the physical system is enabled, which can be used to pause or continue running the physical system.
     * @zh
     * ??????????????????????????????????????????????????????????????????????????????????????????
     */
    get enable (): boolean {
        return this._enable;
    }

    set enable (value: boolean) {
        this._enable = value;
    }

    /**
     * @zh
     * Gets or sets whether the physical system allows automatic sleep, which defaults to true.
     * @zh
     * ??????????????????????????????????????????????????????????????? true???
     */
    get allowSleep (): boolean {
        return this._allowSleep;
    }

    set allowSleep (v: boolean) {
        this._allowSleep = v;
        if (!EDITOR) {
            this.physicsWorld.setAllowSleep(v);
        }
    }

    /**
     * @en
     * Gets or sets the maximum number of simulated substeps per frame.
     * @zh
     * ????????????????????????????????????????????????
     */
    get maxSubSteps () {
        return this._maxSubSteps;
    }

    set maxSubSteps (value: number) {
        this._maxSubSteps = value;
    }

    /**
     * @en
     * Gets or sets the fixed delta time consumed by each simulation step.
     * @zh
     * ???????????????????????????????????????????????????
     */
    get fixedTimeStep () {
        return this._fixedTimeStep;
    }

    set fixedTimeStep (value: number) {
        this._fixedTimeStep = value;
    }

    /**
     * @en
     * Gets or sets the value of gravity in the physical world, which defaults to (0, -10, 0).
     * @zh
     * ?????????????????????????????????????????????????????? (0, -10, 0)???
     */
    get gravity (): Vec3 {
        return this._gravity;
    }

    set gravity (gravity: Vec3) {
        this._gravity.set(gravity);
        if (!EDITOR) {
            this.physicsWorld.setGravity(gravity);
        }
    }

    /**
     * @en
     * Gets or sets the default speed threshold for going to sleep.
     * @zh
     * ??????????????????????????????????????????????????????
     */
    get sleepThreshold (): number {
        return this._sleepThreshold;
    }

    set sleepThreshold (v: number) {
        this._sleepThreshold = v;
    }

    /**
     * @en
     * Turn on or off the automatic simulation.
     * @zh
     * ????????????????????????????????????
     */
    get autoSimulation () {
        return this._autoSimulation;
    }

    set autoSimulation (value: boolean) {
        this._autoSimulation = value;
    }

    /**
     * @en
     * Gets the global default physical material.
     * @zh
     * ????????????????????????????????????
     */
    get defaultMaterial (): PhysicsMaterial {
        return this._material;
    }

    /**
     * @en
     * Gets the wrappered object of the physical world through which you can access the actual underlying object.
     * @zh
     * ???????????????????????????????????????????????????????????????????????????????????????
     */
    readonly physicsWorld: IPhysicsWorld;

    /**
     * @en
     * Gets the raycastClosest test result.
     * @zh
     * ?????? raycastClosest ??????????????????
     */
    readonly raycastClosestResult = new PhysicsRayResult();

    /**
     * @en
     * Gets the raycast test results.
     * @zh
     * ?????? raycast ??????????????????
     */
    readonly raycastResults: PhysicsRayResult[] = [];

    /**
     * @en
     * Gets the collision matrix that used for initialization only.
     * @zh
     * ?????????????????????????????????????????????
     */
    readonly collisionMatrix: ICollisionMatrix = new CollisionMatrix(1) as ICollisionMatrix;

    readonly useNodeChains: boolean;

    private _enable = true;
    private _allowSleep = true;
    private _maxSubSteps = 1;
    private _subStepCount = 0;
    private _fixedTimeStep = 1.0 / 60.0;
    private _autoSimulation = true;
    private _accumulator = 0;
    private _sleepThreshold = 0.1;
    private readonly _gravity = new Vec3(0, -10, 0);
    private readonly _material = new PhysicsMaterial();

    private readonly raycastOptions: IRaycastOptions = {
        group: -1,
        mask: -1,
        queryTrigger: true,
        maxDistance: 10000000,
    }

    private readonly raycastResultPool = new RecyclePool<PhysicsRayResult>(() => new PhysicsRayResult(), 1);

    private constructor () {
        super();
        const config = game.config ? game.config.physics as IPhysicsConfig : null;
        if (config && config.physicsEngine) {
            Vec3.copy(this._gravity, config.gravity);
            this._allowSleep = config.allowSleep;
            this._fixedTimeStep = config.fixedTimeStep;
            this._maxSubSteps = config.maxSubSteps;
            this._sleepThreshold = config.sleepThreshold;
            this.autoSimulation = config.autoSimulation;
            this.useNodeChains = config.useNodeChains;

            if (config.defaultMaterial) {
                this._material.friction = config.defaultMaterial.friction;
                this._material.rollingFriction = config.defaultMaterial.rollingFriction;
                this._material.spinningFriction = config.defaultMaterial.spinningFriction;
                this._material.restitution = config.defaultMaterial.restitution;
            }

            if (config.collisionMatrix) {
                for (const i in config.collisionMatrix) {
                    const key = 1 << parseInt(i);
                    this.collisionMatrix[`${key}`] = config.collisionMatrix[i];
                }
            }
        } else {
            this.useNodeChains = false;
        }
        this._material.on('physics_material_update', this._updateMaterial, this);

        this.physicsWorld = createPhysicsWorld();
        this.physicsWorld.setGravity(this._gravity);
        this.physicsWorld.setAllowSleep(this._allowSleep);
        this.physicsWorld.setDefaultMaterial(this._material);
    }

    /**
     * @en
     * The lifecycle function is automatically executed after all components `update` and `lateUpadte` are executed.
     * @zh
     * ???????????????????????????????????????`update`???`lateUpadte`??????????????????????????????
     * @param deltaTime the time since last frame.
     */
    postUpdate (deltaTime: number) {
        if (EDITOR && !legacyCC.GAME_VIEW && !this._executeInEditMode) {
            return;
        }

        if (!this._enable) {
            this.physicsWorld.syncSceneToPhysics();
            return;
        }

        if (this._autoSimulation) {
            this._subStepCount = 0;
            this._accumulator += deltaTime;
            director.emit(Director.EVENT_BEFORE_PHYSICS);
            while (this._subStepCount < this._maxSubSteps) {
                if (this._accumulator > this._fixedTimeStep) {
                    this.physicsWorld.syncSceneToPhysics();
                    this.physicsWorld.step(this._fixedTimeStep);
                    this._accumulator -= this._fixedTimeStep;
                    this._subStepCount++;
                    this.physicsWorld.emitEvents();
                    // TODO: nesting the dirty flag reset between the syncScenetoPhysics and the simulation to reduce calling syncScenetoPhysics.
                    this.physicsWorld.syncAfterEvents();
                } else {
                    this.physicsWorld.syncSceneToPhysics();
                    break;
                }
            }
            director.emit(Director.EVENT_AFTER_PHYSICS);
        }
    }

    /**
     * @en
     * Reset the accumulator of time to given value.
     * @zh
     * ???????????????????????????????????????
     */
    resetAccumulator (time = 0) {
        this._accumulator = time;
    }

    /**
     * @en
     * Perform simulation steps for the physics world.
     * @zh
     * ????????????????????????????????????
     * @param fixedTimeStep
     */
    step (fixedTimeStep: number, deltaTime?: number, maxSubSteps?: number) {
        this.physicsWorld.step(fixedTimeStep, deltaTime, maxSubSteps);
    }

    /**
     * @en
     * Sync the scene world transform changes to the physics world.
     * @zh
     * ??????????????????????????????????????????????????????
     */
    syncSceneToPhysics () {
        this.physicsWorld.syncSceneToPhysics();
    }

    /**
     * @en
     * Emit trigger and collision events.
     * @zh
     * ??????`trigger`???`collision`?????????
     */
    emitEvents () {
        this.physicsWorld.emitEvents();
    }

    /**
     * @en
     * Collision detect all collider, and record all the detected results, through PhysicsSystem.Instance.RaycastResults access to the results.
     * @zh
     * ???????????????????????????????????????????????????????????????????????? PhysicsSystem.instance.raycastResults ???????????????
     * @param worldRay ??????????????????????????????
     * @param mask ?????????????????? 0xffffffff
     * @param maxDistance ?????????????????????????????? 10000000????????????????????? Infinity ??? Number.MAX_VALUE
     * @param queryTrigger ?????????????????????
     * @return boolean ?????????????????????????????????
     */
    raycast (worldRay: Ray, mask = 0xffffffff, maxDistance = 10000000, queryTrigger = true): boolean {
        this.raycastResultPool.reset();
        this.raycastResults.length = 0;
        this.raycastOptions.mask = mask >>> 0;
        this.raycastOptions.maxDistance = maxDistance;
        this.raycastOptions.queryTrigger = queryTrigger;
        return this.physicsWorld.raycast(worldRay, this.raycastOptions, this.raycastResultPool, this.raycastResults);
    }

    /**
     * @en
     * Collision detect all collider, and record and ray test results with the shortest distance
     * by PhysicsSystem.Instance.RaycastClosestResult access to the results.
     * @zh
     * ????????????????????????????????????????????????????????????????????????????????? PhysicsSystem.instance.raycastClosestResult ???????????????
     * @param worldRay ??????????????????????????????
     * @param mask ?????????????????? 0xffffffff
     * @param maxDistance ?????????????????????????????? 10000000????????????????????? Infinity ??? Number.MAX_VALUE
     * @param queryTrigger ?????????????????????
     * @return boolean ?????????????????????????????????
     */
    raycastClosest (worldRay: Ray, mask = 0xffffffff, maxDistance = 10000000, queryTrigger = true): boolean {
        this.raycastOptions.mask = mask >>> 0;
        this.raycastOptions.maxDistance = maxDistance;
        this.raycastOptions.queryTrigger = queryTrigger;
        return this.physicsWorld.raycastClosest(worldRay, this.raycastOptions, this.raycastClosestResult);
    }

    private _updateMaterial () {
        this.physicsWorld.setDefaultMaterial(this._material);
    }
}

director.once(Director.EVENT_INIT, () => {
    initPhysicsSystem();
});

function initPhysicsSystem () {
    if (!EDITOR) {
        const physics = game.config.physics;
        if (physics) {
            const cg = physics.collisionGroups;
            if (cg instanceof Array) {
                cg.forEach((v) => {
                    PhysicsGroup[v.name] = 1 << v.index;
                });
                Enum.update(PhysicsGroup);
            }
        }
        const oldIns = PhysicsSystem.instance;
        if (oldIns) {
            director.unregisterSystem(oldIns);
            oldIns.physicsWorld.destroy();
        }
        const sys = new legacyCC.PhysicsSystem();
        legacyCC.PhysicsSystem._instance = sys;
        director.registerSystem(PhysicsSystem.ID, sys, 0);
    }
}
