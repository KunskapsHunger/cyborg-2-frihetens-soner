// Staging for the comic panels of CYBÖRG II: every ART id in comics.js mapped
// to a level world, a camera, posed actors, extra props/lights, atmosphere
// overrides and (optionally) a `build(group, { world, camera, lights })` hook
// that adds set dressing the level scripts normally create at runtime (the
// city skyline, sky gradients, snowfall, rooms, printed paper). The Stager
// renders these as PS2 stills. Coordinates are in each level's space.
//
// Panels are rendered at the panel's own aspect with the camera's vertical
// fov kept: wide panels (≈5.7:1) show the same height as a 16:9 still but far
// more width, so wide shots use a narrow fov and keep subjects centred.

import * as THREE from 'three';
import { createMaterial } from '../engine/material.js';
import { loadTexture, getTexture, surfaceFor, instantiateModel, findPart } from '../engine/assets.js';
import { drawText } from '../engine/bitmapFont.js';

const PI = Math.PI;
const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

// Deterministic pseudo-random numbers so stills never change between renders.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------ build helpers
const load = (...names) => Promise.all(names.flat().map(loadTexture));
const undoAll = (...fns) => () => { for (const f of fns) f?.(); };

/** A private engine material for a texture name (or a canvas texture). */
function mat(name, o = {}) {
  const map = typeof name === 'string' ? getTexture(name) : name ?? null;
  const surf = typeof name === 'string' ? surfaceFor(name) : {};
  const m = createMaterial({ map, alphaTest: o.alpha ? 0.5 : 0.01, ...surf, ...o });
  if (o.tint) m.uniforms.uTint.value.setRGB(...o.tint);
  return m;
}

/** Axis-aligned box with world-scaled UVs (like level boxes). */
function box(group, name, x0, x1, y0, y1, z0, z1, o = {}) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv, n = geo.attributes.normal;
  const [su0, sv0] = o.uv ?? [2, 2];
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [a, b] = ay > 0.5 ? [w, d] : ax > 0.5 ? [d, h] : [w, h];
    uv.setXY(i, uv.getX(i) * a / su0, uv.getY(i) * b / sv0);
  }
  const mesh = new THREE.Mesh(geo, o.material ?? mat(name, o));
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  if (o.rot) mesh.rotation.y = o.rot;
  group.add(mesh);
  return mesh;
}

function plane(group, material, x, y, z, w, h, { rot = 0, rx = 0, rz = 0 } = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, rot, rz, 'YXZ');
  group.add(mesh);
  return mesh;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  return t;
}

let flakeTexture = null;
function flakeTex() {
  flakeTexture ??= canvasTex(32, 32, (g) => {
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
  });
  return flakeTexture;
}

/** Soft additive light blob (lamps through snow haze, lanterns under water). */
function glowMat(color, k = 1, fog = true) {
  return mat(flakeTex(), { lit: false, additive: true, color, tint: [k, k, k], fog, side: THREE.DoubleSide });
}

/** Camera basis vectors. */
function basis(cam) {
  const e = cam.matrixWorld.elements;
  return { right: new THREE.Vector3(e[0], e[1], e[2]), up: new THREE.Vector3(e[4], e[5], e[6]), back: new THREE.Vector3(e[8], e[9], e[10]) };
}

/** Camera-facing quads merged into one mesh: snowflakes, bubbles, streaks. */
function sprites(group, cam, points, material) {
  const { right, up, back } = basis(cam);
  const pos = new Float32Array(points.length * 18);
  const uv = new Float32Array(points.length * 12);
  const U = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
  points.forEach((p, i) => {
    let a = up, b = right;
    if (p.dir) {
      a = p.dir.clone().addScaledVector(back, -p.dir.dot(back)).normalize();
      b = new THREE.Vector3().crossVectors(back, a).normalize();
    }
    const L = p.size * (p.streak ?? 1), W = p.size;
    const c = p.pos;
    const q = (sa, sb) => [c.x + a.x * L * sa + b.x * W * sb, c.y + a.y * L * sa + b.y * W * sb, c.z + a.z * L * sa + b.z * W * sb];
    const v = [q(-1, -1), q(-1, 1), q(1, 1), q(-1, -1), q(1, 1), q(1, -1)];
    v.forEach((vv, k) => pos.set(vv, i * 18 + k * 3));
    uv.set(U, i * 12);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  group.add(mesh);
  return mesh;
}

/** Snowfall in the camera's view volume (deterministic). */
function flakes(group, cam, { n = 700, near = 1.2, far = 30, size = 0.0035, seed = 1, color = 0xc4cede, k = 1, streak = 1, dir = null, aspect = 3.2 } = {}) {
  const r = rng(seed);
  const { right, up, back } = basis(cam);
  const t = Math.tan((cam.fov * PI) / 360);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const d = near + (far - near) * r() ** 1.6;
    const pos = cam.position.clone().addScaledVector(back, -d).addScaledVector(right, (r() * 2 - 1) * t * aspect * d).addScaledVector(up, (r() * 2 - 1) * t * d);
    pts.push({ pos, size: size * d * (0.55 + r() * 0.9), streak, dir });
  }
  return sprites(group, cam, pts, glowMat(color, k));
}

/** Blobs of light at world positions, facing the camera. */
function glows(group, cam, list, color, k = 1, fog = true) {
  return sprites(group, cam, list.map(([x, y, z, s]) => ({ pos: new THREE.Vector3(x, y, z), size: s })), glowMat(color, k, fog));
}

/** Vertical sky gradient on a huge plane behind everything. stops: [t, css] from bottom (0) to top (1). */
function sky(group, cam, stops, { dist = 900, y0 = -50, y1 = 400 } = {}) {
  const tex = canvasTex(4, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, h, 0, 0);
    for (const [t, c] of stops) grad.addColorStop(t, c);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const { back } = basis(cam);
  const f = new THREE.Vector3(-back.x, 0, -back.z).normalize();
  const c = cam.position.clone().addScaledVector(f, dist);
  const m = plane(group, mat(tex, { lit: false, fog: false }), c.x, (y0 + y1) / 2, c.z, dist * 14, y1 - y0, { rot: Math.atan2(-f.x, -f.z) });
  m.renderOrder = -1;
  return m;
}

/** Push the far plane out for city vistas; returns the undo. */
function farPlane(cam, far) {
  const old = cam.far;
  cam.far = far;
  return () => { cam.far = old; };
}

/** Actors (everything the stager added to the scene except the world and this set). */
function actorsIn(group, world) {
  return group.parent.children.filter((o) => o !== group && o !== world.root);
}

/** Indoors: no shoulder snow on coats; rim light so figures read against the dark. */
function dressActors(group, world, { rim = 0.5, dry = true } = {}) {
  for (const a of actorsIn(group, world)) {
    a.traverse((o) => {
      if (dry && (o.name === 'snow' || o.name === 'hat')) o.visible = false;
      if (o.isMesh && o.material.uniforms?.uRim && rim) o.material.uniforms.uRim.value = rim;
    });
  }
}

/** Level floors that must not carry procedural snow indoors (their scripts do this at runtime). */
function dryFloors(world, names) {
  const city = world.root.getObjectByName('city');
  for (const m of city?.children ?? []) {
    if (!names.includes(m.name) || m.userData.dry) continue;
    const dm = m.material.clone();
    dm.uniforms = { ...m.material.uniforms, uSnowOn: { value: 0 } };
    m.material = dm;
    m.userData.dry = true;
  }
}

/** A model instance placed in the set. */
async function model(group, name, x, y, z, { rot = 0, rx = 0, rz = 0, scale = 1, tint = null, lit = true } = {}) {
  const o = await instantiateModel(name, { unique: true, lit });
  o.position.set(x, y, z);
  o.rotation.set(rx, rot, rz, 'YXZ');
  o.scale.setScalar(scale);
  if (tint) o.traverse((m) => { if (m.isMesh) m.material.uniforms.uTint.value.setRGB(...tint); });
  group.add(o);
  return o;
}

/** Paint a model part as a self-lit colour (beacons, screens, eyes). */
function glowPart(obj, part, color, k = 1) {
  const p = findPart(obj, part);
  p?.traverse((m) => {
    if (!m.isMesh) return;
    m.material.uniforms.uLit.value = 0;
    m.material.uniforms.uColor.value.set(color);
    m.material.uniforms.uTint.value.setRGB(k, k, k);
  });
  return p;
}

// ------------------------------------------------------------ Gothenburg
// The city around the river level (its skyline, bridge and tower details are
// built by the level script, which never runs for a still).
const FACADES = ['facade_haga', 'facade_landshovding', 'facade_concrete', 'facade_brick'];
const CITY_TEX = [...FACADES, 'facade_glass', 'window_lit', 'window_advent', 'ice_river', 'cobble_snow', 'roof_snow', 'tower_glass', 'concrete_raw', 'snow_fresh'];

function boxGeo(w, h, d, wu, wv) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv, n = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [su, sv] = ay > 0.5 ? [w / 4, d / 4] : ax > 0.5 ? [d / wu, h / wv] : [w / wu, h / wv];
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  return geo;
}

/**
 * Dark city blocks with individual lit windows (warm, or with an advent star)
 * on the faces that look towards the camera.
 * rows: [{ x0, x1, z0, z1, step, h: [min, max] }]
 */
