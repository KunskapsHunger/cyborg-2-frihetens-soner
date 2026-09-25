import * as THREE from 'three';
import { materialFor, findPart } from '../engine/assets.js';

// VII. ÄLVEN — the frozen Göta älv below Karlatornet, 23.54, in a blizzard.
// Henrik comes down from the south quay and crosses the ice (open leads,
// pressure ridges, a Sons camp, a Volvo on the ice) towards the lit broadcast
// rig and the Archive borehole at the foot of the dark tower. There
// Järnjätten wakes (river_intro), Åtta arrives, and the two bring it down
// together: EMP (Q) stuns it and exposes the red eye.
//
// Flow: ri_start → cross the ice → river_intro → ri_jatte → boss → bossDown →
// ri_jatte_down → Sara (river_sara_live | river_sara_dies) → the Archive (E)
// → river_archive → next chapter (church epilogue).

const PI = Math.PI;
const ARENA = { cx: 53, cz: 40, r: 13 };

// ------------------------------------------------------------ entity helpers
const box = (tex, x0, z0, x1, z1, y0, y1, extra = {}) => ({ type: 'box', tex, x0, z0, x1, z1, y0, y1, ...extra });
const light = (x, y, z, color, range, intensity, extra = {}) => ({ type: 'light', x, y, z, color, range, intensity, ...extra });
const decal = (tex, x, y, z, w, h, rot = 0, extra = {}) => ({ type: 'decal', tex, x, y, z, w, h, rot, ...extra });
const prop = (model, x, z, rot = 0, extra = {}) => ({ type: 'prop', model, x, z, rot, ...extra });

/** Ice-road marker pole (plogkäpp) with an orange reflector top. */
function pole(x, z) {
  return [
    box('metal_plate', x - 0.04, z - 0.04, x + 0.04, z + 0.04, 0, 1.3, { collide: false, uvScale: 0.5 }),
    box('lifeboat_orange', x - 0.06, z - 0.06, x + 0.06, z + 0.06, 1.3, 1.6, { collide: false }),
  ];
}

// The ice road the Sons marked from the south quay to their camp and on to the rig.
const ICE_ROAD = [[80.5, 101], [77, 97], [72, 93.5], [66, 91], [60, 88], [57, 83], [55.5, 78], [54, 74], [58.5, 72], [55, 64], [53.5, 59]];

/** Floodlight stand: steel pole, lamp box. */
function flood(x, z, h = 6) {
  return [
    box('metal_plate', x - 0.6, z - 0.6, x + 0.6, z + 0.6, 0, 0.25, { uvScale: 1 }),
    box('metal_plate', x - 0.12, z - 0.12, x + 0.12, z + 0.12, 0.25, h, { uvScale: 1 }),
    box('metal_plate', x - 0.7, z - 0.25, x + 0.7, z + 0.25, h, h + 0.5, { collide: false }),
  ];
}

// Åtta's firing positions, on an arc outside the machine's orbit (south side).
const ATTA_SPOTS = [-25, 15, 55, 95, 135, 175, 205].map((deg) => {
  const a = (deg * PI) / 180;
  return [ARENA.cx + Math.cos(a) * 18.5, ARENA.cz + Math.sin(a) * 18.5];
});

// ------------------------------------------------------------ cutscene stages
// One scene ('river_ice'), three moments: the intro at the arena edge, Sara on
// the ice after the fight, and the Archive. Every variant carries the whole
// cast so any of them satisfies every river cutscene.
const VARIANTS = {
  intro: {
    actors: {
      henrik: { x: 52.5, z: 46, rot: PI },
      sara: { x: 53, z: 28.5, rot: 0 },
      guard1: { x: 50.4, z: 29.4, rot: 0.35 },
      guard2: { x: 56.4, z: 27.6, rot: -0.5 },
      atta: { x: 63, z: 45, rot: -2.3 },
    },
    marks: { mark_a: [52.5, 40.5], mark_b: [54.8, 41.2] },
    establish: { pos: [66, 5.5, 74], look: [53, 12, 22], fov: 55 },
  },
  sara: {
    actors: {
      sara: { x: 46, z: 27.5, rot: 0.9 },
      atta: { x: 47.6, z: 28.9, rot: -2.3 },
      henrik: { x: 44.4, z: 28.9, rot: 2.3 },
      police1: { x: 40, z: 14.5, rot: 0.5 },
    },
    marks: { mark_a: [45, 26.2], mark_b: [39.5, 14] },
    establish: { pos: [36, 5, 38], look: [46, 1, 27], fov: 50 },
  },
  archive: {
    actors: {
      henrik: { x: 55.2, z: 23.8, rot: 2.75 },
      atta: { x: 58.6, z: 24.4, rot: -2.55 },
    },
    establish: { pos: [44, 6, 34], look: [56, 2, 21], fov: 50 },
  },
};
const BASE = {
  actors: {
    henrik: { x: 52.5, z: 46, rot: PI }, atta: { x: 63, z: 45, rot: -2.3 }, sara: { x: 53, z: 28.5, rot: 0 },
    guard1: { x: 50.4, z: 29.4, rot: 0.35 }, guard2: { x: 56.4, z: 27.6, rot: -0.5 }, police1: { x: 40, z: 14.5, rot: 0.5 },
  },
  marks: { mark_a: [52.5, 40.5], mark_b: [54.8, 41.2] },
  // Broadcast screen faces south-east (rot π/4); the Archive cabinet stands by the borehole.
  props: { screen: [62.5 + 0.92, 4.2 + 0.74, 25.2 + 0.92], archive: [56.5 + 1.4, 1.85, 20.4 + 1.4] },
};
const STAGES = Object.fromEntries(Object.entries(VARIANTS).map(([k, v]) => [k, {
  ...v,
  actors: { ...BASE.actors, ...v.actors },
  marks: { ...BASE.marks, ...v.marks },
  props: { ...BASE.props, ...v.props },
}]));
let stageKey = 'intro';

