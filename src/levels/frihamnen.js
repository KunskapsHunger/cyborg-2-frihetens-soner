// III. FRIHAMNEN — snötäckt hamn i gryningen under Älvsborgsbron.
// Åtta kommer in i öster och ska västerut till tornets servicetunnel, som
// börjar i en ramp ner under kajen, under bron. Tre vägar västerut:
//
//   norr   containergården (x 44–72) och Magasin 104 (inomhus, skåp)
//   mitten snöfälten med containerstaplar och kontoret: fotspåren syns här
//   söder  den plogade kajvägen (z 55–58) under kranarna: inga spår, men vakter
//
// Vid kran 1 spelas frihamnen_stranger: mannen i rock (Henrik) skjuter sönder
// strålkastaren och de två vakterna där går åt andra hållet.
// Titelmenyns kamera kretsar kring (30, 12, 40) på radien 34: där står kranarna,
// staplarna, magasinet och bron, och ringen hålls fri från höga block.

const PI = Math.PI;
const W = 90;
const D = 80;

const SNOW = { ft: 'snow_fresh', et: 'concrete_raw', floorScale: 4 };
const PLOWED = { ft: 'asphalt_wet', et: 'sidewalk', floorScale: 4 };
const MAGASIN = { h: 6.5, wt: 'facade_brick', rt: 'roof_snow', lower: 'metal_corrugated', lowerH: 3.4, wu: 4, wv: 3 };

// ---- scenery builders (boxes without collision unless noted) ----------------------

const box = (tex, x0, x1, z0, z1, y0, y1, extra = {}) => ({ type: 'box', tex, x0, x1, z0, z1, y0, y1, collide: false, ...extra });

/** A Gothenburg harbour crane on rails: portal, tower, machine house, jib over the water. */
function crane(cx, cz) {
  const r = 'crane_red';
  const out = [];
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    out.push(box(r, cx + dx - 0.35, cx + dx + 0.35, cz + dz - 0.35, cz + dz + 0.35, 0, 8.4, { collide: true }));
  }
  out.push(
    box(r, cx - 3.4, cx + 3.4, cz - 3.4, cz - 2.6, 7.4, 8.6),
    box(r, cx - 3.4, cx + 3.4, cz + 2.6, cz + 3.4, 7.4, 8.6),
    box(r, cx - 3.4, cx - 2.6, cz - 2.6, cz + 2.6, 7.4, 8.6),
    box(r, cx + 2.6, cx + 3.4, cz - 2.6, cz + 2.6, 7.4, 8.6),
    box('gun_metal', cx - 2.4, cx + 2.4, cz - 2.4, cz + 2.4, 8.6, 9.6),
    box(r, cx - 1, cx + 1, cz - 1, cz + 1, 9.6, 19.6),
    // Machine house (walkable roof: the man in the coat stands here).
    box(r, cx - 2, cx + 2, cz - 2.6, cz + 1.6, 19.6, 23, { collide: true }),
    box('snow_fresh', cx - 2.05, cx + 2.05, cz - 2.65, cz + 1.65, 23, 23.12),
    box('tower_glass', cx + 1.2, cx + 2.5, cz + 1.6, cz + 3.1, 19.9, 21.9),
    box(r, cx - 0.5, cx + 0.5, cz + 1.6, cz + 22, 20.8, 21.8),                 // jib
    box(r, cx - 0.12, cx + 0.12, cz + 1.6, cz + 16, 23, 23.3),                 // jib stay
    box(r, cx - 0.6, cx + 0.6, cz - 8, cz - 2.6, 20.4, 21.4),                  // counter-jib
    box('concrete_raw', cx - 1.1, cx + 1.1, cz - 8, cz - 5.8, 18.2, 20.4),     // counterweight
    box(r, cx - 0.3, cx + 0.3, cz - 0.6, cz + 0.6, 23, 27.5),                  // A-frame mast
    box('gun_metal', cx - 0.05, cx + 0.05, cz + 19.9, cz + 20.1, 9.8, 20.8),   // hoist wire
    box('metal_rust', cx - 0.35, cx + 0.35, cz + 19.6, cz + 20.4, 9.2, 9.9),   // hook block
  );
  return out;
}

