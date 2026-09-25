import * as THREE from 'three';
import { materialFor } from '../engine/assets.js';

// Pooled billboard particles, bullet-hole / blood decals and tracer lines.

const MAX_PARTICLES = 160;
const MAX_DECALS = 80;

export class Effects {
  constructor(scene, lights) {
    this.scene = scene;
    this.lights = lights;
    this.group = new THREE.Group();
    this.group.name = 'effects';
    scene.add(this.group);
    this.particles = [];
    this.decals = [];
    this.tracers = [];
    this.quad = new THREE.PlaneGeometry(1, 1);
  }

  reset() {
    for (const p of this.particles) this.group.remove(p.mesh);
    for (const d of this.decals) this.group.remove(d);
    for (const t of this.tracers) this.group.remove(t.line);
    this.particles = [];
    this.decals = [];
    this.tracers = [];
    if (!this.group.parent) this.scene.add(this.group);
  }

  spawn({ pos, vel, tex = 'fx_spark', size = 0.12, life = 0.4, gravity = 6, color = 0xffffff, additive = false, grow = 0 }) {
    if (this.particles.length >= MAX_PARTICLES) {
      const old = this.particles.shift();
      this.group.remove(old.mesh);
    }
    const mat = materialFor(tex, { lit: false, additive, color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(this.quad, mat);
    mesh.position.copy(pos);
    mesh.scale.setScalar(size);
    mesh.rotation.z = Math.random() * Math.PI * 2;
    this.group.add(mesh);
    this.particles.push({ mesh, vel: vel.clone(), life, maxLife: life, gravity, size, grow });
  }

  impact(point, normal, kind = 'rock') {
    const n = new THREE.Vector3(normal.x, normal.y, normal.z);
    const p = new THREE.Vector3(point.x, point.y, point.z).addScaledVector(n, 0.02);
    if (kind === 'flesh') {
      for (let i = 0; i < 7; i++) {
        this.spawn({ pos: p, vel: rand3(2.2).addScaledVector(n, 1.5), tex: 'blood', size: 0.14, life: 0.5, gravity: 9, color: 0xaa2222 });
      }
      return;
    }
    if (kind === 'dart') {
      this.spawn({ pos: p, vel: n.clone().multiplyScalar(0.3), tex: 'fx_spark', size: 0.1, life: 0.3, gravity: 0, additive: true, color: 0x80ffe0 });
      return;
    }
    const sparkColor = kind === 'metal' ? 0xa0e0ff : 0xffd080;
    for (let i = 0; i < (kind === 'metal' ? 9 : 5); i++) {
      this.spawn({ pos: p, vel: rand3(2.5).addScaledVector(n, 2.5), tex: 'fx_spark', size: 0.06, life: 0.25, gravity: 8, additive: true, color: sparkColor });
    }
    for (let i = 0; i < 2; i++) {
      this.spawn({ pos: p, vel: rand3(0.3).addScaledVector(n, 0.6), tex: 'fx_smoke', size: 0.3, life: 0.8, gravity: -0.4, color: 0x807a70, grow: 0.6 });
    }
  }

  /** Expanding ring of cyan sparks + a flash of light. */
  empPulse(center) {
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      this.spawn({ pos: center, vel: new THREE.Vector3(Math.cos(a) * 9, 0.4, Math.sin(a) * 9), tex: 'fx_spark', size: 0.22, life: 0.55, gravity: 0, additive: true, color: 0x60e8ff });
    }
    this.lights.add({ pos: center.clone(), color: 0x60e8ff, range: 12, intensity: 2.5, ttl: 0.35, decay: 7 });
  }

  decal(pos, normal, tex, size) {
    const mat = materialFor(tex, { side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(this.quad, mat);
    mesh.position.copy(pos);
    mesh.lookAt(pos.clone().add(normal));
    mesh.rotateZ(Math.random() * Math.PI * 2);
    mesh.scale.setScalar(size);
    this.group.add(mesh);
    this.decals.push(mesh);
    if (this.decals.length > MAX_DECALS) this.group.remove(this.decals.shift());
  }

  bloodPool(pos) {
    this.decal(new THREE.Vector3(pos.x, pos.y + 0.03, pos.z), new THREE.Vector3(0, 1, 0), 'blood', 1.2 + Math.random() * 0.6);
  }

  muzzleLight(pos, color = 0xffc070, intensity = 2.2, range = 9) {
    this.lights.add({ pos, color, range, intensity, ttl: 0.06, decay: 20 });
  }

  tracer(from, to, color = 0xffe0a0) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
    this.group.add(line);
    this.tracers.push({ line, life: 0.06 });
  }

  update(dt, camera) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.quaternion.copy(camera.quaternion);
      const s = p.size * (1 + p.grow * (1 - p.life / p.maxLife));
      p.mesh.scale.setScalar(s * Math.max(0.2, p.life / p.maxLife + 0.3));
    }
    const dead = this.particles.filter((p) => p.life <= 0);
    for (const p of dead) this.group.remove(p.mesh);
    if (dead.length) this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.tracers) {
      t.life -= dt;
      if (t.life <= 0) { this.group.remove(t.line); t.line.geometry.dispose(); }
    }
    this.tracers = this.tracers.filter((t) => t.life > 0);
  }
}

export function rand3(s) {
  return new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
}
