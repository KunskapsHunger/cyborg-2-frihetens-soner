import * as THREE from 'three';
import { instantiateModel, findPart, materialFor } from '../engine/assets.js';
import { createMaterial } from '../engine/material.js';
import { Humanoid } from './humanoid.js';
import { sightFactor, lightLevelAt, ConeMesh } from './vision.js';

// Story characters and civilians: walk along paths, sit, talk, turn to face
// someone, and (for the family) occasionally glance back — if they see
// Henrik during a glance, the scene fails. The copy can be a hologram.

export class NPC {
  constructor(def, obj, parent) {
    this.def = def;
    this.id = def.id;
    this.name = def.name ?? def.id;
    this.obj = obj;
    this.rig = new Humanoid(obj);
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.yaw = def.rot ?? 0;
    this.baseYaw = this.yaw;
    this.pose = def.pose ?? 'idle';
    this.route = null;
    this.routeIndex = 0;
    this.speed = def.speed ?? 1.3;
    this.onArrive = null;
    this.moving = 0;
    this.talking = 0;
    this.lookAt = null;
    this.hidden = false;
    this.watch = def.watch ?? null;
    this.glance = { t: def.watch?.every ?? 9, phase: 'idle', timer: 0 };
    this.cone = null;
    this.holo = !!def.holo;
    this.t = Math.random() * 10;
    if (this.watch) this.cone = new ConeMesh(parent, 10);
  }

  setHidden(h) {
    this.hidden = h;
    this.obj.visible = !h;
    if (this.cone) this.cone.visible = false;
  }

  /** Walk along a list of [x, z] points; resolves when done. */
  walk(points, speed = this.speed) {
    this.route = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.routeIndex = 0;
    this.speed = speed;
    return new Promise((resolve) => { this.onArrive = resolve; });
  }

  stop() {
    this.route = null;
    this.onArrive?.();
    this.onArrive = null;
  }

  update(dt, ctx) {
    if (this.hidden) return;
    this.t += dt;
    this.talking = Math.max(0, this.talking - dt);
    let moveSpeed = 0;
    if (this.route && this.glance.phase !== 'looking') {
      const target = this.route[this.routeIndex];
      const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.25) {
        this.routeIndex += 1;
        if (this.routeIndex >= this.route.length) {
          this.route = null;
          const cb = this.onArrive;
          this.onArrive = null;
          cb?.();
        }
      } else {
        const step = Math.min(d, this.speed * dt);
        this.pos.x += (dx / d) * step;
        this.pos.z += (dz / d) * step;
        this.face(Math.atan2(dx, dz), dt, 6);
        moveSpeed = this.speed;
      }
    } else if (this.lookAt) {
      this.face(Math.atan2(this.lookAt.x - this.pos.x, this.lookAt.z - this.pos.z), dt, 3);
    }
    this.moving += (moveSpeed - this.moving) * Math.min(1, dt * 8);
    const f = ctx.grid.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    if (f > -Infinity && !this.def.y) this.pos.y += (f - this.pos.y) * Math.min(1, dt * 10);
    if (this.def.y !== undefined) this.pos.y = this.def.y;
    this.updateWatch(dt, ctx);
    this.obj.position.copy(this.pos);
    const lookBack = this.glance.phase === 'looking' ? Math.PI : 0;
    const lying = this.pose === 'lie' || this.pose === 'dead';
    this.obj.rotation.set(lying ? -Math.PI / 2 : 0, this.yaw + lookBack, 0, 'YXZ');
    if (lying) this.obj.position.y = this.pos.y + 0.2;
    this.rig.update(dt, {
      speed: this.moving,
      sit: this.pose === 'sit' ? 1 : 0,
      crouch: this.pose === 'crouch' ? 1 : 0,
      talk: this.talking > 0 ? 1 : 0,
      reach: this.pose === 'reach' ? 1 : 0,
      aim: this.pose === 'aim' ? 1 : 0,
      handsUp: this.pose === 'hands_up' ? 1 : 0,
      sing: this.pose === 'sing' ? 1 : 0,
      hug: this.pose === 'hug' ? 1 : 0,
      kneel: this.pose === 'kneel' ? 1 : 0,
      lookYaw: this.glance.phase === 'warn' ? Math.sin(this.t * 5) * 0.4 : 0,
    });
    if (this.holo) this.flicker(dt);
    for (const f of this.flames ?? []) f.scale.y = 0.85 + Math.sin(this.t * 17 + f.id) * 0.1 + Math.random() * 0.08;
  }

  // Occasional look back over the shoulder, telegraphed by a pause.
  updateWatch(dt, ctx) {
    if (!this.watch || !ctx.player) return;
    const g = this.glance;
    g.t -= dt;
    if (g.phase === 'idle' && g.t <= 0 && this.watch.enabled !== false) {
      g.phase = 'warn';
      g.timer = 0.9;
      ctx.onGlanceWarn?.(this);
    } else if (g.phase === 'warn') {
      g.timer -= dt;
      if (g.timer <= 0) { g.phase = 'looking'; g.timer = this.watch.duration ?? 2.2; }
    } else if (g.phase === 'looking') {
      g.timer -= dt;
      const eye = new THREE.Vector3(this.pos.x, this.pos.y + (this.def.eyeY ?? 1.2), this.pos.z);
      const light = lightLevelAt(ctx.lights, ctx.player.pos, ctx.ambientLight);
      const seen = sightFactor(ctx.grid, eye, this.yaw + Math.PI, undefined, { half: 0.6, range: this.watch.range ?? 12, near: 2 }, ctx.player, light);
      if (seen > 0.35) ctx.onSeenByFamily?.(this);
      if (g.timer <= 0) { g.phase = 'idle'; g.t = (this.watch.every ?? 9) * (0.7 + Math.random() * 0.6); }
    }
    if (this.cone) {
      this.cone.visible = g.phase !== 'idle';
      this.cone.setColor(g.phase === 'looking' ? 0xffd040 : 0xffffff, g.phase === 'looking' ? 0.35 : 0.15);
      const floorY = Math.max(0, ctx.grid.floorAt(this.pos.x, this.pos.z));
      this.cone.update(ctx.grid, this.pos, this.yaw + Math.PI, 0.6, this.watch.range ?? 12, floorY);
    }
  }

  face(target, dt, rate) {
    let d = target - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * rate);
  }

  flicker() {
    const k = 0.75 + Math.sin(this.t * 31) * 0.08 + (Math.random() < 0.04 ? -0.5 : 0);
    for (const m of this.materials ?? []) m.uniforms.uOpacity.value = Math.max(0.15, k);
  }
}

