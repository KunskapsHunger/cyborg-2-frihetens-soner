import * as THREE from 'three';
import { materialFor } from '../engine/assets.js';

// Vision helpers shared by guards, cameras and drones: can-see tests with a
// visibility factor (light, crouching, distance) and a ground-projected
// vision cone mesh clipped by walls.

const tmp = new THREE.Vector3();

/**
 * How visible is the player from `eye` looking along `dir` (yaw)?
 * Returns 0 (not seen) .. ~1.5 (plainly seen, close, lit).
 */
export function sightFactor(grid, eye, yaw, pitchDown, cone, player, lightLevel) {
  if (player.dead) return 0;
  const target = player.eye();
  target.y -= player.crouch ? 0.3 : 0.5;
  tmp.subVectors(target, eye);
  const dist = tmp.length();
  if (dist > cone.range) return 0;
  const flat = Math.hypot(tmp.x, tmp.z);
  const angle = Math.atan2(tmp.x, tmp.z);
  let d = angle - yaw;
  d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
  const near = dist < cone.near;
  if (d > cone.half && !(near && d < cone.half * 2.2)) return 0;
  if (pitchDown !== undefined) {
    const pitch = Math.atan2(eye.y - target.y, flat);
    if (Math.abs(pitch - pitchDown) > (cone.vHalf ?? 0.7)) return 0;
  }
  if (!grid.lineOfSight(eye.x, eye.y, eye.z, target.x, target.y, target.z)) return 0;
  const distK = 1 - dist / cone.range;
  const lit = 0.45 + Math.min(1, lightLevel) * 0.8;
  const stance = player.crouch ? 0.55 : player.running ? 1.35 : 1;
  return (0.35 + distK * 1.2) * lit * stance;
}

/** Brightness at a point from the level's lights (0..1+). */
export function lightLevelAt(lights, pos, ambient = 0.2) {
  let l = ambient;
  for (const light of lights.lights) {
    if (!light.enabled || light.tag === 'player') continue;
    const d = light.pos.distanceTo(pos);
    if (d < light.range) l += (1 - d / light.range) ** 2 * light.intensity * 0.8;
  }
  return l;
}

/** Ground-projected vision cone, rebuilt each frame from wall raycasts. */
export class ConeMesh {
  constructor(parent, rays = 14) {
    this.rays = rays;
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array((rays + 1) * 3 * 3);
    this.uvs = new Float32Array((rays + 1) * 3 * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    this.mat = materialFor('cone', { lit: false, transparent: true, color: 0xffffff, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.material = this.mat.clone();
    this.mesh.material.uniforms = { ...this.mat.uniforms, uColor: { value: new THREE.Color(0xffffff) }, uOpacity: { value: 0.35 } };
    parent.add(this.mesh);
  }

  setColor(hex, opacity) {
    this.mesh.material.uniforms.uColor.value.setHex(hex);
    this.mesh.material.uniforms.uOpacity.value = opacity;
  }

  update(grid, origin, yaw, half, range, floorY) {
    const y = floorY + 0.06;
    const p = this.positions, u = this.uvs;
    let pi = 0, ui = 0;
    const pts = [];
    for (let i = 0; i <= this.rays; i++) {
      const a = yaw - half + (2 * half * i) / this.rays;
      const dx = Math.sin(a), dz = Math.cos(a);
      const hit = grid.raycast(origin.x, floorY + 1.0, origin.z, dx, 0, dz, range, 0.25);
      const r = hit ? hit.dist : range;
      pts.push([origin.x + dx * r, origin.z + dz * r, r / range]);
    }
    for (let i = 0; i < this.rays; i++) {
      const a = pts[i], b = pts[i + 1];
      p.set([origin.x, y, origin.z, a[0], y, a[1], b[0], y, b[1]], pi);
      u.set([0.5, 0, 0.5 - 0.5 * a[2], a[2], 0.5 + 0.5 * b[2], b[2]], ui);
      pi += 9;
      ui += 6;
    }
    this.mesh.geometry.setDrawRange(0, this.rays * 3);
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.uv.needsUpdate = true;
  }

  set visible(v) { this.mesh.visible = v; }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
