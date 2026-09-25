import * as THREE from 'three';
import { audio } from '../engine/audio.js';
import { sharedUniforms } from '../engine/material.js';

// Henrik's verbs: shooting (tranquiliser / service pistol), choke-hold
// takedowns, carrying bodies, EMP, thermal vision, repair kits — and the
// guards' fire at him.

export const WEAPONS = {
  tranq: { name: 'PARALYSATOR', ammoKey: 'tranq', sound: 'tranq_shot', noise: 0, lethal: false },
  pistol: { name: 'TJÄNSTEVAPEN', ammoKey: 'pistol', sound: 'pistol_shot', noise: 16, lethal: true },
};

const EMP_COST = 45;
const EMP_RADIUS = 9;
const THERMAL_DRAIN = 6;
const tmpDir = new THREE.Vector3();

export function playerShoot(game) {
  const { player, inv } = game;
  const w = WEAPONS[inv.weapon];
  if (!w || game.fireCd > 0) return;
  if ((inv.ammo[w.ammoKey] ?? 0) <= 0) {
    audio.play('keycard_deny', { volume: 0.6 });
    game.fireCd = 0.3;
    return;
  }
  inv.ammo[w.ammoKey] -= 1;
  game.fireCd = w.lethal ? 0.35 : 0.6;
  player.showGun = 1.2;
  audio.play(w.sound, { volume: 0.9, rate: 0.95 + Math.random() * 0.1 });
  const origin = player.eye();
  let dir;
  if (game.cam.fp > 0.5) {
    game.camera.getWorldDirection(tmpDir);
    dir = tmpDir.clone();
    origin.copy(game.camera.position);
  } else {
    dir = autoAim(game, origin, player.forward());
  }
  if (w.noise > 0) game.emitNoise(player.pos.clone(), w.noise);
  game.effects.muzzleLight(origin.clone().addScaledVector(dir, 0.6), w.lethal ? 0xffc070 : 0x80ffe0, w.lethal ? 2 : 0.8, 6);
  hitscan(game, origin, dir, w);
}

// Third-person shots snap towards the nearest enemy roughly in front.
function autoAim(game, origin, fwd) {
  let best = null, bestScore = 0.93;
  const targets = [...game.guards.filter((g) => g.active), ...game.drones.filter((d) => d.active), ...game.bossTargets()];
  for (const t of targets) {
    const p = t.aimPoint ? t.aimPoint() : new THREE.Vector3(t.pos.x, t.pos.y + 1.2, t.pos.z);
    const v = p.clone().sub(origin);
    const dist = v.length();
    if (dist > 25) continue;
    v.normalize();
    const score = v.x * fwd.x + v.z * fwd.z;
    if (score > bestScore && game.world.grid.lineOfSight(origin.x, origin.y, origin.z, p.x, p.y, p.z)) {
      bestScore = score;
      best = v;
    }
  }
  return best ?? fwd.clone();
}

function hitscan(game, origin, dir, w) {
  const grid = game.world.grid;
  const wall = grid.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, 40);
  const maxD = wall ? wall.dist : 40;
  let best = null;
  const consider = (hit, target, kind) => { if (hit && (!best || hit.dist < best.dist)) best = { ...hit, target, kind }; };
  for (const g of game.guards) consider(g.hitTest(origin, dir, maxD), g, 'guard');
  for (const d of game.drones) consider(d.hitTest(origin, dir, maxD), d, 'drone');
  for (const b of game.bossTargets()) consider(b.hitTest(origin, dir, maxD), b, 'boss');
  for (const s of game.shootables ?? []) consider(s.hitTest(origin, dir, maxD), s, 'prop');
  if (best) {
    const p = origin.clone().addScaledVector(dir, best.dist);
    if (best.kind === 'prop') {
      best.target.onHit(game);
    } else if (best.part === 'shield') {
      audio.play('shield_hit', { pos: p, volume: 0.9 });
      game.effects.impact(p, { x: -dir.x, y: -dir.y, z: -dir.z }, 'metal');
      best.target.suspect?.(game.player.pos, game.enemyCtx());
    } else if (best.kind === 'guard') {
      if (w.lethal) {
        best.target.damage(60, best.part, game.enemyCtx());
        game.effects.impact(p, { x: -dir.x, y: -dir.y, z: -dir.z }, 'flesh');
      } else {
        best.target.tranquilise(best.part);
        game.effects.impact(p, { x: -dir.x, y: -dir.y, z: -dir.z }, 'dart');
      }
    } else if (best.kind === 'drone') {
      best.target.damage(w.lethal ? 1 : 0.34);
      game.effects.impact(p, { x: -dir.x, y: -dir.y, z: -dir.z }, 'metal');
    } else {
      best.target.shot(w, best.part, game);
      game.effects.impact(p, { x: -dir.x, y: -dir.y, z: -dir.z }, 'metal');
    }
    game.hud.hitMarker = 0.15;
    return;
  }
  if (wall) game.effects.impact(wall.point, wall.normal, 'rock');
}

/** Guard fires a burst round at the player. */
export function guardShoot(game, guard, dist) {
  const p = game.player;
  const muzzle = new THREE.Vector3(guard.pos.x + Math.sin(guard.yaw) * 0.5, guard.pos.y + 1.4, guard.pos.z + Math.cos(guard.yaw) * 0.5);
  audio.play('rifle_burst', { pos: muzzle, volume: 0.7, rate: 1.1 });
  game.effects.muzzleLight(muzzle, 0xffb060, 1.6, 7);
  let chance = Math.max(0.12, Math.min(0.65, 0.75 - dist * 0.04));
  if (p.speed > 3) chance *= 0.6;
  if (p.crouch) chance *= 0.8;
  const target = p.eye().add(new THREE.Vector3(0, -0.4, 0));
  if (Math.random() < chance) {
    game.effects.tracer(muzzle, target);
    game.hurtPlayer(7 * game.difficulty);
  } else {
    game.effects.tracer(muzzle, target.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.3), (Math.random() - 0.5) * 2)));
  }
}

