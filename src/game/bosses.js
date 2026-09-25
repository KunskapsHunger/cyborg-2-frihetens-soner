import * as THREE from 'three';
import { instantiateModel, findPart } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { Humanoid } from './humanoid.js';
import { sightFactor, lightLevelAt } from './vision.js';
import { makeShadow } from './shadows.js';
import { Vargen } from './bosses/vargen.js';
import { Reader } from './bosses/reader.js';

// Boss fights.
//  Walker / Järnjätten: armoured four-legged machine; an EMP stuns it and
//  exposes the sensor head.
//  Vargen (bosses/vargen.js) and Minnesläsaren (bosses/reader.js) live in
//  their own modules.
//  Kopian (the copy): agile duellist; in its last phase it projects hologram
//  decoys — only the real one casts a shadow.

const tmp = new THREE.Vector3();

function sphereHit(origin, dir, center, r, maxDist) {
  tmp.copy(center).sub(origin);
  const t = tmp.dot(dir);
  if (t < 0 || t > maxDist) return null;
  const d2 = tmp.lengthSq() - t * t;
  if (d2 > r * r) return null;
  return t - Math.sqrt(r * r - d2);
}

export class Walker {
  constructor(def, obj) {
    this.def = def;
    this.obj = obj;
    this.body = findPart(obj, 'body') ?? obj;
    this.head = findPart(obj, 'head');
    this.eye = findPart(obj, 'eye');
    this.drill = findPart(obj, 'drill');
    this.legs = ['fl', 'fr', 'bl', 'br'].map((k) => ({ hip: findPart(obj, `leg_${k}`), knee: findPart(obj, `shin_${k}`) }));
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.scale = def.scale ?? 1;
    obj.scale.setScalar(this.scale);
    // Hit spheres and stomp reach follow the machine's real size, not just its
    // scale: Järnjätten's model is ~2.7x the 4 m walker these numbers were made for.
    this.size = def.size ?? (def.kind === 'jatte' ? 2.4 : 1) * this.scale;
    this.yaw = def.rot ?? 0;
    this.hp = 100;
    this.maxHp = 100;
    this.stun = 0;
    this.phase = 1;
    this.dead = false;
    this.deathT = 0;
    this.walkT = 0;
    this.charge = 0;
    this.fireCd = 3;
    this.stepCd = 0;
    this.orbit = { cx: def.cx ?? def.x, cz: def.cz ?? def.z, r: def.r ?? 9, a: 0 };
    this.bodyBaseY = this.body.position.y;
    this.materials = [];
    obj.traverse((o) => { if (o.isMesh) this.materials.push(o.material); });
    this.name = def.name ?? 'VAKTHUNDEN';
  }

  headPos() {
    const p = new THREE.Vector3();
    (this.eye ?? this.head ?? this.body).getWorldPosition(p);
    return p;
  }

  bodyCenter() { return this.pos.clone().setY(this.pos.y + 2.4 * this.size); }

  aimPoint() { return this.stun > 0 ? this.headPos() : this.bodyCenter(); }

  hitTest(origin, dir, maxDist) {
    if (this.dead) return null;
    const h = sphereHit(origin, dir, this.headPos(), 0.7 * this.size, maxDist);
    if (h !== null) return { dist: h, part: 'head' };
    const b = sphereHit(origin, dir, this.bodyCenter(), 1.6 * this.size, maxDist);
    return b !== null ? { dist: b, part: 'body' } : null;
  }

  shot(weapon, part, game) {
    if (this.dead) return;
    const exposed = this.stun > 0 && part === 'head';
    const dmg = exposed ? (weapon.lethal ? 12 : 4) : 0.5;
    this.hp -= dmg;
    this.flash = 0.12;
    if (!exposed && Math.random() < 0.3) game.hud.message('Pansaret tar allt. Slå ut den med EMP (Q).', '#d0a060', 2);
    if (this.hp <= 0) this.die(game);
  }

