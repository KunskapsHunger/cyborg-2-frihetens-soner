import * as THREE from 'three';
import { instantiateModel, findPart } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { sightFactor, lightLevelAt, ConeMesh } from './vision.js';

// Security cameras (sweeping, wall-mounted) and patrol drones (hovering,
// looking down). Both raise the alarm on sight and can be disabled by EMP;
// drones can also be shot down.

export class SecurityCamera {
  constructor(def, obj, parent) {
    this.def = def;
    this.obj = obj;
    this.head = findPart(obj, 'head') ?? obj;
    this.lens = findPart(obj, 'lens');
    this.pos = new THREE.Vector3(def.x, def.y ?? 3.2, def.z);
    this.baseYaw = def.rot ?? 0;
    this.sweep = def.sweep ?? 0.8;
    this.speed = def.speed ?? 0.4;
    this.t = Math.random() * 6;
    this.yaw = this.baseYaw;
    this.pitchDown = def.pitch ?? 0.6;
    this.disabled = 0;
    this.awareness = 0;
    this.cone = new ConeMesh(parent, 10);
    this.showCone = true;
    this.lastServo = 0;
  }

  get active() { return this.disabled <= 0 && !this.destroyed; }

  update(dt, ctx) {
    this.disabled = Math.max(0, this.disabled - dt);
    if (!this.active) {
      this.cone.visible = false;
      this.head.rotation.x = 0.9;
      return;
    }
    this.t += dt * this.speed;
    const s = Math.sin(this.t);
    this.yaw = this.baseYaw + s * this.sweep;
    this.head.rotation.set(this.pitchDown * 0.6, s * this.sweep, 0, 'YXZ');
    if (Math.abs(Math.cos(this.t)) < 0.02 && this.t - this.lastServo > 1) {
      this.lastServo = this.t;
      audio.play('camera_servo', { pos: this.pos, volume: 0.35 });
    }
    const eye = this.pos.clone();
    const light = lightLevelAt(ctx.lights, ctx.player.pos, ctx.ambientLight);
    const range = (this.def.range ?? 10) * (ctx.visionMul ?? 1);
    const seen = sightFactor(ctx.grid, eye, this.yaw, this.pitchDown, { half: 0.42, range, near: 0, vHalf: 0.75 }, ctx.player, light);
    if (seen > 0) {
      this.awareness += seen * dt * 2.2;
      if (this.awareness >= 1) {
        if (!ctx.alarm.hunting) audio.play('camera_spot', { pos: this.pos, volume: 1 });
        ctx.alarm.spotted(ctx.player.pos);
      }
    } else {
      this.awareness = Math.max(0, this.awareness - dt * 0.5);
    }
    // Footprint of the view on the ground.
    const floorY = ctx.grid.floorAt(this.pos.x, this.pos.z);
    const reach = Math.min(range, (this.pos.y - (floorY > -99 ? floorY : 0)) / Math.tan(Math.max(0.2, this.pitchDown - 0.3)));
    this.cone.visible = this.showCone;
    this.cone.setColor(ctx.alarm.hunting ? 0xff3020 : this.awareness > 0.2 ? 0xffd040 : 0x9fe8ff, 0.3);
    this.cone.update(ctx.grid, this.pos, this.yaw, 0.42, reach, floorY > -99 ? floorY : 0);
  }

  emp(duration) {
    this.disabled = Math.max(this.disabled, duration);
    this.awareness = 0;
  }
}

export class Drone {
  constructor(def, obj, path) {
    this.def = def;
    this.obj = obj;
    this.rotors = [1, 2, 3, 4].map((i) => findPart(obj, `rotor_${i}`)).filter(Boolean);
    this.pos = new THREE.Vector3(def.x, def.y ?? 4, def.z);
    this.alt = def.y ?? 4;
    this.path = path;
    this.pathIndex = 0;
    this.yaw = def.rot ?? 0;
    this.disabled = 0;
    this.hp = 3;
    this.destroyed = false;
    this.awareness = 0;
    this.fall = 0;
    this.bob = Math.random() * 6;
    this.hum = null;
  }

  get active() { return this.disabled <= 0 && !this.destroyed; }