/** E: takedown from behind, pick up / drop a body. */
export function interact(game) {
  const p = game.player;
  if (p.carrying) {
    dropBody(game);
    return true;
  }
  // Choke hold: behind an unaware guard.
  for (const g of game.guards) {
    if (!g.active || g.state === 'alert') continue;
    const d = Math.hypot(g.pos.x - p.pos.x, g.pos.z - p.pos.z);
    if (d > 1.35) continue;
    const toPlayer = Math.atan2(p.pos.x - g.pos.x, p.pos.z - g.pos.z);
    let rel = toPlayer - g.yaw;
    rel = Math.abs(Math.atan2(Math.sin(rel), Math.cos(rel)));
    if (rel < 1.9) continue;
    startChoke(game, g);
    return true;
  }
  // Pick up a body.
  for (const g of game.guards) {
    if (!g.down || g.carried) continue;
    if (Math.hypot(g.pos.x - p.pos.x, g.pos.z - p.pos.z) < 1.4) {
      p.carrying = g;
      p.crouch = false;
      g.carried = true;
      g.hiddenBody = false;
      audio.play('body_drag', { volume: 0.7 });
      return true;
    }
  }
  return false;
}

function startChoke(game, g) {
  const p = game.player;
  g.state = 'choked';
  p.choke = 1.3;
  p.yaw = Math.atan2(-(g.pos.x - p.pos.x), -(g.pos.z - p.pos.z));
  audio.play('choke', { pos: g.pos, volume: 0.9 });
  game.chokeTarget = g;
}

export function updateChoke(game, dt) {
  const p = game.player;
  const g = game.chokeTarget;
  if (!g) return;
  p.choke -= dt;
  // Hold the guard in front of Henrik.
  const f = p.forward();
  g.pos.set(p.pos.x + f.x * 0.55, p.pos.y, p.pos.z + f.z * 0.55);
  g.yaw = Math.atan2(f.x, f.z);
  if (p.choke <= 0) {
    p.choke = 0;
    g.knockOut();
    game.chokeTarget = null;
    game.stats.takedowns += 1;
  }
}

export function updateCarry(game) {
  const p = game.player;
  const g = p.carrying;
  if (!g) return;
  const f = p.forward();
  g.pos.set(p.pos.x - f.x * 0.2, p.pos.y + 1.25, p.pos.z - f.z * 0.2);
  g.obj.position.copy(g.pos);
  g.obj.rotation.set(Math.PI / 2, Math.atan2(f.x, f.z) + Math.PI / 2, 0, 'YXZ');
}

function dropBody(game) {
  const p = game.player;
  const g = p.carrying;
  p.carrying = null;
  g.carried = false;
  const f = p.forward();
  g.pos.set(p.pos.x + f.x * 0.9, Math.max(0, game.world.grid.floorAt(p.pos.x + f.x * 0.9, p.pos.z + f.z * 0.9)), p.pos.z + f.z * 0.9);
  if (!Number.isFinite(g.pos.y)) g.pos.y = p.pos.y;
  g.deathT = 1;
  g.hiddenBody = game.inHideZone(g.pos);
  audio.play('body_fall', { volume: 0.6 });
  if (g.hiddenBody) game.hud.message('Kroppen är gömd.', '#80c0a0', 2);
}

export function useEmp(game) {
  const p = game.player;
  if (p.energy < EMP_COST) { game.hud.message('För lite kärnenergi.', '#d06040', 1.5); return; }
  p.energy -= EMP_COST;
  audio.play('emp', { volume: 1 });
  game.effects.empPulse(p.pos.clone().add(new THREE.Vector3(0, 1, 0)));
  for (const c of game.cameras) if (c.pos.distanceTo(p.pos) < EMP_RADIUS + 2) c.emp(9);
  for (const d of game.drones) if (d.pos.distanceTo(p.pos) < EMP_RADIUS + 3) d.emp(9);
  for (const b of game.bossTargets()) if (b.emp && b.pos.distanceTo(p.pos) < EMP_RADIUS + 6) b.emp(game);
  game.emitNoise(p.pos.clone(), 5);
}

export function updateAbilities(game, dt) {
  const p = game.player;
  if (game.thermal) {
    p.energy = Math.max(0, p.energy - THERMAL_DRAIN * dt);
    if (p.energy <= 0) toggleThermal(game, false);
  } else {
    p.energy = Math.min(100, p.energy + dt * 3.2);
  }
}

export function toggleThermal(game, on = !game.thermal) {
  if (on && game.player.energy < 5) return;
  game.thermal = on;
  sharedUniforms.uThermal.value = on ? 1 : 0;
  audio.play('thermal_on', { volume: on ? 0.8 : 0.5, rate: on ? 1 : 0.8 });
}

export function useRepair(game) {
  const { player, inv } = game;
  if (inv.repair <= 0) { game.hud.message('Inga reparationspaket.', '#a09880', 1.5); return; }
  if (player.health >= player.maxHealth) return;
  inv.repair -= 1;
  player.health = Math.min(player.maxHealth, player.health + 50);
  audio.play('pickup', { volume: 0.7, rate: 0.8 });
  game.hud.message('+50 integritet', '#80c0a0', 2);
}