  emp(game) {
    if (this.dead) return;
    this.stun = 5.5;
    this.charge = 0;
    audio.play('walker_roar', { pos: this.pos, volume: 0.9, rate: 0.7 });
    game.hud.message('Sensorhuvudet är blottat!', '#80e0ff', 2);
  }

  die(game) {
    this.dead = true;
    this.hp = 0;
    audio.play('walker_roar', { pos: this.pos, volume: 1, rate: 0.5 });
    game.onBossDown?.(this);
  }

  update(dt, game) {
    this.flash = Math.max(0, (this.flash ?? 0) - dt);
    for (const m of this.materials) m.uniforms?.uTint.value.setRGB(...(this.flash > 0 ? [2, 1, 1] : this.stun > 0 ? [0.8, 1.1, 1.6] : [1, 1, 1]));
    if (this.dead) {
      this.deathT = Math.min(1, this.deathT + dt * 0.6);
      this.body.position.y = this.bodyBaseY - this.deathT * 1.6;
      this.body.rotation.z = this.deathT * 0.25;
      return;
    }
    this.phase = this.hp > 66 ? 1 : this.hp > 33 ? 2 : 3;
    const p = game.player;
    // Järnjätten's drill spins faster as it gets angrier (stops when stunned).
    if (this.drill && this.stun <= 0) this.drill.rotation.y += dt * (4 + this.phase * 3);
    if (this.stun > 0) {
      this.stun -= dt;
      this.body.position.y += ((this.bodyBaseY - 1.1) - this.body.position.y) * Math.min(1, dt * 4);
      this.animateLegs(dt, 0);
      return;
    }
    this.body.position.y += (this.bodyBaseY - this.body.position.y) * Math.min(1, dt * 2);
    // Walk an orbit around the arena centre, facing the player when seen.
    const speed = 1.3 + this.phase * 0.35;
    this.orbit.a += dt * speed / this.orbit.r;
    const tx = this.orbit.cx + Math.cos(this.orbit.a) * this.orbit.r;
    const tz = this.orbit.cz + Math.sin(this.orbit.a) * this.orbit.r;
    const [nx, nz] = game.world.grid.collideCircle(this.pos.x + (tx - this.pos.x) * Math.min(1, dt), this.pos.z + (tz - this.pos.z) * Math.min(1, dt), 1.5, 0, 4);
    this.pos.x = nx;
    this.pos.z = nz;
    const eye = this.headPos();
    const seen = sightFactor(game.world.grid, eye, this.yaw, undefined, { half: 0.8, range: 22, near: 4 }, p, lightLevelAt(game.lights, p.pos, 0.6));
    const face = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    let d = (seen > 0 ? face : Math.atan2(tx - this.pos.x, tz - this.pos.z)) - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 1.6);
    // Laser: telegraphed charge, then fire along the locked line.
    this.fireCd -= dt;
    if (this.charge > 0) {
      this.charge -= dt;
      game.effects.tracer(eye, this.lockTarget, 0xff3020);
      if (this.charge <= 0) {
        audio.play('walker_laser', { pos: eye, volume: 1 });
        game.effects.muzzleLight(eye, 0xff3020, 3, 10);
        const off = Math.hypot(p.pos.x - this.lockTarget.x, p.pos.z - this.lockTarget.z);
        if (off < 1.1) game.hurtPlayer(22 * game.difficulty);
        this.fireCd = 3.4 - this.phase * 0.6;
      }
    } else if (seen > 0 && this.fireCd <= 0) {
      this.charge = 1.1;
      this.lockTarget = p.pos.clone().setY(p.pos.y + 1);
      audio.play('walker_roar', { pos: this.pos, volume: 0.6, rate: 1.4 });
    }
    // Stomp when the player gets under it.
    if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 2.8 * this.size) {
      this.stompCd = (this.stompCd ?? 0) - dt;
      if (this.stompCd <= 0) {
        this.stompCd = 2;
        audio.play('walker_step', { pos: this.pos, volume: 1, rate: 0.8 });
        game.cam.shake = 1;
        game.hurtPlayer(18 * game.difficulty);
      }
    }
    this.animateLegs(dt, speed);
    this.stepCd -= dt;
    if (this.stepCd <= 0) {
      this.stepCd = 0.8;
      audio.play('walker_step', { pos: this.pos, volume: 0.7 });
      if (this.pos.distanceTo(p.pos) < 12) game.cam.shake = Math.max(game.cam.shake, 0.25);
    }
  }

  animateLegs(dt, speed) {
    this.walkT += dt * speed * 1.5;
    this.legs.forEach((l, i) => {
      const ph = this.walkT + (i % 2 === 0 ? 0 : Math.PI) + (i > 1 ? Math.PI / 2 : 0);
      if (l.hip) l.hip.rotation.x = Math.sin(ph) * 0.35 * Math.min(1, speed);
      if (l.knee) l.knee.rotation.x = Math.max(0, Math.cos(ph)) * 0.4 * Math.min(1, speed);
    });
    this.obj.position.copy(this.pos);
    this.obj.rotation.set(0, this.yaw, 0, 'YXZ');
  }
}

