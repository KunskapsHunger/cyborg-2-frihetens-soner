import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createMaterial, setMaterialMap } from './material.js';

// Loads textures and GLB models. Missing files degrade gracefully to a
// generated checker texture / placeholder box so the game always runs.

const BASE = `${import.meta.env.BASE_URL}assets/`;
const textureCache = new Map();
const modelCache = new Map();
const materialCache = new Map();
const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

// Crisp UI art keeps nearest filtering; everything else is PS2-smooth.
const PIXEL_ART = /^(icon_|ui_|font)/;

function prepTexture(tex, name = '') {
  const pixel = PIXEL_ART.test(name);
  tex.magFilter = pixel ? THREE.NearestFilter : THREE.LinearFilter;
  tex.minFilter = pixel ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = !pixel;
  tex.anisotropy = pixel ? 1 : 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function fallbackTexture(name) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const on = ((x >> 2) + (y >> 2)) % 2 === 0;
      g.fillStyle = `hsl(${hue},25%,${on ? 38 : 26}%)`;
      g.fillRect(x, y, 1, 1);
    }
  }
  return prepTexture(new THREE.CanvasTexture(c));
}

export function loadTexture(name) {
  if (textureCache.has(name)) return textureCache.get(name).promise;
  const entry = {};
  if (name === 'fallback') {
    entry.tex = fallbackTexture(name);
    entry.promise = Promise.resolve(entry.tex);
    textureCache.set(name, entry);
    return entry.promise;
  }
  entry.promise = new Promise((resolve) => {
    texLoader.load(
      `${BASE}textures/${name}.png`,
      (tex) => { entry.tex = prepTexture(tex, name); resolve(entry.tex); },
      undefined,
      () => {
        console.warn(`[assets] missing texture ${name}`);
        entry.tex = fallbackTexture(name);
        resolve(entry.tex);
      },
    );
  });
  textureCache.set(name, entry);
  return entry.promise;
}

export function getTexture(name) {
  const entry = textureCache.get(name);
  return entry?.tex ?? null;
}

export async function preloadTextures(names) {
  await Promise.all(names.map(loadTexture));
}

// Surface response by texture name: wet and icy ground reflects the sky,
// metal and glass get tight highlights.
const SURFACES = [
  [/ice_|water/, { spec: 0.9, gloss: 0.9, wet: 0.55 }],
  [/asphalt|snow_asphalt|road_|tram_rails/, { spec: 0.45, gloss: 0.7, wet: 0.35 }],
  [/marble|lobby|floor_lab|tile_lab|elevator/, { spec: 0.6, gloss: 0.85, wet: 0.2 }],
  [/glass|tower_glass/, { spec: 0.9, gloss: 0.95, wet: 0.4 }],
  [/metal|steel|crane|container|ferry_|rail|gun|pistol|rifle|sniper|shield|hull|walker|jarnjatten|drone|camera/, { spec: 0.5, gloss: 0.6 }],
  [/cobble|sidewalk|deck/, { spec: 0.3, gloss: 0.5, wet: 0.15 }],
  [/snow/, { spec: 0.25, gloss: 0.4 }],
];

export function surfaceFor(name) {
  for (const [re, props] of SURFACES) if (re.test(name)) return props;
  return {};
}

const ALPHA = /graffiti|blood|puddle|fx_|icon_|cone|leaves|neon|poster|sign_|comic_|title_|footprint|scorch|window_|lights|frost|logo/;

/** Shared material for a texture name (world geometry, props). */
export function materialFor(name, opts = {}) {
  const key = `${name}|${JSON.stringify(opts)}`;
  if (materialCache.has(key)) return materialCache.get(key);
  const tex = getTexture(name);
  // Textures that already show snow or ice don't need the procedural cover.
  const own = /snow|ice_/.test(name) ? { snow: false } : {};
  const mat = createMaterial({ map: tex ?? fallbackTexture(name), alphaTest: ALPHA.test(name) ? 0.5 : 0.01, ...surfaceFor(name), ...opts, ...own });
  materialCache.set(key, mat);
  // Not loaded yet: swap the real texture in as soon as it arrives.
  if (!tex && name !== 'fallback') loadTexture(name).then((t) => setMaterialMap(mat, t));
  return mat;
}

function fallbackModel(name) {
  const group = new THREE.Group();
  group.name = name;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5).translate(0, 0.5, 0), materialFor('fallback'));
  mesh.name = 'body';
  group.add(mesh);
  return group;
}

export function loadModel(name) {
  if (modelCache.has(name)) return modelCache.get(name);
  const p = new Promise((resolve) => {
    gltfLoader.load(
      `${BASE}models/${name}.glb`,
      (gltf) => resolve(gltf.scene),
      undefined,
      () => {
        console.warn(`[assets] missing model ${name}`);
        resolve(fallbackModel(name));
      },
    );
  });
  modelCache.set(name, p);
  return p;
}

/**
 * Clone a loaded model and swap every material for an engine material chosen
 * by the source material's name (= texture name). Living bodies (`hot`) get a
 * rim light so they read against the background.
 * @param {boolean} unique  give this instance its own materials (for tint/flash)
 * @param {boolean} snow    static props collect snow on top
 */
export async function instantiateModel(name, { unique = false, lit = true, cut = false, hot = false, snow = false } = {}) {
  const src = await loadModel(name);
  const root = src.clone(true);
  const pending = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const texName = (o.material?.name || 'fallback').replace(/\.\d+$/, '');
    const flags = { ...(lit ? {} : { lit: false }), ...(cut ? { cut: true } : {}), ...(hot ? { hot: true, rim: 0.6 } : {}), ...(snow ? { snow: true } : {}) };
    pending.push(loadTexture(texName).then(() => {
      if (unique) {
        o.material = createMaterial({ map: getTexture(texName), alphaTest: 0.5, ...surfaceFor(texName), ...flags });
        o.material.userData.unique = true;
      } else {
        o.material = materialFor(texName, flags);
      }
    }));
    o.frustumCulled = true;
  });
  await Promise.all(pending);
  return root;
}

export function findPart(root, name) {
  let found = null;
  root.traverse((o) => { if (!found && o.name === name) found = o; });
  return found;
}
