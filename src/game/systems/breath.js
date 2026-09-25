import * as THREE from 'three';
import { createMaterial } from '../../engine/material.js';

// Breath in the cold: every living figure near the camera puffs a small
// cloud every few seconds (faster when running or alarmed). Pure atmosphere;
// only on levels with snow. Pooled soft sprites.

const POOL = 48;
const LIFE = 1.6;
const RANGE = 18;

function puffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export class Breath {
  constructor() {
    this.puffs = [];
    this.group = null;
  }

  load(game) {
    this.enabled = (game.level.snow ?? 0) > 0 || !!game.level.snowfall;
    if (!this.group) {
      this.group = new THREE.Group();
      this.mat = createMaterial({ map: puffTexture(), lit: false, transparent: true, alphaTest: 0.01, color: 0xdce6f0, opacity: 0.5 });
      const geo = new THREE.PlaneGeometry(0.35, 0.35);
      for (let i = 0; i < POOL; i++) {
        const m = new THREE.Mesh(geo, this.mat.clone());
        m.visible = false;
        this.group.add(m);
        this.puffs.push({ m, t: LIFE, vel: new THREE.Vector3() });
      }
    }
    game.scene.add(this.group);
    this.timers = new Map();
  }

  clear() {
    for (const p of this.puffs) { p.m.visible = false; p.t = LIFE; }
  }

  emit(pos, yaw) {
    const p = this.puffs.find((x) => x.t >= LIFE);
    if (!p) return;
    p.t = 0;
    p.m.visible = true;
    p.m.position.set(pos.x + Math.sin(yaw) * 0.22, pos.y, pos.z + Math.cos(yaw) * 0.22);
    p.vel.set(Math.sin(yaw) * 0.25, 0.18, Math.cos(yaw) * 0.25);
  }

  update(game, dt) {
    if (!this.enabled) return;
    const cam = game.camera.position;
    const figures = [
      { key: game.player, pos: game.player.pos, yaw: game.player.yaw + Math.PI, head: game.player.crouch ? 1.05 : 1.62, fast: game.player.speed > 3, show: game.player.obj?.visible && !game.player.hidden },
      ...game.guards.filter((g) => g.active && !g.carried).map((g) => ({ key: g, pos: g.pos, yaw: g.yaw, head: 1.62, fast: g.state === 'alert', show: true })),
      ...game.npcs.filter((n) => !n.hidden && !n.holo).map((n) => ({ key: n, pos: n.pos, yaw: n.yaw, head: n.def.eyeY ?? 1.55, fast: false, show: true })),
    ];
    for (const f of figures) {
      if (!f.show || f.pos.distanceTo(cam) > RANGE) continue;
      const t = (this.timers.get(f.key) ?? Math.random() * 3) - dt;
      if (t <= 0) {
        this.emit(new THREE.Vector3(f.pos.x, f.pos.y + f.head, f.pos.z), f.yaw);
        this.timers.set(f.key, f.fast ? 0.9 + Math.random() * 0.4 : 2.6 + Math.random() * 1.2);
      } else {
        this.timers.set(f.key, t);
      }
    }
    for (const p of this.puffs) {
      if (p.t >= LIFE) continue;
      p.t += dt;
      const k = p.t / LIFE;
      p.m.position.addScaledVector(p.vel, dt);
      p.m.quaternion.copy(game.camera.quaternion);
      p.m.scale.setScalar(0.6 + k * 1.6);
      p.m.material.uniforms.uOpacity.value = 0.5 * (1 - k) * Math.min(1, k * 6);
      if (p.t >= LIFE) p.m.visible = false;
    }
  }
}