export class CopyBoss {
  constructor(def, obj, shadow) {
    this.def = def;
    this.obj = obj;
    this.rig = new Humanoid(obj);
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.yaw = def.rot ?? 0;
    this.hp = 300;
    this.maxHp = 300;
    this.phase = 1;
    this.dead = false;
    this.deathT = 0;
    this.fireCd = 2;
    this.burst = 0;
    this.strafe = 1;
    this.strafeT = 2;
    this.stun = 0;
    this.decoys = [];
    this.spots = def.spots ?? [];
    this.shadow = shadow;
    this.materials = [];
    obj.traverse((o) => { if (o.isMesh) this.materials.push(o.material); });
    this.name = 'KOPIAN';
    this.moveSpeed = 0;
  }

  aimPoint() { return this.pos.clone().setY(this.pos.y + 1.2); }

  hitTest(origin, dir, maxDist) {
    if (this.dead) return null;
    const head = sphereHit(origin, dir, this.pos.clone().setY(this.pos.y + 1.66), 0.18, maxDist);
    if (head !== null) return { dist: head, part: 'head' };
    const body = sphereHit(origin, dir, this.pos.clone().setY(this.pos.y + 1.1), 0.4, maxDist);
    return body !== null ? { dist: body, part: 'body' } : null;
  }

  shot(weapon, part, game) {
    if (this.dead) return;
    const dmg = (weapon.lethal ? 22 : 6) * (part === 'head' ? 2 : 1);
    this.hp -= dmg;
    this.flash = 0.12;
    audio.play('copy_glitch', { pos: this.pos, volume: 0.6, rate: 1.2 });
    if (!weapon.lethal && Math.random() < 0.25) game.hud.message('Den sover inte. Den har aldrig sovit.', '#80e0ff', 2);
    const phase = this.hp > 200 ? 1 : this.hp > 100 ? 2 : 3;
    if (phase !== this.phase) {
      this.phase = phase;
      game.onBossPhase?.(this, phase);
      if (phase === 3) this.spawnDecoys(game);
      this.teleport(game);
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.hp = 0;
      for (const d of this.decoys) d.obj.visible = false;
      audio.play('copy_glitch', { pos: this.pos, volume: 1, rate: 0.6 });
      game.onBossDown?.(this);
    }
  }

  emp(game) {
    this.stun = 3;
    for (const d of this.decoys) d.obj.visible = false;
    this.decoys = [];
    audio.play('copy_glitch', { pos: this.pos, volume: 1 });
    game.hud.message('Hologrammen slocknar.', '#80e0ff', 2);
    if (this.phase === 3) this.decoyTimer = setTimeout(() => { if (!this.dead) this.spawnDecoys(game); }, 7000);
  }

