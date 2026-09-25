import * as THREE from 'three';
import { instantiateModel, findPart, materialFor } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { Humanoid } from './humanoid.js';
import { findPath } from './pathfinding.js';
import { sightFactor, lightLevelAt, ConeMesh } from './vision.js';
import { PHASE } from './alarm.js';

// Guard (Frihetens söner / Folkrådet police): patrols a waypoint path,
// notices the player gradually, investigates noises and knocks, follows
// footprints in snow, checks lockers, raises the alarm, hunts and shoots,
// searches, and can be choked out, held up, tranquilised or killed. Bodies
// are found by other guards. Shield guards block frontal shots.

const CONE = { half: 0.55, range: 11, near: 2.4 };
const HIT = [{ y: 1.1, r: 0.36, part: 'body' }, { y: 1.66, r: 0.18, part: 'head' }];
const WAKE_TIME = 70;
const tmp = new THREE.Vector3();

export class Guard {
  constructor(def, obj, world) {
    this.def = def;
    this.id = def.id ?? null;
    this.obj = obj;
    this.rig = new Humanoid(obj);
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.yaw = def.rot ?? 0;
    this.path = (def.path && world.spawns.paths[def.path]) || null;
    this.pathIndex = 0;
    this.pathDir = 1;
    this.wait = def.wait ?? 0;
    this.state = 'patrol';
    this.awareness = 0;
    this.investigate = null;
    this.searchT = 0;
    this.route = null;
    this.routeT = 0;
    this.fireT = 1;
    this.burst = 0;
    this.hp = 100;
    this.knockT = 0;
    this.sleepDelay = 0;
    this.lookT = 0;
    this.lookYaw = 0;
    this.iconT = 0;
    this.barkT = 3 + Math.random() * 6;
    this.found = false;
    this.carried = false;
    this.hiddenBody = false;
    this.speedNow = 0;
    this.cone = null;
    this.icon = null;
    this.shield = !!def.shield;
    this.group = def.group ?? 'a';
    this.holdupT = 0;
    this.shaken = false;
    this.trackIndex = -1;
    this.trackT = 0;
    this.lockerTarget = null;
    this.materials = [];
    obj.traverse((o) => { if (o.isMesh) this.materials.push(o.material); });
  }

