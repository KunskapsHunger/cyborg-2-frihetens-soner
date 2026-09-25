import * as THREE from 'three';
import { materialFor } from '../engine/assets.js';
import { CELL } from './grid.js';

// Builds render meshes for a CityGrid: ground floors, water, quay risers,
// building facades (with an optional ground-floor band) and roofs. Faces are
// batched per texture. Walls and roofs take part in the camera cutaway.

const SKIRT = 0.3;

class Batch {
  constructor() { this.pos = []; this.uv = []; }
  quad(p0, p1, p2, p3, u0, u1, u2, u3, n) {
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const flip = c[0] * n[0] + c[1] * n[1] + c[2] * n[2] < 0;
    const tri = (a, b, d, ua, ub, ud) => {
      this.pos.push(...a, ...b, ...d);
      this.uv.push(...ua, ...ub, ...ud);
    };
    if (flip) { tri(p0, p2, p1, u0, u2, u1); tri(p0, p3, p2, u0, u3, u2); }
    else { tri(p0, p1, p2, u0, u1, u2); tri(p0, p2, p3, u0, u2, u3); }
  }
}

const EDGES = [
  { nx: 1, nz: 0, a: [1, 0], b: [1, 1] },
  { nx: -1, nz: 0, a: [0, 1], b: [0, 0] },
  { nx: 0, nz: 1, a: [1, 1], b: [0, 1] },
  { nx: 0, nz: -1, a: [0, 0], b: [1, 0] },
];

export function buildCityMesh(grid) {
  const batches = new Map();
  // Indoor floors get their own batch so they never collect snow.
  const batch = (tex, cut, indoor = false) => {
    const key = `${tex}|${cut ? 1 : 0}|${indoor ? 1 : 0}`;
    if (!batches.has(key)) batches.set(key, { tex, cut, indoor, b: new Batch() });
    return batches.get(key).b;
  };

  for (let z = 0; z < grid.depth; z++) {
    for (let x = 0; x < grid.width; x++) {
      const c = grid.get(x, z);
      if (c) {
        openCell(grid, batch, c, x, z);
      } else {
        const b = grid.blockAt(x, z);
        if (b) blockCell(grid, batch, b, x, z);
      }
    }
  }

  addSkirt(grid, batch);

  const group = new THREE.Group();
  group.name = 'city';
  for (const { tex, cut, indoor, b } of batches.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const glow = /^sim_|^neon/.test(tex);
    const mesh = new THREE.Mesh(geo, materialFor(tex, { ...(cut ? { cut: true } : {}), ...(glow ? { lit: false } : indoor ? {} : { snow: true }) }));
    mesh.name = `city_${tex}`;
    if (tex === 'water') mesh.userData.water = true;
    group.add(mesh);
  }
  return group;
}

// Ground continues past the map edge so the camera never looks into the void.
// Each side takes the most common floor (texture + height) along that edge.
const MARGIN = 20;

function edgeGround(grid, cells) {
  const count = new Map();
  for (const [x, z] of cells) {
    const c = grid.get(x, z);
    const b = c ? null : grid.blockAt(x, z);
    const key = c ? `${c.ft}|${c.floor}|${c.floorScale ?? 4}` : b ? `${b.rt === 'roof_tar' ? 'asphalt_wet' : b.rt}|0|4` : null;
    if (key) count.set(key, (count.get(key) ?? 0) + 1);
  }
  const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'asphalt_wet|0|4';
  const [ft, floor, fs] = best.split('|');
  return { ft, floor: Number(floor), fs: Number(fs) };
}

