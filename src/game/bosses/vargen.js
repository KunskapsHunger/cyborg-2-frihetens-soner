import * as THREE from 'three';
import { audio } from '../../engine/audio.js';
import { createMaterial } from '../../engine/material.js';
import { Humanoid } from '../humanoid.js';

// Vargen: Sara's sniper on the ferry's icy deck (MGS2's Olga meets Sniper
// Wolf). She lies at one of several firing spots; a red laser searches for the
// player and locks on. Keep moving or break line of sight. Every hit makes
// her withdraw into the blizzard and reappear at another spot. Thermal vision
// shows her. Stamina, not health: tranquillisers win without a death.

const HIT = [{ y: 0.55, r: 0.45, part: 'body' }, { y: 0.9, r: 0.2, part: 'head' }];
const LOCK_TIME = 1.5;
const tmp = new THREE.Vector3();

export class Vargen {
  constructor(def, obj, parent) {
    this.def = def;
    this.obj = obj;
    this.rig = new Humanoid(obj);
    this.spots = def.spots ?? [[def.x, def.z]];
    this.spot = 0;
    this.pos = new THREE.Vector3(...[this.spots[0][0], 0, this.spots[0][1]]);
    this.yaw = def.rot ?? 0;
    this.hp = 100;
    this.maxHp = 100;
    this.dead = false;
    this.name = 'VARGEN';
    this.state = 'aim';
    this.stateT = 2;
    this.lock = 0;
    this.cool = 2;
    this.aimAt = new THREE.Vector3();
    this.flash = 0;
    this.killedLethal = false;
    this.materials = [];
    obj.traverse((o) => { if (o.isMesh) this.materials.push(o.material); });
    // The laser sight: a thin additive beam.
    const geo = new THREE.CylinderGeometry(0.012, 0.012, 1, 4, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2);
    this.laser = new THREE.Mesh(geo, createMaterial({ lit: false, additive: true, color: 0xff2010, alphaTest: 0.0, fog: false }));
    this.laser.renderOrder = 4;
    parent.add(this.laser);
  }

  muzzle() { return new THREE.Vector3(this.pos.x + Math.sin(this.yaw) * 0.9, this.pos.y + 0.55, this.pos.z + Math.cos(this.yaw) * 0.9); }
  aimPoint() { return new THREE.Vector3(this.pos.x, this.pos.y + 0.6, this.pos.z); }

  hitTest(origin, dir, maxDist) {
    if (this.dead || this.state === 'moving') return null;
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
    if (this.dead || this.state === 'moving') return;
    const dmg = (weapon.lethal ? 34 : 22) * (part === 'head' ? 2 : 1);
    this.hp -= dmg;
    this.flash = 0.2;
    audio.play('hurt_2', { pos: this.pos, volume: 0.8, rate: 1.25 });
    if (this.hp <= 0) {
      this.dead = true;
      this.hp = 0;
      this.killedLethal = weapon.lethal;
      this.laser.visible = false;
      audio.play('body_fall', { pos: this.pos, volume: 1 });
      game.onBossDown?.(this);
      return;
    }
    // Hit: she withdraws into the storm and takes another spot.
    this.state = 'moving';
    this.stateT = 2.5 + Math.random();
    this.laser.visible = false;
    game.onBossPhase?.(this, this.hp > 50 ? 1 : 2);
  }

  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt);
    for (const m of this.materials) m.uniforms?.uTint.value.setRGB(...(this.flash > 0 ? [2, 1, 1] : [1, 1, 1]));
    const p = game.player;
    if (this.dead) {
      this.rig.update(dt, { crouch: 0 });
      this.obj.rotation.set(-Math.PI / 2, this.yaw, 0, 'YXZ');
      this.obj.position.set(this.pos.x, this.pos.y + 0.2, this.pos.z);
      return;
    }
    if (this.state === 'moving') {
      this.obj.visible = false;
      this.stateT -= dt;
      if (this.stateT <= 0) {
        const options = this.spots.map((_, i) => i).filter((i) => i !== this.spot);
        this.spot = options[Math.floor(Math.random() * options.length)] ?? 0;
        const [x, z] = this.spots[this.spot];
        this.pos.set(x, Math.max(0, game.world.grid.floorAt(x, z)), z);
        this.state = 'aim';
        this.lock = 0;
        this.cool = 1.2;
        this.obj.visible = true;
        this.aimAt.copy(p.pos);
      }
      return;
    }
    // Aiming from the snow: the laser drifts after the player.
    const target = p.eye().add(new THREE.Vector3(0, -0.3, 0));
    const muzzle = this.muzzle();
    const los = game.world.grid.lineOfSight(muzzle.x, muzzle.y, muzzle.z, target.x, target.y, target.z) && !p.hidden;
    const follow = los ? 1.6 - (game.snow?.gust ?? 0) : 0.3;
    this.aimAt.lerp(los ? target : this.aimAt, Math.min(1, dt * follow));
    this.yaw += (Math.atan2(this.aimAt.x - this.pos.x, this.aimAt.z - this.pos.z) - this.yaw) * Math.min(1, dt * 4);
    const near = los && this.aimAt.distanceTo(target) < 0.9;
    this.lock = near ? this.lock + dt : Math.max(0, this.lock - dt * 0.7);
    this.cool -= dt;
    if (this.lock >= LOCK_TIME && this.cool <= 0) {
      audio.play('sniper_shot', { pos: muzzle, volume: 1 });
      game.effects.muzzleLight(muzzle, 0xffc080, 3, 12);
      game.effects.tracer(muzzle, this.aimAt.clone());
      game.hurtPlayer(26 * game.difficulty);
      this.lock = 0;
      this.cool = 2.6;
    }
    // Laser from the rifle to where she aims, brighter as the lock tightens.
    const dir = this.aimAt.clone().sub(muzzle);
    const len = dir.length();
    this.laser.visible = true;
    this.laser.position.copy(muzzle);
    this.laser.scale.set(1 + this.lock * 2, 1 + this.lock * 2, len);
    this.laser.lookAt(this.aimAt);
    this.laser.material.uniforms.uColor.value.setRGB(1, 0.15 + this.lock * 0.3, 0.05);
    this.obj.position.copy(this.pos);
    this.obj.rotation.set(0, this.yaw, 0, 'YXZ');
    this.rig.update(dt, { crouch: 1, aim: 1 });
  }

  dispose() { this.laser.parent?.remove(this.laser); }
}
