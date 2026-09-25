import * as THREE from 'three';
import { materialFor } from '../engine/assets.js';

// Rain: a single dynamic mesh of camera-facing streak quads that live in a
// box around the view target and wrap around as they fall.

export class Rain {
  constructor(scene, count = 420) {
    this.count = count;
    this.box = { w: 26, h: 14, d: 26 };
    this.drops = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * this.box.w,
      y: Math.random() * this.box.h,
      z: (Math.random() - 0.5) * this.box.d,
      s: 14 + Math.random() * 6,
    }));
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 6 * 3);
    const uv = new Float32Array(count * 6 * 2);
    for (let i = 0; i < count; i++) uv.set([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], i * 12);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.mesh = new THREE.Mesh(geo, materialFor('fx_rain', { lit: false, additive: true, color: 0x8090a0, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    scene.add(this.mesh);
    this.intensity = 1;
    this.windX = 0.18;
  }

  set visible(v) { this.mesh.visible = v; }

  update(dt, center, camera, grid = null) {
    if (!this.mesh.visible) return;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    right.y = 0;
    right.normalize().multiplyScalar(0.025);
    const len = 0.55;
    const { w, h, d } = this.box;
    const p = this.pos;
    for (let i = 0; i < this.count; i++) {
      const r = this.drops[i];
      r.y -= r.s * dt;
      r.x += r.s * this.windX * dt;
      if (r.y < 0) { r.y += h; r.x = (Math.random() - 0.5) * w; r.z = (Math.random() - 0.5) * d; }
      if (r.x > w / 2) r.x -= w;
      const x = center.x + r.x, z = center.z + r.z;
      // No rain over roofed interiors (they are drawn open for the cutaway camera).
      const y = grid?.get(Math.floor(x), Math.floor(z))?.indoor ? -500 : center.y + r.y - 2;
      const tx = x + this.windX * len, ty = y + len;
      const o = i * 18;
      p[o] = x - right.x; p[o + 1] = y; p[o + 2] = z - right.z;
      p[o + 3] = x + right.x; p[o + 4] = y; p[o + 5] = z + right.z;
      p[o + 6] = tx + right.x; p[o + 7] = ty; p[o + 8] = z + right.z;
      p[o + 9] = x - right.x; p[o + 10] = y; p[o + 11] = z - right.z;
      p[o + 12] = tx + right.x; p[o + 13] = ty; p[o + 14] = z + right.z;
      p[o + 15] = tx - right.x; p[o + 16] = ty; p[o + 17] = z - right.z;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}