function cityBlocks(group, cam, rows, { seed = 7, lit = 0.12, advent = 0.08, color = 0x3a3e4c, winColor = 0xffb860, k = 1.4, y = 1.2 } = {}) {
  const r = rng(seed);
  const sides = FACADES.map((t) => mat(t, { lit: false, color }));
  const roof = mat('roof_snow', { tint: [0.6, 0.62, 0.72] });
  const warm = [], star = [];
  const c = cam.position;
  const quad = (list, ax, az, x, yy, z, w, h) => list.push([x, yy, z, x + ax * w, z + az * w, h]);
  for (const row of rows) {
    for (let x = row.x0; x < row.x1; x += row.step * (0.8 + r() * 0.4)) {
      const w = row.step * (0.6 + r() * 0.3), d = 8 + r() * 6;
      const h = row.h[0] + (row.h[1] - row.h[0]) * r() * r();
      const z = row.z0 + (row.z1 - row.z0 - d) * r();
      const side = sides[Math.floor(r() * sides.length)];
      const mesh = new THREE.Mesh(boxGeo(w, h, d, 5, 3), [side, side, roof, roof, side, side]);
      mesh.position.set(x + w / 2, y + h / 2, z + d / 2);
      group.add(mesh);
      const pl = lit * (0.4 + r() * 1.2), pa = advent * (0.4 + r() * 1.2);
      const faces = [];
      if (c.z < z) faces.push([1, 0, x, z - 0.03, w]);
      if (c.z > z + d) faces.push([-1, 0, x + w, z + d + 0.03, w]);
      if (c.x < x) faces.push([0, -1, x - 0.03, z + d, d]);
      if (c.x > x + w) faces.push([0, 1, x + w + 0.03, z, d]);
      for (const [ax, az, fx, fz, len] of faces) {
        for (let u = 1.2; u < len - 1.4; u += 2.8) {
          for (let v = 2.2; v < h - 1.2; v += 3) {
            const roll = r();
            if (roll < pa) quad(star, ax, az, fx + ax * u, y + v, fz + az * u, 1.3, 1.5);
            else if (roll < pa + pl) quad(warm, ax, az, fx + ax * u, y + v, fz + az * u, 1.3, 1.5);
          }
        }
      }
    }
  }
  const mesh = (list, m) => {
    if (!list.length) return;
    const pos = [], uv = [];
    for (const [x0, y0, z0, x1, z1, h] of list) {
      pos.push(x0, y0, z0, x1, y0, z1, x1, y0 + h, z1, x0, y0, z0, x1, y0 + h, z1, x0, y0 + h, z0);
      uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    group.add(new THREE.Mesh(geo, m));
  };
  mesh(warm, mat(null, { lit: false, color: winColor, tint: [k, k, k], side: THREE.DoubleSide }));
  mesh(star, mat('window_advent', { lit: false, tint: [k, k, k], side: THREE.DoubleSide }));
}

/** The river beyond the level's 110 m: ice, quays and both banks. */
function riverBanks(group, { x0 = -900, x1 = 700 } = {}) {
  box(group, 'ice_river', x0, x1, -0.3, -0.05, 16, 106, { uv: [8, 8] });
  box(group, 'cobble_snow', x0, 0, -0.3, 1.2, -40, 16, { uv: [4, 4] });
  box(group, 'cobble_snow', 110, x1, -0.3, 1.2, -40, 16, { uv: [4, 4] });
  box(group, 'cobble_snow', x0, 0, -0.3, 1.2, 106, 140, { uv: [4, 4] });
  box(group, 'cobble_snow', 110, x1, -0.3, 1.2, 106, 140, { uv: [4, 4] });
  box(group, 'snow_fresh', x0, x1, -0.4, 1.0, -500, -40, { uv: [6, 6] });
  box(group, 'snow_fresh', x0, x1, -0.4, 1.0, 140, 700, { uv: [6, 6] });
}

/** Karlatornet (model) with its red beacon lit; returns [obj, beacon world pos]. */
async function karlatornet(group, cam, x, z, scale, { rot = 0, tint = [0.7, 0.75, 0.85], beacon = 2.6 } = {}) {
  const obj = await model(group, 'karlatornet', x, 0, z, { rot, scale, tint });
  glowPart(obj, 'beacon', 0xff2a18, beacon);
  glowPart(obj, 'sign', 0x60e0ff, 0.9);
  obj.updateMatrixWorld(true);
  const p = new THREE.Vector3();
  findPart(obj, 'beacon')?.getWorldPosition(p);
  glows(group, cam, [[p.x, p.y, p.z, 12 * scale]], 0xff2010, 1.4, false);
  glows(group, cam, [[p.x, p.y, p.z, 40 * scale]], 0xff2010, 0.35, false);
  return [obj, p];
}

async function bridge(group, cam, x, z, scale, rot = PI / 2) {
  const obj = await model(group, 'alvsborgsbron', x, 0, z, { rot, scale, tint: [0.5, 0.55, 0.62] });
  const pts = [];
  for (let t = -1; t <= 1; t += 0.04) {
    const along = t * 640 * scale;
    pts.push([x + Math.sin(rot) * along, 36 * scale + 2, z + Math.cos(rot) * along, 2.2]);
  }
  glows(group, cam, pts, 0xffb060, 1.2);
  return obj;
}

/** Sodium street lamps through snow haze, along the quays. */
function sodium(group, cam, { x0, x1, step = 14, zs = [13, 109], y = 5, size = 2.2, k = 1 }) {
  const pts = [];
  for (const z of zs) for (let x = x0; x < x1; x += step) pts.push([x, y, z, size]);
  return glows(group, cam, pts, 0xff8a30, k);
}

// ------------------------------------------------------------ printed things
/** Christmas card with Sara's stamp (her portrait, a red armband). */
function cardTex() {
  const img = getTexture('portrait_sara2')?.image;
  return canvasTex(256, 176, (g, w, h) => {
    g.fillStyle = '#e8e2d2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b02a24';
    g.fillRect(0, 0, w, 6);
    g.fillRect(0, h - 6, w, 6);
    // Stamp with perforated edge.
    g.fillStyle = '#f4f0e6';
    g.fillRect(150, 12, 94, 112);
    g.fillStyle = '#e8e2d2';
    for (let i = 0; i < 15; i++) { g.fillRect(148 + i * 6.6, 10, 3, 3); g.fillRect(148 + i * 6.6, 123, 3, 3); }
    for (let i = 0; i < 17; i++) { g.fillRect(148, 10 + i * 6.8, 3, 3); g.fillRect(243, 10 + i * 6.8, 3, 3); }
    g.fillStyle = '#20283a';
    g.fillRect(156, 18, 82, 84);
    if (img) g.drawImage(img, 158, 18, 78, 84);
    g.fillStyle = '#d01a14';
    g.fillRect(156, 78, 82, 9);
    drawText(g, 'SVERIGE 12 KR', 197, 107, '#303030', { shadow: null, align: 'center' });
    // Postmark rings over the stamp's corner.
    g.strokeStyle = 'rgba(30,30,50,0.6)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(150, 70, 24, 0, PI * 2); g.stroke();
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(96, 54 + i * 9); g.bezierCurveTo(110, 48 + i * 9, 126, 60 + i * 9, 146, 54 + i * 9); g.stroke(); }
    // Handwritten address (to someone else in the house).
    g.strokeStyle = '#1c2440';
    g.lineWidth = 2;
    const r = rng(5);
    for (let line = 0; line < 3; line++) {
      g.beginPath();
      let x = 40 + line * 6;
      const y = 134 + line * 14;
      g.moveTo(x, y);
      while (x < 132 - line * 14) { x += 4 + r() * 5; g.lineTo(x, y - r() * 8); }
      g.stroke();
    }
  });
}

/** Brown envelope with a printed label. */
function envelopeTex(label) {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#9a7448';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(60,40,20,0.25)';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, 50); g.lineTo(w, 0); g.fill();
    g.fillStyle = '#e8e0cc';
    g.fillRect(60, 64, 150, 30);
    drawText(g, label, 135, 69, '#181410', { shadow: null, align: 'center', scale: 2 });
  });
}

/** Engraved headstone face. */
function stoneTex(lines) {
  const base = getTexture('grave_stone')?.image;
  return canvasTex(160, 160, (g, w, h) => {
    if (base) { g.drawImage(base, 0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 0, w, h); } else { g.fillStyle = '#6a6a6c'; g.fillRect(0, 0, w, h); }
    lines.forEach((l, i) => {
      // Carved letters with snow caught in their lower edges.
      drawText(g, l, w / 2, 44 + i * 30 + 2, '#f4f6fa', { shadow: null, align: 'center', scale: 2 });
      drawText(g, l, w / 2, 44 + i * 30, '#1e1e22', { shadow: null, align: 'center', scale: 2 });
    });
  });
}

/** TV picture: Karlatornet, a news banner and the ticker ÖVNING. */
function newsTex() {
  return canvasTex(128, 96, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#20304c');
    grad.addColorStop(1, '#6a5870');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#0c1018';
    g.fillRect(56, 10, 16, 66);
    g.fillRect(52, 30, 24, 46);
    g.fillRect(0, 62, w, 14);
    g.fillStyle = '#ff2a18';
    g.fillRect(62, 6, 4, 4);
    g.fillStyle = '#c01818';
    g.fillRect(0, 70, w, 26);
    drawText(g, 'ÖVNING', 64, 75, '#ffffff', { shadow: '#400000', align: 'center', scale: 2 });
    for (let y = 0; y < h; y += 2) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y, w, 1); }
  });
}

/** A child's drawing (house, sun, three figures). */
function drawingTex(seed) {
  const r = rng(seed);
  return canvasTex(64, 80, (g, w, h) => {
    g.fillStyle = '#f2eee2';
    g.fillRect(0, 0, w, h);
    const col = () => ['#d03020', '#2050c0', '#20a040', '#e0a020', '#8030a0'][Math.floor(r() * 5)];
    g.lineWidth = 2;
    g.strokeStyle = col(); g.strokeRect(12, 38, 26, 22);
    g.beginPath(); g.moveTo(10, 38); g.lineTo(25, 24); g.lineTo(40, 38); g.stroke();
    g.fillStyle = '#e8c020'; g.beginPath(); g.arc(50, 14, 7, 0, PI * 2); g.fill();
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = col();
      const x = 10 + i * 18, y = 64;
      g.beginPath(); g.arc(x, y, 3, 0, PI * 2); g.moveTo(x, y + 3); g.lineTo(x, y + 10); g.moveTo(x - 4, y + 6); g.lineTo(x + 4, y + 6); g.stroke();
    }
  });
}

/** Handwritten lines on paper (Elsa's song words, Kall's letter). */
function paperTex(seed, { lined = false, ink = '#1a2038', rows = 9 } = {}) {
  const r = rng(seed);
  return canvasTex(96, 128, (g, w, h) => {
    g.fillStyle = '#eeeadc';
    g.fillRect(0, 0, w, h);
    if (lined) { g.fillStyle = '#9ab0d0'; for (let y = 16; y < h; y += 12) g.fillRect(0, y, w, 1); }
    g.strokeStyle = ink;
    g.lineWidth = 1.5;
    for (let i = 0; i < rows; i++) {
      const y = 14 + i * 12;
      let x = 8;
      g.beginPath();
      g.moveTo(x, y);
      const end = 60 + r() * 28;
      while (x < end) { x += 2 + r() * 4; g.lineTo(x, y - r() * 5); }
      g.stroke();
    }
  });
}

// ------------------------------------------------------------ rooms
/**
 * A closed concrete room (cells, visiting room): floor, ceiling, four walls
 * facing inwards; `open` lists walls to leave out ('n','s','e','w').
 */
function room(group, x0, x1, z0, z1, h, { wall = 'concrete_raw', floor = 'concrete_raw', ceil = 'concrete_raw', tint = [1, 1, 1], open = [] } = {}) {
  const t = 0.2;
  box(group, floor, x0, x1, -t, 0, z0, z1, { tint, uv: [2, 2] });
  box(group, ceil, x0, x1, h, h + t, z0, z1, { tint: tint.map((v) => v * 0.8) });
  if (!open.includes('n')) box(group, wall, x0, x1, 0, h, z0 - t, z0, { tint, uv: [2.5, 2.5] });
  if (!open.includes('s')) box(group, wall, x0, x1, 0, h, z1, z1 + t, { tint, uv: [2.5, 2.5] });
  if (!open.includes('w')) box(group, wall, x0 - t, x0, 0, h, z0, z1, { tint, uv: [2.5, 2.5] });
  if (!open.includes('e')) box(group, wall, x1, x1 + t, 0, h, z0, z1, { tint, uv: [2.5, 2.5] });
}

/** Vertical bars between (xa,za) and (xb,zb). */
function bars(group, xa, za, xb, zb, y0, y1, n, thick = 0.035) {
  const m = mat('gun_metal', { tint: [0.6, 0.6, 0.65] });
  for (let i = 0; i <= n; i++) {
    const x = xa + ((xb - xa) * i) / n, z = za + ((zb - za) * i) / n;
    box(group, null, x - thick, x + thick, y0, y1, z - thick, z + thick, { material: m });
  }
}

/** A window opening onto snowy outside light: glass glow + bars + snow on the sill. */
function barredWindow(group, cam, x, y, z, w, h, { axis = 'z', light = 0xbfd0f0, k = 1.4, snowSill = true, n = 5, snow = 0 } = {}) {
  const skyTex = canvasTex(64, 64, (g) => {
    const grad = g.createLinearGradient(0, 64, 0, 0);
    grad.addColorStop(0, '#dfe6f4');
    grad.addColorStop(1, '#8aa0c8');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    // Snow falling outside.
    const r = rng(snow);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < snow; i++) g.fillRect(r() * 64, r() * 64, 1.5, 1.5);
  });
  // axis 'z': a north wall facing +z; axis 'x': an east wall facing -x.
  const along = axis === 'z';
  const rot = along ? 0 : -PI / 2;
  plane(group, mat(skyTex, { lit: false, color: light, tint: [k, k, k], fog: false }), x, y, z, w, h, { rot });
  if (n > 0) {
    if (along) bars(group, x - w / 2, z + 0.06, x + w / 2, z + 0.06, y - h / 2, y + h / 2, n);
    else bars(group, x - 0.06, z - w / 2, x - 0.06, z + w / 2, y - h / 2, y + h / 2, n);
  }
  if (snowSill) {
    if (along) box(group, 'snow_fresh', x - w / 2, x + w / 2, y - h / 2 - 0.02, y - h / 2 + 0.06, z - 0.02, z + 0.12);
    else box(group, 'snow_fresh', x - 0.12, x + 0.02, y - h / 2 - 0.02, y - h / 2 + 0.06, z - w / 2, z + w / 2);
  }
}

