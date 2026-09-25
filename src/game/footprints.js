import * as THREE from 'three';
import { materialFor } from '../engine/assets.js';

// Footprints in snow. The player leaves prints on snowy cells; they fade as
// fresh snow fills them. Guards that pass fresh prints follow them towards
// the newest one (see guard.js `tracks` state). Prints are pooled decals.

const MAX_PRINTS = 160;
const STRIDE = 0.75;          // metres between prints
const FILL_TIME = 75;         // seconds until snowfall covers a print
const NOTICE_RANGE = 1.8;     // a guard notices prints this close
const SNOW_FLOOR = /snow/;
// One print quad shared by every level's pool.
const PRINT_GEO = new THREE.PlaneGeometry(0.22, 0.34).rotateX(-Math.PI / 2);

export class Footprints {
  constructor(parent) {
    this.prints = [];
    this.pool = [];
    this.group = new THREE.Group();
    this.group.name = 'footprints';
    parent.add(this.group);
    this.mat = materialFor('footprint', { transparent: true, lit: true });
    this.lastPos = null;
    this.left = false;
    this.fillTime = FILL_TIME;
  }

  clear() {
    for (const p of this.prints) { p.mesh.visible = false; this.pool.push(p.mesh); }
    this.prints = [];
    this.lastPos = null;
  }

  /** Called every frame with the player's position; drops a print per stride on snow. */
  track(pos, yaw, cell, crouching) {
    if (!cell || !SNOW_FLOOR.test(cell.ft ?? '')) { this.lastPos = null; return; }
    if (this.lastPos && this.lastPos.distanceTo(pos) < STRIDE) return;
    this.lastPos = pos.clone();
    this.left = !this.left;
    const side = this.left ? 0.12 : -0.12;
    const x = pos.x + Math.cos(yaw) * side;
    const z = pos.z - Math.sin(yaw) * side;
    this.add(x, cell.floor + 0.02, z, yaw, crouching ? 0.8 : 1);
  }

  add(x, y, z, yaw, scale) {
    let mesh = this.pool.pop();
    if (!mesh) {
      if (this.prints.length >= MAX_PRINTS) {
        const old = this.prints.shift();
        mesh = old.mesh;
      } else {
        mesh = new THREE.Mesh(PRINT_GEO, this.mat);
        this.group.add(mesh);
      }
    }
    mesh.visible = true;
    mesh.position.set(x, y, z);
    mesh.rotation.set(0, yaw, 0);
    mesh.scale.setScalar(scale);
    this.prints.push({ mesh, x, z, yaw, t: 0 });
  }

  update(dt) {
    for (const p of this.prints) {
      p.t += dt;
      const fade = 1 - Math.min(1, p.t / this.fillTime);
      p.mesh.scale.y = Math.max(0.01, fade);
      if (p.t > this.fillTime) p.mesh.visible = false;
    }
    while (this.prints.length && this.prints[0].t > this.fillTime) this.pool.push(this.prints.shift().mesh);
  }

  /** Fresh print near a point, or null. Returns the index so a follower can walk the trail. */
  noticeAt(x, z) {
    for (let i = this.prints.length - 1; i >= 0; i--) {
      const p = this.prints[i];
      if (p.t > this.fillTime * 0.7) continue;
      if (Math.hypot(p.x - x, p.z - z) < NOTICE_RANGE) return i;
    }
    return -1;
  }

  /** The print a follower should head to next, a few steps along the trail. */
  nextAlong(index, lookahead = 4) {
    const i = Math.min(this.prints.length - 1, index + lookahead);
    return i >= 0 ? { index: i, x: this.prints[i].x, z: this.prints[i].z } : null;
  }

  get newestIndex() { return this.prints.length - 1; }
}
