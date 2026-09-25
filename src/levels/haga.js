// Chapter IV — Haga. The Christmas market on Haga Nygata at dusk, in falling
// snow. Henrik (family mode: no weapons) shadows Maja through the market and
// finds the three Frihetens söner scouts tailing her with "lyssna in" (R),
// then puts each one to sleep from behind (E) without Maja seeing him.
// Maja stops at stalls (overheard lines), glances back over her shoulder and
// sees what is in front of her. Crowds and stalls are cover. When all three
// are down she waits at the stairs up to Skansen Kronan: haga_maja.

import * as THREE from 'three';
import { LINES } from '../story/lines.js';
import { sightFactor, lightLevelAt } from '../game/vision.js';

// ---------------------------------------------------------------- layout
// Haga Nygata runs west–east (z 18..34). Stalls line both sides with a
// narrow service lane behind each row; a small square opens south around
// the julgran; a backyard (gård) runs behind the north row, reached through
// the café and two alleys. At the east end Skansgatan crosses, and stone
// stairs climb south to the hill with Skansen Kronan.

const HOUSE = { h: 10, wt: 'facade_haga', rt: 'roof_snow', wu: 12, wv: 10 };
const ROCK = { h: 4.6, wt: 'grave_stone', rt: 'roof_snow', wu: 3, wv: 3 };

const STREET = { ft: 'cobble_snow', floorScale: 3, et: 'grave_stone' };
const STAIR_STEP = 0.35;
const STAIR_Z0 = 35;
const STAIR_ROWS = 12;
const HILL = STAIR_STEP * STAIR_ROWS; // 4.2 m plateau

// Stall rows: north stalls face south, south stalls face north.
const ROW = {
  n: { back: [20.35, 20.6], counter: [21.8, 22.4], roof: [20.2, 22.95], front: 22.95, seller: 21.1, sellerRot: 0 },
  s: { back: [32.4, 32.65], counter: [30.6, 31.2], roof: [30.05, 32.8], front: 30.05, seller: 31.9, sellerRot: Math.PI },
};

function stall(x0, x1, side, goods = 'crate') {
  const r = ROW[side];
  const post = (x) => ({ type: 'box', tex: 'wood_dark', x0: x - 0.06, x1: x + 0.06, z0: r.front - (side === 'n' ? 0.14 : 0), z1: r.front + (side === 'n' ? 0 : 0.14), y0: 0, y1: 2.3, collide: false, cut: true });
  const cx = (x0 + x1) / 2;
  const goodsY = 1.0;
  const gz = (r.counter[0] + r.counter[1]) / 2;
  const items = goods === 'music_box'
    ? [{ type: 'prop', model: 'music_box', x: cx - 0.4, y: goodsY, z: gz, scale: 2.6, collide: false, snow: false },
      { type: 'prop', model: 'music_box', x: cx + 0.5, y: goodsY, z: gz, rot: 0.6, scale: 2.2, collide: false, snow: false }]
    : [{ type: 'prop', model: 'crate', x: cx - 0.6, y: goodsY, z: gz, scale: 0.34, rot: 0.2, collide: false, snow: false },
      { type: 'prop', model: 'crate', x: cx + 0.55, y: goodsY, z: gz, scale: 0.28, rot: -0.3, collide: false, snow: false }];
  return [
    { type: 'box', tex: 'wood_dark', x0, x1, z0: r.back[0], z1: r.back[1], y0: 0, y1: 2.3, uvScale: 1.5 },
    { type: 'box', tex: 'wood_dark', x0: x0 + 0.1, x1: x1 - 0.1, z0: r.counter[0], z1: r.counter[1], y0: 0, y1: 1.0, uvScale: 1.5 },
    { type: 'box', tex: 'stall_canvas', x0: x0 - 0.15, x1: x1 + 0.15, z0: r.roof[0], z1: r.roof[1], y0: 2.3, y1: 2.42, collide: false, cut: true, uvScale: 2.5 },
    { type: 'box', tex: 'stall_canvas', x0: x0 - 0.15, x1: x1 + 0.15, z0: r.front - 0.04, z1: r.front + 0.04, y0: 1.9, y1: 2.42, collide: false, cut: true, uvScale: 1.2 },
    post(x0 + 0.05), post(x1 - 0.05),
    ...items,
    // A paper star hanging under the canvas.
    { type: 'decal', tex: 'fx_spark', x: cx, y: 1.65, z: r.front + (side === 'n' ? -0.1 : 0.1), w: 0.55, h: 0.55, lit: false, double: true },
  ];
}

const STALLS = [
  ...stall(13, 16, 'n'), // ljus och stearin
  ...stall(18, 21, 'n'), // bageri: lussekatter
  ...stall(23, 25.8, 'n'), // trettio sorters sylt
  ...stall(29, 32, 'n'), // halmbockar
  ...stall(36, 39, 'n'), // glögg
  ...stall(41, 43.6, 'n'), // tomtar
  ...stall(9, 12, 's'), // korv
  ...stall(16, 19, 's'), // vantar
  ...stall(23, 26, 's'), // pepparkakor
  ...stall(41, 44, 's', 'music_box'), // urmakare, speldosor
  ...stall(46, 49, 's'), // hyacinter
];

