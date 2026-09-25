import * as THREE from 'three';
import { instantiateModel, findPart } from '../../engine/assets.js';
import { audio } from '../../engine/audio.js';

// Lockers: hide inside (E), knock from inside (F), stash a carried body.
// A guard who saw you step in walks over and opens the door.
// Level entity: { type: 'locker', x, z, rot }

const REACH = 1.1;

export class Lockers {
  constructor() {
    this.list = [];
    this.inside = null;
  }

  async load(game, world) {
    const defs = world.spawns.extra.locker ?? [];
    this.list = await Promise.all(defs.map(async (def) => {
      const obj = await instantiateModel('locker2', { unique: true, cut: true });
      const yaw = def.rot ?? 0;
      const floor = Math.max(0, world.grid.floorAt(def.x, def.z));
      obj.position.set(def.x, floor, def.z);
      obj.rotation.y = yaw;
      game.actors.add(obj);
      world.grid.addBox(def.x - 0.32, def.z - 0.3, def.x + 0.32, def.z + 0.3, floor, floor + 2, 'locker');
      const front = new THREE.Vector3(def.x + Math.sin(yaw) * 0.75, floor, def.z + Math.cos(yaw) * 0.75);
      return { def, obj, door: findPart(obj, 'door'), yaw, front, open: 0, want: 0, body: null };
    }));
    this.inside = null;
  }

  clear() { this.list = []; this.inside = null; }

  near(pos) {
    return this.list.find((l) => Math.hypot(l.front.x - pos.x, l.front.z - pos.z) < REACH) ?? null;
  }

  interactions(game) {
    const p = game.player;
    if (this.inside) return [{ label: '[E] Kliv ut   [F] Knacka', action: () => this.exit(game), priority: 10 }];
    const l = this.near(p.pos);
    if (!l) return [];
    if (p.carrying && !l.body) return [{ label: '[E] Lägg kroppen i skåpet', action: () => this.stash(game, l), priority: 6 }];
    if (!p.carrying && !l.body && !p.boxed) return [{ label: '[E] Göm dig i skåpet', action: () => this.enter(game, l), priority: 3 }];
    return [];
  }

  enter(game, l) {
    const p = game.player;
    this.inside = l;
    p.hidden = true;
    p.frozen = true;
    p.pos.set(l.def.x, l.front.y, l.def.z);
    p.yaw = l.yaw + Math.PI;
    l.want = 1;
    audio.play('locker_open', { pos: p.pos, volume: 0.8 });
    game.later(0.5, () => { l.want = 0; audio.play('locker_close', { pos: l.front, volume: 0.7 }); });
    // Anyone who was already watching saw where you went.
    for (const g of game.guards) {
      if (g.active && (g.state === 'alert' || g.awareness > 0.35)) g.checkLocker(l, game.enemyCtx());
    }
  }

  exit(game) {
    const l = this.inside;
    const p = game.player;
    this.inside = null;
    p.hidden = false;
    p.frozen = false;
    p.pos.copy(l.front);
    l.want = 1;
    audio.play('locker_open', { pos: l.front, volume: 0.7 });
    game.later(0.6, () => { l.want = 0; });
  }

  stash(game, l) {
    const p = game.player;
    const g = p.carrying;
    p.carrying = null;
    g.carried = false;
    g.hiddenBody = true;
    g.obj.visible = false;
    g.pos.set(l.def.x, l.front.y, l.def.z);
    l.body = g;
    l.want = 1;
    audio.play('locker_open', { pos: l.front, volume: 0.8 });
    audio.play('body_drag', { pos: l.front, volume: 0.6 });
    game.later(0.6, () => { l.want = 0; audio.play('locker_close', { pos: l.front, volume: 0.7 }); });
    game.hud.message('Kroppen ligger i skåpet.', '#80c0a0', 2);
  }

  /** A guard opens a locker: finds the player or a colleague. */
  checkedBy(game, guard, l) {
    l.want = 1;
    audio.play('locker_open', { pos: l.front, volume: 0.9 });
    game.later(1.2, () => { l.want = 0; });
    if (this.inside === l) {
      this.exit(game);
      guard.awareness = 1;
      game.alarm.spotted(game.player.pos);
    } else if (l.body && !l.body.found) {
      l.body.found = true;
      l.body.obj.visible = true;
      game.bark(guard, 'body');
      game.alarm.raiseCaution(l.front);
    }
  }

  knock(game) {
    if (!this.inside) return false;
    audio.play('knock', { pos: this.inside.front, volume: 0.9 });
    game.emitNoise(this.inside.front.clone(), 7, 'knock');
    return true;
  }

  update(game, dt) {
    for (const l of this.list) {
      // A stashed guard who comes round climbs back out.
      if (l.body?.active) {
        l.body.obj.visible = true;
        l.body.pos.copy(l.front);
        l.body = null;
        l.want = 1;
        game.later(0.8, () => { l.want = 0; });
      }
      l.open += (l.want - l.open) * Math.min(1, dt * 7);
      if (l.door) l.door.rotation.y = -l.open * 1.6;
    }
    if (this.inside && game.input.wasPressed('KeyF')) this.knock(game);
  }
}