function addSkirt(grid, batch) {
  const W = grid.width, D = grid.depth, M = MARGIN;
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const sides = [
    { cells: range(W).map((x) => [x, 0]), rect: [-M, -M, W + M, 0] },
    { cells: range(W).map((x) => [x, D - 1]), rect: [-M, D, W + M, D + M] },
    { cells: range(D).map((z) => [0, z]), rect: [-M, 0, 0, D] },
    { cells: range(D).map((z) => [W - 1, z]), rect: [W, 0, W + M, D] },
  ];
  for (const { cells, rect } of sides) {
    const { ft, floor: y, fs } = edgeGround(grid, cells);
    const [x0, z0, x1, z1] = rect;
    const uv = (px, pz) => [px / fs, pz / fs];
    // Tiled in 4 m squares: large quads warp badly under affine texturing.
    for (let z = z0; z < z1; z += 4) {
      for (let x = x0; x < x1; x += 4) {
        const xa = Math.min(x + 4, x1), za = Math.min(z + 4, z1);
        batch(ft, false).quad(
          [x, y, z], [xa, y, z], [xa, y, za], [x, y, za],
          uv(x, z), uv(xa, z), uv(xa, za), uv(x, za), [0, 1, 0]);
      }
    }
  }
}

function openCell(grid, batch, c, x, z) {
  const fs = c.floorScale ?? 4;
  const y = c.floor;
  const uv = (px, pz) => (c.fRot ? [pz / fs, px / fs] : [px / fs, pz / fs]);
  batch(c.ft, false, c.indoor).quad(
    [x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1],
    uv(x, z), uv(x + 1, z), uv(x + 1, z + 1), uv(x, z + 1), [0, 1, 0]);
  // Risers down to lower neighbours (quay edges, kerbs, steps).
  for (const e of EDGES) {
    const n = grid.get(x + e.nx, z + e.nz);
    if (!n || n.floor >= y - 0.01) continue;
    const ax = x + e.a[0], az = z + e.a[1], bx = x + e.b[0], bz = z + e.b[1];
    const ua = e.nx !== 0 ? az : ax, ub = e.nx !== 0 ? bz : bx;
    const h = y - n.floor;
    batch(c.et ?? 'sidewalk', false).quad(
      [ax, n.floor, az], [bx, n.floor, bz], [bx, y, bz], [ax, y, az],
      [ua / 2, 0], [ub / 2, 0], [ub / 2, h / 2], [ua / 2, h / 2], [e.nx, 0, e.nz]);
  }
}

function blockCell(grid, batch, b, x, z) {
  // Roof
  if (b.h > 0.05) {
    const rs = 4;
    batch(b.rt, true).quad(
      [x, b.h, z], [x + 1, b.h, z], [x + 1, b.h, z + 1], [x, b.h, z + 1],
      [x / rs, z / rs], [(x + 1) / rs, z / rs], [(x + 1) / rs, (z + 1) / rs], [x / rs, (z + 1) / rs], [0, 1, 0]);
  }
  // Facades facing open cells (and lower neighbouring blocks).
  for (const e of EDGES) {
    const nx = x + e.nx, nz = z + e.nz;
    if (!grid.inBounds(nx, nz)) continue;
    const n = grid.get(nx, nz);
    let base;
    if (n) base = n.floor - SKIRT;
    else {
      const nb = grid.blockAt(nx, nz);
      if (!nb || nb.h >= b.h) continue;
      base = nb.h;
    }
    const top = b.h;
    if (top <= base) continue;
    const ax = (x + e.a[0]) * CELL, az = (z + e.a[1]) * CELL;
    const bx = (x + e.b[0]) * CELL, bz = (z + e.b[1]) * CELL;
    const along = (px, pz) => (e.nx !== 0 ? pz : px) * (e.nx + e.nz > 0 ? 1 : -1);
    const ua = along(ax, az) / b.wu, ub = along(bx, bz) / b.wu;
    const ground = n ? n.floor : base;
    const quad = (tex, y0, y1, v0, v1) => batch(tex, true).quad(
      [ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az],
      [ua, v0], [ub, v0], [ub, v1], [ua, v1], [e.nx, 0, e.nz]);
    if (b.lower && n) {
      const split = Math.min(top, ground + b.lowerH);
      quad(b.lower, base, split, (base - ground) / b.lowerH, (split - ground) / b.lowerH);
      if (top > split) quad(b.wt, split, top, (split - ground) / b.wv, (top - ground) / b.wv);
    } else {
      quad(b.wt, base, top, (base - ground) / b.wv, (top - ground) / b.wv);
    }
  }
}