// A string of warm bulbs across the street, sagging between the facades.
function bulbString(x, z0 = 18.4, z1 = 34.6, n = 20) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ type: 'decal', tex: 'fx_spark', x, y: 4.7 - Math.sin(Math.PI * t) * 1.1, z: z0 + (z1 - z0) * t, w: 0.4, h: 0.4, rot: Math.PI / 2, lit: false, double: true });
  }
  return out;
}

// The julgran: a big spruce on the square, bulbs spiralling up, a star on top.
const TREE = { x: 34.5, z: 39.5, scale: 0.72 };
function julgran() {
  const h = 10.4 * TREE.scale;
  const out = [
    { type: 'prop', model: 'tree_spruce', x: TREE.x, z: TREE.z, scale: TREE.scale, shrink: 0.9, cut: false },
    { type: 'prop', model: 'tree_spruce', x: TREE.x, z: TREE.z, rot: 0.55, scale: TREE.scale * 0.93, collide: false, cut: false },
    { type: 'prop', model: 'tree_spruce', x: TREE.x, z: TREE.z, rot: 1.1, scale: TREE.scale * 0.85, collide: false, cut: false },
  ];
  const n = 30;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const y = 1.2 + t * (h - 2.2);
    const r = 1.55 * (1 - (y - 0.6) / h) + 0.4;
    const a = i * 2.35;
    const dx = Math.sin(a), dz = Math.cos(a);
    out.push({ type: 'decal', tex: 'fx_spark', x: TREE.x + dx * r, y, z: TREE.z + dz * r, w: 0.42, h: 0.42, rot: a, lit: false, double: true });
  }
  out.push({ type: 'decal', tex: 'fx_spark', x: TREE.x, y: h + 0.2, z: TREE.z, w: 1.1, h: 1.1, rot: Math.PI, lit: false, double: true });
  out.push({ type: 'decal', tex: 'fx_spark', x: TREE.x, y: h + 0.2, z: TREE.z, w: 1.1, h: 1.1, rot: Math.PI / 2, lit: false, double: true });
  return out;
}

// ---------------------------------------------------------------- Maja
// Her round through the market. `face` is what she looks at while she
// stands; `talk` plays the first time Henrik is close enough to overhear.
const STOPS = [
  { at: [19.5, 23.5], face: [19.5, 21], talk: 'ha_walk_1', stay: 10 },
  { at: [33.2, 36.6], face: [34.5, 39.5], talk: 'ha_walk_2', stay: 10 },
  { at: [42.5, 29.4], face: [42.5, 32], talk: 'ha_walk_3', stay: 10 },
  { at: [54, 30.8], face: [56, 50], stay: 9 },
  { at: [37.5, 23.5], face: [37.5, 21], stay: 9 },
  { at: [17.5, 29.4], face: [17.5, 32], stay: 9 },
];
const TALK_WAIT = 26;           // she lingers this long for a line to be overheard
const HEAR_RANGE = 9;
const MAJA_SPEED = 1.05;
const STAIRS_SPOT = [57.4, 30.8];

// Where each scout stands while Maja is at stop k (they tail her).
const SCOUTS = [
  { id: 'sc1', key: 'ha_scout_1', delay: 3, tint: [0.62, 0.66, 0.78], at: [[24.5, 29.3], [27.5, 28.2], [36.5, 27.8], [46.5, 26.0], [43.5, 28.0], [23.0, 26.2]] },
  { id: 'sc2', key: 'ha_scout_2', delay: 7, tint: [0.78, 0.62, 0.5], at: [[11.5, 22.6], [39.0, 34.0], [31.5, 33.5], [41.0, 24.2], [32.0, 28.5], [31.5, 33.6]] },
  { id: 'sc3', key: 'ha_scout_3', delay: 0.5, tint: [0.58, 0.72, 0.62], at: [[29.5, 26.5], [40.5, 26.5], [48.5, 25.2], [56.5, 22.0], [28.0, 25.2], [9.5, 25.0]] },
];
const thoughtOf = (key) => (LINES[key] ?? []).map((l) => l.text).join(' ');

// Straight-line walks stay in the market lane; the square and the south
// lane are entered through the gap in the stall row.
const SQUARE_GAP = [30, 38.5];
const LANE_Z = 29.6;
const inSquare = (x, z) => z > 30.4 && x < 50;
const clampGap = (x) => Math.max(SQUARE_GAP[0], Math.min(SQUARE_GAP[1], x));
function lanePath(from, to) {
  const a = inSquare(from.x, from.z), b = inSquare(to[0], to[1]);
  const pts = [];
  if (a && !b) pts.push([clampGap(from.x), LANE_Z]);
  if (!a && b) pts.push([clampGap(to[0]), LANE_Z]);
  pts.push(to);
  return pts;
}

