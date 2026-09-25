import * as THREE from 'three';
import { materialFor } from '../engine/assets.js';
import { radioVoiceId } from '../engine/voiceIds.js';
import { RADIO } from '../story/radio.js';

// VI. GLITCHEN — the snowy crown of Karlatornet at 23.31, 42 m above a lit,
// frozen Gothenburg. Åtta crosses the roof from the elevator core in the
// south to the crown deck in the north (antenna yard + helipad) while Kall's
// voice falls apart and the roof bleeds into CYBÖRG's cyan SIM grid.
//
// Routes north through the HVAC field: the exposed metal ledge along the
// west parapet (no footprints, loud), the sunken duct trench beside it (dark,
// crawl under the bridges), or the open snow between the units (footprints).
//
// Flow: roof_glitch → ro_glitch_1 → (field) ro_glitch_2 → (sim band)
// ro_glitch_3 → [ro_glitch_reloads] → ro_linnea → screen (E) → roof_linnea →
// ro_truth → helipad → roof_sara → next chapter.

const Y = 42; // roof deck height above the street
const PI = Math.PI;
const HOLO_TINT = [0.5, 1.25, 1.6];

// ------------------------------------------------------------ entity helpers
const box = (tex, x0, z0, x1, z1, y0, y1, extra = {}) => ({ type: 'box', tex, x0, z0, x1, z1, y0: Y + y0, y1: Y + y1, ...extra });
const light = (x, y, z, color, range, intensity, extra = {}) => ({ type: 'light', x, y: Y + y, z, color, range, intensity, ...extra });
const decal = (tex, x, y, z, w, h, rot = 0, extra = {}) => ({ type: 'decal', tex, x, y: Y + y, z, w, h, rot, ...extra });
const prop = (model, x, z, rot = 0, extra = {}) => ({ type: 'prop', model, x, z, rot, ...extra });

/** Antenna mast: concrete foot, steel shaft, a few cross-arms. */
function mast(x, z, h) {
  return [
    box('concrete_raw', x - 0.7, z - 0.7, x + 0.7, z + 0.7, 2, 2.45),
    box('metal_plate', x - 0.22, z - 0.22, x + 0.22, z + 0.22, 2.45, 2 + h, { uvScale: 1 }),
    box('metal_plate', x - 1.1, z - 0.08, x + 1.1, z + 0.08, 2 + h * 0.55, 2 + h * 0.55 + 0.16, { collide: false }),
    box('metal_plate', x - 0.08, z - 0.9, x + 0.08, z + 0.9, 2 + h * 0.8, 2 + h * 0.8 + 0.16, { collide: false }),
  ];
}

// HVAC unit: galvanised box with a darker plinth.
function hvac(x0, z0, x1, z1, h) {
  return [
    box('metal_plate', x0 - 0.1, z0 - 0.1, x1 + 0.1, z1 + 0.1, 0, 0.3, { uvScale: 1 }),
    box('hvac_duct', x0, z0, x1, z1, 0.3, h, { uvScale: 2.5 }),
  ];
}

// ------------------------------------------------------------ cutscene stages
// All three roof cutscenes share the scene 'tower_roof' but happen in three
// places; the script picks the variant before each one. Every variant carries
// the full cast (the unused ones stand out of shot) so any of them is valid.
const VARIANTS = {
  glitch: {
    actors: { atta: { x: 39, z: 87.6, rot: PI } },
    marks: { mark_a: [39.5, 83.6] },
    establish: { pos: [58, Y + 13, 66], look: [39, Y + 1, 86], fov: 50 },
  },
  linnea: {
    actors: { atta: { x: 39.4, z: 34.4, rot: -2.36 } },
    // Screen faces south-east (rot π/4); the insert camera sits on its normal.
    props: { screen: [37.4 + 0.92, Y + 4.8, 32.4 + 0.92] },
    establish: { pos: [48, Y + 7, 46], look: [38, Y + 3, 32], fov: 48 },
  },
  sara: {
    actors: {
      atta: { x: 57, z: 39.5, rot: 2.27 },
      sara: { x: 63.5, z: 34.5, rot: -0.92 },
      guard1: { x: 59.5, z: 74, rot: PI },
    },
    marks: { mark_a: [60.2, 36.8], mark_b: [66.5, 47] },
    establish: { pos: [46, Y + 9, 50], look: [61, Y + 2.5, 35], fov: 50 },
  },
};
const BASE = {
  actors: { atta: { x: 39, z: 87.6, rot: PI }, sara: { x: 63.5, z: 34.5, rot: -0.92 }, guard1: { x: 66.5, z: 47.5, rot: PI } },
  marks: { mark_a: [39.5, 83.6], mark_b: [66.5, 47] },
  props: { screen: [37.4 + 0.92, Y + 4.8, 32.4 + 0.92] },
};
const STAGES = Object.fromEntries(Object.entries(VARIANTS).map(([k, v]) => [k, {
  ...v,
  actors: { ...BASE.actors, ...v.actors },
  marks: { ...BASE.marks, ...v.marks },
  props: { ...BASE.props, ...v.props },
}]));
let stageKey = 'glitch';

