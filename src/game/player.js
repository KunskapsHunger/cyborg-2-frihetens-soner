import * as THREE from 'three';
import { STEP_HEIGHT } from '../levels/grid.js';
import { instantiateModel, findPart } from '../engine/assets.js';
import { Humanoid } from './humanoid.js';

// Henrik: third-person movement (relative to the chase camera), crouching,
// running, first-person aiming, noise emission, stats and his segmented model.

const RADIUS = 0.35;
const HEIGHT = 1.8;
const CROUCH_HEIGHT = 1.15;
const GRAVITY = 20;
const NOISY_FLOORS = new Set(['metal_plate', 'sim_noise_floor']);

export const SPEED = { crouch: 1.7, walk: 3.3, run: 5.8, carry: 2.0 };

export class Player {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.crouch = false;
    this.running = false;
    this.aiming = false;
    this.grounded = true;
    this.health = 100;
    this.maxHealth = 100;
    this.energy = 100;
    this.dead = false;
    this.hurtTimer = 0;
    this.stepAccum = 0;
    this.obj = null;
    this.rig = null;
    this.gun = null;
    this.speed = 0;
    this.choke = 0;
    this.carrying = null;
    this.hidden = false;
    this.lockMove = 0;
    this.onStep = null;
    this.onNoise = null;
  }

  /**
   * Load (or switch to) a character model: Henrik ('henrik2') or Enhet Åtta
   * ('atta'). The sequel changes protagonist between chapters.
   */
  async load(scene, model = 'henrik2') {
    if (this.obj && this.model === model) { scene.add(this.obj); return; }
    if (this.obj) this.obj.parent?.remove(this.obj);
    this.model = model;
    this.obj = await instantiateModel(model, { unique: true, hot: true, cut: false });
    this.rig = new Humanoid(this.obj);
    const hand = findPart(this.obj, 'hand_r');
    this.gun = await instantiateModel('pistol2', { hot: false });
    this.gun.rotation.set(0, Math.PI, 0);
    (hand ?? this.obj).add(this.gun);
    this.gun.visible = false;
    scene.add(this.obj);
  }

  attach(scene) {
    if (this.obj && this.obj.parent !== scene) scene.add(this.obj);
  }

  spawn(x, y, z, yaw = 0) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.dead = false;
    this.crouch = false;
    this.carrying = null;
    this.choke = 0;
  }

  get height() { return this.crouch ? CROUCH_HEIGHT : HEIGHT; }

  eye() {
    return new THREE.Vector3(this.pos.x, this.pos.y + (this.crouch ? 1.05 : 1.65), this.pos.z);
  }

  forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  /**
   * @param {object} ctl { move: Vector2 (x right, y forward, camera space), basis, run, crouchToggle, aim, aimYaw }
   */
  update(dt, grid, ctl) {
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.lockMove = Math.max(0, this.lockMove - dt);
    if (this.dead) { this.animate(dt); return; }
    if (ctl.crouchToggle && !this.carrying) this.crouch = !this.crouch;
    if (this.crouch && ctl.run) this.crouch = !this.canStand(grid) ? true : false;
    this.aiming = ctl.aim;
    this.running = ctl.run && !this.crouch && !this.carrying && !this.aiming;

    let wx = 0, wz = 0;
    if (this.lockMove <= 0 && this.choke <= 0) {
      const { forward, right } = ctl.basis;
      wx = forward.x * ctl.move.y + right.x * ctl.move.x;
      wz = forward.y * ctl.move.y + right.y * ctl.move.x;
      const l = Math.hypot(wx, wz);
      if (l > 1) { wx /= l; wz /= l; }
    }
    let target = this.carrying ? SPEED.carry : this.crouch ? SPEED.crouch : this.running ? SPEED.run : SPEED.walk;
    if (this.aiming) target = SPEED.crouch;
    const accel = 14;
    this.vel.x += (wx * target - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (wz * target - this.vel.z) * Math.min(1, accel * dt);

    if (this.aiming && ctl.aimYaw !== undefined) this.yaw = ctl.aimYaw;
    else if (Math.hypot(wx, wz) > 0.1) {
      const want = Math.atan2(-wx, -wz);
      let d = want - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 12);
    }

    const [nx, nz] = grid.collideCircle(this.pos.x + this.vel.x * dt, this.pos.z + this.vel.z * dt, RADIUS, this.pos.y, this.height);
    this.pos.x = nx;
    this.pos.z = nz;
    const floor = grid.floorAt(this.pos.x, this.pos.z, this.pos.y + STEP_HEIGHT);
    if (floor > -Infinity) {
      if (this.pos.y > floor + 0.02) {
        this.vel.y -= GRAVITY * dt;
        this.pos.y = Math.max(floor, this.pos.y + this.vel.y * dt);
      } else {
        this.pos.y += (floor - this.pos.y) * Math.min(1, dt * 16);
        this.vel.y = 0;
      }
    }

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.4) {
      this.stepAccum += this.speed * dt;
      const stride = this.running ? 1.9 : this.crouch ? 1.1 : 1.5;
      if (this.stepAccum > stride) {
        this.stepAccum = 0;
        const cell = grid.cellAt(this.pos.x, this.pos.z);
        this.onStep?.(cell, this);
        const noise = this.running ? 9 : this.crouch ? 0 : 3.2;
        if (noise > 0) this.onNoise?.(this.pos.clone(), noise * (NOISY_FLOORS.has(cell?.ft) ? 1.4 : 1));
      }
    }
    this.animate(dt);
  }

  canStand(grid) {
    return grid.ceilAt(this.pos.x, this.pos.z) > this.pos.y + HEIGHT;
  }

  animate(dt) {
    if (!this.obj) return;
    this.obj.position.copy(this.pos);
    if (!this.dead) this.obj.rotation.set(0, this.yaw + Math.PI, 0, 'YXZ');
    this.gun.visible = this.aiming || this.showGun > 0;
    this.showGun = Math.max(0, (this.showGun ?? 0) - dt);
    this.rig.update(dt, {
      speed: this.speed,
      crouch: this.crouch ? 1 : 0,
      aim: this.aiming || this.showGun > 0 ? 1 : 0,
      choke: this.choke > 0 ? 1 : 0,
      carry: this.carrying ? 1 : 0,
      hurt: this.hurtTimer > 0 ? 1 : 0,
    });
    if (this.dead) {
      this.deathT = Math.min(1, (this.deathT ?? 0) + dt * 2);
      this.obj.rotation.set(-this.deathT * Math.PI / 2, this.yaw + Math.PI, 0, 'YXZ');
      this.obj.position.y = this.pos.y + this.deathT * 0.25;
    }
  }

  damage(amount) {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    this.hurtTimer = 0.35;
    if (this.health <= 0) { this.dead = true; this.deathT = 0; }
  }
}