// ---------------------------------------------------------------- crowd
const civ = (id, x, z, rot, tint, extra = {}) => ({ type: 'npc', id, model: 'civilian2', name: 'Julhandlare', x, z, rot, tint, ...extra });
const CROWD = [
  // Stall keepers behind their counters.
  civ('c_bak', 19.2, ROW.n.seller, 0, [1, 0.92, 0.85]),
  civ('c_glogg', 37.4, ROW.n.seller, 0, [0.85, 0.55, 0.5]),
  civ('c_ljus', 14.6, ROW.n.seller, 0, [0.9, 0.85, 0.7]),
  civ('c_sylt', 24.4, ROW.n.seller, 0, [0.7, 0.75, 0.9]),
  civ('c_pepp', 24.8, ROW.s.seller, Math.PI, [0.95, 0.8, 0.65]),
  civ('c_ur', 42.4, ROW.s.seller, Math.PI, [0.6, 0.6, 0.65]),
  civ('c_korv', 10.5, ROW.s.seller, Math.PI, [0.9, 0.9, 0.9]),
  // Shoppers.
  civ('c_s1', 15.0, 23.7, Math.PI, [0.7, 0.8, 1]),
  civ('c_s2', 30.8, 23.6, Math.PI + 0.3, [1, 1, 0.82]),
  civ('c_s3', 47.6, 29.5, 0.2, [0.8, 0.62, 0.62]),
  civ('c_s4', 10.2, 29.5, -0.2, [0.62, 0.72, 0.62]),
  civ('c_s5', 25.0, 23.8, Math.PI - 0.4, [0.85, 0.7, 0.9]),
  // Two neighbours by the julgran (ha_walk_2).
  civ('c_tv1', 36.7, 36.3, 0.876, [0.95, 0.75, 0.6]),
  civ('c_tv2', 37.9, 37.3, 0.876 + Math.PI, [0.7, 0.72, 0.85]),
  // Strollers.
  civ('c_w1', 6, 24.6, Math.PI / 2, [0.75, 0.65, 0.55]),
  civ('c_w2', 48, 28.2, -Math.PI / 2, [0.65, 0.7, 0.8]),
  civ('c_w3', 50.5, 27, 0, [0.9, 0.9, 0.95]),
];
const WALKERS = {
  c_w1: [[6, 24.6], [48, 24.6], [48, 25.4], [6, 25.4]],
  c_w2: [[48, 28.2], [6, 28.2], [6, 27.4], [48, 27.4]],
  c_w3: [[50.5, 27], [55.5, 20], [56, 31], [50.5, 27]],
};
const BODY_R = 0.26;
const BODY_H = 1.75;

// ---------------------------------------------------------------- sight
const FORWARD = { half: 0.85, range: 7, near: 1.6 };
const TAKEDOWN_VIEW = { half: 1.15, range: 13, near: 2 };
const SEEN = 0.45;
const CHOKE_TIME = 1.3;

