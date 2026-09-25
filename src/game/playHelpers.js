import * as THREE from 'three';
import { audio } from '../engine/audio.js';
import { sharedUniforms } from '../engine/material.js';
import { PICKUPS } from './interactables.js';
import * as act from './actions.js';

// Per-frame play helpers mixed into Game: alert icons, pickups, triggers,
// the E-interaction prompt and the title-screen camera. Split out of game.js
// to keep it readable; `this` is the Game.

export const playHelpers = {
  updateIcon(g) {
    const show = g.iconT > 0 && !g.down;
    g.iconMesh.visible = show && g.icon === 'alert';
    g.qMesh.visible = show && g.icon === 'question';
    for (const m of [g.iconMesh, g.qMesh]) {
      m.position.set(g.pos.x, g.pos.y + 2.35 + Math.sin(this.time * 8) * 0.05, g.pos.z);
      m.quaternion.copy(this.camera.quaternion);
    }
  },

  updatePickup(p, dt) {
    if (p.taken) return;
    p.update(dt);
    const d = Math.hypot(p.mesh.position.x - this.player.pos.x, p.mesh.position.z - this.player.pos.z);
    // Items on furniture can be grabbed from a bit further away.
    if (d < (p.def.y ? 1.5 : 1) && Math.abs(p.baseY - this.player.pos.y) < 1.5) {
      p.taken = true;
      p.mesh.visible = false;
      const kind = PICKUPS[p.def.kind];
      kind.apply(this, p.def);
      audio.play('pickup', { volume: 0.8 });
      this.hud.message(`+ ${p.def.label ?? kind.label}`, '#c8e0b0', 3);
      this.level.script?.pickup?.(this, p.def);
    }
  },

  updateTriggers() {
    const p = this.player.pos;
    for (const t of this.world.spawns.triggers) {
      if (t.hide) continue;
      const [x0, z0, x1, z1] = t.rect;
      const inside = p.x >= x0 && p.x <= x1 + 1 && p.z >= z0 && p.z <= z1 + 1;
      const entered = inside && !t.inside;
      t.inside = inside;
      if (t.repeat && entered) t.fired = false;
      if (inside && !t.fired) {
        t.fired = true;
        if (t.checkpoint) this.checkpoint(t.checkpoint);
        this.level.script?.trigger?.(this, t.id, t);
      }
    }
  },

  updateInteraction() {
    const p = this.player;
    const input = this.input;
    this.hud.prompt = '';
    if (p.dead || p.choke > 0) return;
    let label = null;
    let action = null;
    if (p.carrying) { label = '[E] Släpp kroppen'; action = () => act.interact(this); }
    else if (this.mode === 'mission') {
      for (const g of this.guards) {
        if (!g.active || g.state === 'alert') continue;
        const d = Math.hypot(g.pos.x - p.pos.x, g.pos.z - p.pos.z);
        const rel = Math.abs(Math.atan2(Math.sin(Math.atan2(p.pos.x - g.pos.x, p.pos.z - g.pos.z) - g.yaw), Math.cos(Math.atan2(p.pos.x - g.pos.x, p.pos.z - g.pos.z) - g.yaw)));
        if (d < 1.35 && rel > 1.9) { label = '[E] Kvävgrepp'; action = () => act.interact(this); break; }
      }
      if (!label) {
        for (const g of this.guards) {
          if (g.down && !g.carried && Math.hypot(g.pos.x - p.pos.x, g.pos.z - p.pos.z) < 1.4) { label = '[E] Bär kroppen'; action = () => act.interact(this); break; }
        }
      }
    }
    if (!label) {
      for (const u of this.world.spawns.uses) {
        if (u.done || (u.when && !u.when(this))) continue;
        if (Math.hypot(u.x - p.pos.x, u.z - p.pos.z) < (u.r ?? 1.6)) { label = `[E] ${u.label}`; action = () => this.level.script?.use?.(this, u); break; }
      }
    }
    // Sequel systems (lockers, hold-ups, bombs …) offer their own actions.
    const extra = Object.values(this.sys).flatMap((s) => s.interactions?.(this) ?? []).sort((a, b) => b.priority - a.priority)[0];
    if (extra && (!label || extra.priority >= 5)) { label = extra.label; action = extra.action; }
    if (label) {
      this.hud.prompt = label;
      if (input.wasPressed('KeyE')) action();
    }
  },

  titleCamera(dt) {
    this.titleT += dt * 0.05;
    const t = this.titleT;
    const target = new THREE.Vector3(30, 12, 40);
    this.camera.position.set(target.x + Math.cos(t) * 34, 9 + Math.sin(t * 0.7) * 2, target.z + Math.sin(t) * 34);
    this.camera.lookAt(target);
    this.cam.target.copy(target);
    sharedUniforms.uCutTarget.value.set(0, 9999, 0);
    sharedUniforms.uSpotColor.value.setRGB(0, 0, 0);
  },
};