let flameMat = null;

/** Candle flames on the lucia crown: crossed additive quads at each flame_N empty. */
function lightCandles(obj) {
  if (!flameMat) {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 32;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(8, 20, 0, 8, 20, 12);
    grad.addColorStop(0, 'rgba(255,250,220,1)');
    grad.addColorStop(0.4, 'rgba(255,190,80,0.8)');
    grad.addColorStop(1, 'rgba(255,120,20,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 32);
    flameMat = createMaterial({ map: new THREE.CanvasTexture(c), lit: false, additive: true, alphaTest: 0.01, side: THREE.DoubleSide });
  }
  const flames = [];
  for (let i = 1; i <= 8; i++) {
    const e = findPart(obj, `flame_${i}`);
    if (!e) continue;
    for (const r of [0, Math.PI / 2]) {
      const q = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.1).translate(0, 0.04, 0), flameMat);
      q.rotation.y = r;
      e.add(q);
      flames.push(q);
    }
  }
  return flames;
}

/** Turn a model's materials into a flickering cyan hologram. */
function makeHologram(obj) {
  const mats = [];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    m.transparent = true;
    m.depthWrite = false;
    m.blending = THREE.AdditiveBlending;
    m.uniforms.uLit.value = 0;
    m.uniforms.uColor.value.setRGB(0.35, 0.85, 1.0);
    m.uniforms.uOpacity.value = 0.8;
    m.uniforms.uAlphaTest.value = 0.01;
    m.needsUpdate = true;
    mats.push(m);
  });
  return mats;
}

export async function spawnNPC(def, world, parent) {
  const obj = await instantiateModel(def.model ?? 'civilian', { unique: true, hot: !def.holo });
  if (def.scale) obj.scale.setScalar(def.scale);
  if (def.tint) obj.traverse((o) => { if (o.isMesh) o.material.uniforms.uTint.value.setRGB(...def.tint); });
  parent.add(obj);
  const npc = new NPC(def, obj, parent);
  npc.pos.y = def.y ?? Math.max(0, world.grid.floorAt(def.x, def.z));
  if (def.holo) npc.materials = makeHologram(obj);
  npc.flames = lightCandles(obj);
  if (def.prop) {
    const hand = findPart(obj, 'hand_r');
    const p = await instantiateModel(def.prop);
    (hand ?? obj).add(p);
  }
  npc.obj.position.copy(npc.pos);
  npc.obj.rotation.set(0, npc.yaw, 0, 'YXZ');
  return npc;
}

export { materialFor };