  teleport(game) {
    if (!this.spots.length) return;
    const p = game.player.pos;
    const choices = this.spots.filter(([x, z]) => Math.hypot(x - p.x, z - p.z) > 6);
    const [x, z] = choices[Math.floor(Math.random() * choices.length)] ?? this.spots[0];
    game.effects.empPulse(this.pos.clone().setY(this.pos.y + 1));
    this.pos.set(x, this.pos.y, z);
    audio.play('copy_glitch', { pos: this.pos, volume: 0.9 });
  }

  async spawnDecoys(game) {
    for (const d of this.decoys) d.obj.parent?.remove(d.obj);
    this.decoys = [];
    for (let i = 0; i < 2; i++) {
      const obj = await instantiateModel('copy', { unique: true });
      obj.traverse((o) => {
        if (!o.isMesh) return;
        o.material.transparent = true;
        o.material.uniforms.uOpacity.value = 0.92;
        o.material.uniforms.uEmissive.value.setRGB(0.05, 0.12, 0.16);
      });
      game.scene.add(obj);
      const a = Math.random() * Math.PI * 2;
      this.decoys.push({ obj, rig: new Humanoid(obj), pos: this.pos.clone().add(new THREE.Vector3(Math.cos(a) * 4, 0, Math.sin(a) * 4)), yaw: 0, t: Math.random() * 6 });
    }
  }

  update(dt, game) {
    this.flash = Math.max(0, (this.flash ?? 0) - dt);
    const glitch = Math.random() < 0.02 ? 0.5 : 1;
    for (const m of this.materials) m.uniforms?.uTint.value.setRGB(...(this.flash > 0 ? [0.6, 1.8, 2] : [glitch, 1, 1]));
    if (this.dead) {
      this.deathT = Math.min(1, this.deathT + dt);
      this.obj.rotation.set(-this.deathT * Math.PI / 2, this.yaw, 0, 'YXZ');
      this.obj.position.copy(this.pos).setY(this.pos.y + this.deathT * 0.2);
      this.shadow.position.set(this.pos.x, this.pos.y + 0.03, this.pos.z);
      return;
    }
    const p = game.player;
    const grid = game.world.grid;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const face = Math.atan2(dx, dz);
    this.yaw += Math.atan2(Math.sin(face - this.yaw), Math.cos(face - this.yaw)) * Math.min(1, dt * 8);
    if (this.stun > 0) {
      this.stun -= dt;
      this.moveSpeed = 0;
    } else {
      // Strafe around the player at mid range; dodge when aimed at.
      this.strafeT -= dt;
      if (this.strafeT <= 0 || (p.aiming && Math.random() < dt * 1.5)) { this.strafe *= -1; this.strafeT = 1.5 + Math.random() * 2; }
      const want = dist > 9 ? 1 : dist < 5 ? -1 : 0;
      const sx = (dx / dist) * want + (-dz / dist) * this.strafe;
      const sz = (dz / dist) * want + (dx / dist) * this.strafe;
      const l = Math.hypot(sx, sz) || 1;
      const sp = 3.2 + this.phase * 0.5;
      const [nx, nz] = grid.collideCircle(this.pos.x + (sx / l) * sp * dt, this.pos.z + (sz / l) * sp * dt, 0.35, this.pos.y, 1.8);
      this.pos.x = nx;
      this.pos.z = nz;
      this.moveSpeed = sp;
      // Shoot bursts when it has a line of sight.
      this.fireCd -= dt;
      const eye = this.pos.clone().setY(this.pos.y + 1.5);
      const see = grid.lineOfSight(eye.x, eye.y, eye.z, p.pos.x, p.pos.y + 1.2, p.pos.z);
      if (this.burst > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0 && see) {
          this.burst -= 1;
          this.burstT = 0.16;
          this.fire(game, eye, dist);
        }
      } else if (this.fireCd <= 0 && see) {
        this.fireCd = 2.2 - this.phase * 0.35;
        this.burst = 2 + this.phase;
        this.burstT = 0.3;
      }
    }
    this.obj.position.copy(this.pos);
    this.obj.rotation.set(0, this.yaw, 0, 'YXZ');
    this.shadow.position.set(this.pos.x, this.pos.y + 0.03, this.pos.z);
    this.rig.update(dt, { speed: this.moveSpeed, aim: 1 });
    for (const d of this.decoys) this.updateDecoy(d, dt, game);
  }

  fire(game, eye, dist) {
    audio.play('pistol_shot', { pos: eye, volume: 0.8, rate: 1.15 });
    game.effects.muzzleLight(eye, 0x80e0ff, 1.5, 6);
    const p = game.player;
    const target = p.eye().add(new THREE.Vector3(0, -0.4, 0));
    let chance = Math.max(0.15, 0.7 - dist * 0.03);
    if (p.speed > 3) chance *= 0.55;
    if (Math.random() < chance) {
      game.effects.tracer(eye, target, 0x80e0ff);
      game.hurtPlayer(6 * game.difficulty);
    } else {
      game.effects.tracer(eye, target.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)), 0x80e0ff);
    }
  }

  // Decoys mirror the copy's behaviour but have no shadow and do no harm.
  updateDecoy(d, dt, game) {
    d.t += dt;
    const p = game.player.pos;
    const a = d.t * 0.7;
    d.pos.x += (p.x + Math.cos(a) * 7 - d.pos.x) * dt * 0.5;
    d.pos.z += (p.z + Math.sin(a) * 7 - d.pos.z) * dt * 0.5;
    d.yaw = Math.atan2(p.x - d.pos.x, p.z - d.pos.z);
    d.obj.position.copy(d.pos);
    d.obj.rotation.set(0, d.yaw, 0, 'YXZ');
    d.rig.update(dt, { speed: 3, aim: 1 });
    if (Math.random() < dt * 0.6) {
      const eye = d.pos.clone().setY(d.pos.y + 1.5);
      audio.play('pistol_shot', { pos: eye, volume: 0.5, rate: 1.2 });
      game.effects.tracer(eye, game.player.eye().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)), 0x80e0ff);
    }
  }

  dispose() {
    clearTimeout(this.decoyTimer);
    for (const d of this.decoys) d.obj.parent?.remove(d.obj);
  }
}

