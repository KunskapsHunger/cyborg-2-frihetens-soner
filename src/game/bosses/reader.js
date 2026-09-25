import * as THREE from 'three';
import { audio } from '../../engine/audio.js';
import { createMaterial } from '../../engine/material.js';
import { Humanoid } from '../humanoid.js';
import { readerVoiceId } from '../../engine/voiceIds.js';

// Minnesläsaren: the tower's memory reader (a Psycho Mantis homage). She
// floats, teleports and sends out rings of force with a gap you must stand
// in. While you move with WASD she reads your hand and sidesteps every shot;
// switch to the arrow keys and she goes blind. She also reads this browser's
// saves from the other games (local only, nothing leaves the machine).

const HIT = [{ y: 1.3, r: 0.4, part: 'body' }, { y: 1.95, r: 0.2, part: 'head' }];
const tmp = new THREE.Vector3();

/** What she can "see" about the player. Everything stays in this browser. */
export function readPlayer() {
  const has = (k) => { try { return localStorage.getItem(k) !== null; } catch { return false; } };
  let loads = 0;
  try { loads = JSON.parse(localStorage.getItem('cyborg2.progress.v1') ?? '{}').loads ?? 0; } catch { loads = 0; }
  const hour = new Date().getHours();
  return {
    tunnelbana: has('tunnelbana2033.save.v1') || has('tunnelbana2033.settings.v1'),
    cyborg: has('cyborg.save.v1') || has('cyborg.progress.v1') || has('cyborg.settings.v1'),
    loads,
    night: hour >= 22 || hour < 5,
    morning: hour >= 5 && hour < 10,
  };
}

/** Build her opening monologue from READER templates and what she read. */
export function readerMonologue(READER) {
  const r = readPlayer();
  // Each line keeps its voice id; {n} lines are filled in and stay unvoiced.
  const pick = (k) => {
    const v = READER?.[k];
    const list = Array.isArray(v) ? v : v ? [v] : [];
    return list.map((l, i) => {
      const text = typeof l === 'string' ? l : l.text ?? '';
      return { who: 'reader', text: text.replace('{n}', String(r.loads)), voiceId: text.includes('{') ? null : readerVoiceId(k, i) };
    });
  };
  const lines = [...pick('intro')];
  if (r.tunnelbana) lines.push(...pick('saw_tunnelbana'));
  if (r.cyborg) lines.push(...pick('saw_cyborg'));
  if (!r.tunnelbana && !r.cyborg) lines.push(...pick('saw_nothing'));
  if (r.loads > 2) lines.push(...pick('reloads'));
  if (r.night) lines.push(...pick('late_night'));
  else if (r.morning) lines.push(...pick('morning'));
  return lines;
}

export class Reader {
  constructor(def, obj, parent) {
    this.def = def;
    this.obj = obj;
    this.rig = new Humanoid(obj);
    this.spots = def.spots ?? [[def.x, def.z]];
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.yaw = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.dead = false;
    this.name = 'MINNESLÄSAREN';
    this.t = 0;
    this.teleT = 6;
    this.ringT = 3;
    this.rings = [];
    this.dodges = 0;
    this.flash = 0;
    this.parent = parent;
    this.materials = [];
    obj.traverse((o) => { if (o.isMesh) this.materials.push(o.material); });
    this.ringMat = createMaterial({ lit: false, additive: true, color: 0xb070ff, alphaTest: 0, side: THREE.DoubleSide, fog: false });
  }