// ------------------------------------------------------------ atmospheres
const HOME_NIGHT = { ambient: [0.06, 0.06, 0.09], sky: [0.05, 0.05, 0.08], ground: [0.05, 0.04, 0.04], fogColor: [0.02, 0.02, 0.035], fog: [6, 30], snow: 0.9, frost: 0.05, exposure: 1.35 };
const CITY_NIGHT = { ambient: [0.07, 0.08, 0.12], sky: [0.07, 0.08, 0.14], ground: [0.06, 0.05, 0.05], fogColor: [0.06, 0.07, 0.12], fog: [40, 700], snow: 0.8, bloom: 0.8, exposure: 1.3 };
const DAWN_ICE = { ambient: [0.2, 0.2, 0.26], sky: [0.46, 0.44, 0.6], ground: [0.2, 0.18, 0.22], fogColor: [0.64, 0.5, 0.56], fog: [30, 600], snow: 0.7, bloom: 0.6, exposure: 1.2, frost: 0.1 };
const CELL = { ambient: [0.1, 0.1, 0.12], sky: [0.06, 0.06, 0.08], ground: [0.05, 0.05, 0.06], fogColor: [0.02, 0.02, 0.03], fog: [8, 30], snow: 0, frost: 0.04, bloom: 0.6 };
const UNDERWATER = { ambient: [0.03, 0.08, 0.06], sky: [0.02, 0.06, 0.05], ground: [0.01, 0.03, 0.02], fogColor: [0.012, 0.045, 0.035], fog: [2, 34], snow: 0, frost: 0, bloom: 0.9, exposure: 1.3, grade: { lift: [0, 0.01, 0.01], gamma: [1, 1, 1], gain: [0.9, 1.05, 0.98], saturation: 0.9 } };
const GREY_DAY = { ambient: [0.34, 0.35, 0.38], sky: [0.5, 0.52, 0.56], ground: [0.26, 0.26, 0.28], fogColor: [0.62, 0.64, 0.67], fog: [10, 70], snow: 1, bloom: 0.35, exposure: 1.1, frost: 0.1, grade: { lift: [0.01, 0.01, 0.02], gamma: [1, 1, 1], gain: [1, 1, 1.02], saturation: 0.7 } };

// ------------------------------------------------------------ scene map
export const SCENE_LEVEL = {
  home: 'home', ferry: 'ferry', sim2: 'sim2', frihamnen: 'frihamnen', haga: 'haga', tower: 'tower',
  roof: 'roof', river: 'river', church: 'church', city_snow: 'haga',
};

// Fallback per scene when an art id has no dedicated staging.
export const SCENE_DEFAULT = {
  home: { level: 'home', atmo: HOME_NIGHT, cam: { pos: [26, 2.2, 14.6], look: [30.2, 0.9, 10.5], fov: 50 } },
  ferry: { level: 'ferry', cam: { pos: [41, 7.5, 1], look: [23, 3.5, 21], fov: 50 } },
  sim2: { level: 'sim2', cam: { pos: [34.3, 4.2, 108.4], look: [27.5, 0.4, 114.5], fov: 50 } },
  frihamnen: { level: 'frihamnen', cam: { pos: [88.4, 3.4, 60.2], look: [46, 11, 46], fov: 50 } },
  haga: { level: 'haga', cam: { pos: [4, 7.5, 32.5], look: [26, 2.5, 25], fov: 45 } },
  tower: { level: 'tower', cam: { pos: [45.2, 8.5, 43.8], look: [27, 1.2, 19], fov: 50 } },
  roof: { level: 'roof', cam: { pos: [58, 55, 66], look: [39, 43, 86], fov: 50 } },
  river: { level: 'river', cam: { pos: [66, 5.5, 74], look: [53, 12, 22], fov: 50 } },
  church: { level: 'church', cam: { pos: [20, 7.2, 42.6], look: [20, 2.2, 12], fov: 50 } },
  city_snow: { level: 'haga', cam: { pos: [4, 7.5, 32.5], look: [26, 2.5, 25], fov: 45 } },
};