  get down() { return this.state === 'asleep' || this.state === 'unconscious' || this.state === 'dead'; }
  get active() { return !this.down && this.state !== 'choked'; }
  get heldUp() { return this.state === 'holdup'; }

  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.62, this.pos.z); }

  hitTest(origin, dir, maxDist) {
    if (this.down || this.carried) return null;
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
    // A raised riot shield stops shots from the front.
    if (best && this.shield && this.state !== 'holdup') {
      const facing = Math.sin(this.yaw) * dir.x + Math.cos(this.yaw) * dir.z;
      if (facing < -0.35) best.part = 'shield';
    }
    return best;
  }

  // --- reactions -------------------------------------------------------------

  hearNoise(pos, radius, ctx, kind = null) {
    if (!this.active || this.state === 'alert' || this.state === 'holdup') return;
    if (this.pos.distanceTo(pos) > radius) return;
    if (kind === 'knock' && this.state !== 'suspicious') ctx.bark(this, 'knock');
    this.suspect(pos, ctx);
  }

  /** Player aims at this guard from close behind: hands up (refreshed while aimed). */
  holdUp(ctx) {
    if (!this.active || this.state === 'alert') return false;
    if (this.state !== 'holdup') {
      this.state = 'holdup';
      this.route = null;
      audio.play('holdup', { pos: this.pos, volume: 0.9 });
      ctx.bark(this, 'holdup');
    }
    this.holdupT = 3.5;
    return true;
  }

  /** Walk to a locker the player was seen entering and open it. */
  checkLocker(locker, ctx) {
    if (!this.active || this.state === 'alert') return;
    this.suspect(locker.front.clone(), ctx);
    this.lockerTarget = locker;
    this.searchT = 3;
  }

  suspect(pos, ctx) {
    if (this.state === 'alert') return;
    // A new lead replaces any locker he was on his way to check.
    this.lockerTarget = null;
    const was = this.state;
    this.state = 'suspicious';
    this.investigate = pos.clone();
    this.searchT = 5;
    this.route = null;
    if (was !== 'suspicious') {
      this.iconT = 1.6;
      this.icon = 'question';
      audio.play('question', { pos: this.pos, volume: 0.8 });
      ctx.bark(this, 'suspicious');
    }
  }

  tranquilise(part) {
    if (this.down) return;
    this.sleepDelay = part === 'head' ? 0.05 : 2.2;
    this.drugged = true;
  }

  damage(amount, part, ctx) {
    if (this.state === 'dead') return;
    this.hp -= amount * (part === 'head' ? 3 : 1);
    this.flash = 0.15;
    if (this.hp <= 0) {
      this.state = 'dead';
      this.deathT = 0;
      ctx.onKill(this);
      audio.play('body_fall', { pos: this.pos, volume: 0.9 });
      return;
    }
    if (this.active) ctx.alarm.spotted(ctx.player.pos);
  }

  knockOut() {
    this.state = 'unconscious';
    this.deathT = 0;
    this.knockT = WAKE_TIME;
    audio.play('body_fall', { pos: this.pos, volume: 0.8 });
  }

  // --- update -------------------------------------------------------------------

  update(dt, ctx) {
    const { grid, player, alarm } = ctx;
    this.flash = Math.max(0, (this.flash ?? 0) - dt);
    this.iconT = Math.max(0, this.iconT - dt);
    if (this.drugged && !this.down) {
      this.sleepDelay -= dt;
      if (this.sleepDelay <= 0) {
        this.drugged = false;
        this.state = 'asleep';
        this.deathT = 0;
        this.knockT = WAKE_TIME;
        audio.play('body_fall', { pos: this.pos, volume: 0.8 });
      }
    }
    if (this.state === 'choked' || this.carried) { this.animate(dt); return; }
    if (this.down) {
      this.deathT = Math.min(1, (this.deathT ?? 0) + dt * 2.5);
      if (this.state !== 'dead') {
        this.knockT -= dt;
        if (this.knockT <= 0) this.wake(ctx);
      }
      this.animate(dt);
      return;
    }

    if (this.state === 'holdup') {
      this.holdupT -= dt;
      if (this.holdupT <= 0) {
        if (this.pos.distanceTo(player.pos) < 7) {
          // He lowers his hands and goes for the radio.
          this.state = 'alert';
          this.iconT = 1.6;
          this.icon = 'alert';
          ctx.bark(this, 'alert');
          alarm.spotted(player.pos);
        } else {
          // The gun is gone. Shaken, he searches instead of raising the alarm.
          this.state = 'search';
          this.searchT = 8;
          this.investigate = player.pos.clone();
          ctx.bark(this, 'suspicious');
        }
      }
      this.animate(dt);
      return;
    }

    // Perception
    const eye = this.eye();
    const light = lightLevelAt(ctx.lights, player.pos, ctx.ambientLight);
    const rangeMul = alarm.phase === PHASE.CAUTION || alarm.phase === PHASE.EVASION ? 1.2 : 1;
    const cone = { ...CONE, range: CONE.range * rangeMul * (ctx.visionMul ?? 1) };
    let seen = player.hidden ? 0 : sightFactor(grid, eye, this.yaw, undefined, cone, player, light);
    if (seen > 0 && player.boxed) {
      // A still box is just a box. A box that walks is not.
      if (player.speed > 0.4) {
        seen *= 1.2;
        if (this.state === 'patrol') ctx.bark(this, 'box');
      } else {
        seen = this.pos.distanceTo(player.pos) < 2.2 ? seen * 0.35 : 0;
      }
    }
    if (seen > 0) {
      this.awareness += seen * dt * (this.state === 'suspicious' ? 2.4 : 1.6);
      if (this.awareness > 0.3 && this.state !== 'alert') this.suspect(player.pos, ctx);
      if (this.awareness >= 1) {
        if (this.state !== 'alert') {
          this.state = 'alert';
          this.iconT = 1.6;
          this.icon = 'alert';
          ctx.bark(this, 'alert');
        }
        alarm.spotted(player.pos);
      }
    } else {
      this.awareness = Math.max(0, this.awareness - dt * 0.25);
    }
    if (this.state === 'alert') this.seesPlayer = seen > 0;

    // Bodies of colleagues
    if (this.state !== 'alert') {
      for (const other of ctx.guards) {
        if (other === this || !other.down || other.found || other.carried || other.hiddenBody) continue;
        const d = other.pos.distanceTo(this.pos);
        if (d > 9) continue;
        const a = Math.atan2(other.pos.x - this.pos.x, other.pos.z - this.pos.z);
        let da = a - this.yaw;
        da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
        if (da > 0.9) continue;
        if (!grid.lineOfSight(eye.x, eye.y, eye.z, other.pos.x, other.pos.y + 0.4, other.pos.z)) continue;
        other.found = true;
        ctx.bark(this, 'body');
        this.iconT = 1.6;
        this.icon = 'alert';
        audio.play('alert', { volume: 0.7 });
        alarm.raiseCaution(other.pos);
        alarm.set(PHASE.EVASION);
        this.investigate = other.pos.clone();
        this.state = 'search';
        this.searchT = 12;
        break;
      }
    }

    // Fresh footprints in the snow.
    if (this.state === 'patrol' && ctx.footprints) {
      const i = ctx.footprints.noticeAt(this.pos.x, this.pos.z);
      if (i >= 0) {
        this.state = 'tracks';
        this.trackIndex = i;
        this.trackT = 25;
        this.route = null;
        this.iconT = 1.6;
        this.icon = 'question';
        audio.play('question', { pos: this.pos, volume: 0.8 });
        ctx.bark(this, 'tracks');
      }
    }

    // Global alarm drives behaviour
    if (alarm.phase === PHASE.ALERT && this.state !== 'alert') {
      if (this.pos.distanceTo(alarm.lastKnown) < 40) { this.state = 'alert'; this.route = null; }
    }
    if (alarm.phase === PHASE.EVASION && this.state === 'alert' && !this.seesPlayer) {
      this.state = 'search';
      this.searchT = 15;
      this.investigate = alarm.lastKnown.clone();
      this.route = null;
    }

    let move = null;
    let speed = 1.4;
    switch (this.state) {
      case 'patrol': move = this.patrol(dt); break;
      case 'tracks': move = this.followTracks(dt, grid, ctx); speed = 1.9; break;
      case 'suspicious':
      case 'search': {
        speed = this.state === 'search' ? 3.0 : 1.8;
        move = this.goTo(dt, grid, this.investigate);
        if (!move && this.lockerTarget && this.pos.distanceTo(this.lockerTarget.front) < 1.6) {
          ctx.onCheckLocker?.(this, this.lockerTarget);
          this.lockerTarget = null;
        }
        if (!move) {
          this.searchT -= dt;
          this.lookAround(dt);
          if (this.searchT <= 0) {
            if (alarm.phase === PHASE.EVASION) {
              this.investigate = alarm.lastKnown.clone().add(new THREE.Vector3((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12));
              this.searchT = 4;
              this.route = null;
            } else {
              ctx.bark(this, 'giveup');
              this.state = 'patrol';
              this.route = null;
              this.awareness = 0;
            }
          }
        }
        break;
      }
      case 'alert': {
        speed = 4.2;
        const d = this.pos.distanceTo(player.pos);
        if (this.seesPlayer && d < 15) {
          this.face(Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z), dt, 10);
          this.shoot(dt, ctx, d);
          if (d > 6) move = this.goTo(dt, grid, player.pos);
        } else {
          move = this.goTo(dt, grid, alarm.lastKnown);
        }
        break;
      }
      default:
    }
    this.integrate(dt, grid, move, speed);
    this.barkT -= dt;
    if (this.barkT <= 0 && this.state === 'patrol') {
      this.barkT = 12 + Math.random() * 15;
      if (Math.random() < 0.35) ctx.bark(this, 'idle');
    }
    this.animate(dt);
  }

  /** Walk the player's trail a few prints at a time; search where it ends. */
  followTracks(dt, grid, ctx) {
    const next = ctx.footprints?.nextAlong(this.trackIndex, 3);
    this.trackT -= dt;
    if (!next || this.trackT <= 0) {
      this.state = 'search';
      this.searchT = 6;
      this.investigate = this.pos.clone();
      return null;
    }
    const target = new THREE.Vector3(next.x, this.pos.y, next.z);
    const move = this.goTo(dt, grid, target);
    if (!move) {
      this.trackIndex = next.index;
      if (next.index >= ctx.footprints.newestIndex) {
        this.state = 'search';
        this.searchT = 7;
        this.investigate = target;
      }
    }
    return move;
  }

  wake(ctx) {
    this.state = 'search';
    this.hp = Math.max(this.hp, 40);
    this.searchT = 6;
    this.investigate = this.pos.clone();
    this.found = false;
    this.deathT = 0;
    ctx.alarm.raiseCaution(this.pos);
  }

  patrol(dt) {
    if (!this.path || this.path.length < 2) {
      this.lookAround(dt, 0.6);
      return null;
    }
    if (this.wait > 0) {
      this.wait -= dt;
      this.lookAround(dt, 0.8);
      return null;
    }
    const [tx, tz, pause] = this.path[this.pathIndex];
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    if (Math.hypot(dx, dz) < 0.3) {
      this.wait = pause ?? 1.2;
      this.pathIndex += 1;
      if (this.pathIndex >= this.path.length) this.pathIndex = 0;
      return null;
    }
    const l = Math.hypot(dx, dz);
    return [dx / l, dz / l];
  }

  goTo(dt, grid, target) {
    if (!target) return null;
    const d = Math.hypot(target.x - this.pos.x, target.z - this.pos.z);
    if (d < 0.8) return null;
    this.routeT -= dt;
    if (!this.route || this.routeT <= 0) {
      this.routeT = 0.6 + Math.random() * 0.4;
      this.route = findPath(grid, Math.floor(this.pos.x), Math.floor(this.pos.z), Math.floor(target.x), Math.floor(target.z), { climb: 0.45, height: 1.8, maxNodes: 3000 });
    }
    if (!this.route || !this.route.length) {
      const l = Math.max(d, 0.001);
      return [(target.x - this.pos.x) / l, (target.z - this.pos.z) / l];
    }
    let [cx, cz] = this.route[0];
    if (Math.floor(this.pos.x) === cx && Math.floor(this.pos.z) === cz) {
      this.route.shift();
      if (!this.route.length) return null;
      [cx, cz] = this.route[0];
    }
    const wx = cx + 0.5 - this.pos.x, wz = cz + 0.5 - this.pos.z;
    const l = Math.hypot(wx, wz) || 1;
    return [wx / l, wz / l];
  }

  lookAround(dt, amount = 1) {
    this.lookT += dt;
    this.lookYaw = Math.sin(this.lookT * 0.9) * 0.7 * amount;
  }

  face(target, dt, rate) {
    let d = target - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * rate);
  }

  shoot(dt, ctx, dist) {
    this.fireT -= dt;
    if (this.burst > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) {
        this.burst -= 1;
        this.burstT = 0.11;
        ctx.guardShoot(this, dist);
      }
    } else if (this.fireT <= 0) {
      this.fireT = 1.4 + Math.random() * 0.8;
      this.burst = 3;
      this.burstT = 0.35;
    }
  }

  integrate(dt, grid, move, speed) {
    if (move) {
      this.face(Math.atan2(move[0], move[1]), dt, 7);
      const [nx, nz] = grid.collideCircle(this.pos.x + move[0] * speed * dt, this.pos.z + move[1] * speed * dt, 0.35, this.pos.y, 1.8);
      this.pos.x = nx;
      this.pos.z = nz;
      this.speedNow += (speed - this.speedNow) * Math.min(1, dt * 8);
    } else {
      this.speedNow += (0 - this.speedNow) * Math.min(1, dt * 8);
    }
    const f = grid.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    if (f > -Infinity) this.pos.y += (f - this.pos.y) * Math.min(1, dt * 12);
  }

  animate(dt) {
    const o = this.obj;
    o.position.copy(this.pos);
    if (this.down) {
      const t = this.deathT ?? 1;
      o.rotation.set(-t * Math.PI / 2, this.yaw, 0, 'YXZ');
      o.position.y = this.pos.y + t * 0.2;
    } else if (!this.carried) {
      o.rotation.set(0, this.yaw, 0, 'YXZ');
    }
    const aim = this.state === 'alert' ? 1 : 0;
    this.rig.update(dt, { speed: this.down ? 0 : this.speedNow, aim, lookYaw: this.state === 'alert' ? 0 : this.lookYaw, hurt: this.flash > 0 ? 1 : 0, handsUp: this.state === 'holdup' ? 1 : 0 });
    for (const m of this.materials) {
      const base = m.userData.baseTint ?? [1, 1, 1];
      m.uniforms?.uTint.value.setRGB(...(this.flash > 0 ? [2, 0.7, 0.7] : base));
    }
    if (this.cone) {
      this.cone.visible = this.active && !this.carried && this.showCone;
    }
  }
}

