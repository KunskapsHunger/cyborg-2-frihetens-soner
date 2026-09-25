import * as THREE from 'three';
import { audio } from '../../engine/audio.js';
import { DOGTAGS } from '../../story/lines.js';

// Hold-ups (MGS2): aim at an unaware guard from close behind and he raises
// his hands. Walk up and press E to shake him down: he drops ammo and his ID
// tag (a collectible). Knock (F) on a wall in front of you to lure guards.

const RANGE = 5;
const AIM_DOT = 0.965;
const tmp = new THREE.Vector3();

export class Holdup {
  interactions(game) {
    const p = game.player;
    for (const g of game.guards) {
      if (!g.heldUp || g.shaken) continue;
      if (Math.hypot(g.pos.x - p.pos.x, g.pos.z - p.pos.z) < 1.5) {
        return [{ label: '[E] Skaka honom', action: () => this.shake(game, g), priority: 8 }];
      }
    }
    return [];
  }

  /** Tag for a guard: stable per level so reloading gives the same person. */
  tagFor(game, g) {
    const list = DOGTAGS ?? [];
    if (!list.length) return null;
    const seed = [...`${game.level.id}:${g.def.index ?? 0}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return list[seed % list.length];
  }

  shake(game, g) {
    g.shaken = true;
    g.holdupT = Math.max(g.holdupT, 2.5);
    audio.play('dogtag', { pos: g.pos, volume: 0.9 });
    game.inv.ammo.tranq += 3;
    const tag = this.tagFor(game, g);
    if (tag && !game.stats.dogtags.includes(tag.name)) {
      game.stats.dogtags.push(tag.name);
      game.recordDogtag?.(tag.name);
      game.hud.message(`ID-BRICKA: ${tag.name.toUpperCase()} (${tag.born})`, '#e8d8a0', 4);
      game.later(1.2, () => game.hud.message(tag.line, '#b8b0a0', 4));
    } else {
      game.hud.message('+3 pilar', '#c8e0b0', 2);
    }
  }

  update(game) {
    const p = game.player;
    if (game.mode !== 'mission' || game.cam.fp < 0.5) {
      if (game.input.wasPressed('KeyF')) this.knock(game);
      return;
    }
    // Aiming in first person: anyone in the sights from behind raises his hands.
    const dir = game.camera.getWorldDirection(tmp);
    const eye = game.camera.position;
    for (const g of game.guards) {
      if (!g.active || g.state === 'alert') continue;
      const dx = g.pos.x - eye.x, dz = g.pos.z - eye.z;
      const d = Math.hypot(dx, dz);
      if (d > RANGE || d < 0.5) continue;
      const aim = (dx * dir.x + dz * dir.z) / (d * Math.hypot(dir.x, dir.z));
      if (aim < AIM_DOT) continue;
      const toPlayer = Math.atan2(p.pos.x - g.pos.x, p.pos.z - g.pos.z);
      const rel = Math.abs(Math.atan2(Math.sin(toPlayer - g.yaw), Math.cos(toPlayer - g.yaw)));
      if (g.heldUp || rel > 1.9) g.holdUp(game.enemyCtx());
    }
  }

  /** F against a wall: a knock that draws nearby guards. */
  knock(game) {
    const p = game.player;
    if (p.hidden || p.carrying) return;
    const f = p.forward();
    const eye = p.eye();
    const hit = game.world.grid.raycast(eye.x, eye.y - 0.4, eye.z, f.x, 0, f.z, 1.1);
    if (!hit) return;
    audio.play('knock', { pos: hit.point, volume: 0.9 });
    game.emitNoise(p.pos.clone(), 8, 'knock');
  }
}
