import * as THREE from 'three';
import { createMaterial } from '../engine/material.js';

// Blob shadows under characters (PS1 style). The texture is generated once.

let shadowMat = null;

function shadowMaterial() {
  if (shadowMat) return shadowMat;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  // Hard-edged dithered disc so it survives the PS1 alpha test look.
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5) / 15.5;
      const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]][y % 4][x % 4] / 16;
      if (d < 1 && (1 - d) * 1.6 > bayer) {
        g.fillStyle = '#000';
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  shadowMat = createMaterial({ map: tex, lit: false, alphaTest: 0.5, opacity: 0.55, transparent: true, side: THREE.DoubleSide });
  return shadowMat;
}

export function makeShadow(parent, size = 0.8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), shadowMaterial());
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  parent.add(m);
  return m;
}