export const SHOTS = {
  // ================================================================ PROLOG
  // Advent night over the city: the frozen river running west to the bridge,
  // the old tower dark on the right bank, Karlatornet far off with its beacon.
  city_advent: {
    level: 'river', atmo: CITY_NIGHT,
    cam: { pos: [236, 24, 66], look: [-120, 34, 52], fov: 24 },
    lights: [
      { pos: [120, 6, 14], color: 0xff8a30, range: 30, intensity: 1.2 },
      { pos: [120, 6, 110], color: 0xff8a30, range: 30, intensity: 1.2 },
      { pos: [60, 6, 60], color: 0x8090c0, range: 60, intensity: 0.4 },
    ],
    async build(g, { camera }) {
      await load(CITY_TEX);
      const undo = farPlane(camera, 3000);
      sky(g, camera, [[0, '#2a2438'], [0.25, '#141828'], [1, '#05070e']], { dist: 1600, y0: -80, y1: 700 });
      riverBanks(g);
      cityBlocks(g, camera, [
        { x0: -700, x1: 400, z0: -60, z1: -8, step: 13, h: [8, 34] },
        { x0: -700, x1: 400, z0: -150, z1: -70, step: 17, h: [14, 60] },
        { x0: -700, x1: 400, z0: 124, z1: 170, step: 13, h: [10, 30] },
        { x0: -700, x1: 400, z0: 180, z1: 260, step: 18, h: [16, 56] },
      ], { seed: 11, lit: 0.16, advent: 0.14, color: 0x2c303c });
      sodium(g, camera, { x0: -500, x1: 240, step: 16, zs: [13, 109], size: 3.2, k: 1.1 });
      await karlatornet(g, camera, -260, -40, 0.42, { rot: 0.4 });
      await bridge(g, camera, -620, 60, 0.45);
      flakes(g, camera, { n: 700, near: 2, far: 80, size: 0.0024, seed: 3, aspect: 6, k: 0.8 });
      return undo;
    },
  },

  // Seen from the yard through the kitchen window: Henrik in the lamplight,
  // an advent star by his head, snow between us and the glass.
  // The camera stands inside the (solid) house wall, whose inner faces are
  // culled, so the frame we build is the only thing between us and him.
  henrik_window: {
    level: 'home', atmo: { ...HOME_NIGHT, fog: [8, 30] },
    cam: { pos: [29.72, 1.62, 17.96], look: [29.7, 1.58, 15.3], fov: 36 },
    actors: [{ model: 'henrik2', x: 29.7, z: 15.35, rot: 0.05, state: { look: 0.12, lookYaw: 0.1 } }],
    lights: [
      ...Array.from({ length: 8 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [29.1, 1.9, 15.9], color: 0xffa850, range: 1.4, intensity: 2.2 },
      { pos: [30.4, 1.75, 16.2], color: 0x5c80e0, range: 1.3, intensity: 1.8 },
      { pos: [28.4, 2.8, 13.5], color: 0xffc070, range: 5, intensity: 0.9 },
      { pos: [29.7, 1.2, 17.6], color: 0x7890c0, range: 1.2, intensity: 0.8 },
    ],
    async build(g, { world, camera }) {
      await load('facade_haga', 'wood_dark', 'snow_fresh', 'tower_glass');
      dryFloors(world, ['city_wood_floor']);
      dressActors(g, world, { rim: 0.5 });
      // Plaster around the opening (x 29.36..30.06, y 1.36..1.9) at z 17.
      const f = { uv: [2.5, 2.5], tint: [0.55, 0.58, 0.7] };
      box(g, 'facade_haga', 28.6, 29.36, 0.6, 2.8, 17.0, 17.08, f);
      box(g, 'facade_haga', 30.06, 30.9, 0.6, 2.8, 17.0, 17.08, f);
      box(g, 'facade_haga', 29.36, 30.06, 0.6, 1.36, 17.0, 17.08, f);
      box(g, 'facade_haga', 29.36, 30.06, 1.9, 2.8, 17.0, 17.08, f);
      // Frame, cross muntins and the sill with a ridge of snow.
      const wd = { tint: [0.95, 0.93, 0.9] };
      const wood = mat(null, { color: 0xd8d4c8, tint: [0.6, 0.62, 0.7] });
      box(g, null, 29.33, 29.39, 1.34, 1.92, 17.0, 17.1, { material: wood });
      box(g, null, 30.03, 30.09, 1.34, 1.92, 17.0, 17.1, { material: wood });
      box(g, null, 29.33, 30.09, 1.87, 1.92, 17.0, 17.1, { material: wood });
      box(g, null, 29.86, 29.885, 1.36, 1.88, 17.02, 17.06, { material: wood });
      box(g, null, 29.36, 30.06, 1.735, 1.755, 17.02, 17.06, { material: wood });
      box(g, 'wood_dark', 29.3, 30.12, 1.3, 1.36, 17.0, 17.22, wd);
      box(g, 'snow_fresh', 29.32, 30.1, 1.36, 1.395, 17.04, 17.22);
      // The glass: a faint cold sheen over the view.
      plane(g, mat('tower_glass', { transparent: true, opacity: 0.1, lit: false, color: 0x8aa0c8 }), 29.71, 1.63, 17.03, 0.7, 0.54);
      // Advent star hanging inside the window, next to his head.
      const star = await model(g, 'advent_star', 29.52, 1.93, 16.3, { rot: 0.2, scale: 0.3 });
      glowPart(star, 'star', 0xffd8a0, 1.8);
      glows(g, camera, [[29.52, 1.8, 16.28, 0.28]], 0xffb060, 0.9);
      flakes(g, camera, { n: 110, near: 0.15, far: 0.9, size: 0.0055, seed: 9, aspect: 1.5, k: 0.6 });
      return null;
    },
  },

  // Maja tells, Henrik listens, too big for the chair; the album between them.
  maja_table: {
    level: 'home', atmo: { ...HOME_NIGHT, ambient: [0.03, 0.03, 0.05], sky: [0.02, 0.02, 0.04] },
    cam: { pos: [30.2, 1.32, 9.0], look: [30.2, 1.08, 12.4], fov: 21 },
    actors: [
      { model: 'maja2', x: 31.2, y: 0, z: 11.8, pose: 'sit', rot: -PI / 2 - 0.2, state: { reach: 0.75, talk: 0.3, look: 0.15 } },
      { model: 'henrik2', x: 29.2, y: 0, z: 11.8, pose: 'sit', rot: PI / 2, scale: 1.06, state: { look: 0.2, lookYaw: 0.1 } },
    ],
    lights: [
      ...Array.from({ length: 8 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [30.2, 1.95, 11.8], color: 0xffb860, range: 2.4, intensity: 2.2 },
      { pos: [30.2, 1.3, 13.2], color: 0xffd8a0, range: 1.8, intensity: 0.5 },
      { pos: [30.2, 1.8, 15.2], color: 0x5068a8, range: 3, intensity: 0.7 },
      { pos: [30.55, 1.45, 11.95], color: 0xffc080, range: 1.1, intensity: 0.9 },
    ],
    async build(g, { world, camera }) {
      await load('wood_dark', 'stall_canvas');
      dryFloors(world, ['city_wood_floor']);
      dressActors(g, world, { rim: 0.3 });
      // Pendant lamp over the table.
      box(g, null, 30.05, 30.35, 1.95, 2.05, 11.65, 11.95, { material: mat(null, { lit: false, color: 0xffd090, tint: [1.6, 1.6, 1.6] }) });
      box(g, null, 30.19, 30.21, 2.05, 3.4, 11.79, 11.81, { material: mat(null, { color: 0x202020 }) });
      glows(g, camera, [[30.2, 1.96, 11.8, 0.3]], 0xffb050, 0.8);
      // Advent star in the kitchen window behind them.
      const star = await model(g, 'advent_star', 29.8, 2.25, 15.8, { rot: PI, scale: 0.45 });
      glowPart(star, 'star', 0xffd8a0, 1.8);
      glows(g, camera, [[29.8, 2.05, 15.75, 0.4]], 0xffb060, 0.8);
      // Christmas oilcloth and the closed album.
      const cloth = canvasTex(64, 64, (c) => {
        c.fillStyle = '#b8201c'; c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#e8e0d0';
        for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) { c.fillRect(x + 6, y + 2, 3, 12); c.fillRect(x + 2, y + 6, 12, 3); }
      });
      cloth.wrapS = cloth.wrapT = THREE.RepeatWrapping;
      const cm = mat(cloth, {});
      cm.uniforms.uUvScale.value.set(3, 5);
      box(g, null, 29.75, 30.65, 0.765, 0.775, 11.05, 12.55, { material: cm });
      box(g, 'wood_dark', 30.02, 30.32, 0.775, 0.8, 11.62, 12.0, { tint: [0.25, 0.4, 0.3] });
      // Coffee cup in Maja's hands.
      box(g, null, 30.74, 30.8, 0.78, 0.85, 11.77, 11.83, { material: mat(null, { color: 0xd8d0c0 }) });
      return null;
    },
  },

  // The new poster pasted over the old SIM one at the tram stop.
  folkradet_poster: {
    level: 'home', atmo: { ...HOME_NIGHT, ambient: [0.1, 0.11, 0.16], fogColor: [0.1, 0.12, 0.19], fog: [10, 50] },
    cam: { pos: [44.4, 1.6, 62.9], look: [41, 1.75, 61.35], fov: 30 },
    actors: [{ model: 'civilian2', x: 43.35, z: 59.9, pose: 'walk', rot: PI + 0.3, tint: [0.28, 0.29, 0.36], state: { look: 0.25 } }],
    lights: [
      { pos: [42.4, 3.2, 61.2], color: 0xdfe8ff, range: 4.5, intensity: 1.3 },
      { pos: [43, 2.6, 58.5], color: 0xff9a40, range: 5, intensity: 0.9 },
    ],
    async build(g, { camera }) {
      await load('poster_folkradet', 'poster_lugnet', 'snow_fresh');
      const X = 41.02, Z = 61.2;
      plane(g, mat('poster_lugnet', { alpha: true }), X, 1.75, Z + 0.8, 1.1, 2.2, { rot: PI / 2, rz: 0.03 });
      // Torn strip of the old poster.
      plane(g, mat('poster_lugnet', { alpha: true, tint: [0.8, 0.8, 0.8] }), X + 0.005, 0.95, Z + 1.55, 0.4, 0.5, { rot: PI / 2, rz: -0.4 });
      plane(g, mat('poster_folkradet', { alpha: true }), X + 0.01, 1.8, Z, 1.1, 2.2, { rot: PI / 2 });
      // Snow caught on the paper edges.
      box(g, 'snow_fresh', X, X + 0.05, 2.88, 2.93, Z - 0.6, Z + 1.4);
      box(g, 'snow_fresh', X, X + 0.04, 0.66, 0.7, Z - 0.6, Z + 0.5);
      flakes(g, camera, { n: 400, near: 0.5, far: 12, size: 0.003, seed: 21, k: 0.8 });
      return null;
    },
  },

  // Extreme close-up: the Christmas card on the hall mat, in the slush.
  sara_stamp: {
    level: 'home', atmo: { ...HOME_NIGHT, ambient: [0.12, 0.13, 0.17] },
    cam: { pos: [32.47, 0.3, 15.55], look: [32.44, 0.0, 15.31], fov: 36 },
    lights: [
      ...Array.from({ length: 10 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [32.7, 1.1, 16.6], color: 0xb0c8f8, range: 2.6, intensity: 1.9 },
      { pos: [31.7, 0.6, 14.7], color: 0xffa050, range: 1.4, intensity: 0.35 },
    ],
    async build(g, { world }) {
      await load('portrait_sara2', 'puddle', 'footprint', 'snow_trodden');
      dryFloors(world, ['city_wood_floor']);
      // A rag rug (trasmatta) in muted stripes.
      const rug = canvasTex(128, 128, (c, w, h) => {
        const r = rng(3);
        const cols = ['#3a4458', '#6a3a30', '#8a8478', '#2e3440', '#5a6a70', '#7a5a3a'];
        for (let y = 0; y < h; y += 4) { c.fillStyle = cols[Math.floor(r() * cols.length)]; c.fillRect(0, y, w, 4); }
        for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(0,0,0,${r() * 0.25})`; c.fillRect(r() * w, r() * h, 2, 1); }
      });
      box(g, null, 31.95, 33.05, 0, 0.012, 14.95, 15.85, { material: mat(rug, { tint: [0.9, 0.9, 0.95] }) });
      const pud = mat('puddle', { alpha: true, tint: [0.75, 0.8, 0.95] });
      plane(g, pud, 32.2, 0.014, 15.5, 0.3, 0.22, { rx: -PI / 2, rot: 0.6 });
      plane(g, pud, 32.72, 0.014, 15.12, 0.26, 0.2, { rx: -PI / 2, rot: -0.3 });
      plane(g, mat(cardTex(), {}), 32.44, 0.02, 15.31, 0.22, 0.151, { rx: -PI / 2, rot: 0.14 });
      return null;
    },
  },

  // Frog's-eye from the south quay: Karlatornet climbing into the snow, the
  // old tower lower and dark on the left, a crane at its foot.
  karlatornet_rise: {
    level: 'river', atmo: { ...CITY_NIGHT, ambient: [0.1, 0.1, 0.15], fogColor: [0.26, 0.21, 0.32], fog: [20, 500] },
    cam: { pos: [-24, 2.6, 13], look: [-58, 92, -62], fov: 52 },
    lights: [
      { pos: [-26, 5, 14], color: 0xff8a30, range: 12, intensity: 1.2 },
      { pos: [-60, 30, -40], color: 0x9aa8d0, range: 80, intensity: 0.6 },
    ],
    async build(g, { camera }) {
      await load(CITY_TEX, 'crane_red');
      const undo = farPlane(camera, 3000);
      sky(g, camera, [[0, '#4a3c58'], [0.12, '#34304c'], [0.35, '#1c1e32'], [1, '#06080e']], { dist: 500, y0: -100, y1: 3000 });
      riverBanks(g);
      await karlatornet(g, camera, -62, -62, 0.72, { rot: 0.5, tint: [0.75, 0.8, 0.9], beacon: 3 });
      // The old SIM tower: lower, dark, on the left.
      box(g, 'tower_glass', -118, -96, 0, 88, -34, -12, { lit: false, color: 0x262c36, uv: [4, 3.5] });
      box(g, 'metal_plate', -114, -100, 88, 96, -30, -16, { lit: false, color: 0x1c2028 });
      await model(g, 'crane', -30, 0, -40, { rot: 1.1, scale: 1.0, tint: [0.55, 0.45, 0.42] });
      cityBlocks(g, camera, [{ x0: -160, x1: 40, z0: -34, z1: -8, step: 13, h: [6, 14] }], { seed: 5, lit: 0.2, advent: 0.15, color: 0x303440 });
      sodium(g, camera, { x0: -150, x1: -50, step: 12, zs: [12], y: 5, size: 2.6 });
      flakes(g, camera, { n: 600, near: 1, far: 60, size: 0.003, seed: 15, aspect: 3, k: 0.9 });
      return undo;
    },
  },

  // Thursday night surgery on the kitchen table.
  astrom_kitchen: {
    level: 'home', atmo: { ...HOME_NIGHT, ambient: [0.04, 0.04, 0.06] },
    cam: { pos: [27.8, 1.45, 13.9], look: [30.3, 1.12, 11.25], fov: 24 },
    actors: [
      { model: 'henrik2', x: 30.2, y: 0.5, z: 12.95, pose: 'fall', rx: -1.25, rot: 0, rz: 0, state: { look: 0.3, lookYaw: -0.5 } },
      { model: 'astrom', x: 31.0, y: 0, z: 11.45, rot: -PI / 2 - 0.15, state: { reach: 1, crouch: 0.35, look: 0.6 } },
      { model: 'maja2', x: 29.35, y: 0, z: 10.55, rot: 0.63, state: { reach: 1, aim: 0.4, look: 0.35 } },
    ],
    lights: [
      ...Array.from({ length: 12 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [30.25, 1.05, 11.75], color: 0xff8030, range: 1.4, intensity: 2.4 },
      { pos: [30.9, 1.65, 11.3], color: 0xe8f0ff, range: 1.6, intensity: 1.2 },
      { pos: [30.2, 1.5, 10.6], color: 0xffd8a0, range: 2.4, intensity: 1.4 },
      { pos: [33.0, 1.6, 7.9], color: 0x8090c0, range: 3, intensity: 0.7 },
    ],
    spot: { pos: [29.72, 1.3, 11.02], dir: [0.5, -0.35, 0.72], color: [1.8, 1.55, 1.1] },
    async build(g, { world, camera }) {
      await load('office_wall');
      dryFloors(world, ['city_wood_floor']);
      dressActors(g, world, { rim: 0.35 });
      // The glowing core in his open chest.
      box(g, null, 30.14, 30.26, 1.0, 1.06, 11.7, 11.82, { material: mat(null, { lit: false, color: 0xff9030, tint: [2.2, 2.2, 2.2] }) });
      glows(g, camera, [[30.2, 1.07, 11.76, 0.22]], 0xff7020, 1.4);
      // Åström's headlamp and soldering iron.
      glows(g, camera, [[30.9, 1.56, 11.45, 0.05]], 0xffffff, 2.4);
      box(g, null, 30.35, 30.62, 1.12, 1.135, 11.66, 11.675, { material: mat(null, { color: 0x303030 }) }).rotation.z = 0.5;
      // The desk lamp in Maja's hands, aimed at his chest.
      const shade = mat(null, { color: 0x284838 });
      box(g, null, 29.64, 29.8, 1.24, 1.36, 10.96, 11.1, { material: shade }).rotation.y = 0.6;
      box(g, null, 29.62, 29.66, 1.0, 1.26, 10.97, 11.01, { material: mat(null, { color: 0x505050 }) });
      glows(g, camera, [[29.78, 1.28, 11.1, 0.07]], 0xfff0d0, 2);
      // Elsa's drawings on the fridge.
      [[7.35, 1.45, 1], [7.7, 1.3, 2], [7.5, 1.05, 3]].forEach(([z, y, s]) => plane(g, mat(drawingTex(s), {}), 33.12, y, z, 0.24, 0.3, { rot: -PI / 2, rz: (s - 2) * 0.08 }));
      return null;
    },
  },

  // Elsa's room, moon lamp: she holds up the words, he listens by the bed.
  elsa_words: {
    level: 'home', atmo: { ...HOME_NIGHT, ambient: [0.03, 0.03, 0.06], sky: [0.02, 0.02, 0.05] },
    cam: { pos: [25.2, 0.88, 7.3], look: [27.1, 0.82, 5.3], fov: 27 },
    actors: [
      { model: 'elsa_lucia', x: 28.25, y: 0.32, z: 5.05, pose: 'sit', rot: -PI / 2 - 0.35, state: { reach: 1, look: 0.15, lookYaw: -0.3 } },
      { model: 'henrik2', x: 26.55, y: -0.42, z: 5.9, pose: 'sit', rot: -0.35, state: { look: -0.45, lookYaw: 0.4 } },
    ],
    props: [{ model: 'bed', x: 27.6, z: 5.05, rot: PI / 2 }],
    lights: [
      ...Array.from({ length: 9 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [28.7, 0.85, 4.55], color: 0xffd890, range: 2.2, intensity: 1.9 },
      { pos: [26.2, 1.8, 4.3], color: 0x5070c0, range: 3, intensity: 1.1 },
      { pos: [26.2, 1.0, 6.9], color: 0x6078b0, range: 1.8, intensity: 0.5 },
    ],
    async build(g, { world, camera }) {
      await load('snow_fresh', 'wood_dark');
      dryFloors(world, ['city_wood_floor']);
      dressActors(g, world, { rim: 0.45 });
      // Pyjamas, not the lucia gown: no crown, no candles.
      for (const a of actorsIn(g, world)) for (const n of ['crown', 'flames', 'flame_1', 'flame_2', 'flame_3', 'flame_4']) { const p = findPart(a, n); if (p) p.visible = false; }
      // Moon lamp on the bedside table.
      box(g, 'wood_dark', 28.75, 29.2, 0, 0.55, 4.25, 4.7);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(null, { lit: false, color: 0xffe6b0, tint: [1.7, 1.7, 1.7] }));
      moon.position.set(28.95, 0.66, 4.45);
      g.add(moon);
      glows(g, camera, [[28.95, 0.66, 4.45, 0.4]], 0xffd080, 0.9);
      // Window with snow against the pane.
      const nightTex = canvasTex(4, 32, (c) => { const gr = c.createLinearGradient(0, 32, 0, 0); gr.addColorStop(0, '#3a4868'); gr.addColorStop(1, '#101828'); c.fillStyle = gr; c.fillRect(0, 0, 4, 32); });
      plane(g, mat(nightTex, { lit: false }), 26.3, 1.55, 4.04, 1.0, 1.1);
      box(g, 'wood_dark', 25.75, 26.85, 0.97, 1.02, 4.0, 4.16);
      box(g, 'snow_fresh', 25.8, 26.8, 1.02, 1.14, 4.02, 4.1);
      box(g, 'wood_dark', 26.27, 26.33, 1.0, 2.1, 4.02, 4.08);
      // The paper with the song's words, held up towards him.
      plane(g, mat(paperTex(3), { tint: [1.1, 1.05, 0.95] }), 27.72, 0.98, 5.22, 0.21, 0.28, { rot: face(27.72, 5.22, 25.4, 7.45) });
      return null;
    },
  },

  // ============================================================= INTERLUDE
  // The ferry lists in the storm, lights on, stern under the black water.
  ferry_sinking: {
    level: 'ferry', atmo: { ambient: [0.03, 0.035, 0.06], sky: [0.05, 0.06, 0.09], ground: [0.02, 0.02, 0.03], fogColor: [0.04, 0.05, 0.075], fog: [30, 300], snow: 0.9, bloom: 1.0, exposure: 1.3 },
    cam: { pos: [-30, 3.2, 22], look: [24, 5.5, 66], fov: 24 },
    lights: [
      ...Array.from({ length: 6 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [12, 8, 45], color: 0xffb060, range: 14, intensity: 0.9 },
      { pos: [12, 8, 75], color: 0xffb060, range: 14, intensity: 0.8 },
      { pos: [14, 5, 26], color: 0xffd0a0, range: 12, intensity: 0.7 },
      { pos: [-5, 1, 45], color: 0x4a5a80, range: 40, intensity: 0.5 },
    ],
    async build(g, { world, camera }) {
      await load('water');
      const root = world.root;
      const water = root.getObjectByName('city')?.children.filter((m) => m.userData.water) ?? [];
      for (const m of water) m.visible = false;
      // List to port and stern down, about the ship's middle.
      const pivot = new THREE.Vector3(24, 0, 64);
      root.rotation.set(0.1, 0, 0.22, 'XYZ');
      root.updateMatrix();
      const moved = pivot.clone().applyEuler(root.rotation);
      root.position.copy(pivot).sub(moved);
      root.position.y -= 1.2;
      const undo = farPlane(camera, 2000);
      sky(g, camera, [[0, '#1c2230'], [0.3, '#0c1018'], [1, '#04060a']], { dist: 1000, y0: -60, y1: 600 });
      box(g, 'water', -1200, 1200, -3.4, -3.0, -1200, 1200, { uv: [6, 6], tint: [0.16, 0.19, 0.24] });
      await bridge(g, camera, 30, 700, 0.5, 0);
      // Every window lit: a warm haze along the listing hull.
      const r = rng(33);
      const lit = [];
      for (let z = 30; z <= 88; z += 5) lit.push([15.4, 6.2, z, 0.9 + r() * 0.5], [15.4, 9.4, z + 2, 0.8 + r() * 0.4]);
      root.updateMatrixWorld(true);
      glows(g, camera, lit.map(([x, y, z, sz]) => { const p = new THREE.Vector3(x, y, z).applyMatrix4(root.matrixWorld); return [p.x, p.y, p.z, sz]; }), 0xffb060, 0.45);
      // Foam where the stern goes under, whitecaps on the black swell.
      const foam = [];
      for (let i = 0; i < 40; i++) foam.push([12 + r() * 30, -2.9, 92 + r() * 40, 0.8 + r() * 1.6]);
      for (let i = 0; i < 60; i++) foam.push([-60 + r() * 140, -2.95, 20 + r() * 160, 0.4 + r() * 0.9]);
      glows(g, camera, foam, 0xc0d0e0, 0.35);
      flakes(g, camera, { n: 650, near: 1.5, far: 60, size: 0.0015, seed: 31, streak: 5, dir: new THREE.Vector3(1, -0.2, 0.25), aspect: 6, k: 0.7 });
      return undoAll(undo, () => {
        root.rotation.set(0, 0, 0);
        root.position.set(0, 0, 0);
        for (const m of water) m.visible = true;
      });
    },
  },

  // Under the water, looking up: Henrik sinking on his back against the
  // blurred lights of the ferry far above.
  under_water: {
    level: 'ferry', atmo: { ...UNDERWATER, fog: [2, 15] },
    cam: { pos: [23.6, -15.7, 59.5], look: [24.3, -9.5, 57.9], fov: 58 },
    actors: [{ model: 'henrik2', x: 24.35, y: -13.2, z: 58.7, pose: 'lie', rot: 0.5, state: { handsUp: 0.5, look: -0.35 } }],
    lights: [
      ...Array.from({ length: 10 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [24.0, -13.25, 57.75], color: 0xff7020, range: 0.9, intensity: 2.2 },
      { pos: [24, -8, 58], color: 0x80c0a0, range: 9, intensity: 0.7 },
    ],
    async build(g, { world, camera }) {
      dressActors(g, world, { rim: 0.9, dry: true });
      const r = rng(41);
      const pts = [];
      for (let i = 0; i < 70; i++) pts.push([14 + r() * 20, -3.3 - r() * 0.4, 48 + r() * 20, 0.35 + r() * 0.8]);
      glows(g, camera, pts, 0xf0f8c8, 0.45, false);
      glows(g, camera, [[24, -3.2, 58, 14]], 0x80b090, 0.4, false);
      // Core in the chest.
      glows(g, camera, [[24.05, -13.25, 57.8, 0.22]], 0xff6a18, 2.0);
      // Bubbles and snow drifting up.
      flakes(g, camera, { n: 260, near: 0.6, far: 12, size: 0.006, seed: 43, color: 0x9ad0b8, k: 0.8, aspect: 1.6 });
      return null;
    },
  },

  // The machine walks the riverbed towards the city; Henrik sinks in front.
  jatte_riverbed: {
    level: 'river', atmo: { ...UNDERWATER, fog: [3, 44] },
    cam: { pos: [51.4, 3.5, 78.5], look: [53.6, 8.6, 50], fov: 32 },
    actors: [
      { model: 'jarnjatten', x: 54.5, y: 2.2, z: 51, rot: PI + 0.6, tint: [0.5, 0.56, 0.52] },
      { model: 'henrik2', x: 49.4, y: 4.3, z: 71.6, pose: 'fall', rx: -0.25, rz: 0.35, rot: 0.7, tint: [0.08, 0.1, 0.09], state: { handsUp: 0.85, look: -0.2 } },
    ],
    lights: [
      ...Array.from({ length: 10 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [53, 17, 34], color: 0xc0e0a0, range: 28, intensity: 1.2 },
      { pos: [57.2, 9.8, 48.6], color: 0xffd040, range: 4, intensity: 1.4 },
      { pos: [50, 8, 66], color: 0x60a080, range: 14, intensity: 0.5 },
    ],
    async build(g, { world, camera }) {
      await load('mud');
      dressActors(g, world, { rim: 0.8, dry: false });
      for (const a of actorsIn(g, world)) if (findPart(a, 'eye')) glowPart(a, 'eye', 0xffd040, 2.4);
      // The riverbed: a raised floor of silt that buries the ice level.
      box(g, 'mud', 10, 100, 0, 2.2, 10, 100, { uv: [6, 6], tint: [0.45, 0.5, 0.4] });
      const r = rng(51);
      for (let i = 0; i < 10; i++) {
        const t = await model(g, 'barrel', 44 + r() * 20, 2.25, 56 + r() * 18, { rx: PI / 2, rot: r() * PI, scale: 0.9, tint: [0.1, 0.1, 0.1] });
        t.scale.set(1.2, 0.4, 1.2);
      }
      await model(g, 'volvo240', 60.5, 2.2, 66, { rot: 2.2, rz: 0.3, tint: [0.25, 0.3, 0.28] });
      // City lights far above, smeared by the water.
      const pts = [];
      for (let i = 0; i < 40; i++) pts.push([24 + r() * 60, 20 + r() * 14, -4 + r() * 24, 2.5 + r() * 4]);
      glows(g, camera, pts, 0xd8c880, 0.28, false);
      glows(g, camera, [[54, 26, 10, 34]], 0x80b090, 0.28, false);
      flakes(g, camera, { n: 300, near: 1, far: 25, size: 0.0035, seed: 53, color: 0x90c8b0, k: 0.6, aspect: 6 });
      return null;
    },
  },

  // Top-down through misted glass: Åtta's eyes have just opened.
  sim2_pod: {
    level: 'sim2', atmo: { ambient: [0.05, 0.09, 0.11], sky: [0.02, 0.05, 0.07], fogColor: [0, 0.015, 0.025], fog: [4, 20], bloom: 0.8 },
    cam: { pos: [28.1, 1.08, 112.0], look: [28.13, 0.3, 112.0], fov: 34 },
    actors: [{ model: 'atta', x: 26.45, y: 0.36, z: 112, pose: 'lie', rot: -PI / 2, state: { look: 0 } }],
    lights: [
      ...Array.from({ length: 10 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [27.9, 0.95, 112.55], color: 0x50e0ff, range: 1.2, intensity: 1.4 },
      { pos: [28.4, 0.95, 111.7], color: 0xd0f8ff, range: 0.9, intensity: 0.9 },
    ],
    async build(g, { world }) {
      await load('gun_metal', 'tile_lab', 'facade_glass');
      dressActors(g, world, { rim: 0.4 });
      // The coffin: steel tub, pale padding, cables from the neck.
      box(g, 'gun_metal', 26.2, 28.6, 0, 0.36, 111.55, 112.45, { tint: [0.6, 0.7, 0.75] });
      box(g, 'tile_lab', 26.3, 28.5, 0.3, 0.37, 111.62, 112.38, { tint: [0.8, 0.95, 1] });
      box(g, 'gun_metal', 26.2, 28.6, 0.36, 0.48, 111.5, 111.58, { tint: [0.5, 0.6, 0.65] });
      box(g, 'gun_metal', 26.2, 28.6, 0.36, 0.48, 112.42, 112.5, { tint: [0.5, 0.6, 0.65] });
      const cable = mat(null, { color: 0x101418 });
      for (const a of actorsIn(g, world)) { const v = findPart(a, 'visor'); if (v) v.visible = false; }
      for (const [z0, z1, x] of [[111.55, 111.88, 27.92], [112.12, 112.45, 27.95], [111.55, 111.9, 27.85]]) box(g, null, x - 0.012, x + 0.012, 0.38, 0.405, z0, z1, { material: cable });
      // Seams of cyan light at the temples.
      box(g, null, 28.28, 28.36, 0.44, 0.445, 111.9, 111.93, { material: mat(null, { lit: false, color: 0x40f0ff, tint: [2, 2, 2] }) });
      box(g, null, 28.28, 28.36, 0.44, 0.445, 112.07, 112.1, { material: mat(null, { lit: false, color: 0x40f0ff, tint: [2, 2, 2] }) });
      // Misted glass lid.
      const mist = canvasTex(128, 64, (c, w, h) => {
        const r = rng(61);
        c.fillStyle = 'rgba(200,240,255,0.18)';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(220,250,255,${0.1 + r() * 0.3})`; c.beginPath(); c.arc(r() * w, r() * h, 1 + r() * 3, 0, PI * 2); c.fill(); }
        const gr = c.createRadialGradient(w * 0.87, h / 2, 4, w * 0.87, h / 2, 24);
        gr.addColorStop(0, 'rgba(0,0,0,0.9)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
      });
      plane(g, mat(mist, { lit: false, transparent: true, color: 0xc8f0ff, tint: [0.8, 0.8, 0.8] }), 27.4, 0.86, 112, 2.4, 0.95, { rx: -PI / 2 });
      return null;
    },
  },

  // The wireframe city from above: Åtta alone on the grid, snow in straight lines.
  sim2_grid: {
    level: 'sim2', atmo: { ambient: [0.15, 0.23, 0.29], sky: [0.01, 0.03, 0.05], fogColor: [0, 0.01, 0.02], fog: [30, 120], bloom: 0.7 },
    cam: { pos: [104, 30, 24], look: [52, 9, 44], fov: 30 },
    actors: [{ model: 'atta', x: 59.5, z: 33.5, rot: PI + 0.3, state: { look: 0.35 } }],
    lights: [{ pos: [59.5, 2.2, 33.5], color: 0x80f0ff, range: 5, intensity: 3.2 }],
    async build(g, { world, camera }) {
      dressActors(g, world, { rim: 0.8 });
      // Snow falling in perfect, parallel lines.
      const pts = [];
      for (let x = 40; x <= 100; x += 3) {
        for (let z = -10; z <= 110; z += 3) pts.push({ pos: new THREE.Vector3(x + (z % 2) * 1.5, 4 + ((x * 7 + z * 3) % 17), z), size: 0.05, streak: 36, dir: new THREE.Vector3(0, 1, 0) });
      }
      sprites(g, camera, pts, glowMat(0xb0f4ff, 1.1));
      return null;
    },
  },

  // ================================================================ ENDING
  // Blue hour from Ramberget: kitchen windows lighting one by one across the
  // river; Karlatornet dark by the ice.
  windows_dawn: {
    level: 'river', atmo: { ambient: [0.05, 0.06, 0.12], sky: [0.1, 0.13, 0.26], ground: [0.03, 0.04, 0.08], fogColor: [0.16, 0.19, 0.34], fog: [80, 1400], snow: 0.6, bloom: 0.9, exposure: 1.05, frost: 0 },
    cam: { pos: [100, 34, -86], look: [26, 12, 160], fov: 24 },
    lights: Array.from({ length: 16 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
    async build(g, { camera }) {
      await load(CITY_TEX, 'water');
      const undo = farPlane(camera, 3000);
      sky(g, camera, [[0, '#c89a8c'], [0.1, '#7a7aa4'], [0.3, '#3a4a80'], [1, '#0e1430']], { dist: 1700, y0: -60, y1: 800 });
      riverBanks(g);
      // South bank rows: dark facades, kitchen windows lit one after another.
      const r = rng(71);
      const dark = FACADES.map((t) => mat(t, { lit: false, color: 0x3a4262 }));
      const roof = mat('roof_snow', { tint: [0.7, 0.75, 0.95] });
      const quads = [];
      for (let row = 0; row < 8; row++) {
        const z = 124 + row * 24;
        for (let x = -600 + row * 9; x < 460; x += 20 + r() * 8) {
          const w = 15 + r() * 5, h = 11 + r() * 8 + row * 1.6;
          const side = dark[Math.floor(r() * dark.length)];
          const mesh = new THREE.Mesh(boxGeo(w, h, 12, 5, 3), [side, side, roof, roof, side, side]);
          mesh.position.set(x + w / 2, 1.2 + h / 2, z + 6);
          g.add(mesh);
          // More windows lit eastwards: the city waking like an advent candlestick.
          const p = 0.04 + 0.3 * Math.max(0, Math.min(1, (x + 350) / 800));
          for (let fx = x + 1.2; fx < x + w - 1.4; fx += 2.6) for (let fy = 2.5; fy < h - 1.5; fy += 3) if (r() < p) quads.push([fx, 1.2 + fy, z - 0.03]);
        }
      }
      const pos = [];
      for (const [x, y, z] of quads) pos.push(x, y, z, x + 1.5, y, z, x + 1.5, y + 1.7, z, x, y, z, x + 1.5, y + 1.7, z, x, y + 1.7, z);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(quads.flatMap(() => [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), 2));
      g.add(new THREE.Mesh(geo, mat(null, { lit: false, color: 0xffb860, tint: [1.5, 1.5, 1.5], side: THREE.DoubleSide })));
      glows(g, camera, [[53, 131, 4.5, 3]], 0xff2010, 1.2, false);
      // Ice floes along a dark lead.
      box(g, 'water', -700, 600, -0.04, -0.02, 58, 64, { tint: [0.2, 0.22, 0.3] });
      for (let i = 0; i < 18; i++) await model(g, 'ice_floe', -250 + r() * 420, 0.05, 50 + r() * 22, { rot: r() * PI, scale: 1.5 + r() * 2.5 });
      return undo;
    },
  },

  // Four in the morning in a stranger's kitchen, seen from the doorway.
  envelope_kitchen: {
    level: 'tower', atmo: { ambient: [0.035, 0.035, 0.05], sky: [0.03, 0.03, 0.05], ground: [0.03, 0.02, 0.015], fogColor: [0.01, 0.01, 0.02], fog: [6, 20], snow: 0, bloom: 0.8 },
    cam: { pos: [-76.7, 1.55, -34.6], look: [-78.15, 1.0, -38.8], fov: 28 },
    actors: [{ model: 'civilian2', x: -78.2, y: 0, z: -39.05, pose: 'sit', rot: 0.25, tint: [0.85, 0.7, 0.62], state: { sing: 0.9, look: 0.35 } }],
    props: [
      { model: 'table', x: -78.1, z: -38.35 },
      { model: 'chair', x: -78.2, z: -39.0, rot: 0.25 },
      { model: 'chair', x: -77.2, z: -38.3, rot: -PI / 2 },
    ],
    lights: [
      { pos: [-77.75, 0.95, -38.2], color: 0xffa848, range: 2.6, intensity: 1.7, flicker: 0.3 },
      { pos: [-78.15, 1.05, -38.55], color: 0x7ab0ff, range: 0.9, intensity: 1.2 },
      { pos: [-78.9, 1.9, -40.2], color: 0xffc070, range: 1.4, intensity: 0.8 },
      { pos: [-77.2, 2.3, -37.0], color: 0xffb070, range: 4.5, intensity: 0.45 },
    ],
    async build(g, { world, camera }) {
      await load('wallpaper_home', 'wood_floor', 'office_wall', 'window_advent', 'wood_dark');
      dressActors(g, world, { rim: 0.35 });
      room(g, -81, -75.5, -40.5, -34.5, 2.6, { wall: 'wallpaper_home', floor: 'wood_floor', ceil: 'office_wall', tint: [0.55, 0.7, 0.62], open: ['s'] });
      // We stand in the dark hall; the doorway frames the kitchen.
      box(g, 'wallpaper_home', -81, -77.3, 0, 2.6, -34.5, -34.35, { tint: [0.25, 0.3, 0.28] });
      box(g, 'wallpaper_home', -76.0, -75.5, 0, 2.6, -34.5, -34.35, { tint: [0.25, 0.3, 0.28] });
      box(g, 'wallpaper_home', -77.3, -76.0, 2.1, 2.6, -34.5, -34.35, { tint: [0.25, 0.3, 0.28] });
      box(g, 'wood_dark', -77.36, -77.26, 0, 2.12, -34.52, -34.3, { tint: [0.5, 0.45, 0.4] });
      box(g, 'wood_dark', -76.04, -75.94, 0, 2.12, -34.52, -34.3, { tint: [0.5, 0.45, 0.4] });
      room(g, -78, -75.2, -34.35, -33.2, 2.6, { wall: 'wallpaper_home', floor: 'wood_floor', tint: [0.2, 0.22, 0.22], open: ['n'] });
      // Candle, tablet glowing on the table.
      box(g, null, -77.77, -77.73, 0.76, 0.86, -38.22, -38.18, { material: mat(null, { color: 0xf0e8d8 }) });
      glows(g, camera, [[-77.75, 0.9, -38.2, 0.07]], 0xffc060, 2.4);
      glows(g, camera, [[-77.75, 0.9, -38.2, 0.3]], 0xff9030, 0.5);
      box(g, null, -78.33, -78.03, 0.77, 0.78, -38.6, -38.4, { material: mat(null, { lit: false, color: 0x9ac8ff, tint: [1.3, 1.3, 1.3] }) });
      // Window with an advent star behind him; fridge and a dark doorway.
      plane(g, mat('window_advent', { lit: false, tint: [1.3, 1.3, 1.3] }), -78.9, 1.55, -40.48, 1.0, 1.2);
      glows(g, camera, [[-78.9, 1.75, -40.4, 0.7]], 0xffa040, 0.5);
      box(g, 'office_wall', -76.2, -75.5, 0, 1.8, -40.5, -39.8, { tint: [0.8, 0.8, 0.78] });
      box(g, 'wood_dark', -81, -79.8, 0, 0.9, -40.5, -39.9, { tint: [0.7, 0.6, 0.5] });
      return null;
    },
  },

  // Dawn on the ice: the machine down, half through the ice; Åtta waiting,
  // looking at the city.
  jatte_ice: {
    level: 'river', atmo: { ...DAWN_ICE, ambient: [0.16, 0.15, 0.2], fog: [30, 900] },
    cam: { pos: [64.2, 1.05, 58.9], look: [-60, 10, 64], fov: 26 },
    actors: [
      { model: 'jarnjatten', x: 52.5, y: -4.6, z: 50.5, pose: 'fall', rx: 0.3, rz: 0.55, rot: -1.2, tint: [0.3, 0.3, 0.36] },
      { model: 'atta', x: 58.2, y: 0, z: 60.3, rot: -PI / 2 + 0.15, state: { sit: 1, crouch: 1, carry: 1, look: -0.1 } },
    ],
    lights: [
      ...Array.from({ length: 6 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [40, 10, 62], color: 0xffb8a8, range: 30, intensity: 0.8 },
      { pos: [59, 2.2, 61.5], color: 0xa8b4e8, range: 3, intensity: 0.7 },
      { pos: [56, 9, 56], color: 0xc0c8ff, range: 14, intensity: 0.5 },
    ],
    async build(g, { world, camera }) {
      await load(CITY_TEX);
      dressActors(g, world, { rim: 0.7, dry: false });
      for (const a of actorsIn(g, world)) if (findPart(a, 'eye')) glowPart(a, 'eye', 0x302020, 1);
      const undo = farPlane(camera, 3000);
      sky(g, camera, [[0, '#f4c0a8'], [0.08, '#e0a8b8'], [0.25, '#9098c8'], [1, '#2c3c70']], { dist: 1400, y0: -40, y1: 600 });
      riverBanks(g);
      cityBlocks(g, camera, [
        { x0: -700, x1: 0, z0: -60, z1: -8, step: 13, h: [8, 30] },
        { x0: -700, x1: 0, z0: -150, z1: -70, step: 17, h: [14, 50] },
        { x0: -700, x1: 0, z0: 124, z1: 170, step: 13, h: [10, 30] },
        { x0: -700, x1: 0, z0: 180, z1: 260, step: 18, h: [16, 50] },
      ], { seed: 13, lit: 0.06, advent: 0.05, color: 0x6a6078, k: 1.1 });
      await bridge(g, camera, -560, 60, 0.45);
      // Snow settling on the plating.
      flakes(g, camera, { n: 160, near: 2, far: 20, size: 0.0018, seed: 81, color: 0xfff0f4, k: 0.7, aspect: 6 });
      return undo;
    },
  },

  // A shop window of television sets, all showing the same picture; people
  // walk past without looking. One of them laughs.
  news_screen: {
    level: 'home', atmo: { ...HOME_NIGHT, ambient: [0.06, 0.07, 0.1], fogColor: [0.07, 0.08, 0.13], fog: [10, 50] },
    cam: { pos: [23.1, 1.5, 41.9], look: [23.1, 1.3, 46], fov: 22 },
    actors: [
      { model: 'civilian2', x: 20.9, z: 44.55, pose: 'walk', rot: PI / 2, tint: [0.45, 0.48, 0.58] },
      { model: 'civilian2', x: 25.3, z: 44.8, pose: 'walk', rot: -PI / 2 - 0.2, tint: [0.9, 0.62, 0.52], state: { talk: 1, look: -0.35, lookYaw: -0.8 } },
      { model: 'civilian2', x: 26.2, z: 44.5, pose: 'walk', rot: -PI / 2, tint: [0.55, 0.62, 0.5], state: { lookYaw: 0.5 } },
      { model: 'civilian2', x: 18.6, z: 44.9, pose: 'walk', rot: PI / 2, tint: [0.3, 0.3, 0.34] },
    ],
    lights: [
      { pos: [23, 1.5, 45.2], color: 0x9ab8ff, range: 3.6, intensity: 1.8 },
      { pos: [17, 4, 43], color: 0xff9a40, range: 8, intensity: 0.8 },
    ],
    async build(g, { world, camera }) {
      await load('wood_dark', 'facade_glass', 'metal_plate', 'neon_godjul');
      dressActors(g, world, { rim: 0.6, dry: false });
      const pic = newsTex();
      box(g, 'metal_plate', 19.2, 26.8, 0, 0.62, 45.3, 46, { tint: [0.25, 0.25, 0.27] });
      box(g, 'metal_plate', 19.2, 26.8, 2.85, 3.3, 45.3, 46, { tint: [0.25, 0.25, 0.27] });
      box(g, null, 19.2, 26.8, 0.62, 2.85, 45.9, 46, { material: mat(null, { color: 0x0a0c12 }) });
      plane(g, mat('neon_godjul', { lit: false, alpha: true }), 23, 3.08, 45.28, 1.8, 0.45, { rot: PI });
      for (const [x, y, s] of [[20.2, 0.62, 0.72], [21.35, 0.62, 0.72], [22.5, 0.62, 0.72], [23.65, 0.62, 0.72], [24.8, 0.62, 0.72], [25.9, 0.62, 0.66],
        [20.75, 1.58, 0.66], [21.85, 1.58, 0.72], [23.0, 1.58, 0.72], [24.15, 1.58, 0.66], [25.3, 1.58, 0.7]]) {
        const tv = await model(g, 'tv_old', x, y, 45.72, { rot: PI, scale: s, tint: [0.7, 0.7, 0.7] });
        const scr = findPart(tv, 'screen');
        if (scr) scr.visible = false;
        plane(g, mat(pic, { lit: false, tint: [1.4, 1.4, 1.4] }), x, y + 0.62 * s, 45.44, 0.52 * s, 0.4 * s, { rot: PI });
      }
      plane(g, mat('facade_glass', { transparent: true, opacity: 0.1, lit: false, color: 0x8090b0 }), 23, 1.75, 45.28, 7.6, 2.2, { rot: PI });
      flakes(g, camera, { n: 350, near: 0.5, far: 8, size: 0.0025, seed: 91, aspect: 6, k: 0.8 });
      return null;
    },
  },

  // Kall's cell on Hisingen at dawn: straight-backed, writing four lines.
  kall_cell: {
    level: 'tower', atmo: { ...CELL, ambient: [0.1, 0.1, 0.13] },
    cam: { pos: [-36.5, 1.25, -38.3], look: [-36.05, 1.1, -41.5], fov: 40 },
    actors: [{ model: 'kall', x: -36.35, y: 0, z: -41.1, pose: 'sit', rot: PI / 2 - 0.25, tint: [0.62, 0.62, 0.68], state: { reach: 0.85, look: 0.18, lookYaw: 0.25 } }],
    props: [{ model: 'chair', x: -36.4, z: -41.1, rot: PI / 2 - 0.25 }],
    lights: [
      { pos: [-36.6, 2.2, -42.2], color: 0xffc8b0, range: 3.2, intensity: 1.6 },
      { pos: [-35.0, 2.4, -39.2], color: 0x7888b0, range: 3.5, intensity: 0.6 },
      { pos: [-35.6, 1.6, -40.75], color: 0xffd8c0, range: 1.2, intensity: 1.0 },
    ],
    async build(g, { world, camera }) {
      await load('office_wall', 'concrete_raw', 'gun_metal', 'snow_fresh', 'wood_dark');
      dressActors(g, world, { rim: 0.15 });
      room(g, -39, -34.5, -42.5, -37.5, 2.8, { wall: 'office_wall', tint: [0.62, 0.66, 0.64] });
      barredWindow(g, camera, -36.9, 2.05, -42.48, 0.8, 0.6, { light: 0xffc8b0, k: 1.3 });
      // Bolted table, lined paper, pencil, a small radio.
      box(g, 'wood_dark', -35.95, -35.0, 0.72, 0.76, -41.8, -40.4, { tint: [0.55, 0.55, 0.55] });
      box(g, 'gun_metal', -35.55, -35.45, 0, 0.72, -41.15, -41.05);
      plane(g, mat(paperTex(7, { lined: true }), {}), -35.72, 0.765, -41.05, 0.21, 0.29, { rx: -PI / 2, rot: PI / 2 + 0.25 });
      box(g, null, -35.8, -35.62, 0.766, 0.772, -40.9, -40.89, { material: mat(null, { color: 0xd8b030 }) });
      box(g, 'gun_metal', -35.4, -35.12, 0.76, 0.92, -41.72, -41.5, { tint: [0.45, 0.32, 0.3] });
      return null;
    },
  },

  // The unopened envelope in the kitchen drawer; Maja's hand on its edge.
  maja_envelope: {
    level: 'home', atmo: { ...HOME_NIGHT, ambient: [0.05, 0.05, 0.07] },
    cam: { pos: [31.78, 1.3, 5.78], look: [31.95, 0.68, 4.95], fov: 32 },
    
    lights: [
      ...Array.from({ length: 9 }, () => ({ pos: [0, -600, 0], color: 0x000000, range: 3000, intensity: 1 })),
      { pos: [31.5, 1.45, 5.4], color: 0xffd0a0, range: 1.8, intensity: 1.6 },
      { pos: [32.9, 1.2, 5.6], color: 0x7890c8, range: 1.6, intensity: 0.5 },
    ],
    async build(g, { world }) {
      await load('wood_dark', 'battery', 'maja2_cloth');
      dryFloors(world, ['city_wood_floor']);
      // Drawer pulled out of the counter (front at z 4.72).
      const wd = { tint: [0.9, 0.8, 0.7] };
      box(g, 'wood_dark', 31.3, 32.6, 0.62, 0.64, 4.4, 5.3, wd);
      box(g, 'wood_dark', 31.3, 31.33, 0.64, 0.78, 4.4, 5.3, wd);
      box(g, 'wood_dark', 32.57, 32.6, 0.64, 0.78, 4.4, 5.3, wd);
      box(g, 'wood_dark', 31.25, 32.65, 0.6, 0.84, 5.3, 5.34, { tint: [1, 0.95, 0.85] });
      // Contents: candle stubs, rubber bands, a battery, the envelope.
      const wax = mat(null, { color: 0xeee6d8 });
      for (const [x, z, a] of [[31.45, 4.6, 0.3], [31.52, 4.75, -0.2], [32.42, 5.12, 1.2], [31.6, 5.15, 0.8]]) { const c = box(g, null, x - 0.05, x + 0.05, 0.64, 0.662, z - 0.011, z + 0.011, { material: wax }); c.rotation.y = a; }
      for (const [x, z, c] of [[32.35, 4.55, 0xc03030], [32.45, 4.62, 0x3050c0], [31.44, 5.02, 0xd0a020]]) box(g, null, x - 0.022, x + 0.022, 0.64, 0.645, z - 0.022, z + 0.022, { material: mat(null, { color: c }) });
      box(g, 'battery', 32.3, 32.4, 0.64, 0.665, 4.95, 4.98);
      plane(g, mat(envelopeTex('SANDELL, HENRIK'), {}), 31.9, 0.648, 4.86, 0.5, 0.25, { rx: -PI / 2, rot: 0.08 });
      // Maja's hand resting on the drawer front, her knitted sleeve.
      const hand = new THREE.Group();
      const skin = mat(null, { color: 0xc89c8c, tint: [0.8, 0.8, 0.8] });
      box(hand, null, -0.036, 0.036, 0, 0.02, -0.04, 0.04, { material: skin });
      for (let i = 0; i < 4; i++) box(hand, null, -0.034 + i * 0.018, -0.02 + i * 0.018, -0.045, 0.016, 0.04, 0.056, { material: skin });
      box(hand, null, 0.03, 0.048, -0.005, 0.014, -0.045, 0.005, { material: skin });
      box(hand, null, -0.028, 0.028, -0.01, 0.03, -0.12, -0.04, { material: skin });
      box(hand, null, -0.05, 0.05, -0.035, 0.055, -0.9, -0.11, { material: mat('maja2_cloth', { tint: [0.7, 0.72, 0.8] }) });
      hand.position.set(32.25, 0.842, 5.29);
      hand.rotation.set(-0.08, PI + 0.6, 0);
      g.add(hand);
      return null;
    },
  },

  // Holding cell, evening: Sara reads Boye aloud through the bars; the young
  // guard listens on his chair, cap in his hands.
  sara_cell: {
    level: 'tower', atmo: CELL,
    cam: { pos: [-44.9, 1.45, -27.3], look: [-40.6, 0.9, -30.9], fov: 32 },
    actors: [
      { model: 'sara2', x: -40.0, y: 0, z: -30.3, pose: 'sit', rot: -PI / 2 + 0.25, state: { reach: 0.75, look: 0.4 } },
      { model: 'police', x: -44.0, y: 0, z: -30.0, pose: 'sit', rot: PI / 2 - 0.2, state: { carry: 0.6, look: 0.05 } },
    ],
    props: [{ model: 'chair', x: -44.05, z: -30.0, rot: PI / 2 - 0.2 }],
    lights: [
      { pos: [-40.6, 1.9, -30.0], color: 0xffc080, range: 2.6, intensity: 2.0 },
      { pos: [-44.2, 2.4, -29.4], color: 0x8aa0c8, range: 3, intensity: 0.9 },
      { pos: [-42.2, 2.6, -26], color: 0x607090, range: 4, intensity: 0.5 },
    ],
    async build(g, { world, camera }) {
      await load('office_wall', 'concrete_raw', 'gun_metal', 'snow_fresh', 'copy_cloth');
      dressActors(g, world, { rim: 0.45 });
      for (const a of actorsIn(g, world)) { const h = findPart(a, 'helmet'); if (h) h.visible = false; const v = findPart(a, 'visor'); if (v) v.visible = false; }
      room(g, -46, -38.8, -32.5, -24, 2.9, { wall: 'office_wall', tint: [0.55, 0.58, 0.6] });
      // Bars between the cell (east) and the corridor (west).
      bars(g, -42.2, -32.5, -42.2, -25.4, 0, 2.9, 20, 0.022);
      box(g, 'gun_metal', -42.26, -42.14, 2.1, 2.2, -32.5, -25.4);
      // Bunk and the poetry book in her hands.
      box(g, 'copy_cloth', -40.3, -38.8, 0.3, 0.45, -32.3, -29.6, { tint: [0.45, 0.45, 0.5] });
      box(g, null, -40.62, -40.44, 0.86, 0.88, -30.45, -30.2, { material: mat(null, { color: 0x7a2a1c }) });
      // The guard's cap in his lap.
      box(g, null, -43.6, -43.38, 0.62, 0.7, -30.12, -29.9, { material: mat(null, { color: 0x1a2030 }) });
      barredWindow(g, camera, -39.6, 2.35, -32.48, 0.7, 0.4, { light: 0x6078a8, k: 0.9, n: 4 });
      return null;
    },
  },

  // Visiting room: armoured glass between them, a hand on each side; their
  // reflections overlap in the pane.
  sara_visit: {
    level: 'tower', atmo: { ...CELL, ambient: [0.1, 0.11, 0.14] },
    cam: { pos: [-61.75, 1.6, -36.9], look: [-59.9, 1.42, -40.0], fov: 26 },
    actors: [
      { model: 'henrik2', x: -60.62, z: -40.05, rot: PI / 2, state: { reach: 1, look: 0.08 } },
      { model: 'sara2', x: -59.4, z: -40.0, rot: -PI / 2, state: { reach: 1, look: 0.18 } },
      { model: 'henrik2', x: -59.38, z: -40.05, rot: -PI / 2, holo: true, tint: [0.07, 0.07, 0.08], state: { reach: 1, look: 0.08 } },
      { model: 'sara2', x: -60.6, z: -40.0, rot: PI / 2, holo: true, tint: [0.06, 0.06, 0.07], state: { reach: 1, look: 0.18 } },
    ],
    lights: [
      { pos: [-60, 2.6, -39.6], color: 0xdff0ff, range: 3.5, intensity: 1.7 },
      { pos: [-61.5, 2.4, -37.2], color: 0xc8e0ff, range: 3, intensity: 0.6 },
    ],
    async build(g, { world, camera }) {
      await load('concrete_raw', 'gun_metal', 'facade_glass', 'snow_fresh', 'office_wall');
      dressActors(g, world, { rim: 0.45 });
      room(g, -63, -57, -42.2, -35.5, 2.9, { wall: 'office_wall', floor: 'concrete_raw', tint: [0.62, 0.68, 0.7] });
      // Counter and the glass wall with steel posts.
      box(g, 'gun_metal', -60.35, -59.65, 0.9, 0.95, -42.2, -35.5, { tint: [0.5, 0.52, 0.55] });
      box(g, 'office_wall', -60.1, -59.9, 0, 0.9, -42.2, -35.5, { tint: [0.5, 0.52, 0.55] });
      for (const z of [-41.2, -38.6, -36.0]) box(g, 'gun_metal', -60.05, -59.95, 0.95, 2.9, z - 0.05, z + 0.05, { tint: [0.25, 0.26, 0.28] });
      plane(g, mat('facade_glass', { transparent: true, opacity: 0.07, lit: false, color: 0xa0c0d0, side: THREE.DoubleSide }), -60, 1.92, -38.85, 6.7, 1.94, { rot: PI / 2 });
      // Fluorescent tube.
      box(g, null, -60.6, -59.4, 2.84, 2.88, -39.9, -39.7, { material: mat(null, { lit: false, color: 0xe8f4ff, tint: [2, 2, 2] }) });
      // A window behind Sara, snow falling outside.
      barredWindow(g, camera, -57.02, 1.95, -39.6, 1.3, 0.8, { axis: 'x', light: 0x9ab0d8, k: 1.0, n: 0, snow: 60 });
      return null;
    },
  },

  // Östra kyrkogården: Henrik and Åtta lower the coffin, no one else there.
  sara_grave: {
    level: 'church', atmo: GREY_DAY,
    cam: { pos: [35.5, 1.35, 39.7], look: [38.7, 0.55, 36.3], fov: 32 },
    actors: [
      { model: 'henrik2', x: 36.8, y: 0, z: 35.24, rot: 0.8, state: { carry: 0.7, crouch: 0.35, look: 0.45 } },
      { model: 'atta', x: 39.6, y: 0, z: 37.96, rot: 0.8 + PI, state: { carry: 0.7, crouch: 0.35, look: 0.45 } },
    ],
    lights: [{ pos: [36, 4, 34], color: 0xdde4f0, range: 10, intensity: 0.4 }],
    async build(g, { world, camera }) {
      await load('mud', 'wood_dark', 'snow_fresh', 'grave_stone');
      dressActors(g, world, { rim: 0.3, dry: false });
      box(g, 'snow_fresh', 39.9, 160, -0.3, 0, -40, 120, { uv: [4, 4], snow: true });
      const A = 0.8;
      // The open grave (a dark opening), the earth mound, the coffin sinking.
      const pit = plane(g, mat(null, { color: 0x040303 }), 38.2, 0.012, 36.6, 1.05, 2.35, { rx: -PI / 2, rot: A });
      pit.renderOrder = 1;
      const coffin = box(g, 'wood_dark', -0.3, 0.3, -0.34, 0.14, -0.95, 0.95, { tint: [0.95, 0.8, 0.65] });
      coffin.position.set(38.2, -0.2, 36.6);
      coffin.rotation.y = A;
      // Ropes from the coffin ends up into their hands.
      const rope = mat(null, { color: 0xc0b090 });
      for (const [x0, z0, x1, z1] of [[37.55, 35.95, 37.1, 35.52], [38.85, 37.25, 39.31, 37.68]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1), rope);
        const a = new THREE.Vector3(x0, 0.16, z0), b = new THREE.Vector3(x1, 1.0, z1);
        m.position.copy(a).add(b).multiplyScalar(0.5);
        m.scale.z = a.distanceTo(b);
        m.lookAt(b);
        g.add(m);
      }
      // Rows of stones; Gösta Sandell's two stones away; black trees.
      const r = rng(121);
      for (let row = 0; row < 5; row++) {
        for (let i = 0; i < 7; i++) {
          const along = -5 + i * 1.9 + r() * 0.3, back = 3 + row * 2.4 + r() * 0.3;
          const x = 38.2 + Math.sin(A) * along + Math.cos(A) * back, z = 36.6 + Math.cos(A) * along - Math.sin(A) * back;
          await model(g, r() < 0.3 ? 'grave_cross' : 'grave', x, 0, z, { rot: A + PI / 2 + (r() - 0.5) * 0.15, tint: [0.75, 0.75, 0.78] });
        }
      }
      await model(g, 'grave', 38.2 + Math.sin(A) * 3.8 + Math.cos(A) * 0.6, 0, 36.6 + Math.cos(A) * 3.8 - Math.sin(A) * 0.6, { rot: A + PI / 2, tint: [0.7, 0.7, 0.72] });
      for (const [x, z, s] of [[46, 30, 1.1], [44, 44, 0.9], [52, 38, 1.3], [48.5, 50, 1.0]]) await model(g, 'tree_birch_snow', x, 0, z, { scale: s, tint: [0.12, 0.12, 0.13] });
      flakes(g, camera, { n: 500, near: 0.8, far: 22, size: 0.003, seed: 123, color: 0xe8ecf0, k: 0.9 });
      return null;
    },
  },

  // The new headstone, snow in the letters; the folded armband and a lantern.
  grave_snow: {
    level: 'church', atmo: { ...GREY_DAY, ambient: [0.26, 0.27, 0.3], fog: [6, 50] },
    cam: { pos: [42.75, 0.42, 35.42], look: [44.6, 0.4, 35.5], fov: 30 },
    lights: [
      { pos: [44.3, 0.25, 35.1], color: 0xffa040, range: 1.0, intensity: 1.4, flicker: 0.3 },
      { pos: [43.3, 1.4, 36.0], color: 0xd0d8e8, range: 3, intensity: 0.5 },
    ],
    async build(g, { camera }) {
      await load('grave_stone', 'snow_fresh', 'gun_metal');
      box(g, 'snow_fresh', 39.9, 160, -0.3, 0, -40, 120, { uv: [4, 4], snow: true });
      // Stone with the carved name, a cap of snow (faces -x, towards us).
      box(g, 'grave_stone', 44.7, 44.86, 0, 0.82, 35.12, 35.88, { tint: [0.75, 0.75, 0.78], uv: [0.8, 0.8] });
      plane(g, mat(stoneTex(['SARA NYBERG', '2011-2047']), { tint: [0.78, 0.78, 0.8] }), 44.695, 0.45, 35.5, 0.74, 0.74, { rot: -PI / 2 });
      box(g, 'snow_fresh', 44.68, 44.88, 0.82, 0.87, 35.1, 35.9);
      box(g, 'snow_fresh', 44.1, 44.7, 0, 0.06, 34.9, 36.1);
      // Folded red armband on the snow.
      box(g, null, 44.28, 44.42, 0.06, 0.085, 35.52, 35.78, { material: mat(null, { color: 0xc81a14 }) }).rotation.y = 0.2;
      // Lantern with a flame.
      box(g, 'gun_metal', 44.24, 44.4, 0.06, 0.08, 35.04, 35.2, { tint: [0.3, 0.3, 0.3] });
      box(g, null, 44.25, 44.39, 0.08, 0.26, 35.05, 35.19, { material: mat(null, { transparent: true, opacity: 0.3, lit: false, color: 0xffd8a0 }) });
      box(g, 'gun_metal', 44.23, 44.41, 0.26, 0.29, 35.03, 35.21, { tint: [0.3, 0.3, 0.3] });
      for (const [x, z] of [[44.25, 35.05], [44.39, 35.05], [44.25, 35.19], [44.39, 35.19]]) box(g, 'gun_metal', x - 0.008, x + 0.008, 0.08, 0.26, z - 0.008, z + 0.008, { tint: [0.3, 0.3, 0.3] });
      for (const [x, z, m] of [[48.5, 33.2, 'grave'], [48.2, 37.6, 'grave_cross'], [51.5, 35.8, 'grave'], [52, 31.5, 'grave_cross']]) await model(g, m, x, 0, z, { rot: -PI / 2, tint: [0.7, 0.7, 0.72] });
      await model(g, 'tree_birch_snow', 55, 0, 42, { scale: 1.1, tint: [0.12, 0.12, 0.13] });
      glows(g, camera, [[44.32, 0.15, 35.12, 0.05]], 0xffc050, 2.6);
      glows(g, camera, [[44.32, 0.16, 35.12, 0.22]], 0xff8020, 0.6);
      flakes(g, camera, { n: 220, near: 0.25, far: 4, size: 0.005, seed: 131, color: 0xeef0f4, k: 0.8 });
      return null;
    },
  },
};
