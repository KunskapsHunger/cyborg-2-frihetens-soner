import * as THREE from 'three';
import { instantiateModel } from '../../engine/assets.js';
import { audio } from '../../engine/audio.js';

// C4 charges on the tower's pillars (MGS2's Big Shell). Walk up with the
// freeze spray and hold E to freeze a charge. The radar shows the charges;
// the level script hears about each one (`bombFrozen`).
// Level entity: { type: 'bomb', id, x, y, z, rot }

const REACH = 1.4;
const SPRAY_TIME = 1.6;

export class Bombs {
  constructor() { this.list = []; }

  async load(game, world) {
    const defs = world.spawns.extra.bomb ?? [];
    const done = new Set(game.restoreState?.frozen ?? []);
    this.list = await Promise.all(defs.map(async (def) => {
      const obj = await instantiateModel('bomb', { unique: true });
      obj.position.set(def.x, def.y ?? 1.2, def.z);
      obj.rotation.y = def.rot ?? 0;
      game.actors.add(obj);
      const light = game.lights.add({ pos: new THREE.Vector3(def.x, (def.y ?? 1.2) + 0.1, def.z), color: 0xff2010, range: 2.5, intensity: 0.8, strobe: 1.2 });
      const b = { def, obj, light, frozen: done.has(def.id), sprayT: 0 };
      if (b.frozen) this.freezeLook(b);
      return b;
    }));
  }

  clear() { this.list = []; }

  get remaining() { return this.list.filter((b) => !b.frozen).length; }

  freezeLook(b) {
    b.light.enabled = false;
    b.obj.traverse((o) => { if (o.isMesh) o.material.uniforms.uTint.value.setRGB(1.6, 1.8, 2.2); });
  }

  near(pos) {
    return this.list.find((b) => !b.frozen && Math.hypot(b.def.x - pos.x, b.def.z - pos.z) < REACH) ?? null;
  }

  interactions(game) {
    const b = this.near(game.player.pos);
    if (!b) return [];
    if (!game.inv.items.has('spray')) return [{ label: 'Du behöver frysspray', action: () => {}, priority: 2 }];
    return [{ label: '[E håll] Frys laddningen', action: () => {}, hold: true, priority: 7 }];
  }

  update(game, dt) {
    if (Math.floor(game.time) !== Math.floor(game.time - dt)) {
      for (const b of this.list) if (!b.frozen && b.obj.position.distanceTo(game.player.pos) < 8) audio.play('bomb_beep', { pos: b.obj.position, volume: 0.35 });
    }
    const b = this.near(game.player.pos);
    const spraying = b && game.inv.items.has('spray') && game.input.isDown('KeyE') && !game.player.carrying;
    game.player.spraying = !!spraying;
    for (const x of this.list) if (x !== b) x.sprayT = 0;
    if (!spraying) return;
    if (b.sprayT === 0) audio.play('spray', { pos: b.obj.position, volume: 0.9 });
    b.sprayT += dt;
    game.effects.frost?.(b.obj.position);
    if (b.sprayT >= SPRAY_TIME) {
      b.frozen = true;
      b.sprayT = 0;
      this.freezeLook(b);
      audio.play('bomb_freeze', { pos: b.obj.position, volume: 1 });
      game.frozenBombs = [...(game.frozenBombs ?? []), b.def.id];
      game.level.script?.bombFrozen?.(game, b.def.id, this.remaining);
    }
  }
}
