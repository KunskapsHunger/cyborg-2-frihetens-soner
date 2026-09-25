import { audio } from '../../engine/audio.js';
import { THOUGHTS } from '../../story/lines.js';

// "Lyssna in" (hold R): the Kallocain ability. Drains core energy. Guards in
// front of you within range are marked (their patrol routes show on the
// radar) and the nearest one's private thought is read. NPCs with
// `thought`/`scout` in their definition can be read too (Haga's scouts).

const RANGE = 16;
const HALF_ANGLE = 1.0;
const DRAIN = 14;       // energy per second
const READ_TIME = 0.9;  // seconds of focus before a thought comes through

export class Scan {
  constructor() {
    this.active = false;
    this.focus = null;
    this.focusT = 0;
    this.read = new Set();
  }

  load() { this.active = false; this.focus = null; this.read = new Set(); }
  clear() { this.active = false; this.focus = null; }

  thoughtFor(game, target) {
    if (target.def.thought) return target.def.thought;
    const list = THOUGHTS ?? [];
    if (!list.length) return null;
    const seed = [...`${game.level.id}:${target.def.index ?? target.def.id ?? 0}`].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 11);
    return list[seed % list.length];
  }

  candidates(game) {
    const p = game.player;
    const out = [];
    const consider = (t) => {
      const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > RANGE || d < 0.3) return;
      const ang = Math.atan2(dx, dz);
      const face = Math.atan2(-Math.sin(p.yaw), -Math.cos(p.yaw));
      if (Math.abs(Math.atan2(Math.sin(ang - face), Math.cos(ang - face))) > HALF_ANGLE) return;
      out.push({ t, d });
    };
    for (const g of game.guards) if (g.active) consider(g);
    for (const n of game.npcs) if (!n.hidden && (n.def.thought || n.def.scout)) consider(n);
    return out.sort((a, b) => a.d - b.d);
  }

  update(game, dt) {
    const p = game.player;
    const held = game.input.isDown('KeyR') && !p.hidden && !p.dead && p.energy > 1;
    if (held && !this.active) audio.play('scan_on', { volume: 0.7 });
    this.active = held;
    game.scanning = held;
    if (!held) { this.focus = null; this.focusT = 0; return; }
    p.energy = Math.max(0, p.energy - DRAIN * dt);
    if (Math.floor(game.time * 1.5) !== Math.floor((game.time - dt) * 1.5)) audio.play('scan_pulse', { volume: 0.35 });
    const list = this.candidates(game);
    for (const { t } of list) t.scannedT = 6;
    const nearest = list[0]?.t ?? null;
    if (nearest !== this.focus) { this.focus = nearest; this.focusT = 0; }
    if (!nearest) return;
    this.focusT += dt;
    const key = nearest.def.id ?? nearest;
    if (this.focusT >= READ_TIME && !this.read.has(key)) {
      this.read.add(key);
      const text = this.thoughtFor(game, nearest);
      if (text) game.hud.showThought(text, 5);
      game.level.script?.onScan?.(game, nearest);
      game.stats.scans = (game.stats.scans ?? 0) + 1;
    }
  }
}
