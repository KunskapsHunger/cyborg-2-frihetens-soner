import * as THREE from 'three';
import { createMaterial } from '../engine/material.js';

// Snowfall: camera-facing flake quads in a box around the view target. Flakes
// drift, sway and wrap around; wind gusts (blizzard levels) push them sideways
// and speed them up. `gust` (0..1) is read by the game to shorten vision.

const FLAKE_UV = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];

/** Soft round flake, drawn once at runtime. */
function flakeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export class Snow {
  constructor(scene, count = 1400) {
    this.count = count;
    this.box = { w: 30, h: 16, d: 30 };
    this.flakes = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * this.box.w,
      y: Math.random() * this.box.h,
      z: (Math.random() - 0.5) * this.box.d,
      s: 0.8 + Math.random() * 1.4,
      size: 0.03 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
    }));
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 6 * 3);
    const uv = new Float32Array(count * 12);
    for (let i = 0; i < count; i++) uv.set(FLAKE_UV, i * 12);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.mesh = new THREE.Mesh(geo, createMaterial({ map: flakeTexture(), lit: false, additive: true, alphaTest: 0.01, color: 0xb8c4d4, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    scene.add(this.mesh);
    this.mesh.visible = false;
    this.wind = new THREE.Vector2(0.4, 0.1);
    this.blizzard = 0;
    this.gust = 0;
    this.gustT = 6;
    this.time = 0;
  }

  set visible(v) { this.mesh.visible = v; }
  get visible() { return this.mesh.visible; }

  /** @param {number} blizzard 0 = calm snowfall, 1 = storm with gusts */
  configure({ blizzard = 0, wind = [0.4, 0.1] } = {}) {
    this.blizzard = blizzard;
    this.wind.set(...wind);
    this.gust = 0;
  }

  updateGust(dt) {
    if (this.blizzard <= 0) { this.gust = Math.max(0, this.gust - dt); return; }
    this.gustT -= dt;
    if (this.gustT <= 0) {
      this.gustT = 7 + Math.random() * 9;
      this.gustPeak = 0.6 + Math.random() * 0.4;
      this.gustLife = 3 + Math.random() * 2;
      this.gustAge = 0;
      this.onGust?.(this.gustPeak * this.blizzard);
    }
    if (this.gustLife) {
      this.gustAge += dt;
      const t = this.gustAge / this.gustLife;
      this.gust = t < 1 ? Math.sin(Math.PI * t) * this.gustPeak * this.blizzard : 0;
      if (t >= 1) this.gustLife = 0;
    }
  }

  update(dt, center, camera) {
    this.time += dt;
    this.updateGust(dt);
    if (!this.mesh.visible) return;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const { w, h, d } = this.box;
    const push = 1 + this.blizzard * 2.5 + this.gust * 6;
    const wx = this.wind.x * push, wz = this.wind.y * push;
    const fall = 1 + this.blizzard * 0.8 + this.gust;
    const p = this.pos;
    for (let i = 0; i < this.count; i++) {
      const f = this.flakes[i];
      f.y -= f.s * fall * dt;
      f.x += (wx + Math.sin(this.time * 1.3 + f.phase) * 0.35) * dt;
      f.z += (wz + Math.cos(this.time * 1.1 + f.phase) * 0.25) * dt;
      if (f.y < 0) { f.y += h; f.x = (Math.random() - 0.5) * w; f.z = (Math.random() - 0.5) * d; }
      if (f.x > w / 2) f.x -= w; else if (f.x < -w / 2) f.x += w;
      if (f.z > d / 2) f.z -= d; else if (f.z < -d / 2) f.z += d;
      const x = center.x + f.x, y = center.y + f.y - 3, z = center.z + f.z;
      const sx = right.x * f.size, sy = right.y * f.size, sz = right.z * f.size;
      const ux = up.x * f.size, uy = up.y * f.size, uz = up.z * f.size;
      const o = i * 18;
      // two triangles: (-r-u) (+r-u) (+r+u) / (-r-u) (+r+u) (-r+u)
      p[o] = x - sx - ux; p[o + 1] = y - sy - uy; p[o + 2] = z - sz - uz;
      p[o + 3] = x + sx - ux; p[o + 4] = y + sy - uy; p[o + 5] = z + sz - uz;
      p[o + 6] = x + sx + ux; p[o + 7] = y + sy + uy; p[o + 8] = z + sz + uz;
      p[o + 9] = p[o]; p[o + 10] = p[o + 1]; p[o + 11] = p[o + 2];
      p[o + 12] = p[o + 6]; p[o + 13] = p[o + 7]; p[o + 14] = p[o + 8];
      p[o + 15] = x - sx + ux; p[o + 16] = y - sy + uy; p[o + 17] = z - sz + uz;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}
