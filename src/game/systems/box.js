import { instantiateModel } from '../../engine/assets.js';
import { audio } from '../../engine/audio.js';

// The cardboard box. B puts it on (if carried) or takes it off. Under the box
// you move at a crouch; guards ignore a still box at a distance and grow
// suspicious of one that walks (see guard.js).

export class Box {
  constructor() {
    this.mesh = null;
  }

  async load(game) {
    if (!this.mesh) {
      this.mesh = await instantiateModel('box', { snow: false });
      this.mesh.visible = false;
      game.scene.add(this.mesh);
    }
    this.off(game, true);
  }

  clear(game) { if (this.mesh) this.off(game, true); }

  get available() { return true; }

  on(game) {
    const p = game.player;
    if (p.carrying || p.hidden || p.choke > 0) return;
    p.boxed = true;
    p.crouch = true;
    this.mesh.visible = true;
    audio.play('box_rustle', { volume: 0.8 });
  }

  off(game, silent = false) {
    const p = game.player;
    if (!p) return;
    p.boxed = false;
    if (this.mesh) this.mesh.visible = false;
    if (!silent) audio.play('box_rustle', { volume: 0.6, rate: 1.2 });
  }

  update(game, dt) {
    const p = game.player;
    if (game.mode === 'mission' && game.inv.items.has('box') && game.input.wasPressed('KeyB')) {
      if (p.boxed) this.off(game); else this.on(game);
    }
    if (!p.boxed || !this.mesh) return;
    if (p.carrying || p.hidden || game.cam.fp > 0.5) { this.off(game); return; }
    p.crouch = true;
    p.obj.visible = false;
    this.mesh.position.set(p.pos.x, p.pos.y, p.pos.z);
    this.mesh.rotation.y = p.yaw;
    // A little wobble when it walks.
    this.mesh.rotation.z = p.speed > 0.4 ? Math.sin(game.time * 12) * 0.04 : 0;
    if (p.speed > 0.4 && Math.random() < dt * 1.5) audio.play('box_rustle', { volume: 0.25, rate: 0.9 + Math.random() * 0.3 });
  }
}