  hitTest(origin, dir, maxDist) {
    if (this.destroyed) return null;
    const v = this.pos.clone().sub(origin);
    const t = v.dot(dir);
    if (t < 0 || t > maxDist) return null;
    const d2 = v.lengthSq() - t * t;
    return d2 < 0.5 * 0.5 ? { dist: t, part: 'body' } : null;
  }

  damage(n) {
    this.hp -= n;
    if (this.hp <= 0 && !this.destroyed) {
      this.destroyed = true;
      audio.play('emp', { pos: this.pos, volume: 0.9, rate: 0.6 });
    }
  }

  emp(duration) {
    this.disabled = Math.max(this.disabled, duration);
    this.awareness = 0;
  }

  update(dt, ctx) {
    this.bob += dt;
    if (!this.hum && !this.destroyed) this.hum = audio.play('drone_hum', { pos: this.pos, loop: true, volume: 0.5, refDistance: 2, maxDistance: 25 });
    this.hum?.setPosition(this.pos);
    if (this.destroyed || this.disabled > 0) {
      this.disabled = Math.max(0, this.disabled - dt);
      const floorY = Math.max(0, ctx.grid.floorAt(this.pos.x, this.pos.z));
      this.pos.y = Math.max(floorY + 0.3, this.pos.y - dt * 4);
      if (this.destroyed) { this.hum?.stop(0.3); this.hum = null; }
      this.sync();
      return;
    }
    this.pos.y += (this.alt - this.pos.y) * Math.min(1, dt * 1.5);
    const hunting = ctx.alarm.hunting;
    let target = null;
    if (hunting) target = new THREE.Vector3(ctx.player.pos.x, 0, ctx.player.pos.z);
    else if (this.path?.length) {
      const [tx, tz] = this.path[this.pathIndex];
      target = new THREE.Vector3(tx, 0, tz);
      if (Math.hypot(tx - this.pos.x, tz - this.pos.z) < 0.6) this.pathIndex = (this.pathIndex + 1) % this.path.length;
    }
    if (target) {
      const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
      const l = Math.hypot(dx, dz);
      if (l > (hunting ? 3.5 : 0.2)) {
        const sp = hunting ? 3.6 : 2.2;
        this.pos.x += (dx / l) * sp * dt;
        this.pos.z += (dz / l) * sp * dt;
        let d = Math.atan2(dx, dz) - this.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        this.yaw += d * Math.min(1, dt * 4);
      }
    }
    // Looks straight down in a wide circle.
    const light = lightLevelAt(ctx.lights, ctx.player.pos, ctx.ambientLight) + 0.5;
    const flat = Math.hypot(ctx.player.pos.x - this.pos.x, ctx.player.pos.z - this.pos.z);
    const radius = 4.2 * (ctx.visionMul ?? 1);
    if (!ctx.player.dead && flat < radius && ctx.grid.lineOfSight(this.pos.x, this.pos.y - 0.4, this.pos.z, ctx.player.pos.x, ctx.player.pos.y + 1, ctx.player.pos.z)) {
      this.awareness += dt * (1.6 - flat / radius) * light * (ctx.player.crouch ? 0.6 : 1);
      if (this.awareness > 1) ctx.alarm.spotted(ctx.player.pos);
    } else this.awareness = Math.max(0, this.awareness - dt * 0.4);
    this.sync();
    this.spot = { x: this.pos.x, z: this.pos.z, r: radius };
  }

  sync() {
    this.obj.position.copy(this.pos);
    this.obj.position.y += Math.sin(this.bob * 2) * 0.06;
    this.obj.rotation.set(this.destroyed ? 0.6 : 0, this.yaw, this.destroyed ? 0.4 : 0, 'YXZ');
    if (!this.destroyed && this.disabled <= 0) for (const r of this.rotors) r.rotation.y += 0.9;
  }

  dispose() {
    this.hum?.stop(0.2);
  }
}

export async function spawnCamera(def, parent) {
  const obj = await instantiateModel('camera_sec', { unique: true });
  obj.position.set(def.x, def.y ?? 3.2, def.z);
  obj.rotation.set(0, def.rot ?? 0, 0, 'YXZ');
  parent.add(obj);
  return new SecurityCamera(def, obj, parent);
}

export async function spawnDrone(def, world, parent) {
  const obj = await instantiateModel('drone', { unique: true });
  parent.add(obj);
  const d = new Drone(def, obj, world.spawns.paths[def.path] ?? null);
  d.sync();
  return d;
}