/** Älvsborgsbron (scaled for the view): deck over the west end, pylon in the river, cables. */
function bridge() {
  const out = [];
  const [xa, xb] = [3, 15];
  const Z0 = -70, Z1 = 210;
  out.push(
    box('concrete_raw', xa, xb, Z0, Z1, 29.6, 31.2, { uvScale: 6 }),               // deck
    box('metal_rust', xa + 0.6, xb - 0.6, Z0, Z1, 28.2, 29.6, { uvScale: 4 }),      // box girder
    box('gun_metal', xa, xa + 0.25, Z0, Z1, 31.2, 32.3, { uvScale: 3 }),            // railings
    box('gun_metal', xb - 0.25, xb, Z0, Z1, 31.2, 32.3, { uvScale: 3 }),
    // Pylon in the river (south of the map).
    box('concrete_raw', 1.6, 4.2, 84, 87.4, -1.6, 74, { uvScale: 5 }),
    box('concrete_raw', 13.8, 16.4, 84, 87.4, -1.6, 74, { uvScale: 5 }),
    box('concrete_raw', 1.6, 16.4, 84.4, 87, 26.4, 28.2, { uvScale: 4 }),
    box('concrete_raw', 1.6, 16.4, 84.4, 87, 69, 72.5, { uvScale: 4 }),
  );
  // Main cables: short steps along a parabola, with hangers down to the deck.
  const north = (z) => 31.8 + 40 * ((z - Z0) / (85.7 - Z0)) ** 2;
  const south = (z) => 34 + 38 * ((z - 215) / (215 - 85.7)) ** 2;
  for (const x of [xa + 0.6, xb - 0.6]) {
    const seg = (z0, z1, f) => {
      const y0 = f(z0), y1 = f(z1);
      out.push(box('gun_metal', x - 0.22, x + 0.22, z0, z1, Math.min(y0, y1) - 0.2, Math.max(y0, y1) + 0.2));
    };
    for (let z = Z0 + 3; z < 85.7; z += 3) seg(z, Math.min(85.7, z + 3), north);
    for (let z = 85.7; z < 150; z += 6) seg(z, z + 6, south);
    for (let z = Z0 + 18; z < 82; z += 10) out.push(box('gun_metal', x - 0.06, x + 0.06, z - 0.06, z + 0.06, 31.2, north(z)));
    for (let z = 96; z < 150; z += 10) out.push(box('gun_metal', x - 0.06, x + 0.06, z - 0.06, z + 0.06, 31.2, south(z)));
  }
  return out;
}

/** Ice floes on the river (walkable-looking but out of reach). */
function floes() {
  const spots = [
    [6, 66, 5, 3], [19, 71, 3, 2], [31, 67, 6, 2.5], [44, 74, 4, 3], [57, 66, 3, 2], [66, 72, 5, 3.5],
    [80, 67, 4, 2], [86, 75, 3, 2], [26, 77, 4, 2.5], [12, 78, 6, 3], [50, 82, 5, 3], [72, 84, 6, 4],
    [36, 88, 7, 4], [2, 92, 5, 3], [88, 90, 6, 3],
  ];
  return spots.map(([x, z, w, d], i) => box(i % 3 ? 'snow_fresh' : 'ice_river', x - w / 2, x + w / 2, z - d / 2, z + d / 2, -1.5, -1.22, { uvScale: 3 }));
}

/** Plowed snow banks along the roads: low cover with gaps to cross. */
function banks() {
  const out = [];
  const bank = (x0, x1, z0, z1) => {
    out.push(box('snow_fresh', x0, x1, z0, z1, 0, 0.55, { collide: true, uvScale: 3 }));
    out.push(box('snow_fresh', x0 + 0.35, x1 - 0.35, z0 + 0.15, z1 - 0.15, 0.55, 0.9, { uvScale: 3 }));
  };
  for (const [a, b] of [[17.5, 21], [28, 30.5], [38, 44.5], [50, 58], [66, 71], [77.5, 81]]) bank(a, b, 53.4, 54.5);
  for (const [a, b] of [[44.5, 50.5], [54, 55.8], [59.5, 62], [65, 70]]) bank(a, b, 30.4, 31.2);
  bank(77, 78, 36.5, 44);
  return out;
}

/** Distant Gothenburg: south bank across the river, Hisingen behind, Karlatornet in the west. */
function skyline() {
  const out = [];
  const south = [[-20, 8], [2, 12], [18, 7], [30, 15], [46, 10], [60, 18], [76, 9], [92, 13], [108, 11]];
  for (const [x, h] of south) out.push(box('facade_landshovding', x, x + 14, 104, 116, -1.5, h, { uvScale: 4 }));
  const north = [[-10, 12], [14, 9], [40, 14], [62, 10], [86, 16]];
  for (const [x, h] of north) out.push(box('facade_concrete', x, x + 20, -34, -18, 0, h, { uvScale: 4 }));
  out.push(box('facade_concrete', 100, 116, 6, 40, 0, 12, { uvScale: 4 }));
  out.push(box('facade_brick', 93, 108, 42, 61, 0, 9, { uvScale: 4 }), box('roof_snow', 93, 108, 42, 61, 9, 9.3));
  // Karlatornet: glass slab with a setback, west beyond the bridge.
  out.push(
    box('tower_glass', -58, -42, 8, 22, 0, 96, { uvScale: 4 }),
    box('tower_glass', -55, -45, 10.5, 19.5, 96, 128, { uvScale: 4 }),
    box('gun_metal', -51, -49, 14, 16, 128, 136),
  );
  return out;
}

const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