export async function spawnGuard(def, world, parent) {
  const obj = await instantiateModel(def.model ?? world.def.guardModel ?? 'sons_guard', { unique: true, hot: true });
  if (def.tint) obj.traverse((o) => { if (o.isMesh) o.material.userData.baseTint = def.tint; });
  const hand = findPart(obj, 'hand_r');
  const rifle = await instantiateModel(def.weapon ?? world.def.guardWeapon ?? 'rifle2');
  rifle.rotation.set(0, Math.PI, 0);
  (hand ?? obj).add(rifle);
  if (def.shield) {
    const shield = await instantiateModel('shield');
    (findPart(obj, 'forearm_l') ?? obj).add(shield);
  }
  parent.add(obj);
  const g = new Guard(def, obj, world);
  g.pos.y = Math.max(0, world.grid.floorAt(def.x, def.z));
  g.cone = new ConeMesh(parent);
  g.showCone = true;
  g.iconMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), materialFor('icon_alert', { lit: false, fog: false }));
  g.qMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), materialFor('icon_question', { lit: false, fog: false }));
  for (const m of [g.iconMesh, g.qMesh]) { m.visible = false; m.renderOrder = 5; parent.add(m); }
  g.animate(0);
  return g;
}

export { CONE as GUARD_CONE };