// ------------------------------------------------------------ script helpers
const setFlag = (g, k) => { g.flags = { ...g.flags, [k]: true }; };

/** The Sons scatter when the machine wakes: drop the remaining patrols. */
function dismissGuards(g) {
  for (const guard of g.guards) {
    guard.cone?.dispose?.();
    for (const o of [guard.obj, guard.shadow, guard.iconMesh, guard.qMesh]) if (o) o.parent?.remove(o);
  }
  g.guards = [];
  g.alarm.reset();
}

function jatte(g) { return g.bosses.find((b) => b.def.kind === 'jatte') ?? null; }

/** Boss camera: lower and wider so the whole machine stays in frame. */
function bossCamera(g, on) {
  g.cam.pitch = on ? 0.5 : 0.95;
  g.cam.dist = on ? 12.5 : 9.5;
}

/** Put the player where Henrik stood in the last cutscene. */
function placePlayer(g, x, z, yaw = 0) {
  g.player.spawn(x, Math.max(0, g.world.grid.floorAt(x, z)), z, yaw);
  g.cam.snap(g.player.pos, yaw);
}

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

// ------------------------------------------------------------ set dressing
// Visual-only meshes: the city on both banks, Älvsborgsbron in the west, and
// the single lit window on the 22nd floor.

const FACADES = ['facade_haga', 'facade_landshovding', 'facade_concrete', 'facade_brick', 'facade_glass'];

function buildSkyline(root) {
  const rand = rng(4711);
  const group = new THREE.Group();
  group.name = 'river_skyline';
  const roofMat = materialFor('roof_snow', {});
  const add = (x, z, w, d, h) => {
    const lit = rand() < 0.45;
    const tex = lit ? 'window_lit' : FACADES[Math.floor(rand() * FACADES.length)];
    const side = materialFor(tex, { lit: false, color: lit ? [0xc89868, 0xa88a70, 0xd8b080][Math.floor(rand() * 3)] : 0x7a7470 });
    const mesh = new THREE.Mesh(boxGeo(w, h, d, lit ? 2.5 : 4, 3), [side, side, roofMat, roofMat, side, side]);
    mesh.position.set(x + w / 2, h / 2 + 1.2, z + d / 2);
    group.add(mesh);
  };
  // South bank (Masthugget side) behind the quay houses.
  for (let x = -14; x < 124; x += 15) add(x, 128 + rand() * 6, 10 + rand() * 3, 10, 10 + rand() * 22);
  for (let x = -6; x < 124; x += 17) add(x, 145 + rand() * 6, 11, 11, 16 + rand() * 26);
  // North bank (Hisingen) beside the tower.
  for (let x = -14; x < 124; x += 16) if (x < 26 || x > 80) add(x, -24 + rand() * 6, 11, 11, 12 + rand() * 20);
  root.add(group);
}