export default {
  id: 'haga',
  title: 'HAGA',
  subtitle: 'Julmarknaden, 13 december',
  player: 'henrik2',
  mode: 'family',
  seenKey: 'seen_by_family',
  size: [64, 60],
  spawn: { x: 5, z: 26.5, yaw: -Math.PI / 2 },
  camYaw: -Math.PI / 2,
  loadout: { tranq: 0, pistol: 0, repair: 1, items: [] },
  // Look: blue dusk, warm pockets of light.
  ambient: [0.12, 0.14, 0.23],
  sky: [0.13, 0.17, 0.31],
  ground: [0.05, 0.05, 0.08],
  fogColor: [0.15, 0.18, 0.29],
  fog: [16, 68],
  ambientLight: 0.3,
  snow: 0.55,
  snowfall: true,
  blizzard: 0.08,
  wind: [0.25, 0.08],
  snowGround: true,
  snowFill: 50,
  grade: { lift: [0.01, 0.01, 0.03], gamma: [1, 1, 1.02], gain: [1.07, 1.0, 0.95], saturation: 0.95 },
  bloom: 0.55,
  exposure: 1.05,
  frost: 0.12,
  grain: 0.02,
  playerLight: 0xb8b0a8,
  music: 'music_haga',
  ambience: 'amb_haga',
  ambienceVolume: 0.7,
  sounds: [
    { name: 'music_box', x: 42.5, y: 1.2, z: 31.9, volume: 0.35, ref: 2, max: 14 },
  ],
  codec: ['astrom'],
  codecKey: 'haga',
  saveContact: 'astrom',

  build(g) {
    // Everything starts as Haga houses; the streets are carved out.
    g.block(0, 0, 63, 59, HOUSE);
    // Skyline variety along the street.
    g.block(14, 12, 25, 17, { ...HOUSE, h: 11, wv: 11 });
    g.block(34, 12, 43, 17, { ...HOUSE, h: 9, wv: 9 });
    g.block(0, 35, 14, 45, { ...HOUSE, h: 11, wv: 11 });
    g.block(40, 35, 50, 45, { ...HOUSE, h: 9, wv: 9 });

    // Haga Nygata and Skansgatan.
    g.open(3, 18, 50, 34, STREET);
    g.open(51, 12, 58, 34, STREET);
    // The square with the julgran.
    g.open(29, 35, 39, 42, STREET);
    // Backyard behind the north row, the café and two alleys.
    g.open(4, 5, 46, 11, { ft: 'snow_fresh', floorScale: 4 });
    g.open(26, 12, 27, 17, { ft: 'snow_trodden', floorScale: 3 });
    g.open(44, 12, 45, 17, { ft: 'snow_trodden', floorScale: 3 });
    g.open(7, 13, 13, 16, { ft: 'wood_floor', floorScale: 2, indoor: true });
    g.open(10, 17, 11, 17, { ft: 'wood_floor', floorScale: 2, indoor: true });
    g.open(12, 12, 12, 12, { ft: 'wood_floor', floorScale: 2, indoor: true });

    // Stairs up to Skansen Kronan, flanked by rock.
    g.block(51, 35, 51, 46, ROCK);
    g.block(57, 35, 63, 46, ROCK);
    for (let i = 0; i < STAIR_ROWS; i++) {
      g.open(52, STAIR_Z0 + i, 56, STAIR_Z0 + i, { ft: 'snow_trodden', floorScale: 3, et: 'grave_stone', floor: STAIR_STEP * (i + 1) });
    }
    g.block(44, 46, 63, 59, { ...ROCK, h: HILL + 1.1 });
    g.open(46, 47, 62, 57, { ft: 'snow_fresh', floorScale: 4, floor: HILL, et: 'grave_stone' });
    // Skansen Kronan: the old stone tower on the hill.
    const KRONAN = { wt: 'grave_stone', rt: 'roof_snow', wu: 2, wv: 2 };
    g.block(54, 50, 60, 56, { ...KRONAN, h: HILL + 12 });
    g.block(55, 51, 59, 55, { ...KRONAN, h: HILL + 16 });
  },

  entities: [
    // ------------------------------------------------------------ market
    ...STALLS,
    ...bulbString(16.8), ...bulbString(27.6), ...bulbString(45.6),
    ...julgran(),
    { type: 'prop', model: 'bench', x: 31.2, z: 37.4, rot: Math.PI / 2 },
    { type: 'prop', model: 'bench', x: 37.9, z: 40.4, rot: Math.PI / 2 },
    { type: 'prop', model: 'bench', x: 34.5, z: 42.6, rot: Math.PI },
    // Fire basket at the mouth of the square.
    { type: 'prop', model: 'barrel', x: 28.2, z: 29.4 },
    { type: 'light', x: 28.2, y: 1.3, z: 29.4, color: 0xff7a30, range: 7, intensity: 1.3, flicker: 0.25 },
    // Julgran light: a warm glow and a red bulb tint.
    { type: 'light', x: TREE.x - 1.2, y: 4.2, z: TREE.z - 1.8, color: 0xffb450, range: 14, intensity: 2.0, flicker: 0.04 },
    { type: 'light', x: TREE.x + 1, y: 2, z: TREE.z + 1.2, color: 0xff5a40, range: 6, intensity: 0.7 },
    // Stall bulbs.
    { type: 'light', x: 14.5, y: 1.7, z: 22.4, color: 0xffa040, range: 6, intensity: 1.2, flicker: 0.15 },
    { type: 'light', x: 19.5, y: 2.0, z: 22.6, color: 0xffb868, range: 8, intensity: 1.6 },
    { type: 'light', x: 37.5, y: 2.0, z: 22.6, color: 0xffa050, range: 8, intensity: 1.6, flicker: 0.06 },
    { type: 'light', x: 24.5, y: 2.0, z: 30.4, color: 0xffb060, range: 8, intensity: 1.5 },
    { type: 'light', x: 42.5, y: 2.0, z: 30.4, color: 0xffd090, range: 7, intensity: 1.3 },
    // Old Haga lamp posts (warm), one sodium streetlight on Skansgatan.
    { type: 'prop', model: 'lamp_post', x: 4.5, z: 30.2 },
    { type: 'prop', model: 'lamp_post', x: 51.2, z: 21.5 },
    { type: 'prop', model: 'lamp_post', x: 51.5, z: 33.6 },
    { type: 'prop', model: 'lamp_post', x: 57.5, z: 47.6 },
    { type: 'prop', model: 'streetlight', x: 58.4, z: 17, rot: -Math.PI / 2 },
    // Street furniture and winter.
    { type: 'prop', model: 'bollard', x: 3.6, z: 20.5 }, { type: 'prop', model: 'bollard', x: 3.6, z: 31.8 },
    { type: 'prop', model: 'volvo240', x: 57.1, z: 23.5, tint: [0.95, 0.42, 0.35] },
    { type: 'prop', model: 'volvo240', x: 52.2, z: 15.2, rot: Math.PI, tint: [0.6, 0.7, 0.9] },
    { type: 'prop', model: 'bench', x: 58.1, z: 29.5, rot: -Math.PI / 2 },
    { type: 'box', tex: 'snow_fresh', x0: 3, x1: 5.5, z0: 33.2, z1: 35, y0: 0, y1: 0.45, uvScale: 3 },
    { type: 'box', tex: 'snow_fresh', x0: 56.4, x1: 59, z0: 12, z1: 14.4, y0: 0, y1: 0.5, uvScale: 3 },
    { type: 'box', tex: 'snow_fresh', x0: 49.2, x1: 51, z0: 18, z1: 20.2, y0: 0, y1: 0.4, uvScale: 3 },
    { type: 'decal', tex: 'poster_rorelsen', x: 26.03, y: 1.7, z: 14.2, w: 0.8, h: 1.6, rot: Math.PI / 2 },
    { type: 'decal', tex: 'poster_rorelsen', x: 58.97, y: 1.8, z: 27, w: 0.7, h: 1.4, rot: -Math.PI / 2 },

    // ------------------------------------------------------------ café
    { type: 'decal', tex: 'window_lit', x: 8.3, y: 1.55, z: 18.03, w: 1.7, h: 1.4, lit: false },
    { type: 'decal', tex: 'window_lit', x: 12.6, y: 1.55, z: 18.03, w: 1.7, h: 1.4, lit: false },
    { type: 'decal', tex: 'fx_spark', x: 8.3, y: 1.7, z: 18.06, w: 0.6, h: 0.6, lit: false },
    { type: 'decal', tex: 'fx_spark', x: 12.6, y: 1.7, z: 18.06, w: 0.6, h: 0.6, lit: false },
    { type: 'light', x: 10, y: 2.4, z: 14.6, color: 0xffc070, range: 8, intensity: 1.3, flicker: 0.04 },
    { type: 'light', x: 10.5, y: 2.2, z: 19.6, color: 0xffb060, range: 6, intensity: 0.8 },
    { type: 'prop', model: 'table', x: 9.6, z: 14.4 },
    { type: 'prop', model: 'chair', x: 8.6, z: 14.4, rot: Math.PI / 2 },
    { type: 'prop', model: 'chair', x: 10.6, z: 14.4, rot: -Math.PI / 2 },
    { type: 'box', tex: 'wood_dark', x0: 11.6, x1: 13.9, z0: 15.3, z1: 15.9, y0: 0, y1: 1.05 },
    { type: 'locker', x: 7.45, z: 15.6, rot: Math.PI / 2 },
    { type: 'locker', x: 7.45, z: 14.8, rot: Math.PI / 2 },

    // ------------------------------------------------------------ backyard
    { type: 'prop', model: 'tree_spruce', x: 15, z: 7.2, scale: 0.5, shrink: 1.1 },
    { type: 'prop', model: 'tree_birch', x: 31, z: 7.8, scale: 0.6, shrink: 1.2 },
    { type: 'prop', model: 'tree_spruce', x: 40.5, z: 6.8, scale: 0.55, shrink: 1.1 },
    { type: 'prop', model: 'dumpster', x: 5.4, z: 6.2 },
    { type: 'prop', model: 'dumpster', x: 7.0, z: 6.2 },
    { type: 'box', tex: 'wood_dark', x0: 18.2, x1: 22.8, z0: 5, z1: 6.3, y0: 0, y1: 2.1 },
    { type: 'prop', model: 'crate', x: 23.6, z: 6.8, rot: 0.3 },
    { type: 'prop', model: 'bench', x: 34.5, z: 10.5 },
    { type: 'prop', model: 'lamp_post', x: 36.5, z: 9.2, lightColor: 0x9fb4e0, lightIntensity: 0.7 },
    // Kitchen windows onto the yard: the only warmth back here.
    ...[[17, 1.6], [21, 1.6], [30, 5.3], [39, 1.6]].map(([x, y]) => ({ type: 'decal', tex: 'window_lit', x, y, z: 11.97, w: 1.1, h: 1.3, rot: Math.PI, lit: false })),
    ...[[11, 1.6], [28, 5.3], [34, 1.6]].map(([x, y]) => ({ type: 'decal', tex: 'window_lit', x, y, z: 5.03, w: 1.1, h: 1.3, lit: false })),
    { type: 'light', x: 19, y: 1.8, z: 10.8, color: 0xffb070, range: 5.5, intensity: 0.9 },
    { type: 'box', tex: 'snow_fresh', x0: 42.5, x1: 46, z0: 5, z1: 6.4, y0: 0, y1: 0.5, uvScale: 3 },
    { type: 'prop', model: 'bench', x: 12.5, z: 10.6 },

    // ------------------------------------------------------------ Skansen Kronan
    { type: 'light', x: 57, y: HILL + 17.8, z: 52.5, color: 0xffd070, range: 9, intensity: 2 },
    { type: 'box', tex: 'grave_stone', x0: 55.7, x1: 58.3, z0: 51.7, z1: 54.3, y0: HILL + 16, y1: HILL + 17.1, uvScale: 1, collide: false },
    { type: 'decal', tex: 'fx_spark', x: 57, y: HILL + 17.9, z: 51.6, w: 1.6, h: 1.6, rot: Math.PI, lit: false, double: true },
    ...[[55.5, 4.5], [57, 4.5], [58.5, 4.5], [57, 8.5], [56, 14], [58, 14]].map(([x, y]) => (
      { type: 'decal', tex: 'window_lit', x, y: HILL + y, z: y > 12 ? 50.98 : 49.98, w: 0.55, h: 1.0, rot: Math.PI, lit: false })),
    // Spruces on the hill around the stairs.
    { type: 'prop', model: 'tree_spruce', x: 59.5, z: 38, y: ROCK.h, scale: 0.45, collide: false },
    { type: 'prop', model: 'tree_spruce', x: 61.5, z: 43, y: ROCK.h, scale: 0.55, collide: false },
    { type: 'prop', model: 'tree_birch', x: 60, z: 41, y: ROCK.h, scale: 0.5, collide: false },
    { type: 'prop', model: 'tree_spruce', x: 48.5, z: 50, scale: 0.5, shrink: 1.2 },
    { type: 'prop', model: 'tree_spruce', x: 61, z: 50, scale: 0.42, shrink: 1.2 },

    // ------------------------------------------------------------ people
    { type: 'npc', id: 'maja', model: 'maja2', name: 'Maja', x: STOPS[0].at[0], z: STOPS[0].at[1], rot: Math.PI, watch: { every: 7, range: 11, duration: 2 }, radar: true, eyeY: 1.55 },
    ...SCOUTS.map((s) => ({ type: 'npc', id: s.id, model: 'civilian2', name: 'Spanare', x: s.at[0][0], z: s.at[0][1], rot: Math.PI, tint: s.tint, scout: true, thought: thoughtOf(s.key) })),
    ...CROWD,

    // ------------------------------------------------------------ gameplay
    ...SCOUTS.map((s) => ({ type: 'use', id: `take_${s.id}`, x: s.at[0][0], z: s.at[0][1], r: 1.35, label: 'Kvävgrepp', when: (g) => g.level.script.canTake(g, s.id) })),
    { type: 'pickup', kind: 'battery', x: 9.6, y: 0.8, z: 14.4 },
    { type: 'pickup', kind: 'battery', x: 20.5, z: 7.2 },
    { type: 'pickup', kind: 'repair', x: 26.5, z: 12.8 },
    { type: 'trigger', id: 'yard', rect: [4, 5, 46, 11], checkpoint: 'cp_yard_w' },
    { type: 'marker', id: 'cp_yard_w', x: 9, z: 9, yaw: -Math.PI / 2 },
    { type: 'marker', id: 'cp_yard_e', x: 38, z: 9.5, yaw: Math.PI / 2 },
  ],

  stages: {
    haga_market: {
      actors: {
        henrik: { x: 6.2, z: 26.6, rot: Math.PI / 2 },
        maja: { x: 24, z: 25.2, rot: -Math.PI / 2 },
        guard1: { x: 25.3, z: 30.0, rot: Math.PI, model: 'civilian2', tint: SCOUTS[0].tint },
      },
      marks: { mark_a: [10, 26.4], mark_b: [19.5, 24.0], mark_c: [24.4, 29.0] },
      establish: { pos: [4, 7.5, 32.5], look: [26, 2.5, 25], fov: 52 },
    },
    haga_stairs: {
      actors: {
        henrik: { x: 53.0, z: 31.4, rot: Math.PI / 2, pose: 'kneel' },
        maja: { x: 57.6, z: 30.6, rot: -Math.PI / 2 },
        guard1: { x: 53.9, z: 32.8, rot: Math.PI / 2, pose: 'lie', model: 'civilian2', tint: SCOUTS[2].tint },
      },
      marks: { mark_a: [55.4, 31.3], mark_b: [54.75, 31.35] },
      establish: { pos: [47.5, 7.5, 24.5], look: [56, 2.5, 35], fov: 55 },
    },
  },

  script: {
    // ---------------------------------------------------------- setup
    onStart(g, restore) {
      this.g = g;
      this.phase = 'intro';
      this.stop = 0;
      this.mstate = 'idle';
      this.stayT = 0;
      this.talking = false;
      this.choke = null;
      this.walkers = [];
      this.maja = g.npc('maja');
      this.maja.watch.enabled = false;
      this.flags(g);
      this.scouts = SCOUTS.map((def) => ({ def, npc: g.npc(def.id), down: g.flags.ha_down.includes(def.id), read: g.flags.ha_read.includes(def.id) }));
      this.setupCrowd(g);
      for (const s of this.scouts) {
        if (s.read) this.markRead(s);
        if (s.down) s.npc.setHidden(true);
        else s.npc.lookAt = this.maja.pos;
      }
      if (restore) { this.resume(g); return; }
      this.maja.setHidden(true);
      this.scouts[0].npc.setHidden(true);
      g.playCutscene('haga_intro').then(() => {
        this.maja.setHidden(false);
        this.scouts[0].npc.setHidden(false);
        g.radio('ha_start', () => { g.setObjective(0); this.begin(g); });
      });
    },

    flags(g) {
      g.flags.ha_down = [...(g.flags.ha_down ?? [])];
      g.flags.ha_read = [...(g.flags.ha_read ?? [])];
      g.flags.ha_talked = [...(g.flags.ha_talked ?? [])];
    },

    resume(g) {
      const down = g.flags.ha_down.length;
      if (down >= SCOUTS.length) { g.setObjective(2); this.toStairs(g, true); return; }
      g.setObjective(down > 0 ? 1 : 0);
      this.begin(g);
    },

    begin(g) {
      this.phase = 'hunt';
      this.maja.watch.enabled = true;
      this.maja.glance.t = 5;
      this.arrive(g, 0);
    },

    // Civilians are solid (and block Maja's view); strollers loop.
    setupCrowd(g) {
      const grid = g.world.grid;
      this.crowd = [];
      for (const c of CROWD) {
        const npc = g.npc(c.id);
        if (!npc) continue;
        const box = grid.addBox(npc.pos.x - BODY_R, npc.pos.z - BODY_R, npc.pos.x + BODY_R, npc.pos.z + BODY_R, 0, BODY_H, 'crowd');
        this.crowd.push({ npc, box });
        if (c.id === 'c_tv1' || c.id === 'c_tv2') npc.talking = 4;
        const route = WALKERS[c.id];
        if (route) this.stroll(npc, route, 0.9 + Math.random() * 0.2);
      }
    },

    stroll(npc, route, speed) {
      npc.walk(route, speed).then(() => { if (this.g?.level?.id === 'haga') this.stroll(npc, route, speed); });
    },

    // ---------------------------------------------------------- Maja's round
    goTo(g, k) {
      this.stop = k;
      this.mstate = 'walk';
      this.maja.lookAt = null;
      const s = STOPS[k];
      this.maja.walk(lanePath(this.maja.pos, s.at), MAJA_SPEED).then(() => { if (this.phase === 'hunt') this.arrive(g, k); });
      for (const sc of this.scouts) g.later(sc.def.delay, () => this.moveScout(sc, k));
    },

    arrive(g, k) {
      const s = STOPS[k];
      this.mstate = 'stay';
      this.maja.lookAt = new THREE.Vector3(s.face[0], 0, s.face[1]);
      this.stayT = s.talk && !g.flags.ha_talked.includes(s.talk) ? TALK_WAIT : s.stay;
    },

    moveScout(sc, k) {
      if (sc.down || this.choke?.sc === sc || this.phase !== 'hunt') return;
      sc.npc.lookAt = null;
      sc.npc.walk(lanePath(sc.npc.pos, sc.def.at[k]), 1.1).then(() => { sc.npc.lookAt = this.maja.pos; });
    },

    updateMaja(g, dt) {
      if (this.mstate !== 'stay') return;
      const s = STOPS[this.stop];
      const d = this.maja.pos.distanceTo(g.player.pos);
      if (s.talk && !this.talking && !g.flags.ha_talked.includes(s.talk) && d < HEAR_RANGE) this.overhear(g, s.talk);
      this.stayT -= dt;
      if (this.stayT <= 0 && !this.talking) this.goTo(g, (this.stop + 1) % STOPS.length);
    },

    overhear(g, key) {
      this.talking = true;
      const partners = { ha_walk_1: ['c_bak'], ha_walk_2: ['c_tv1', 'c_tv2'], ha_walk_3: ['c_ur'] }[key] ?? [];
      const people = [key === 'ha_walk_2' ? null : this.maja, ...partners.map((id) => g.npc(id))].filter(Boolean);
      for (const n of people) n.talking = 40;
      g.say(key, () => {
        this.talking = false;
        for (const n of people) n.talking = 0;
        g.flags.ha_talked = [...g.flags.ha_talked, key];
        this.stayT = Math.min(this.stayT, 3);
      });
    },

    // She sees what is in front of her (the engine handles glances back).
    majaSees(g, cone) {
      const m = this.maja;
      if (m.hidden) return false;
      const eye = new THREE.Vector3(m.pos.x, m.pos.y + 1.55, m.pos.z);
      const light = lightLevelAt(g.lights, g.player.pos, g.ambientLight);
      return sightFactor(g.world.grid, eye, m.yaw, undefined, cone, g.player, light) > SEEN;
    },

    // ---------------------------------------------------------- scouts
    onScan(g, target) {
      const sc = this.scouts?.find((s) => s.npc === target);
      if (!sc) return;
      g.hud.showThought(sc.def && thoughtOf(sc.def.key), 8);
      if (sc.read) return;
      sc.read = true;
      g.flags.ha_read = [...g.flags.ha_read, sc.def.id];
      this.markRead(sc);
      g.audio.play('radio_check', { volume: 0.5 });
      if (g.flags.ha_read.length === 1) g.later(8.5, () => g.hud.message('Spanare. Ta honom bakifrån [E] när Maja inte ser.', '#8ff0ff', 4));
    },

    markRead(sc) {
      sc.npc.def = { ...sc.npc.def, radar: true };
    },

    canTake(g, id) {
      const sc = this.scouts?.find((s) => s.def.id === id);
      if (!sc || !sc.read || sc.down || this.choke || this.phase !== 'hunt' || g.player.dead) return false;
      const p = g.player.pos;
      const toPlayer = Math.atan2(p.x - sc.npc.pos.x, p.z - sc.npc.pos.z);
      const rel = Math.abs(Math.atan2(Math.sin(toPlayer - sc.npc.yaw), Math.cos(toPlayer - sc.npc.yaw)));
      return rel > 1.9;
    },

    use(g, u) {
      const sc = this.scouts.find((s) => `take_${s.def.id}` === u.id);
      if (!sc || !this.canTake(g, sc.def.id)) return;
      if (this.majaSees(g, TAKEDOWN_VIEW) || this.maja.glance.phase === 'looking') { this.seen(g); return; }
      const p = g.player;
      p.yaw = Math.atan2(-(sc.npc.pos.x - p.pos.x), -(sc.npc.pos.z - p.pos.z));
      p.choke = CHOKE_TIME;
      p.crouch = false;
      sc.npc.route = null;
      sc.npc.onArrive = null;
      sc.npc.lookAt = null;
      this.choke = { sc, t: CHOKE_TIME };
      g.audio.play('choke', { pos: sc.npc.pos, volume: 0.8 });
    },

    updateChoke(g, dt) {
      const c = this.choke;
      if (!c) return;
      const p = g.player;
      c.t -= dt;
      p.choke = Math.max(0.001, c.t);
      const f = p.forward();
      c.sc.npc.pos.set(p.pos.x + f.x * 0.55, p.pos.y, p.pos.z + f.z * 0.55);
      c.sc.npc.yaw = Math.atan2(f.x, f.z);
      if (c.t > 0) return;
      p.choke = 0;
      this.choke = null;
      const sc = c.sc;
      sc.down = true;
      sc.npc.pose = 'lie';
      // No longer a scan target, so "lyssna in" moves on to the others.
      sc.npc.def = { ...sc.npc.def, scout: false, thought: null, radar: false };
      g.stats.takedowns += 1;
      g.audio.play('body_fall', { pos: sc.npc.pos, volume: 0.5 });
      g.flags.ha_down = [...g.flags.ha_down, sc.def.id];
      this.scoutDown(g);
    },

    scoutDown(g) {
      const n = g.flags.ha_down.length;
      const save = () => g.checkpoint(g.player.pos.x < 26 ? 'cp_yard_w' : 'cp_yard_e');
      if (n === 1) g.radio('ha_found', () => { g.setObjective(1); save(); });
      else if (n >= SCOUTS.length) {
        g.radio('ha_all', () => {
          g.say('ha_done');
          g.setObjective(2);
          this.toStairs(g, false);
          save();
        });
      } else {
        g.hud.message(`Spanare ${n} av ${SCOUTS.length}.`, '#c8e0b0', 3);
        save();
      }
    },

    seen(g) {
      if (this.phase === 'failed') return;
      this.phase = 'failed';
      this.maja.lookAt = g.player.pos;
      g.fail('seen_by_family');
    },

    // ---------------------------------------------------------- finale
    toStairs(g, instant) {
      this.phase = 'stairs';
      this.mstate = 'idle';
      const m = this.maja;
      m.watch.enabled = false;
      m.glance.phase = 'idle';
      m.lookAt = null;
      const wait = () => { this.phase = 'waiting'; m.lookAt = new THREE.Vector3(40, 0, 27); };
      if (instant) { m.pos.set(STAIRS_SPOT[0], 0, STAIRS_SPOT[1]); m.yaw = -Math.PI / 2; wait(); return; }
      m.walk([...lanePath(m.pos, [52.5, 28.5]), STAIRS_SPOT], 1.25).then(wait);
    },

    finale(g) {
      this.phase = 'finale';
      this.maja.setHidden(true);
      g.playCutscene('haga_maja').then(() => g.completeChapter());
    },

    // ---------------------------------------------------------- frame
    update(g, dt) {
      if (!this.maja) return;
      // Core energy slowly returns (family chapters have no other recharge).
      if (!g.scanning) g.player.energy = Math.min(100, g.player.energy + dt * 4);
      for (const c of this.crowd) {
        if (!WALKERS[c.npc.id]) continue;
        const { x, z } = c.npc.pos;
        Object.assign(c.box, { minX: x - BODY_R, minZ: z - BODY_R, maxX: x + BODY_R, maxZ: z + BODY_R });
      }
      for (const sc of this.scouts) {
        const u = g.world.spawns.uses.find((e) => e.id === `take_${sc.def.id}`);
        if (u) { u.x = sc.npc.pos.x; u.z = sc.npc.pos.z; u.done = sc.down; }
      }
      this.updateChoke(g, dt);
      if (this.phase === 'hunt') {
        this.updateMaja(g, dt);
        if (!this.choke && this.majaSees(g, FORWARD)) this.seen(g);
      } else if (this.phase === 'waiting') {
        if (this.maja.pos.distanceTo(g.player.pos) < 6) this.finale(g);
      }
    },

    onGlance(g, npc) {
      if (npc.id === 'maja') g.audio.play('question', { volume: 0.25, rate: 1.35 });
    },

    onLeave() {
      this.maja = null;
      this.g = null;
    },
  },
};