// Where the man in the coat stands: the machine-house roof of crane 1.
const HENRIK = [34.8, 56.6];

const STRANGER_GUARDS = {
  guard1: { x: 43.5, z: 52.2, rot: PI / 2 },
  guard2: { x: 41.6, z: 50.8, rot: face(41.6, 50.8, 46.5, 51.2) },
};

// The intro staging (the other actors wait where the stranger scene puts them).
const INTRO_STAGE = {
  actors: {
    atta: { x: 85, z: 52, rot: -PI / 2 },
    henrik: { x: HENRIK[0], z: HENRIK[1], rot: 2.1 },
    ...STRANGER_GUARDS,
  },
  marks: { mark_a: [80.5, 52.4], mark_b: [36, 43.8] },
  establish: { pos: [88.4, 3.4, 60.2], look: [46, 11, 46], fov: 55 },
};

function strangerStage(p) {
  const [hx, hz] = HENRIK;
  return {
    actors: {
      atta: { x: p.x, z: p.z, rot: face(p.x, p.z, hx, hz) },
      henrik: { x: hx, z: hz, rot: face(hx, hz, p.x, p.z) },
      ...STRANGER_GUARDS,
    },
    marks: { mark_a: [46.5, 51.2], mark_b: [36, 43.8] },
    establish: { pos: [54, 7.5, 70], look: [39, 9, 52], fov: 52 },
  };
}

let activeStage = null;

// Radio check-in groups: quay, container yard, warehouse.
const GUARDS = [
  { type: 'guard', id: 'g_kaj1', x: 50, z: 56.5, rot: -PI / 2, path: 'p_kaj1', group: 'kaj' },
  { type: 'guard', id: 'g_kaj2', x: 16, z: 57, rot: PI / 2, path: 'p_kaj2', group: 'kaj' },
  { type: 'guard', id: 'g_st1', x: 43.5, z: 52.2, rot: PI / 2, group: 'kaj' },
  { type: 'guard', id: 'g_st2', x: 41.6, z: 50.8, rot: PI / 2 + 0.5, group: 'kaj' },
  { type: 'guard', id: 'g_yard1', x: 60, z: 13.8, rot: PI / 2, path: 'p_yard1', group: 'yard' },
  { type: 'guard', id: 'g_yard2', x: 66, z: 33.5, rot: PI / 2, path: 'p_yard2', group: 'yard', wait: 4 },
  { type: 'guard', id: 'g_lager', x: 31, z: 11, rot: PI / 2, path: 'p_lager', group: 'lager' },
  { type: 'guard', id: 'g_bro', x: 10, z: 49, rot: 0, path: 'p_bro', group: 'lager', wait: 5 },
  { type: 'guard', id: 'g_mid', x: 60, z: 52, rot: PI / 2, path: 'p_mid', group: 'yard' },
];