  aimPoint() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.4, this.pos.z); }

  /** She reads WASD. The arrow keys are a hand she cannot see. */
  predicts(game) {
    return game.moveScheme !== 'arrows';
  }

  hitTest(origin, dir, maxDist) {
    if (this.dead) return null;
    let best = null;
    for (const h of HIT) {
      tmp.set(this.pos.x, this.pos.y + h.y, this.pos.z).sub(origin);
      const t = tmp.dot(dir);
      if (t < 0 || t > maxDist) continue;
      const d2 = tmp.lengthSq() - t * t;
      if (d2 > h.r * h.r) continue;
      const th = t - Math.sqrt(h.r * h.r - d2);
      if (!best || th < best.dist) best = { dist: th, part: h.part };
    }
    return best;
  }

  shot(weapon, part, game) {
    if (this.dead) return;
    if (this.predicts(game)) {
      // She saw it coming.
      this.dodges += 1;
      this.teleport(game, true);
      game.level.script?.readerDodge?.(game, this.dodges);
      return;
    }
    this.hp -= (weapon.lethal ? 22 : 12) * (part === 'head' ? 2 : 1);
    this.flash = 0.2;
    audio.play('glitch_noise', { pos: this.pos, volume: 0.8 });
    if (this.hp <= 0) {
      this.dead = true;
      this.hp = 0;
      this.killedLethal = weapon.lethal;
      for (const r of this.rings) this.parent.remove(r.mesh);
      this.rings = [];
      game.onBossDown?.(this);
      return;
    }
    game.onBossPhase?.(this, this.hp > 50 ? 1 : 2);
  }

  teleport(game, dodge = false) {
    const [x, z] = this.spots[Math.floor(Math.random() * this.spots.length)];
    this.pos.set(x, Math.max(0, game.world.grid.floorAt(x, z)), z);
    this.teleT = 5 + Math.random() * 3;
    audio.play('glitch_stutter', { pos: this.pos, volume: 0.8 });
    game.glitchPulse?.(dodge ? 0.35 : 0.5, 0.35);
  }

  spawnRing(game) {
    const gap = Math.random() * Math.PI * 2;
    const geo = new THREE.RingGeometry(0.9, 1, 48, 1, gap + 0.6, Math.PI * 2 - 1.2).rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, this.ringMat);
    mesh.position.set(this.pos.x, this.pos.y + 0.15, this.pos.z);
    this.parent.add(mesh);
    this.rings.push({ mesh, r: 0.5, gap, hit: false });
    audio.play('scan_pulse', { pos: this.pos, volume: 1, rate: 0.6 });
  }

  update(dt, game) {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    for (const m of this.materials) m.uniforms?.uTint.value.setRGB(...(this.flash > 0 ? [2, 1.6, 2.4] : [1, 1, 1]));
    const p = game.player;
    if (this.dead) {
      const floor = Math.max(0, game.world.grid.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.5));
      this.pos.y = Math.max(floor, this.pos.y - dt * 0.8);
      this.obj.position.copy(this.pos);
      this.obj.rotation.set(-Math.PI / 2, this.yaw, 0, 'YXZ');
      return;
    }
    const floor = Math.max(0, game.world.grid.floorAt(this.pos.x, this.pos.z));
    this.pos.y = floor + 0.6 + Math.sin(this.t * 1.7) * 0.15;
    this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    this.teleT -= dt;
    if (this.teleT <= 0) this.teleport(game);
    const phase2 = this.hp <= 50;
    this.ringT -= dt;
    if (this.ringT <= 0) { this.spawnRing(game); this.ringT = phase2 ? 2.4 : 3.4; }
    // Rings expand; standing on one outside its gap hurts.
    for (const r of this.rings) {
      r.r += dt * (phase2 ? 6.5 : 5);
      r.mesh.scale.set(r.r, 1, r.r);
      const dx = p.pos.x - r.mesh.position.x, dz = p.pos.z - r.mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (!r.hit && Math.abs(d - r.r) < 0.45) {
        // Ring geometry is rotated -90° about X, so local angle θ points along
        // world (cos θ, 0, -sin θ). The missing arc is centred on r.gap (±0.6).
        const a = Math.atan2(-dz, dx) - r.gap;
        const inGap = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.55;
        if (!inGap) { r.hit = true; game.hurtPlayer(14 * game.difficulty); game.glitchPulse?.(0.4, 0.3); }
      }
    }
    this.rings = this.rings.filter((r) => { if (r.r > 26) { this.parent.remove(r.mesh); return false; } return true; });
    this.obj.position.copy(this.pos);
    this.obj.rotation.set(0, this.yaw, 0, 'YXZ');
    this.rig.update(dt, { aim: 0.3, handsUp: Math.sin(this.t * 0.8) > 0.6 ? 0.4 : 0 });
  }

  dispose() { for (const r of this.rings) this.parent.remove(r.mesh); this.rings = []; }
}
