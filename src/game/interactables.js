import * as THREE from 'three';
import { instantiateModel, findPart, materialFor } from '../engine/assets.js';
import { audio } from '../engine/audio.js';

// Sliding doors with keycard levels, pickups, and body-hiding zones.

export class Door {
  constructor(def, obj, grid) {
    this.def = def;
    this.obj = obj;
    this.panel = findPart(obj, 'panel');
    this.level = def.level ?? 0;
    this.locked = !!def.locked;
    this.open = 0;
    this.want = 0;
    this.pos = new THREE.Vector3(def.x, 0, def.z);
    this.grid = grid;
    const alongX = Math.abs(Math.sin(def.rot ?? 0)) < 0.5;
    const hw = 1.5, t = 0.25;
    // The door blocks from its own floor up (doors on raised storeys too).
    const floor = Math.max(0, grid.floorAt(def.x, def.z));
    this.box = alongX
      ? grid.addBox(def.x - hw, def.z - t, def.x + hw, def.z + t, floor, floor + 3, 'door')
      : grid.addBox(def.x - t, def.z - hw, def.x + t, def.z + hw, floor, floor + 3, 'door');
    this.boxOpen = false;
    this.denyT = 0;
  }

  update(dt, game) {
    this.denyT = Math.max(0, this.denyT - dt);
    const near = (p) => Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 2.6;
    let want = 0;
    const p = game.player;
    if (near(p.pos) && !this.locked) {
      if (this.level === 0 || game.inv.keycards.has(this.level)) want = 1;
      else if (this.denyT <= 0) {
        this.denyT = 3;
        audio.play('keycard_deny', { pos: this.pos, volume: 0.8 });
        game.hud.message(`Kräver nyckelkort ${this.level}.`, '#d06040', 2);
      }
    }
    if (!this.locked) for (const g of game.guards) if (g.active && near(g.pos)) want = 1;
    if (want !== this.want) {
      this.want = want;
      audio.play(want && this.level > 0 ? 'keycard_ok' : 'door_slide', { pos: this.pos, volume: 0.7 });
      if (want && this.level > 0) audio.play('door_slide', { pos: this.pos, volume: 0.7 });
    }
    this.open += (this.want - this.open) * Math.min(1, dt * 6);
    if (this.panel) this.panel.position.x = this.panelBase + this.open * 2.8;
    const shouldBeOpen = this.open > 0.6;
    if (shouldBeOpen !== this.boxOpen) {
      this.boxOpen = shouldBeOpen;
      if (shouldBeOpen) this.grid.removeBox(this.box);
      else this.grid.boxes.push(this.box);
    }
  }
}

export async function spawnDoor(def, world, parent) {
  const obj = await instantiateModel('door_slide', { unique: true, cut: true });
  obj.position.set(def.x, Math.max(0, world.grid.floorAt(def.x, def.z)), def.z);
  obj.rotation.set(0, def.rot ?? 0, 0, 'YXZ');
  parent.add(obj);
  const d = new Door(def, obj, world.grid);
  d.panelBase = d.panel ? d.panel.position.x : 0;
  if (def.level > 0) {
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), materialFor('keycard', { lit: false }));
    card.position.set(1.8, 1.4, 0.2);
    card.material = card.material.clone();
    card.material.uniforms = { ...materialFor('keycard', { lit: false }).uniforms, uColor: { value: new THREE.Color(KEY_COLORS[def.level] ?? 0xffffff) } };
    obj.add(card);
  }
  return d;
}

export const KEY_COLORS = { 1: 0x60d0ff, 2: 0xffc040, 3: 0xff5050 };

export const PICKUPS = {
  tranq: { tex: 'gun_metal', size: [0.3, 0.15, 0.2], label: 'Pilar till paralysatorn', apply: (g, e) => { g.inv.ammo.tranq += e.amount ?? 6; } },
  pistol: { tex: 'gun_metal', size: [0.25, 0.15, 0.2], label: 'Patroner till tjänstevapnet', apply: (g, e) => { g.inv.ammo.pistol += e.amount ?? 8; } },
  repair: { tex: 'ration', size: [0.35, 0.2, 0.25], label: 'Reparationspaket', apply: (g) => { g.inv.repair = Math.min(5, g.inv.repair + 1); } },
  battery: { tex: 'battery', size: [0.2, 0.3, 0.2], label: 'Kärnbatteri', apply: (g) => { g.player.energy = Math.min(100, g.player.energy + 50); } },
  keycard: { tex: 'keycard', size: [0.3, 0.02, 0.2], label: 'Nyckelkort', apply: (g, e) => { g.inv.keycards.add(e.level ?? 1); } },
  item: { tex: 'server_panel', size: [0.3, 0.1, 0.3], label: 'Föremål', apply: (g, e) => { g.inv.items.add(e.item); } },
};

export class Pickup {
  constructor(def, mesh) {
    this.def = def;
    this.mesh = mesh;
    this.taken = false;
    this.baseY = mesh.position.y;
    this.t = Math.random() * 6;
  }

  update(dt) {
    this.t += dt;
    this.mesh.rotation.y += dt * 1.4;
    this.mesh.position.y = this.baseY + 0.25 + Math.sin(this.t * 2.5) * 0.06;
  }
}

export function spawnPickup(def, world, parent) {
  const kind = PICKUPS[def.kind];
  const [w, h, d] = kind.size;
  const mat = materialFor(kind.tex, def.kind === 'keycard' ? { lit: false } : {});
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  if (def.kind === 'keycard') {
    mesh.material = mat.clone();
    mesh.material.uniforms = { ...mat.uniforms, uColor: { value: new THREE.Color(KEY_COLORS[def.level] ?? 0xffffff) } };
  }
  // Height is relative to the ground cell (not to the desk/box it may sit on).
  const ground = world.grid.cellAt(def.x, def.z)?.floor ?? 0;
  mesh.position.set(def.x, ground + (def.y ?? 0), def.z);
  parent.add(mesh);
  return new Pickup(def, mesh);
}