// ------------------------------------------------------------ script helpers
const setFlag = (g, k) => { g.flags = { ...g.flags, [k]: true }; };

/** Cutscenes freeze the post uniforms: leave only a light tear on screen. */
function playScene(g, key, id) {
  stageKey = key;
  g.glitchT = 0;
  g.gfx.postUniforms.uGlitch.value = 0.12;
  switch (id) {
    case 'roof_glitch': return g.playCutscene('roof_glitch');
    case 'roof_linnea': return g.playCutscene('roof_linnea');
    default: return g.playCutscene('roof_sara');
  }
}

// The glitch calls in order; each can fire from its trigger or be caught up
// by a later one, so the story never skips a call.
const SEQUENCE = [
  { flag: 'ro_g1', radio: 'ro_glitch_1', glitch: 0.15 },
  { flag: 'ro_g2', radio: 'ro_glitch_2', glitch: 0.4 },
  { flag: 'ro_g3', radio: 'ro_glitch_3', glitch: 0.5 },
  { flag: 'ro_linnea', radio: 'ro_linnea', glitch: 0.5, objective: 1 },
];

function glitchFor(flags) {
  if (flags.ro_truth) return 0.7;
  const done = SEQUENCE.filter((s) => flags[s.flag]);
  return done.length ? done[done.length - 1].glitch : 0.15;
}

function playRadio(g, key, onDone) {
  g.glitchPulse(0.7, 0.45);
  const done = () => { g.glitchPulse(0.5, 0.3); onDone?.(); };
  // Literal ids keep the story tests able to find every call.
  switch (key) {
    case 'ro_glitch_1': g.radio('ro_glitch_1', done); break;
    case 'ro_glitch_2': g.radio('ro_glitch_2', done); break;
    case 'ro_glitch_3': g.radio('ro_glitch_3', done); break;
    case 'ro_linnea': g.radio('ro_linnea', done); break;
    default: done();
  }
}

/** Play every call up to `upto` that has not been heard yet. */
function advance(g, upto, onDone) {
  const i = SEQUENCE.findIndex((s, k) => k <= upto && !g.flags[s.flag]);
  if (i < 0) { onDone?.(); return; }
  const step = SEQUENCE[i];
  setFlag(g, step.flag);
  playRadio(g, step.radio, () => {
    g.sys.glitch.level = step.glitch;
    if (step.objective !== undefined) g.setObjective(step.objective);
    advance(g, upto, onDone);
  });
}

/** "Snön har stannat i luften." Park every flake, then let them fall again. */
function freezeSnow(g, on) {
  const flakes = g.snow?.flakes;
  if (!flakes) return;
  if (on) {
    if (g.snow.frozenSpeeds) return;
    g.snow.frozenSpeeds = flakes.map((f) => f.s);
    g.snow.frozenWind = g.snow.wind.clone();
    for (const f of flakes) f.s = 0;
    g.snow.wind.set(0, 0);
  } else if (g.snow.frozenSpeeds) {
    flakes.forEach((f, i) => { f.s = g.snow.frozenSpeeds[i]; });
    g.snow.wind.copy(g.snow.frozenWind);
    g.snow.frozenSpeeds = null;
  }
}

/** ro_glitch_reloads with the real page-load count. */
function playReloads(g) {
  const n = g.progress?.loads ?? 0;
  const lines = RADIO.ro_glitch_reloads.map((l, i) => ({
    ...l,
    text: l.text.replace('{n}', String(n)),
    ...(l.text.includes('{n}') ? {} : { voiceId: radioVoiceId('ro_glitch_reloads', i) }),
  }));
  g.input.exitLock();
  g.audio.play('codec_ring', { volume: 0.8 });
  g.glitchPulse(0.8, 0.5);
  g.ui.open({ type: 'radio', lines, index: 0, onDone: () => { g.input.requestLock(); g.glitchPulse(0.4, 0.3); } });
}

// ------------------------------------------------------------ set dressing
// The lit city 42 m below, the SIM phantoms and small glowing fixtures are
// built as plain meshes (visual only, no collision).

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