export default {
  id: 'frihamnen',
  title: 'III. FRIHAMNEN',
  subtitle: '13 december, 08.40',
  player: 'atta',
  mode: 'mission',
  size: [W, D],
  spawn: { x: 85, z: 52, yaw: PI / 2 },
  camYaw: PI / 2,
  loadout: { tranq: 10, pistol: 0, repair: 1, items: ['box'] },
  guardModel: 'sons_guard',
  guardWeapon: 'rifle2',
  barks: 'sons',

  // Dawn: pink-grey haze, low warm sky, blue shadows, sodium lamps still on.
  ambient: [0.22, 0.22, 0.28],
  sky: [0.44, 0.37, 0.42],
  ground: [0.12, 0.13, 0.17],
  fogColor: [0.56, 0.5, 0.55],
  fog: [20, 125],
  ambientLight: 0.3,
  playerLight: 0xb0c0d8,
  playerLightIntensity: 0.6,
  snow: 0.4,
  snowfall: true,
  blizzard: 0.25,
  wind: [0.7, 0.15],
  snowGround: true,
  snowFill: 60,
  grade: { lift: [0.02, 0.01, 0.03], gamma: [1, 0.98, 1.02], gain: [1.05, 1.0, 1.02], saturation: 0.85 },
  bloom: 0.4,
  exposure: 1.15,
  frost: 0.18,
  grain: 0.025,
  music: 'music_sneak2',
  alertMusic: 'music_alert2',
  evasionMusic: 'music_evasion2',
  ambience: 'amb_frihamnen',
  ambienceVolume: 0.6,
  sounds: [
    { name: 'gulls', x: 40, y: 6, z: 70, volume: 0.45, ref: 8, max: 60 },
    { name: 'foghorn', x: 10, y: 4, z: 95, volume: 0.35, ref: 20, max: 120 },
  ],
  codec: ['kall', 'linnea'],
  codecKey: 'frihamnen',
  saveContact: 'linnea',

  build(g) {
    // Land and river.
    g.open(0, 0, W - 1, 61, SNOW);
    g.water(0, 62, W - 1, D - 1);
    // Plowed roads (no footprints): quay road, main road, yard branch, east link.
    g.open(14, 55, 88, 58, PLOWED);
    g.open(14, 59, 88, 60, { ft: 'tram_rails', et: 'concrete_raw', floorScale: 2 });
    g.open(14, 61, 88, 61, { ft: 'snow_trodden', et: 'concrete_raw', floorScale: 4 });
    g.open(40, 32, 88, 35, PLOWED);
    g.open(71, 4, 73, 31, PLOWED);
    g.open(74, 36, 76, 54, PLOWED);
    g.open(41, 25, 43, 31, PLOWED);

    // Boundaries: magasin row in the north (gate to the yard), fence east,
    // embankment west.
    g.block(0, 0, 70, 3, { ...MAGASIN, h: 9 });
    g.block(74, 0, W - 1, 3, { ...MAGASIN, h: 8, wt: 'facade_concrete' });
    g.block(W - 1, 4, W - 1, 61, { h: 2.4, wt: 'metal_corrugated', rt: 'metal_rust', wu: 4, wv: 2.4 });
    g.block(0, 4, 1, 61, { h: 3.2, wt: 'concrete_raw', rt: 'roof_snow', wu: 4, wv: 3.2 });

    // Magasin 104, walk-through warehouse.
    g.block(22, 8, 40, 24, MAGASIN);
    g.open(23, 9, 39, 23, { ft: 'concrete_raw', et: 'concrete_raw', floorScale: 4, indoor: true });
    g.open(40, 14, 40, 16, { ...PLOWED, indoor: true });
    g.open(22, 11, 22, 13, { ...PLOWED, indoor: true });
    g.open(29, 24, 31, 24, { ...PLOWED, indoor: true });
    g.block(23, 17, 28, 17, { ...MAGASIN, h: 3, lower: null, wt: 'office_wall' });   // office wall
    g.block(28, 18, 28, 20, { ...MAGASIN, h: 3, lower: null, wt: 'office_wall' });

    // Kontor (site office) in the middle band and the guard hut by the east gate.
    g.block(26, 36, 31, 40, { h: 4.2, wt: 'facade_concrete', rt: 'roof_snow', wu: 4, wv: 4.2 });
    g.block(79, 38, 82, 41, { h: 3.2, wt: 'facade_concrete', rt: 'roof_snow', wu: 4, wv: 3.2 });

    // Bridge piers on land (the deck is scenery high above).
    for (const z of [5]) {
      g.block(5, z, 6, z + 1, { h: 28.3, wt: 'concrete_raw', rt: 'concrete_raw', wu: 4, wv: 4 });
      g.block(12, z, 13, z + 1, { h: 28.3, wt: 'concrete_raw', rt: 'concrete_raw', wu: 4, wv: 4 });
    }

    // Service tunnel: a ramp down under the quay at the west end.
    const ramp = [[9, -0.4], [8, -0.8], [7, -1.2], [6, -1.6], [5, -2.0], [4, -2.4], [3, -2.4], [2, -2.4]];
    for (const [x, y] of ramp) g.open(x, 52, x, 54, { ft: 'concrete_raw', et: 'concrete_raw', floor: y, floorScale: 2, indoor: true });
    g.block(2, 51, 9, 51, { h: 1.0, wt: 'concrete_raw', rt: 'roof_snow', wu: 2, wv: 1 });
    g.block(2, 55, 9, 55, { h: 1.0, wt: 'concrete_raw', rt: 'roof_snow', wu: 2, wv: 1 });
  },

  entities: [
    // ---- markers ---------------------------------------------------------------
    { type: 'marker', id: 'cp_start', x: 85, z: 52, yaw: PI / 2, camYaw: PI / 2 },
    { type: 'marker', id: 'cp_mid', x: 70, z: 46, yaw: PI / 2, camYaw: PI / 2 },
    { type: 'marker', id: 'cp_crane', x: 52, z: 51, yaw: PI / 2, camYaw: PI / 2 },
    { type: 'marker', id: 'cp_tunnel', x: 14, z: 55, yaw: PI / 2, camYaw: PI / 2 },
    { type: 'marker', id: 'reinforce', x: 72, z: 5, yaw: 0 },

    // ---- triggers ----------------------------------------------------------------
    { type: 'trigger', id: 'tr_snow', rect: [62, 36, 72, 54] },
    { type: 'trigger', id: 'tr_mid', rect: [66, 36, 73, 54], checkpoint: 'cp_mid' },
    { type: 'trigger', id: 'tr_bridge', rect: [46, 36, 58, 61] },
    { type: 'trigger', id: 'tr_henrik_tracks', rect: [56, 36, 62, 54] },
    { type: 'trigger', id: 'tr_stranger', rect: [44, 36, 55, 61] },
    { type: 'trigger', id: 'tr_stranger_w', rect: [14, 4, 21, 36] },
    { type: 'trigger', id: 'tr_stranger_c', rect: [22, 25, 43, 35] },
    { type: 'trigger', id: 'tr_tunnel', rect: [10, 49, 16, 58], checkpoint: 'cp_tunnel' },
    { type: 'use', id: 'tunnel', x: 2.8, z: 53.5, r: 1.8, label: 'Öppna servicetunneln' },
    // Body hiding: dark corners.
    { type: 'trigger', id: 'hide_bridge', rect: [2, 22, 4, 30], hide: true },
    { type: 'trigger', id: 'hide_yard', rect: [44, 4, 48, 7], hide: true },
    { type: 'trigger', id: 'hide_magasin', rect: [36, 20, 39, 23], hide: true },
    { type: 'trigger', id: 'hide_hut', rect: [83, 38, 85, 41], hide: true },

    // ---- guards, paths, sensors --------------------------------------------------
    ...GUARDS,
    { type: 'path', id: 'p_kaj1', points: [[20, 56.5, 4], [50, 56.5, 2], [70, 56.5, 4], [50, 56.5, 2]] },
    { type: 'path', id: 'p_kaj2', points: [[16, 57, 5], [27, 57, 3], [27, 50.5, 3], [16, 50.5, 4]] },
    { type: 'path', id: 'p_yard1', points: [[42.5, 13.8, 3], [72, 13.8, 2], [72, 20.8, 3], [42.5, 20.8, 2]] },
    { type: 'path', id: 'p_yard2', points: [[47, 33.5, 3], [84, 33.5, 5]] },
    { type: 'path', id: 'p_lager', points: [[31, 11, 4], [37.5, 11, 2], [37.5, 21.5, 4], [31, 21.5, 2]] },
    { type: 'path', id: 'p_bro', points: [[10, 49.5, 7], [10, 37, 4], [17, 37, 3], [17, 47, 2]] },
    { type: 'path', id: 'p_mid', points: [[66, 52, 3], [66, 37, 3], [54, 37, 4], [54, 52, 3]] },
    { type: 'path', id: 'p_away1', points: [[31, 43.8, 4], [45, 43.8, 4]] },
    { type: 'path', id: 'p_away2', points: [[18, 41, 5], [18, 51, 3]] },
    { type: 'path', id: 'p_drone', points: [[47, 14], [69, 14], [69, 28], [47, 28]] },
    { type: 'drone', x: 47, y: 5.5, z: 14, path: 'p_drone' },
    { type: 'camera', x: 41.3, y: 4.2, z: 25.3, rot: PI / 4, sweep: 0.7, id: 'cam_magasin' },

    // ---- pickups -------------------------------------------------------------------
    { type: 'pickup', kind: 'tranq', x: 81.2, z: 44.6 },
    { type: 'pickup', kind: 'battery', x: 24.5, z: 22 },
    { type: 'pickup', kind: 'tranq', x: 56.3, z: 6.6 },
    { type: 'pickup', kind: 'repair', x: 31.4, z: 44.4 },
    { type: 'pickup', kind: 'tranq', x: 15.5, z: 38 },

    // ---- lockers -------------------------------------------------------------------
    { type: 'locker', x: 30.5, z: 9.35, rot: 0 },
    { type: 'locker', x: 31.3, z: 9.35, rot: 0 },
    { type: 'locker', x: 32.1, z: 9.35, rot: 0 },
    { type: 'locker', x: 83.35, z: 42, rot: PI / 2 },
    { type: 'locker', x: 27, z: 41.35, rot: 0 },
    { type: 'locker', x: 7.5, z: 50.65, rot: PI },

    // ---- east lot: arrival -----------------------------------------------------------
    { type: 'prop', model: 'volvo240', x: 86, z: 45, rot: 0.15 },
    { type: 'prop', model: 'dumpster', x: 87.6, z: 38.2, rot: PI / 2 },
    { type: 'prop', model: 'barrel', x: 85.5, z: 58.6 },
    { type: 'prop', model: 'barrel', x: 86.3, z: 59.3 },
    { type: 'prop', model: 'crate', x: 80.5, z: 43.2 },
    { type: 'prop', model: 'streetlight', x: 82, z: 53.6, rot: 0, id: 'lamp_e', collide: false },
    { type: 'prop', model: 'bench', x: 80.5, z: 36.7, rot: 0 },
    { type: 'decal', tex: 'window_lit', x: 78.98, y: 1.6, z: 39.5, w: 1.1, h: 1.1, rot: -PI / 2, lit: false },
    { type: 'decal', tex: 'window_lit', x: 80.5, y: 1.6, z: 42.02, w: 1.1, h: 1.1, rot: 0, lit: false },
    { type: 'decal', tex: 'poster_rorelsen', x: 83.02, y: 1.7, z: 39.6, w: 0.9, h: 1.8, rot: PI / 2 },
    { type: 'light', x: 78.2, y: 1.8, z: 39.5, color: 0xffa860, range: 6, intensity: 1.0, flicker: 0.05 },

    // ---- main road and container yard ----------------------------------------------
    { type: 'prop', model: 'streetlight', x: 52, z: 31.4, rot: 0, id: 'lamp_road1', collide: false },
    { type: 'prop', model: 'streetlight', x: 77, z: 31.4, rot: 0, id: 'lamp_road2', collide: false },
    { type: 'prop', model: 'lamp_post', x: 57.5, z: 22, id: 'lamp_yard' },
    // Row z 9–11.6
    { type: 'prop', model: 'container', x: 50, z: 10.3, rot: PI / 2 },
    box('container_orange', 59, 71, 9, 11.6, 0, 2.6, { collide: true, uvScale: 2.6 }),
    box('container_green', 60, 70, 9, 11.6, 2.6, 5.2, { collide: true, uvScale: 2.6 }),
    // Row z 16–18.6
    box('container_green', 44, 56, 16, 18.6, 0, 2.6, { collide: true, uvScale: 2.6 }),
    { type: 'prop', model: 'container', x: 50, y: 2.6, z: 17.3, rot: PI / 2, collide: false },
    { type: 'prop', model: 'container', x: 65, z: 17.3, rot: PI / 2 },
    // Row z 23–25.6
    box('container_orange', 44.5, 56.5, 23, 25.6, 0, 2.6, { collide: true, uvScale: 2.6 }),
    { type: 'prop', model: 'container', x: 65, z: 24.3, rot: PI / 2 },
    box('container_orange', 60, 70, 23, 25.6, 2.6, 5.2, { collide: true, uvScale: 2.6 }),
    box('container_green', 61, 69, 23, 25.6, 5.2, 7.8, { collide: true, uvScale: 2.6 }),
    { type: 'prop', model: 'crate', x: 57.5, z: 6.5 },
    { type: 'prop', model: 'crate', x: 58.3, z: 5.4, rot: 0.3 },
    { type: 'prop', model: 'barrel', x: 45, z: 5 },
    { type: 'prop', model: 'barrel', x: 45.8, z: 5.6 },
    { type: 'prop', model: 'truck_trailer', x: 80, z: 12, rot: 0.08 },
    { type: 'decal', tex: 'graffiti_1', x: 59.5, y: 1.4, z: 11.62, w: 2.6, h: 1.3, rot: 0 },
    { type: 'decal', tex: 'poster_rorelsen', x: 45.2, y: 1.4, z: 18.62, w: 0.9, h: 1.8, rot: 0 },

    // ---- Magasin 104 -----------------------------------------------------------------
    box('wood_floor', 33, 35.4, 13, 15.4, 0, 1.1, { collide: true }),
    box('wood_floor', 33.2, 35.2, 13.2, 15.2, 1.1, 2.1, { collide: true }),
    box('wood_floor', 25, 27, 12.5, 14.5, 0, 1.2, { collide: true }),
    { type: 'prop', model: 'crate', x: 34, z: 19 },
    { type: 'prop', model: 'crate', x: 35.1, z: 19.2, rot: 0.4 },
    { type: 'prop', model: 'crate', x: 34.5, z: 19.1, y: 1, rot: 0.2 },
    { type: 'prop', model: 'office_desk', x: 25.5, z: 19.2, rot: 0 },
    { type: 'prop', model: 'office_chair', x: 25.6, z: 20.3, rot: PI },
    { type: 'prop', model: 'tv_old', x: 26.9, z: 18.6, rot: 0 },
    { type: 'decal', tex: 'poster_rorelsen', x: 32.9, y: 1.7, z: 9.02, w: 0.9, h: 1.8, rot: 0 },
    { type: 'decal', tex: 'graffiti_1', x: 39.97, y: 1.6, z: 20, w: 2.8, h: 1.4, rot: -PI / 2 },
    { type: 'decal', tex: 'poster_lugnet', x: 41.02, y: 1.8, z: 11.5, w: 0.9, h: 1.8, rot: PI / 2 },
    { type: 'light', x: 31, y: 5, z: 12, color: 0xa8c8ff, range: 9, intensity: 0.9, flicker: 0.12 },
    { type: 'light', x: 26, y: 2.6, z: 20, color: 0xffb870, range: 5, intensity: 0.8 },

    // ---- middle band ------------------------------------------------------------------
    // Stack by the kontor (tallest silhouette in the title view).
    { type: 'prop', model: 'container', x: 40, z: 41.5, rot: PI / 2 },
    box('container_orange', 34.5, 45.5, 40.2, 42.8, 2.6, 5.2, { collide: true, uvScale: 2.6 }),
    box('container_green', 36.5, 43.5, 40.2, 42.8, 5.2, 7.8, { collide: true, uvScale: 2.6 }),
    // The cover in the stranger scene.
    box('container_green', 40, 52, 46, 48.6, 0, 2.6, { collide: true, uvScale: 2.6 }),
    box('container_orange', 20, 32, 46, 48.6, 0, 2.6, { collide: true, uvScale: 2.6 }),
    { type: 'prop', model: 'container', x: 60, z: 44, rot: 0 },
    box('container_orange', 58.7, 61.3, 39, 49, 2.6, 5.2, { collide: true, uvScale: 2.6 }),
    { type: 'prop', model: 'dumpster', x: 32.6, z: 38, rot: PI / 2 },
    { type: 'prop', model: 'barrel', x: 25.2, z: 42 },
    { type: 'prop', model: 'crate', x: 30, z: 45.2 },
    // Cable drums and pallets on the snowfield.
    { type: 'prop', model: 'barrel', x: 49, y: 0, z: 39.5, rx: PI / 2, rot: 0.3, scale: 2.4 },
    { type: 'prop', model: 'barrel', x: 51.4, y: 0, z: 40.2, rx: PI / 2, rot: 0.1, scale: 2.4 },
    box('wood_floor', 67, 68.4, 45, 46.4, 0, 0.9, { collide: true }),
    box('wood_floor', 67.1, 68.3, 45.1, 46.3, 0.9, 1.7, { collide: true }),
    box('wood_floor', 68.8, 70.2, 45.4, 46.8, 0, 0.9, { collide: true }),
    { type: 'prop', model: 'volvo240', x: 22, z: 30.5, rot: PI / 2 + 0.1 },
    { type: 'prop', model: 'barrier', x: 72, z: 36.6, rot: 0 },
    { type: 'decal', tex: 'window_lit', x: 28.5, y: 1.8, z: 41.02, w: 1.2, h: 1.1, rot: 0, lit: false },
    { type: 'decal', tex: 'window_lit', x: 32.02, y: 1.8, z: 38, w: 1.2, h: 1.1, rot: PI / 2, lit: false },
    { type: 'decal', tex: 'poster_rorelsen', x: 42, y: 1.4, z: 48.62, w: 0.9, h: 1.8, rot: 0 },
    { type: 'decal', tex: 'graffiti_1', x: 26, y: 1.3, z: 48.62, w: 2.8, h: 1.4, rot: 0 },

    // ---- the quay: cranes, lamps, bollards, boats --------------------------------------
    ...crane(34, 58),
    ...crane(62, 58),
    { type: 'prop', model: 'streetlight', x: 40.4, z: 49.1, rot: PI / 2, id: 'flood', unique: true, collide: false, lightIntensity: 1.6, lightRange: 13, lightColor: 0xfff0d0 },
    { type: 'prop', model: 'streetlight', x: 22, z: 53.8, rot: 0, id: 'lamp_q1', collide: false },
    { type: 'prop', model: 'streetlight', x: 48, z: 53.8, rot: 0, id: 'lamp_q2', collide: false },
    { type: 'prop', model: 'streetlight', x: 72, z: 53.8, rot: 0, id: 'lamp_q3', collide: false },
    ...[16, 26, 44, 52, 70, 78, 86].map((x) => ({ type: 'prop', model: 'bollard2', x, z: 61.3 })),
    { type: 'prop', model: 'boat', x: 76, z: 66.5, rot: PI / 2 + 0.05 },
    { type: 'prop', model: 'winch', x: 57, z: 60.2, rot: PI },

    // ---- under the bridge: the service tunnel ------------------------------------------
    { type: 'prop', model: 'door_slide', x: 2.2, y: -2.4, z: 53.5, rot: PI / 2, collide: false },
    { type: 'prop', model: 'barrier', x: 11, z: 50.3, rot: 0 },
    { type: 'prop', model: 'barrel', x: 3, z: 24 },
    { type: 'prop', model: 'barrel', x: 3.6, z: 25.2 },
    { type: 'prop', model: 'crate', x: 15, z: 30 },
    { type: 'prop', model: 'truck_trailer', x: 7, z: 36, rot: 0.03 },
    { type: 'prop', model: 'tree_spruce', x: 3.5, z: 10, scale: 0.8 },
    { type: 'prop', model: 'tree_spruce', x: 8, z: 6.5, scale: 0.65 },
    { type: 'decal', tex: 'graffiti_1', x: 7.02, y: 2.2, z: 6, w: 3, h: 1.5, rot: PI / 2 },
    { type: 'decal', tex: 'poster_minnes', x: 11.98, y: 1.8, z: 6, w: 0.9, h: 1.8, rot: -PI / 2 },
    { type: 'light', x: 3.2, y: 0.8, z: 53.5, color: 0xff9040, range: 6, intensity: 1.2, flicker: 0.1 },
    { type: 'light', x: 9, y: 26, z: 40, color: 0x8090c0, range: 14, intensity: 0.4 },

    // ---- scenery --------------------------------------------------------------------------
    ...banks(),
    ...bridge(),
    ...floes(),
    ...skyline(),
  ],

  // One scene id, two stagings: the intro at the east gate, and the stranger
  // at crane 1 (Åtta is staged wherever the player stands when it fires).
  stages: {
    get frihamnen() { return activeStage ?? INTRO_STAGE; },
  },

  script: {
    onStart(g, restore) {
      activeStage = INTRO_STAGE;
      this.pending = [];
      this.radioCheckSeen = false;
      const f = g.flags;
      if (restore) {
        if (f.fh_stranger) this.afterStranger(g);
        g.setObjective(f.fh_stranger ? 2 : f.fh_tracks ? 1 : 0);
        return;
      }
      g.playCutscene('frihamnen_intro').then(() => {
        g.radio('fh_start', () => g.setObjective(0));
      });
    },

    /** Radio calls wait for cutscenes and other screens to finish. */
    queueRadio(g, id, onDone) {
      this.pending.push({ id, onDone });
    },

    update(g) {
      const f = g.flags;
      if (this.pending.length && !g.cutscene.playing && !g.ui.screen && !g.failing) {
        const { id, onDone } = this.pending.shift();
        g.radio(id, onDone);
      }
      // First guard on somebody's tracks, or the first radio check-in.
      if (!f.fh_tracks && g.guards.some((x) => x.state === 'tracks')) this.tracksRadio(g);
      if (!f.fh_radio && g.sys.radioCheck.pending) {
        f.fh_radio = true;
        g.later(8, () => this.queueRadio(g, 'fh_radio'));
      }
    },

    tracksRadio(g) {
      const f = g.flags;
      if (f.fh_tracks) return;
      f.fh_tracks = true;
      this.queueRadio(g, 'fh_tracks', () => { if (!f.fh_stranger) g.setObjective(1); });
    },

    trigger(g, id) {
      const f = g.flags;
      switch (id) {
        case 'tr_snow': this.tracksRadio(g); break;
        case 'tr_bridge': g.say('fh_bridge'); break;
        case 'tr_henrik_tracks':
          if (!f.fh_stranger) this.henrikTracks(g);
          break;
        case 'tr_stranger':
        case 'tr_stranger_w':
        case 'tr_stranger_c':
          if (!f.fh_stranger) this.playStranger(g, id === 'tr_stranger' ? 'cp_crane' : null);
          break;
        case 'tr_tunnel':
          if (!f.fh_stranger) this.playStranger(g, null);
          this.queueRadio(g, 'fh_tunnel');
          break;
        default:
      }
    },

    /** Big prints of a heavier man, one foot deeper: Henrik went this way first. */
    henrikTracks(g) {
      if (!g.footprints) return;
      for (let i = 0; i < 16; i++) {
        const x = 55 - i * 0.8;
        const side = i % 2 ? 0.14 : -0.14;
        g.footprints.add(x, 0.02, 51.4 + Math.sin(i * 0.35) * 0.5 + side, PI / 2, i % 2 ? 1.3 : 1.15);
      }
      g.later(1.5, () => g.say('fh_tracks_seen'));
    },

    playStranger(g, checkpoint) {
      const f = g.flags;
      f.fh_stranger = true;
      activeStage = strangerStage(g.player.pos);
      // The stage has its own two guards; keep the live ones out of the shots.
      const hidden = g.guards.filter((gd) => gd.obj.visible && !gd.carried);
      for (const gd of hidden) gd.obj.visible = false;
      g.playCutscene('frihamnen_stranger').then(() => {
        activeStage = INTRO_STAGE;
        for (const gd of hidden) gd.obj.visible = !gd.hiddenBody;
        this.afterStranger(g);
        this.queueRadio(g, 'fh_stranger', () => {
          g.setObjective(2);
          if (checkpoint) g.checkpoint(checkpoint);
        });
      });
    },

    /** The floodlight is shot out and the two guards take the other way round. */
    afterStranger(g) {
      const lamp = g.world.props.find((p) => p.def.id === 'flood');
      if (lamp?.light) {
        lamp.light.enabled = false;
        lamp.obj.traverse((o) => { if (o.isMesh && o.material.uniforms?.uEmissive) o.material.uniforms.uEmissive.value.setRGB(0, 0, 0); });
      }
      const moves = [['g_st1', 'p_away1', 36, 43.8], ['g_st2', 'p_away2', 18, 44]];
      for (const [id, path, x, z] of moves) {
        const gd = g.guard(id);
        if (!gd) continue;
        gd.obj.visible = !gd.hiddenBody;
        if (gd.down || gd.carried || gd.hiddenBody) continue;
        gd.pos.set(x, 0, z);
        gd.path = g.world.spawns.paths[path];
        gd.pathIndex = 0;
        gd.state = 'patrol';
        gd.route = null;
        gd.awareness = 0;
      }
    },

    use(g, u) {
      if (u.id !== 'tunnel') return;
      u.done = true;
      g.audio.play('door_slide', { volume: 0.8 });
      g.later(0.6, () => g.completeChapter());
    },
  },
};