/** Älvsborgsbron: two portal towers, the deck and a string of lights, far west. */
function buildBridge(root) {
  const group = new THREE.Group();
  group.name = 'alvsborgsbron';
  const steel = materialFor('metal_plate', { color: 0x8a95a0 });
  const lamp = materialFor('fx_spark', { lit: false, fog: false, color: 0xffb060 });
  const red = materialFor('fx_spark', { lit: false, fog: false, color: 0xff3020 });
  const X = -26;
  const piece = (w, h, d, x, y, z, mat = steel) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  for (const tz of [-30, 150]) {
    piece(2.5, 78, 2.5, X - 7, 29, tz);
    piece(2.5, 78, 2.5, X + 7, 29, tz);
    piece(16, 2, 2.5, X, 66, tz);
    piece(16, 2, 2.5, X, 40, tz);
    piece(0.8, 0.8, 0.8, X - 7, 69, tz, red);
    piece(0.8, 0.8, 0.8, X + 7, 69, tz, red);
  }
  piece(14, 2.2, 260, X, 34, 60);
  // Main cables: a sagging chain of segments on each side.
  const cable = (side) => {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const z = -30 + t * 180;
      pts.push(new THREE.Vector3(X + side * 7, 67 - Math.sin(t * PI) * 30, z));
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, len), steel);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.lookAt(b);
      group.add(m);
    }
  };
  cable(-1);
  cable(1);
  for (let z = -60; z < 180; z += 9) {
    piece(0.5, 0.5, 0.5, X - 6.5, 35.5, z, lamp);
    piece(0.5, 0.5, 0.5, X + 6.5, 35.5, z, lamp);
  }
  root.add(group);
}

function buildTowerDetails(root) {
  // "Ett enda fönster lyser, på tjugoandra våningen."
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), materialFor('window_lit', { lit: false, fog: false, color: 0xfff0c8 }));
  win.position.set(50.5, 74, 9.03);
  root.add(win);
  const beacon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), materialFor('fx_spark', { lit: false, fog: false, color: 0xff2a18 }));
  beacon.position.set(53, 131, 4.5);
  root.add(beacon);
  return beacon;
}