function boxGeo(w, h, d, wu = 4, wv = 3) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const n = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [su, sv] = ay > 0.5 ? [w / 4, d / 4] : ax > 0.5 ? [d / wu, h / wv] : [w / wu, h / wv];
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  return geo;
}

const FACADES = ['facade_haga', 'facade_landshovding', 'facade_concrete', 'facade_glass', 'facade_brick', 'tower_glass', 'facade_haga', 'facade_landshovding'];
const SIM_MAT = () => materialFor('sim_grid', { lit: false, color: 0x9fe8ff });

/** City blocks around the tower: self-lit facades (windows glow), snowy roofs. */
function buildCity(g, root) {
  const rand = rng(1213);
  const group = new THREE.Group();
  group.name = 'roof_city';
  const blocks = [];
  const roofMat = materialFor('roof_snow', {});
  for (let bx = -18; bx < 118; bx += 17) {
    for (let bz = -18; bz < 100; bz += 17) {
      if (bx > 8 && bx < 80 && bz > 8 && bz < 104) continue; // tower plaza
      const w = 8 + Math.floor(rand() * 5), d = 8 + Math.floor(rand() * 5);
      const h = 6 + Math.floor(rand() * rand() * 30);
      // Two in five blocks read as rows of lit windows, the rest as dim facades.
      const lit = rand() < 0.4;
      const tex = lit ? 'window_lit' : FACADES[Math.floor(rand() * FACADES.length)];
      const side = lit
        ? materialFor('window_lit', { lit: false, color: [0xc89868, 0xa88a70, 0xd8b080][Math.floor(rand() * 3)] })
        : materialFor(tex, { lit: false, color: tex === 'tower_glass' || tex === 'facade_glass' ? 0x7a88a0 : 0x8a8078 });
      const mesh = new THREE.Mesh(boxGeo(w, h, d, lit ? 2.5 : 4, lit ? 3 : 3), [side, side, roofMat, roofMat, side, side]);
      mesh.position.set(bx + w / 2, h / 2, bz + d / 2);
      group.add(mesh);
      blocks.push({ mesh, real: mesh.material, t: 0 });
    }
  }
  // Sodium pools along the streets and the quay.
  const glow = materialFor('fx_smoke', { lit: false, additive: true, color: 0xff7018 });
  const pool = new THREE.PlaneGeometry(6, 6).rotateX(-PI / 2);
  for (let x = -20; x < 124; x += 11) {
    for (const z of [12, 104]) {
      const m = new THREE.Mesh(pool, glow);
      m.position.set(x, 0.15, z);
      group.add(m);
    }
  }
  for (let z = -20; z < 104; z += 11) {
    for (const x of [14, 90]) {
      const m = new THREE.Mesh(pool, glow);
      m.position.set(x, 0.15, z);
      group.add(m);
    }
  }
  root.add(group);
  return blocks;
}

/** Cyan SIM-grid blocks that flicker into existence as the glitch grows. */
const PHANTOMS = [
  [38.2, 63, 40, 66, 0, 2.2], [46.5, 70, 49, 72.5, 0, 3], [57.5, 62, 61, 64, 0, 1.6],
  [42, 49, 44.5, 52, 2.6, 3.8], [52, 42.5, 55, 44, 0, 2.2], [60, 76, 63, 79.5, 2.4, 4.4],
  [47, 55, 50, 57, 0, 1.2], [33.5, 44, 36, 47, 0, 2.6], [64, 50.5, 66, 53, 3, 5],
  [49, 80, 52, 83, 0, 2.4], [55, 36, 58, 38, 2.3, 3.4], [44, 31.5, 47, 34, 2, 4.5],
];