export async function spawnBoss(def, world, parent) {
  if (def.kind === 'vargen' || def.kind === 'reader') {
    const obj = await instantiateModel(def.kind, { unique: true, hot: true });
    const hand = findPart(obj, 'hand_r');
    if (def.kind === 'vargen') {
      const rifle = await instantiateModel('sniper');
      rifle.rotation.set(0, Math.PI, 0);
      (hand ?? obj).add(rifle);
    }
    parent.add(obj);
    const b = def.kind === 'vargen' ? new Vargen(def, obj, parent) : new Reader(def, obj, parent);
    b.pos.y = Math.max(0, world.grid.floorAt(b.pos.x, b.pos.z));
    return b;
  }
  if (def.kind === 'walker' || def.kind === 'jatte') {
    const obj = await instantiateModel(def.model ?? (def.kind === 'jatte' ? 'jarnjatten' : 'walker'), { unique: true, cut: true, hot: true });
    parent.add(obj);
    const w = new Walker(def, obj);
    w.pos.y = Math.max(0, world.grid.floorAt(def.x, def.z));
    w.animateLegs(0, 0);
    return w;
  }
  const obj = await instantiateModel('copy', { unique: true, hot: false });
  parent.add(obj);
  const shadow = makeShadow(parent, 0.9);
  const c = new CopyBoss(def, obj, shadow);
  c.pos.y = Math.max(0, world.grid.floorAt(def.x, def.z));
  return c;
}