// ------------------------------------------------------------ level
export default {
  id: 'river',
  title: 'ÄLVEN',
  subtitle: 'Göta älv, nedanför tornet. 13 december, 23.54',
  player: 'henrik2',
  mode: 'mission',
  size: [110, 124],
  spawn: { x: 83.5, z: 109, yaw: 0 },
  camYaw: 0,
  loadout: { tranq: 18, pistol: 8, repair: 2, items: ['box'] },
  guardModel: 'sons_guard',
  guardWeapon: 'rifle2',
  barks: 'sons',
  // Look: midnight blizzard over black ice; floodlights, the tower's cold
  // spill, sodium on the quays and the machine's red eye.
  ambient: [0.1, 0.11, 0.16],
  sky: [0.07, 0.08, 0.13],
  ground: [0.05, 0.05, 0.06],
  fogColor: [0.08, 0.09, 0.13],
  fog: [16, 104],
  ambientLight: 0.26,
  snow: 0.45,
  snowfall: true,
  blizzard: 0.85,
  wind: [1.0, 0.45],
  snowGround: true,
  snowFill: 60,
  grade: { lift: [0.0, 0.01, 0.03], gamma: [1, 1, 0.97], gain: [1.04, 1, 1.06], saturation: 0.85 },
  bloom: 0.7,
  exposure: 1.15,
  frost: 0.25,
  grain: 0.03,
  music: 'music_sneak2',
  ambience: 'amb_river_ice',
  ambienceVolume: 0.75,
  sounds: [
    { name: 'drill_loop', x: 53, y: 1, z: 21, volume: 0.35, ref: 4, max: 30 },
    { name: 'hum_broken', x: 63, y: 3, z: 25, volume: 0.4, ref: 3, max: 18 },
    { name: 'foghorn', x: -20, y: 10, z: 60, volume: 0.25, ref: 20, max: 140 },
  ],
  codec: ['astrom'],
  codecKey: 'river',
  saveContact: 'astrom',

  build(g) {
    // The frozen river; its edges get thin dark ice.
    g.open(0, 0, 109, 123, { ft: 'ice_river', et: 'ice_thin', floorScale: 7 });
    // Open river to the west, towards the bridge and the sea.
    g.water(0, 17, 3, 105, { ft: 'water', floor: -0.8, et: 'ice_thin' });

    // North bank: Karlatornet, its podiums, harbour sheds; the quay (+1.2 m).
    g.block(0, 0, 109, 1, { h: 12, wt: 'facade_concrete', rt: 'roof_snow' });
    g.block(4, 2, 29, 8, { h: 11, wt: 'metal_corrugated', rt: 'roof_snow', wu: 3, wv: 3 });
    g.block(30, 2, 43, 8, { h: 9, wt: 'facade_glass', rt: 'roof_snow', lower: 'concrete_raw', lowerH: 1.8 });
    g.block(44, 2, 62, 8, { h: 130, wt: 'tower_glass', rt: 'metal_plate', wu: 4, wv: 3.5, lower: 'facade_glass', lowerH: 7 });
    g.block(63, 2, 76, 8, { h: 9, wt: 'facade_glass', rt: 'roof_snow', lower: 'concrete_raw', lowerH: 1.8 });
    g.block(77, 2, 105, 8, { h: 12, wt: 'facade_concrete', rt: 'roof_snow', lower: 'metal_corrugated', lowerH: 3.5 });
    g.block(0, 2, 3, 16, { h: 11, wt: 'metal_corrugated', rt: 'roof_snow' });
    g.block(106, 2, 109, 16, { h: 11, wt: 'metal_corrugated', rt: 'roof_snow' });
    g.open(4, 9, 105, 16, { floor: 1.2, ft: 'cobble_snow', et: 'concrete_raw', floorScale: 4 });
    for (const [x0, x1] of [[38, 41], [66, 69]]) {
      g.open(x0, 17, x1, 17, { floor: 0.8, ft: 'concrete_raw', et: 'concrete_raw' });
      g.open(x0, 18, x1, 18, { floor: 0.4, ft: 'concrete_raw', et: 'concrete_raw' });
    }

    // South bank quay (spawn) with the city behind it.
    g.open(0, 106, 109, 115, { floor: 1.2, ft: 'cobble_snow', et: 'concrete_raw', floorScale: 4 });
    g.block(0, 116, 30, 123, { h: 14, wt: 'facade_haga', rt: 'roof_snow', wu: 5, wv: 4 });
    g.block(31, 116, 62, 123, { h: 16, wt: 'facade_landshovding', rt: 'roof_snow', wu: 5, wv: 4 });
    g.block(63, 116, 109, 123, { h: 13, wt: 'facade_haga', rt: 'roof_snow', wu: 5, wv: 4 });
    g.open(81, 105, 86, 105, { floor: 0.8, ft: 'concrete_raw', et: 'concrete_raw' });
    g.open(81, 104, 86, 104, { floor: 0.4, ft: 'concrete_raw', et: 'concrete_raw' });

    // Snow drifts on the ice (they take footprints; bare ice does not).
    for (const [x0, z0, x1, z1] of [[70, 92, 100, 103], [8, 88, 24, 103], [30, 74, 42, 86], [62, 70, 80, 82], [8, 58, 30, 68], [74, 40, 100, 58], [6, 22, 34, 40], [36, 94, 60, 103]]) {
      g.open(x0, z0, x1, z1, { ft: 'snow_fresh', et: 'ice_thin' });
    }

    // Open leads and fishing holes (black water, not walkable).
    g.water(4, 70, 40, 71, { floor: -0.6, et: 'ice_thin' });
    g.water(60, 66, 105, 67, { floor: -0.6, et: 'ice_thin' });
    g.water(25, 76, 26, 100, { floor: -0.6, et: 'ice_thin' });
    g.water(47, 96, 47, 96, { floor: -0.6 });
    g.water(58, 97, 58, 97, { floor: -0.6 });
    // The borehole into the shelter; the Archive came up through it.
    g.water(52, 19, 54, 21, { floor: -1.6, et: 'metal_rust' });

    // Pressure ridges: broken ice heaved into walls (cover).
    const ridge = (x0, z0, x1, z1, h) => g.block(x0, z0, x1, z1, { h, wt: 'ice_river', rt: 'snow_fresh', wu: 3, wv: 2 });
    ridge(70, 88, 77, 88, 1.8);
    ridge(44, 78, 45, 84, 1.6);
    ridge(60, 76, 63, 76, 2.0);
    ridge(14, 60, 19, 60, 1.6);
    ridge(85, 72, 86, 79, 1.9);
    ridge(30, 90, 35, 90, 1.5);
    ridge(8, 84, 12, 85, 2.2);
    ridge(92, 94, 98, 94, 1.7);
    // Arena: cover inside the machine's orbit, and a ring of floes outside it.
    ridge(47, 36, 49, 36, 1.6);
    ridge(56, 44, 58, 44, 1.8);
    ridge(51, 46, 51, 48, 1.5);
    ridge(29, 44, 32, 45, 1.9);
    ridge(74, 36, 77, 37, 2.0);
    ridge(40, 61, 43, 61, 1.7);
  },

  entities: [
    // ---- North quay: the broadcast rig and the Archive borehole
    prop('container', 66, 20.8, PI / 2, { id: 'rig' }),
    box('metal_plate', 69.2, 19, 69.6, 19.4, 0, 13, { uvScale: 1 }), // antenna mast
    box('metal_plate', 68.4, 18.9, 70.4, 19.5, 11.5, 12.8, { collide: false }),
    box('metal_plate', 61.8, 24.5, 62.2, 24.9, 0, 4.4, { uvScale: 1 }), // screen post
    decal('metal_plate', 62.5, 4.2, 25.2, 3.8, 3.8, PI / 4, { double: true }),
    decal('portrait_sara2', 62.54, 4.2, 25.24, 3.3, 3.3, PI / 4, { lit: false }),
    decal('portrait_glitch', 62.56, 4.2, 25.26, 3.3, 3.3, PI / 4, { lit: false }),
    decal('poster_rorelsen', 66, 1.6, 22.25, 1.1, 1.5, 0),
    ...flood(47, 22.5),
    ...flood(60, 21.5),
    ...flood(71, 27.5),
    // Borehole: steel frame, winch tripod, the Archive cabinet and its terminal.
    box('metal_rust', 51.6, 18.6, 54.4, 19, 0, 0.35),
    box('metal_rust', 51.6, 22, 54.4, 22.4, 0, 0.35),
    box('metal_rust', 51.6, 19, 52, 22, 0, 0.35),
    box('metal_rust', 54, 19, 54.4, 22, 0, 0.35),
    box('metal_plate', 52.9, 18.7, 53.1, 18.9, 0.35, 4.6, { collide: false }),
    box('metal_plate', 52.9, 22.1, 53.1, 22.3, 0.35, 4.6, { collide: false }),
    box('metal_plate', 52.8, 18.7, 53.2, 22.3, 4.5, 4.8, { collide: false }),
    prop('winch', 49.8, 20.5, PI / 2),
    prop('server_rack', 56.5, 20.4, PI / 4, { id: 'archive_cabinet' }),
    prop('terminal', 58.3, 22.2, -0.3),
    prop('crate', 58.8, 19.6, 0.2),
    prop('barrel', 45.2, 19.5),
    prop('barrel', 44.4, 20.3),
    prop('streetlight', 36, 15.4, 0),
    prop('streetlight', 74, 15.4, 0),
    prop('bollard', 30, 16.2),
    prop('bollard', 47, 16.2),
    prop('bollard', 80, 16.2),
    decal('graffiti_1', 18, 1.6, 9.02, 3, 2, 0),
    decal('poster_rorelsen', 36.5, 2.8, 9.02, 1.1, 1.5, 0),

    // ---- The ice: marked ice road, Sons camp, a Volvo, frozen boats
    ...ICE_ROAD.flatMap(([x, z]) => pole(x, z)),
    box('stall_canvas', 60.5, 93.5, 62.5, 95.5, 0, 1.5, { uvScale: 1.5 }),
    prop('crate', 62.9, 93.2, 0.7),
    prop('crate', 44.2, 88.9, -0.2),
    prop('barrel', 36.5, 80),
    prop('barrel', 37.3, 80.6),
    prop('crate', 90.5, 86.5, 0.4),
    prop('barrier', 30, 64.5, PI / 2),
    prop('barrier', 76, 61, PI / 2),
    decal('poster_rorelsen', 61.5, 1.0, 95.52, 0.9, 1.2, 0),
    box('stall_canvas', 47, 88, 49.5, 90.5, 0, 1.7, { uvScale: 1.5 }),
    box('stall_canvas', 53, 90.2, 55.5, 92.7, 0, 1.6, { uvScale: 1.5 }),
    prop('crate', 51, 88.6, 0.3),
    prop('barrel', 50.8, 91.2),
    prop('box', 45.8, 91.5, 0.6),
    prop('volvo240', 20.5, 95, 0.45),
    prop('boat', 92, 49, 0.8),
    prop('boat', 14, 36, -0.4),
    prop('barrier', 38, 97, 0.1),
    prop('barrier', 66, 99, -0.2),
    prop('bench', 60, 111.5, PI),
    prop('tree_spruce', 12, 113.5),
    prop('tree_spruce', 100, 113),
    prop('streetlight', 78, 107.4, PI),
    prop('streetlight', 92, 107.4, PI),
    prop('bollard', 70, 106.4),
    decal('poster_rorelsen', 40, 2.8, 115.98, 1.1, 1.5, PI),

    // ---- Lights (15 + the machine's eye + the player's)
    light(53, 9, 13, 0xb8ccff, 18, 1.0),
    light(47, 6.3, 22.9, 0xe8f0ff, 16, 1.4),
    light(60, 6.3, 21.9, 0xe8f0ff, 16, 1.4),
    light(71, 6.3, 27.9, 0xdfe8ff, 15, 1.2),
    light(53, 2.2, 19, 0xffa050, 7, 1.2, { flicker: 0.1 }),
    light(63.4, 3.6, 26.2, 0xffb090, 8, 1.0, { flicker: 0.15 }),
    light(51, 1.5, 90, 0xffb060, 7, 1.1, { flicker: 0.25 }),
    light(22.5, 0.9, 93, 0xfff0d0, 10, 1.0),
    light(88, 2.2, 48.5, 0x9fb8d8, 8, 0.6),
    light(70, 3, 104, 0xffa050, 8, 0.7),

    // ---- The Sons on the ice
    { type: 'path', id: 'p_pass', points: [[44, 69, 2.5], [58, 69, 2.5]] },
    { type: 'path', id: 'p_east', points: [[66, 80, 2], [84, 84, 1], [80, 95, 2.5], [66, 92, 1]] },
    { type: 'path', id: 'p_west', points: [[12, 78, 2], [22, 90, 2], [12, 98, 2.5]] },
    { type: 'path', id: 'p_line', points: [[30, 63.5, 2.5], [76, 63.5, 2.5]] },
    { type: 'guard', id: 'q_pass', x: 58, z: 69, rot: -PI / 2, path: 'p_pass', group: 'a' },
    { type: 'guard', id: 'q_east', x: 66, z: 80, rot: PI / 2, path: 'p_east', group: 'a' },
    { type: 'guard', id: 'q_west', x: 12, z: 78, rot: 0, path: 'p_west', group: 'b' },
    { type: 'guard', id: 'q_camp', x: 51, z: 93.8, rot: 0.3, group: 'b' },
    { type: 'guard', id: 'q_line', x: 76, z: 63.5, rot: -PI / 2, path: 'p_line', group: 'a' },

    // ---- The boss and the people on the ice
    { type: 'boss', kind: 'jatte', x: 53, z: 24, rot: 0.55, cx: ARENA.cx, cz: ARENA.cz, r: ARENA.r, name: 'JÄRNJÄTTEN' },
    { type: 'npc', id: 'sara', model: 'sara2', name: 'SARA NYBERG', x: 53, z: 27, rot: 0 },
    { type: 'npc', id: 'atta', model: 'atta', name: 'ÅTTA', x: ATTA_SPOTS[3][0], z: ATTA_SPOTS[3][1], rot: PI },

    // ---- Hiding
    { type: 'locker', x: 48.2, z: 87.35, rot: PI },
    { type: 'locker', x: 95, z: 115.4, rot: PI },
    { type: 'trigger', id: 'hide_ridge_w', rect: [45, 79, 46, 83], hide: true },
    { type: 'trigger', id: 'hide_ridge_e', rect: [70, 89, 77, 90], hide: true },
    { type: 'trigger', id: 'hide_boat', rect: [12, 37, 16, 39], hide: true },

    // ---- Pickups (the machine eats tranquilliser darts)
    { type: 'pickup', kind: 'tranq', x: 49.5, z: 92, amount: 8 },
    { type: 'pickup', kind: 'battery', x: 71.5, z: 90 },
    { type: 'pickup', kind: 'repair', x: 10, z: 87.5 },
    { type: 'pickup', kind: 'tranq', x: 34.5, z: 44.5, amount: 8 },
    { type: 'pickup', kind: 'tranq', x: 72.5, z: 38.5, amount: 8 },
    { type: 'pickup', kind: 'battery', x: 53, z: 49.5 },
    { type: 'pickup', kind: 'battery', x: 41.5, z: 62.5 },
    { type: 'pickup', kind: 'repair', x: 30.5, z: 46.5 },

    // ---- Story
    { type: 'trigger', id: 'ice', rect: [74, 94, 94, 102] },
    { type: 'trigger', id: 'mid', rect: [4, 72, 105, 73], checkpoint: 'cp_mid' },
    { type: 'trigger', id: 'arena', rect: [4, 50, 105, 57] },
    { type: 'trigger', id: 'sara_body', rect: [43, 25, 49, 31], repeat: true },
    { type: 'use', id: 'archive', x: 56.5, z: 22.4, r: 1.9, label: 'Arkivet', when: (g) => !!g.flags.ri_sara && !g.flags.ri_archive },
    { type: 'marker', id: 'cp_start', x: 83.5, z: 101, yaw: 0 },
    { type: 'marker', id: 'cp_mid', x: 50, z: 74, yaw: 0 },
    { type: 'marker', id: 'cp_arena', x: 52.5, z: 40.5, yaw: 0 },
    { type: 'marker', id: 'cp_sara', x: 46, z: 31.5, yaw: 0 },
    { type: 'marker', id: 'reinforce', x: 95, z: 104, yaw: 0 },
  ],

  stages: {
    get river_ice() { return STAGES[stageKey]; },
    // Per-cutscene stagings (the engine prefers these over the scene id).
    river_intro: STAGES.intro,
    river_sara_live: STAGES.sara,
    river_sara_dies: STAGES.sara,
    river_archive: STAGES.archive,
  },

  script: {
    onStart(g, restore) {
      const root = g.world.root;
      buildSkyline(root);
      buildBridge(root);
      this.beacon = buildTowerDetails(root);
      this.screens = { sara: root.getObjectByName('decal_portrait_sara2'), glitch: root.getObjectByName('decal_portrait_glitch') };
      this.showScreen('sara');
      this.t = 0;
      this.stepT = 0;
      this.atta = { spot: 3, dir: 1, t: 4, fireT: 1.5 };
      const boss = jatte(g);
      this.drill = boss ? findPart(boss.obj, 'drill') : null;
      this.eye = g.lights.add({ pos: new THREE.Vector3(53, 8, 24), color: 0xff2010, range: 12, intensity: 1.5, tag: 'jatte_eye' });
      g.npc('atta')?.setHidden(true);
      const f = g.flags;
      if (f.ri_sara) this.afterSara(g);
      else if (f.ri_down) this.afterBoss(g, true);
      else if (f.ri_intro) this.startFight(g);
      if (restore) {
        g.setObjective(f.ri_sara ? 3 : f.ri_down ? 2 : f.ri_intro ? 1 : 0);
        return;
      }
      // Establishing look over the ice, then Åström on the radio.
      g.cinematic = { pos: [68, 7, 66], look: [53, 7, 22] };
      g.later(4, () => {
        g.cinematic = null;
        g.radio('ri_start', () => { if (!g.flags.ri_intro) g.setObjective(0); });
      });
    },

    showScreen(which) {
      if (this.screens.sara) this.screens.sara.visible = which === 'sara';
      if (this.screens.glitch) this.screens.glitch.visible = which === 'glitch';
    },

    trigger(g, id) {
      switch (id) {
        case 'ice': g.say('ri_ice'); break;
        case 'arena': if (!g.flags.ri_intro) this.intro(g); break;
        case 'sara_body': if (g.flags.ri_down && !g.flags.ri_sara) this.meetSara(g); break;
        default:
      }
    },

    intro(g) {
      setFlag(g, 'ri_intro');
      stageKey = 'intro';
      dismissGuards(g);
      g.npc('sara')?.setHidden(true);
      g.playCutscene('river_intro').then(() => {
        placePlayer(g, 52.5, 40.5, 0);
        this.showScreen('glitch');
        g.checkpoint('cp_arena');
        g.radio('ri_jatte', () => {
          g.setObjective(1);
          this.startFight(g);
        });
      });
    },

    startFight(g) {
      dismissGuards(g);
      g.npc('sara')?.setHidden(true);
      this.showScreen('glitch');
      const atta = g.npc('atta');
      if (atta) {
        atta.setHidden(false);
        const [x, z] = ATTA_SPOTS[this.atta.spot];
        atta.pos.set(x, 0, z);
      }
      const boss = jatte(g);
      if (!boss) return;
      g.boss = boss;
      g.bossActive = true;
      bossCamera(g, true);
      g.audio.playMusic('music_climax2', 1);
      g.audio.play('jatte_roar', { pos: boss.pos, volume: 1 });
      g.cam.shake = 1;
    },

    bossDown(g, boss) {
      setFlag(g, 'ri_down');
      bossCamera(g, false);
      g.audio.play('ice_break', { pos: boss.pos, volume: 1 });
      g.audio.play('jatte_roar', { pos: boss.pos, volume: 0.8, rate: 0.5 });
      g.cam.shake = 1.5;
      g.later(2.5, () => {
        g.audio.play('ice_crack', { pos: boss.pos, volume: 1 });
        g.radio('ri_jatte_down', () => {
          this.afterBoss(g, false);
          g.checkpoint('cp_sara');
        });
      });
    },

    afterBoss(g, restored) {
      const boss = jatte(g);
      if (boss && !boss.dead) { boss.dead = true; boss.hp = 0; }
      g.bossActive = false;
      bossCamera(g, false);
      if (restored) this.showScreen('glitch');
      g.setObjective(2);
      // Sara lies where Åtta pulled her out of the water.
      const sara = g.npc('sara');
      if (sara) {
        sara.setHidden(false);
        sara.pos.set(46, 0, 27.5);
        sara.yaw = 0.9;
        sara.pose = 'lie';
      }
      const atta = g.npc('atta');
      if (atta) {
        atta.setHidden(false);
        if (restored) atta.pos.set(47.6, 0, 28.9);
        else atta.walk([[47.6, 28.9]], 3.5).then(() => { atta.pose = 'kneel'; });
        atta.pose = restored ? 'kneel' : 'idle';
        atta.lookAt = new THREE.Vector3(46, 0, 27.5);
      }
    },

    meetSara(g) {
      setFlag(g, 'ri_sara');
      stageKey = 'sara';
      g.npc('sara')?.setHidden(true);
      g.npc('atta')?.setHidden(true);
      const scene = g.stats.kills === 0 ? 'river_sara_live' : 'river_sara_dies';
      const play = scene === 'river_sara_live' ? g.playCutscene('river_sara_live') : g.playCutscene('river_sara_dies');
      play.then(() => {
        placePlayer(g, 44.4, 28.9, 0);
        this.afterSara(g);
        g.checkpoint('cp_sara');
      });
    },

    afterSara(g) {
      g.setObjective(3);
      this.showScreen('glitch');
      const boss = jatte(g);
      if (boss && !boss.dead) { boss.dead = true; boss.hp = 0; }
      g.bossActive = false;
      // Sara has been taken away (alive) or lies under a coat (dead): off the ice either way.
      g.npc('sara')?.setHidden(true);
      const atta = g.npc('atta');
      if (atta) {
        atta.setHidden(false);
        atta.pose = 'idle';
        atta.pos.set(58.6, 0, 24.4);
        atta.lookAt = new THREE.Vector3(56.5, 0, 20.4);
      }
    },

    use(g, u) {
      if (u.id !== 'archive') return;
      setFlag(g, 'ri_archive');
      stageKey = 'archive';
      g.npc('atta')?.setHidden(true);
      g.playCutscene('river_archive').then(() => g.completeChapter());
    },

    update(g, dt) {
      this.t += dt;
      const boss = jatte(g);
      // The red eye (cyan while stunned, dark when dead).
      if (boss && this.eye) {
        this.eye.pos.copy(boss.headPos());
        this.eye.pos.y += 0.6;
        this.eye.color.setHex(boss.dead ? 0x000000 : boss.stun > 0 ? 0x60d8ff : 0xff2010);
        this.eye.intensity = boss.dead ? 0 : g.bossActive ? 1.6 + Math.sin(this.t * 9) * 0.3 : 0.9;
      }
      if (this.beacon) this.beacon.visible = Math.sin(this.t * 2) > -0.3;
      if (!boss || !g.bossActive || boss.dead) return;
      // The drill spins; snow and ice spray from the feet.
      if (this.drill && boss.stun <= 0) this.drill.rotation.y += dt * 9;
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.8;
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * PI * 2;
          g.effects.spawn({
            pos: boss.pos.clone().add(new THREE.Vector3(Math.cos(a) * 3, 0.2, Math.sin(a) * 3)),
            vel: new THREE.Vector3(Math.cos(a) * 2, 2 + Math.random() * 2, Math.sin(a) * 2),
            tex: 'fx_smoke', size: 0.6, life: 0.9, gravity: 3, color: 0xdde6f0, grow: 1.2,
          });
        }
      }
      this.updateAtta(g, boss, dt);
    },

    onLeave(g) {
      bossCamera(g, false);
    },

    /** Åtta fights alongside: moves between firing spots and shoots at the eye. */
    updateAtta(g, boss, dt) {
      const npc = g.npc('atta');
      const s = this.atta;
      if (!npc || npc.hidden) return;
      s.t -= dt;
      if (npc.route) return;
      npc.lookAt = boss.pos;
      if (s.t <= 0) {
        s.t = 5 + Math.random() * 4;
        if (s.spot + s.dir < 0 || s.spot + s.dir >= ATTA_SPOTS.length) s.dir *= -1;
        s.spot += s.dir;
        npc.pose = 'idle';
        npc.walk([ATTA_SPOTS[s.spot]], 3.8).then(() => { npc.pose = 'aim'; });
        return;
      }
      npc.pose = 'aim';
      s.fireT -= dt;
      if (s.fireT > 0) return;
      s.fireT = boss.stun > 0 ? 0.5 : 1.1 + Math.random() * 0.8;
      const from = npc.pos.clone().add(new THREE.Vector3(Math.sin(npc.yaw) * 0.5, 1.45, Math.cos(npc.yaw) * 0.5));
      const to = boss.headPos().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2));
      g.effects.tracer(from, to, 0x9ff0ff);
      g.effects.muzzleLight(from, 0x9ff0ff, 1.2, 5);
      g.audio.play('suppressed_shot', { pos: from, volume: 0.6 });
    },
  },
};