function buildPhantoms(root) {
  const mat = SIM_MAT();
  return PHANTOMS.map(([x0, z0, x1, z1, y0, y1], i) => {
    const mesh = new THREE.Mesh(boxGeo(x1 - x0, y1 - y0, z1 - z0, 2, 2), mat);
    mesh.position.set((x0 + x1) / 2, Y + (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.visible = false;
    root.add(mesh);
    return { mesh, t: i * 0.37 };
  });
}

/** Small self-lit fixtures: mast beacons, helipad edge lights, lamp heads. */
function buildFixtures(root) {
  const red = materialFor('fx_spark', { lit: false, color: 0xff2a18 });
  const amber = materialFor('fx_spark', { lit: false, color: 0xffc050 });
  const warm = materialFor('window_lit', { lit: false, color: 0xffe0b0 });
  const cube = (s) => new THREE.BoxGeometry(s, s, s);
  const beacons = [[33, 18.4, 36], [44, 20.4, 33], [48.5, 14.4, 38.5]].map(([x, y, z]) => {
    const m = new THREE.Mesh(cube(0.5), red);
    m.position.set(x, Y + y, z);
    root.add(m);
    return m;
  });
  // Tower-top aviation lights on the parapet corners.
  for (const [x, z] of [[30.5, 30.5], [73.5, 30.5], [30.5, 97.5], [73.5, 97.5]]) {
    const m = new THREE.Mesh(cube(0.35), red);
    m.position.set(x, Y + (z < 40 ? 3.6 : 1.5), z);
    root.add(m);
    beacons.push(m);
  }
  for (let x = 54.5; x <= 67.5; x += 2.6) {
    for (const z of [32.3, 40.2]) {
      const m = new THREE.Mesh(cube(0.18), amber);
      m.position.set(x, Y + 2.42, z);
      root.add(m);
    }
  }
  for (let z = 34.9; z <= 38; z += 2.6) {
    for (const x of [53.8, 68.7]) {
      const m = new THREE.Mesh(cube(0.18), amber);
      m.position.set(x, Y + 2.42, z);
      root.add(m);
    }
  }
  // Lamp heads under the overhead ducts and above the doors.
  for (const [x, y, z] of [[48.5, 2.05, 59.5], [64.5, 2.33, 60.6], [64, 2.55, 89.8], [53.45, 5.1, 31.85], [70.35, 5.1, 40.05]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.35), warm);
    m.position.set(x, Y + y, z);
    root.add(m);
  }
  return beacons;
}

// ------------------------------------------------------------ level
export default {
  id: 'roof',
  title: 'GLITCHEN',
  subtitle: 'Karlatornets tak. 13 december, 23.31',
  player: 'atta',
  mode: 'mission',
  size: [104, 128],
  spawn: { x: 39, z: 87.2, yaw: 0 },
  camYaw: 0,
  loadout: { tranq: 14, pistol: 0, repair: 1, items: ['box', 'spray'] },
  guardModel: 'sons_guard',
  guardWeapon: 'rifle2',
  barks: 'sons',
  // Look: night blizzard, cold blue fog, the city glowing orange below.
  ambient: [0.1, 0.11, 0.16],
  sky: [0.05, 0.06, 0.1],
  ground: [0.09, 0.06, 0.05],
  fogColor: [0.07, 0.08, 0.12],
  fog: [20, 112],
  ambientLight: 0.28,
  snow: 0.8,
  snowfall: true,
  blizzard: 0.8,
  wind: [0.9, 0.35],
  snowGround: true,
  snowFill: 70,
  grade: { lift: [0.0, 0.01, 0.035], gamma: [1, 1, 0.97], gain: [1.02, 1, 1.08], saturation: 0.82 },
  bloom: 0.6,
  exposure: 1.15,
  frost: 0.2,
  grain: 0.035,
  music: 'music_glitch',
  ambience: 'amb_blizzard',
  ambienceVolume: 0.7,
  sounds: [
    { name: 'hum_broken', x: 37.4, y: Y + 3, z: 32.4, volume: 0.55, ref: 3, max: 22 },
    { name: 'holo_hum', x: 51, y: Y + 1.2, z: 49, volume: 0.45, ref: 3, max: 20 },
    { name: 'radar_jam', x: 44, y: Y + 10, z: 33, volume: 0.2, ref: 4, max: 26 },
  ],
  codec: ['kall', 'linnea', 'astrom'],
  codecKey: 'roof',
  saveContact: 'linnea',
  glitch: 0.15,

  build(g) {
    // Streets 42 m below, and the frozen river to the south.
    g.open(0, 0, 103, 105, { ft: 'snow_asphalt', floorScale: 5 });
    g.water(0, 106, 103, 127, { ft: 'ice_river', floor: -1.2, et: 'concrete_raw', floorScale: 8 });

    // The tower: its parapet ring is the glass facade all the way down.
    const par = { h: Y + 1.2, wt: 'tower_glass', rt: 'metal_plate', wu: 4, wv: 3.5, lower: 'concrete_raw', lowerH: 1.3 };
    const crown = { ...par, h: Y + 3.3 };
    g.block(30, 30, 73, 30, crown);
    g.block(30, 31, 30, 41, crown);
    g.block(73, 31, 73, 41, crown);
    g.block(30, 42, 30, 97, par);
    g.block(73, 42, 73, 97, par);
    g.block(31, 97, 72, 97, par);

    // Main roof: fresh snow (footprints!).
    g.open(31, 31, 72, 96, { floor: Y, ft: 'snow_fresh', et: 'concrete_raw' });
    // The roof bleeding into the SIM training grid.
    g.open(42, 46, 61, 53, { floor: Y, ft: 'sim_grid_floor' });
    g.open(58, 44, 71, 50, { floor: Y, ft: 'sim_grid_floor' });
    g.open(38, 50, 44, 56, { floor: Y, ft: 'sim_noise_floor' });
    g.open(48, 54, 53, 57, { floor: Y, ft: 'sim_grid_floor' });
    const sim = { h: Y + 2.6, wt: 'sim_grid', rt: 'sim_wall_top', wu: 2, wv: 2 };
    g.block(44, 47, 45, 50, sim);
    g.block(50, 51, 53, 51, sim);
    g.block(56, 46, 57, 48, sim);
    g.block(61, 51, 64, 51, sim);
    g.block(67, 45, 68, 47, sim);

    // Crown deck (+2 m): antenna yard west, helipad east.
    g.open(31, 31, 72, 41, { floor: Y + 2, ft: 'snow_fresh', et: 'concrete_raw' });
    g.open(53, 32, 69, 40, { floor: Y + 2.3, ft: 'concrete_raw', et: 'metal_plate' });
    // Grand stairs (west) and service stairs (east) up to the crown.
    for (const [x0, x1] of [[42, 48], [65, 68]]) {
      [1.6, 1.2, 0.8, 0.4].forEach((dy, i) => g.open(x0, 42 + i, x1, 42 + i, { floor: Y + dy, ft: 'metal_plate', et: 'metal_plate' }));
    }

    // West maintenance ledge (metal, no footprints) and the sunken duct trench.
    g.open(31, 49, 33, 86, { floor: Y, ft: 'metal_plate', et: 'concrete_raw' });
    g.open(34, 53, 37, 79, { floor: Y - 1.6, ft: 'metal_plate', et: 'concrete_raw' });
    [[52, 1.2], [51, 0.8], [50, 0.4], [80, 1.2], [81, 0.8], [82, 0.4]].forEach(([z, d]) => g.open(34, z, 37, z, { floor: Y - d, ft: 'metal_plate', et: 'concrete_raw' }));

    // Elevator machine room (spawn) and the stair house.
    const core = { h: Y + 3.2, wt: 'metal_corrugated', rt: 'roof_snow', wu: 3, wv: 3, lower: 'concrete_raw', lowerH: 0.6 };
    g.block(34, 89, 43, 96, core);
    g.block(60, 90, 68, 96, { ...core, h: Y + 3.0 });
  },

  entities: [
    // ---- HVAC field
    ...hvac(41, 74, 46, 79, 2.4),
    ...hvac(41, 57, 46, 62, 2.4),
    ...hvac(50, 63, 57, 69, 3.2),
    ...hvac(62, 74, 67, 79, 2.2),
    ...hvac(62, 55, 67, 60, 2.6),
    ...hvac(70, 63, 72.95, 69, 1.8),
    box('hvac_duct', 49, 71, 58, 72, 0, 0.9, { uvScale: 1.5 }), // low duct: crouch cover
    // Overhead ducts (walk under them).
    box('hvac_duct', 46, 59, 51.5, 60, 2.2, 2.8, { cut: true, collide: false }),
    box('hvac_duct', 50.5, 60, 51.5, 63, 2.2, 2.8, { cut: true, collide: false }),
    box('hvac_duct', 57, 66, 70.5, 67, 2.3, 2.9, { cut: true, collide: false }),
    box('hvac_duct', 69.6, 66, 70.5, 67, 1.8, 2.3, { collide: false }),
    box('hvac_duct', 62, 60.2, 67, 61, 2.4, 2.9, { cut: true, collide: false }),
    // Trench bridges: walk over, or crawl under crouched.
    box('metal_plate', 33.9, 64, 38.1, 66, -0.35, 0, { uvScale: 1 }),
    box('metal_plate', 33.9, 74, 38.1, 75.6, -0.35, 0, { uvScale: 1 }),
    box('hvac_duct', 34, 55, 34.6, 68.8, -1.6, -1.0, { collide: false }), // pipes along the trench wall
    box('hvac_duct', 34, 71.2, 34.6, 79, -1.6, -1.0, { collide: false }),
    // Window-cleaning gondola parked on the east edge.
    box('metal_plate', 69.3, 80, 72.9, 84, 0, 1.3, { uvScale: 1 }),
    box('metal_rust', 70.6, 80.5, 71.4, 83.5, 1.3, 4.2, { collide: false }),
    prop('winch', 71.2, 86.2, -PI / 2),
    prop('vent_mushroom', 52, 65),
    prop('vent_mushroom', 55.3, 67.4),
    prop('vent_mushroom', 44.5, 66.5),
    prop('vent_mushroom', 69, 76.5),
    prop('vent_mushroom', 63.5, 57.5),
    prop('crate', 47, 86, 0.2),
    prop('crate', 48.4, 86.4, -0.3),
    prop('barrel', 57.2, 88.6),
    prop('barrel', 58.1, 89.1),
    prop('box', 32.2, 56, 0.5),
    prop('lamp_post', 50.5, 88.6, 0, { lightColor: 0xffc890, lightIntensity: 0.9 }),

    // ---- Crown deck: antenna yard + Linnea's transmitter
    ...mast(33, 36, 16),
    ...mast(44, 33, 18),
    ...mast(48.5, 38.5, 12),
    box('metal_plate', 35.2, 30.9, 39.6, 31.4, 2, 5.6, { uvScale: 1 }), // screen gantry
    box('metal_plate', 36.7, 31.4, 37.1, 32.1, 2, 3.95),
    decal('metal_plate', 37.4, 3.95, 32.4, 2.5, 2.5, PI / 4, { double: true }),
    decal('portrait_linnea', 37.44, 3.95, 32.44, 2.1, 2.1, PI / 4, { lit: false }),
    prop('server_rack', 33.6, 32.2, 0),
    prop('server_rack', 40.8, 32.2, 0),
    prop('terminal', 35.4, 33.9, 0.4),
    box('metal_plate', 53.3, 31.4, 53.6, 31.7, 2, 5.2),
    box('metal_plate', 70.2, 40.2, 70.5, 40.5, 2, 5.2),
    // Helipad markings.
    box('office_wall', 57, 33, 58, 39, 2.3, 2.33, { collide: false }),
    box('office_wall', 64, 33, 65, 39, 2.3, 2.33, { collide: false }),
    box('office_wall', 58, 35.5, 64, 36.5, 2.3, 2.33, { collide: false }),
    box('lifeboat_orange', 54, 32.5, 68, 32.8, 2.3, 2.33, { collide: false }),
    box('lifeboat_orange', 54, 39.7, 68, 40, 2.3, 2.33, { collide: false }),
    box('lifeboat_orange', 54, 32.8, 54.3, 39.7, 2.3, 2.33, { collide: false }),
    box('lifeboat_orange', 67.7, 32.8, 68, 39.7, 2.3, 2.33, { collide: false }),
    prop('barrier', 70.5, 38, PI / 2),
    prop('crate', 70.8, 34.2, 0.1),

    // ---- Decals
    decal('elevator_steel', 39, 1.35, 88.97, 2.2, 2.7, PI),
    decal('metal_plate', 64, 1.15, 89.97, 1.3, 2.3, PI),
    decal('poster_rorelsen', 36, 1.6, 88.96, 1.0, 1.4, PI),
    decal('poster_rorelsen', 53.5, 1.6, 62.94, 1.0, 1.4, PI),
    decal('graffiti_1', 62, 1.4, 89.96, 2.2, 1.6, PI),
    decal('poster_lugnet', 51.5, 1.5, 52.03, 1.1, 1.5, 0, { lit: false }),
    decal('neon_sim', 46.03, 2.0, 48.5, 2.6, 0.9, PI / 2, { lit: false }),
    decal('poster_minnes', 64.97, 1.5, 76.5, 1.0, 1.4, -PI / 2),

    // ---- Lights (15 + the player's)
    light(39, 2.9, 88, 0xffb870, 7, 1.1),
    light(64, 2.6, 89, 0xffa860, 6, 1.0, { flicker: 0.12 }),
    light(48.5, 1.9, 59.5, 0xffa050, 9, 1.05),
    light(64.5, 2.2, 60.6, 0x9fc4e8, 9, 0.95),
    light(35.5, -0.4, 66, 0xff3020, 5, 0.7, { flicker: 0.25 }),
    light(47, 2.2, 49, 0x40e8ff, 9, 1.0, { flicker: 0.25 }),
    light(62, 2.2, 47, 0x40e8ff, 8, 0.9, { flicker: 0.3 }),
    light(40, 7, 35, 0xff2a18, 15, 0.85, { strobe: 2.4 }),
    light(38.6, 3.6, 33.6, 0xffc8b0, 7, 1.1, { flicker: 0.15 }),
    light(53.8, 4.9, 32.2, 0xe0ecff, 12, 1.05),
    light(70, 4.9, 39.8, 0xe0ecff, 11, 0.95),
    light(45, 3.3, 42.4, 0xffd8a0, 8, 0.9),
    light(70.5, 2.6, 82, 0xffa050, 7, 0.8),
    light(58, 1.5, 84, 0x8fa8d0, 10, 0.6),

    // ---- Guards (Frihetens söner; the ones on the grid flicker like holograms)
    { type: 'path', id: 'p_south', points: [[55, 82.5, 3], [69, 82.5, 1], [69, 86.5, 3], [55, 86.5, 1]] },
    { type: 'path', id: 'p_hvac', points: [[48, 73.5, 2], [59.5, 73.5, 0.5], [59.5, 61.5, 2.5], [48, 61.5, 0.5]] },
    { type: 'path', id: 'p_rim', points: [[38.9, 55, 3], [38.9, 72, 2.5]] },
    { type: 'path', id: 'p_sim1', points: [[39.5, 52.5, 2.5], [59.5, 52.5, 2.5]] },
    { type: 'path', id: 'p_sim2', points: [[48.5, 46.5, 2], [54.5, 46.5, 0], [54.5, 49.5, 0], [65.5, 49.5, 2.5], [54.5, 49.5, 0], [54.5, 46.5, 0]] },
    { type: 'path', id: 'p_crown', points: [[33, 40.3, 3], [50.5, 40.3, 3]] },
    { type: 'guard', id: 'r_south', x: 55, z: 86.5, rot: PI / 2, path: 'p_south', group: 'a' },
    { type: 'guard', id: 'r_hvac', x: 48, z: 73.5, rot: PI / 2, path: 'p_hvac', group: 'a' },
    { type: 'guard', id: 'r_rim', x: 38.9, z: 58, rot: 0, path: 'p_rim', group: 'a' },
    { type: 'guard', id: 'r_sim1', x: 59.5, z: 52.5, rot: -PI / 2, path: 'p_sim1', group: 'b', holo: true, tint: HOLO_TINT },
    { type: 'guard', id: 'r_sim2', x: 54.5, z: 46.5, rot: -PI / 2, path: 'p_sim2', group: 'b', holo: true, tint: HOLO_TINT },
    { type: 'guard', id: 'r_crown', x: 33, z: 40.3, rot: PI / 2, path: 'p_crown', group: 'b', holo: true, tint: HOLO_TINT },

    // ---- Hiding
    { type: 'locker', x: 34.62, z: 70, rot: PI / 2 },
    { type: 'locker', x: 59.4, z: 93, rot: -PI / 2 },
    { type: 'locker', x: 31.62, z: 38.5, rot: PI / 2 },
    { type: 'trigger', id: 'hide_trench', rect: [34, 53, 37, 56], hide: true },
    { type: 'trigger', id: 'hide_hvac', rect: [70, 70, 72, 72], hide: true },
    { type: 'trigger', id: 'hide_crown', rect: [31, 31, 33, 34], hide: true },

    // ---- Pickups
    { type: 'pickup', kind: 'tranq', x: 35.5, z: 60 },
    { type: 'pickup', kind: 'repair', x: 71.5, z: 71.5 },
    { type: 'pickup', kind: 'battery', x: 39.5, z: 48.5 },
    { type: 'pickup', kind: 'tranq', x: 70.5, z: 44.5 },
    { type: 'pickup', kind: 'repair', x: 32, z: 32.5 },

    // ---- Story triggers
    { type: 'trigger', id: 'snow', rect: [38, 80, 52, 84] },
    { type: 'trigger', id: 'field', rect: [31, 70, 72, 70], checkpoint: 'cp_field' },
    { type: 'trigger', id: 'g2', rect: [31, 64, 72, 65] },
    { type: 'trigger', id: 'g3', rect: [31, 53, 72, 54], checkpoint: 'cp_sim' },
    { type: 'trigger', id: 'reloads', rect: [31, 49, 72, 50] },
    { type: 'trigger', id: 'linnea', rect: [31, 42, 72, 46] },
    { type: 'trigger', id: 'crown', rect: [31, 39, 72, 41], checkpoint: 'cp_crown' },
    { type: 'trigger', id: 'helipad', rect: [53, 31, 72, 40], repeat: true },
    { type: 'use', id: 'screen', x: 39.3, z: 34.4, r: 1.8, label: 'Titta på skärmen', when: (g) => !!g.flags.ro_linnea && !g.flags.ro_truth },
    { type: 'npc', id: 'sara', model: 'sara2', name: 'SARA NYBERG', x: 63.5, z: 34.5, rot: -0.92 },

    { type: 'marker', id: 'cp_field', x: 48, z: 70.5, yaw: 0 },
    { type: 'marker', id: 'cp_sim', x: 48, z: 54.6, yaw: 0 },
    { type: 'marker', id: 'cp_crown', x: 45, z: 40, yaw: 0 },
    { type: 'marker', id: 'reinforce', x: 64, z: 88.5, yaw: 0 },
  ],

  stages: {
    get tower_roof() { return STAGES[stageKey]; },
    // Per-cutscene stagings (the engine prefers these over the scene id).
    roof_glitch: STAGES.glitch,
    roof_linnea: STAGES.linnea,
    roof_sara: STAGES.sara,
  },

  script: {
    onStart(g, restore) {
      const root = g.world.root;
      this.city = buildCity(g, root);
      this.phantoms = buildPhantoms(root);
      this.beacons = buildFixtures(root);
      this.simMat = SIM_MAT();
      this.flipT = 0;
      this.t = 0;
      const sara = g.npc('sara');
      sara?.setHidden(!g.flags.ro_truth);
      g.sys.glitch.level = glitchFor(g.flags);
      if (restore) {
        g.setObjective(g.flags.ro_truth ? 2 : g.flags.ro_linnea ? 1 : 0);
        if (!g.flags.ro_g1) advance(g, 0);
        return;
      }
      // The snow stops in mid-air during the call ("Snön är avstängd …").
      g.later(9, () => { if (g.cutscene.playing) freezeSnow(g, true); });
      playScene(g, 'glitch', 'roof_glitch').then(() => {
        freezeSnow(g, true);
        advance(g, 0, () => g.setObjective(0));
      });
    },

    trigger(g, id) {
      switch (id) {
        case 'snow': g.say('ro_snow'); break;
        case 'g2': g.glitchPulse(0.9, 0.6); advance(g, 1); break;
        case 'g3': g.glitchPulse(1, 0.8); advance(g, 2); break;
        case 'reloads':
          if ((g.progress?.loads ?? 0) >= 5 && !g.flags.ro_reloads) { setFlag(g, 'ro_reloads'); playReloads(g); }
          break;
        case 'linnea': advance(g, 3); break;
        case 'helipad': if (g.flags.ro_truth && !g.flags.ro_sara) this.meetSara(g); break;
        default:
      }
    },

    use(g, u) {
      if (u.id !== 'screen') return;
      setFlag(g, 'ro_truth');
      playScene(g, 'linnea', 'roof_linnea').then(() => {
        g.glitchPulse(0.9, 0.5);
        g.radio('ro_truth', () => {
          g.sys.glitch.level = 0.7;
          g.glitchPulse(1, 0.8);
          g.npc('sara')?.setHidden(false);
          g.setObjective(2);
          g.checkpoint('cp_crown');
        });
      });
    },

    meetSara(g) {
      setFlag(g, 'ro_sara');
      g.npc('sara')?.setHidden(true);
      g.sys.glitch.level = 0.25;
      playScene(g, 'sara', 'roof_sara').then(() => g.completeChapter());
    },

    update(g, dt) {
      this.t += dt;
      const level = g.sys.glitch.level;
      // The snow falls again once Kall's first call is over.
      if (g.snow.frozenSpeeds && g.flags.ro_g1) freezeSnow(g, false);
      // Hologram guards: tinted cyan, and they drop out for a frame or two.
      for (const guard of g.guards) {
        if (!guard.def.holo) continue;
        guard.obj.visible = guard.down || guard.carried || Math.random() > 0.05 + level * 0.1;
      }
      // Beacons blink with the red strobe.
      const on = Math.sin(this.t * 2.4) > -0.2;
      for (const b of this.beacons ?? []) b.visible = on;
      // SIM phantoms fade in and out as the glitch grows.
      for (const p of this.phantoms ?? []) {
        p.t -= dt;
        if (p.t > 0) continue;
        p.t = 0.15 + Math.random() * (1.4 - level);
        p.mesh.visible = level >= 0.35 && Math.random() < level * 0.8;
      }
      // The city below flickers into the training grid.
      this.flipT -= dt;
      if (this.flipT <= 0 && this.city) {
        this.flipT = 0.12 + Math.random() * 0.5;
        for (const b of this.city) {
          const sim = level >= 0.3 && Math.random() < (level - 0.25) * 0.35;
          b.mesh.material = sim ? this.simMat : b.real;
        }
      }
    },

    onLeave(g) {
      freezeSnow(g, false);
    },
  },
};
