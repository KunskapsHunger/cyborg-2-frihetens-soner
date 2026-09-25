// Chapter I — Färjan. M/S Friheten, the night ferry from Frederikshavn, in a
// Kattegatt snowstorm the night before lucia. Henrik boards at the bow, sneaks
// along the snowy promenades into the superstructure, down the stairs to the
// car deck and on to the hold, where Järnjätten stands under a tarpaulin. He
// photographs it, climbs the aft stairs to the icy stern deck and meets
// Vargen, Sara's sniper, among containers and lifeboats. When she is down the
// ship starts to sink and he runs to the bow, where Sara is waiting.
//
// Height layout (2.5D grid): the open decks are raised to y = 3 over black
// water at y = -3; the car deck and the hold lie "below" at y = 0, reached by
// two stairwells at the fore end and one aft stairwell. The superstructure is
// a 12 m white steel block with a raised sun deck (y = 7.5) at its aft end,
// Vargen's favourite perch.
//
// Routes: west (port) promenade → reception → port stair → car deck (guards,
// trucks, cars) → hold; or starboard promenade → reception → starboard stair
// → the narrow service corridor (lockers, one guard) → hold. Decks outside
// are either snow (quiet, but leaves footprints) or cleared green steel
// (no prints, but that is where the patrols walk).

const PI = Math.PI;
const DECK = 3; // open deck height
const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

const SNOW = { ft: 'snow_fresh', et: 'ferry_hull', floor: DECK, floorScale: 4 };
const CLEAR = { ft: 'ferry_deck', et: 'ferry_hull', floor: DECK, floorScale: 3 };
const LOBBY = { ft: 'office_carpet', et: 'metal_plate', floor: DECK, floorScale: 2, indoor: true };
const CAR = { ft: 'ferry_cardeck', et: 'metal_plate', floor: 0, floorScale: 4, indoor: true };
const SUPER = { h: 12, wt: 'ferry_wall', rt: 'roof_snow', wu: 4, wv: 4 };

// ---- entity helpers ---------------------------------------------------------------
const prop = (model, x, z, o = {}) => ({ type: 'prop', model, x, z, ...o });
const rail = (x, z, rot, y) => ({ type: 'prop', model: 'ferry_rail', x, z, rot, ...(y !== undefined ? { y } : {}), shrink: 0 });
const light = (x, y, z, color, range, intensity, o = {}) => ({ type: 'light', x, y, z, color, range, intensity, ...o });
const hull = (x0, x1, z0, z1) => ({ type: 'box', tex: 'ferry_hull', x0, x1, z0, z1, y0: -3.4, y1: DECK + 0.08, uvScale: 6.5, collide: false, cut: false });
const win = (x, y, z, rot) => ({ type: 'decal', tex: 'window_lit', x, y, z, rot, w: 1.1, h: 0.9, lit: false });
const locker = (x, z, rot) => ({ type: 'locker', x, z, rot });
// Below deck nothing collects snow.
const dry = (model, x, z, o = {}) => prop(model, x, z, { snow: false, ...o });
const INDOOR_TEX = new Set(['office_carpet', 'ferry_cardeck', 'metal_plate', 'concrete_raw']);

/** City-mesh floors below deck get their own material copy without snow. */
function dryInteriors(g) {
  const city = g.world.root.getObjectByName('city');
  for (const m of city?.children ?? []) {
    if (!INDOOR_TEX.has(m.name.replace(/^city_/, ''))) continue;
    const mat = m.material.clone();
    mat.uniforms = { ...m.material.uniforms, uSnowOn: { value: 0 } };
    m.material = mat;
  }
}

function railings() {
  const out = [];
  for (let z = 18; z <= 122; z += 4) { out.push(rail(10.12, z, PI / 2), rail(37.88, z, PI / 2)); }
  for (let x = 12; x <= 36; x += 4) out.push(rail(x, 124.88, 0));
  // Bow: two tapering steps.
  out.push(rail(13.12, 12, PI / 2), rail(34.88, 12, PI / 2), rail(12, 16.1, 0), rail(36, 16.1, 0));
  out.push(rail(15, 10.12, 0), rail(33, 10.12, 0), rail(17.12, 7, PI / 2), rail(30.88, 7, PI / 2));
  out.push(rail(19, 5.12, 0), rail(23, 5.12, 0), rail(27, 5.12, 0));
  // Sun deck edge (Vargen's perch) above the aft deck.
  for (let x = 22; x <= 30; x += 4) out.push(rail(x, 96.85, 0, 7.5));
  out.push(rail(31.88, 94, PI / 2, 7.5));
  return out;
}

function superstructureWindows() {
  const out = [];
  for (let z = 30; z <= 86; z += 5) {
    out.push(win(15.94, 6.2, z, -PI / 2), win(32.06, 6.2, z, PI / 2));
    if (z % 10 === 0) out.push(win(15.94, 9.4, z + 2, -PI / 2), win(32.06, 9.4, z + 2, PI / 2));
  }
  // Bridge windows facing the bow.
  for (let x = 18; x <= 30; x += 3) out.push({ ...win(x, 10.2, 26.94, PI), w: 2.2, h: 1.1 });
  return out;
}

// ---- cutscene stages ----------------------------------------------------------------
// Three cutscenes share the scene 'ferry_deck'. The static stage is the bow
// (ferry_intro); the script swaps in the aft-deck stage for ferry_vargen and a
// bow stage with Sara for ferry_sink.
const STAGE_INTRO = {
  actors: {
    henrik: { x: 22.1, z: 13.4, rot: face(22.1, 13.4, 24.4, 20.4), pose: 'crouch' },
    guard1: { x: 25.9, z: 22.7, rot: 0.7 },
    guard2: { x: 25.3, z: 19.0, rot: face(25.3, 19.0, 24, 21) },
  },
  marks: { mark_a: [24.3, 20.6], mark_b: [13.2, 26.5] },
  props: { screen: [21.05, 4.15, 24.55] },
  establish: { pos: [41, 7.5, 1], look: [23, 3.5, 21], fov: 50 },
};

// Vargen waits on the sun deck above and behind the aft door: "Vänd dig om."
const STAGE_VARGEN = {
  actors: {
    henrik: { x: 19.6, z: 100.6, rot: 0.3 },
    vargen: { x: 21.8, z: 94.8, rot: face(21.8, 94.8, 20.8, 103.4) },
  },
  marks: { mark_a: [20.8, 103.4] },
  establish: { pos: [31, 12, 126], look: [21, 5.5, 100], fov: 50 },
};

// Sara comes up from the superstructure; Henrik has run all the way to the
// bow rail. She starts facing away (the guards) and walks towards him.
const STAGE_SINK = {
  actors: {
    henrik: { x: 23.5, z: 6.5, rot: 0 },
    sara: { x: 23.3, z: 16.8, rot: 0.2 },
    guard1: { x: 26.8, z: 18.2, rot: PI },
  },
  marks: { mark_a: [23.5, 12.0], mark_b: [23.5, 7.7], mark_c: [34.6, 31] },
  props: { screen: [21.05, 4.15, 24.55] },
  establish: { pos: [8, 9, 1], look: [23.5, 4, 16], fov: 50 },
};

const STAGE_HOLD = {
  actors: { henrik: { x: 23.3, z: 77.1, rot: 0.4 } },
  marks: { mark_a: [24.6, 80.3] },
  props: { drill: [23.1, 1.5, 83.1], screen: [22.72, 4.2, 82.72] },
  establish: { pos: [26.6, 4.6, 86.6], look: [21, 2.2, 80], fov: 55 },
};
const JATTE_HEAD = [21.5, 3.9, 81.5];

// ---- helpers used by the script -----------------------------------------------------
/** Hide or show the level's own actors while a cutscene has the stage. */
function worldActors(g, visible) {
  if (visible && g.cutscene.playing) return;
  for (const gd of g.guards) {
    gd.obj.visible = visible;
    if (gd.shadow) gd.shadow.visible = visible && !gd.carried;
    if (gd.cone) gd.cone.visible = false;
  }
}

/** Cues run per beat while a cutscene plays (timers keep ticking in cutscenes). */
// The poll interval must exceed any frame dt, or a timer added while the
// timer list is being walked would fire again in the same frame.
const POLL = 0.06;
function cue(g, id, cues) {
  let started = false;
  let waited = 0;
  let last = -1;
  const poll = () => {
    const a = g.cutscene.active;
    if (!a || a.id !== id) {
      waited += POLL;
      if (!started && waited < 5 && !g.skipCutscenes) g.later(POLL, poll);
      return;
    }
    started = true;
    for (let b = last + 1; b <= a.beat; b++) cues[b]?.(g.cutscene, g);
    last = a.beat;
    cues.every?.(g.cutscene, g);
    g.later(POLL, poll);
  };
  g.later(POLL, poll);
}

/** Play a ferry_deck cutscene on a specific stage. */
function playOn(g, id, stage, cues = {}) {
  g.level = { ...g.level, stages: { ...g.level.stages, ferry_deck: stage } };
  worldActors(g, false);
  g.snow.visible = true;
  cue(g, id, cues);
  return g.playCutscene(id).then(() => worldActors(g, true));
}

export default {
  id: 'ferry',
  title: 'FÄRJAN',
  subtitle: 'M/S Friheten, Kattegatt. Natten före lucia',
  player: 'henrik2',
  mode: 'mission',
  size: [48, 132],
  spawn: { x: 13.2, z: 27, yaw: 0 },
  camYaw: PI,
  loadout: { tranq: 12, pistol: 0, repair: 1, items: ['box'] },
  guardModel: 'sons_guard',
  guardWeapon: 'rifle2',
  barks: 'sons',

  ambient: [0.05, 0.06, 0.09],
  sky: [0.065, 0.08, 0.12],
  ground: [0.03, 0.035, 0.05],
  fogColor: [0.035, 0.045, 0.065],
  fog: [6, 42],
  ambientLight: 0.28,
  snow: 0.85,
  snowfall: true,
  blizzard: 0.7,
  wind: [0.9, 0.35],
  snowGround: true,
  snowFill: 60,
  grade: { lift: [0, 0.005, 0.025], gamma: [1, 1, 0.98], gain: [0.98, 1, 1.06], saturation: 0.8 },
  bloom: 0.4,
  exposure: 1.2,
  frost: 0.22,
  grain: 0.025,
  playerLight: 0xa8b8cc,
  music: 'music_ferry',
  ambience: 'amb_ferry',
  ambienceVolume: 0.75,
  sounds: [
    { name: 'elevator_move', x: 22, y: 1.5, z: 60, volume: 0.25, ref: 5, max: 30 },
    { name: 'drill_loop', x: 22, y: 2, z: 82, volume: 0.08, ref: 3, max: 16 },
  ],
  codec: ['astrom'],
  codecKey: 'ferry',
  saveContact: 'astrom',

  build(g) {
    // The sea. The skirt beyond the map picks it up too.
    g.water(0, 0, 47, 131, { floor: -3 });
    // Hull: main deck, two tapering bow steps.
    g.open(10, 16, 37, 124, SNOW);
    g.open(13, 10, 34, 15, SNOW);
    g.open(17, 5, 30, 9, SNOW);
    // Cleared steel walkways where the crew (and the patrols) walk.
    g.open(14, 20, 33, 26, CLEAR);
    g.open(14, 27, 15, 100, CLEAR);
    g.open(32, 27, 33, 100, CLEAR);
    g.open(14, 97, 33, 100, CLEAR);
    g.open(22, 10, 25, 19, CLEAR);

    // Superstructure (the rest of the ship is carved out of it).
    g.block(16, 27, 31, 89, SUPER);
    g.block(16, 90, 19, 96, SUPER);
    // Sun deck over the stern: Vargen's perch, out of the player's reach.
    g.open(20, 90, 31, 96, { ft: 'ferry_deck', et: 'ferry_wall', floor: DECK + 4.5, floorScale: 3 });

    // Reception at deck level, doors to both promenades.
    g.open(17, 28, 30, 33, LOBBY);
    g.open(16, 30, 16, 31, LOBBY);
    g.open(31, 30, 31, 31, LOBBY);
    g.block(22, 28, 23, 31, SUPER);
    // Fore stairwells down to the car deck (8 steps of 0.375 m).
    for (let i = 0; i < 8; i++) {
      const step = { ft: 'metal_plate', et: 'metal_plate', floor: DECK - 0.375 * (i + 1), floorScale: 2, indoor: true };
      g.open(17, 34 + i, 18, 34 + i, step);
      g.open(29, 34 + i, 30, 34 + i, step);
    }
    // Car deck and the starboard service corridor.
    g.open(17, 42, 27, 74, CAR);
    g.open(29, 42, 30, 87, { ...CAR, ft: 'metal_plate', floorScale: 2 });
    g.open(28, 52, 28, 53, CAR);
    g.open(28, 66, 28, 67, CAR);
    // The hold behind a bulkhead.
    g.open(21, 75, 23, 75, CAR);
    g.open(17, 76, 27, 87, { ...CAR, ft: 'concrete_raw', floorScale: 3 });
    g.open(28, 80, 28, 81, CAR);
    // Aft stairwell up to the stern deck.
    for (let i = 0; i < 8; i++) {
      g.open(17, 88 + i, 18, 88 + i, { ft: 'metal_plate', et: 'metal_plate', floor: 0.375 * (i + 1), floorScale: 2, indoor: true });
    }
    g.open(17, 96, 18, 96, CLEAR);
  },

  entities: [
    // ---- hull, rails, superstructure dressing ----------------------------------------
    hull(9.7, 10, 16, 125), hull(38, 38.3, 16, 125), hull(10, 38, 125, 125.3),
    hull(12.7, 13, 10, 16), hull(35, 35.3, 10, 16), hull(9.7, 13, 15.7, 16), hull(35, 38.3, 15.7, 16),
    hull(16.7, 17, 5, 10), hull(31, 31.3, 5, 10), hull(13, 17, 9.7, 10), hull(31, 35, 9.7, 10), hull(17, 31, 4.7, 5),
    ...railings(),
    ...superstructureWindows(),
    prop('ferry_funnel', 23.5, 68, { y: 12, rot: PI, scale: 1.25, collide: false, cut: true }),
    prop('ferry_funnel', 23.5, 76, { y: 12, rot: PI, scale: 1.1, collide: false, cut: true }),
    { type: 'decal', tex: 'poster_rorelsen', x: 15.94, y: DECK + 1.6, z: 34.5, rot: -PI / 2, w: 0.8, h: 1.6 },
    { type: 'decal', tex: 'poster_rorelsen', x: 30.06, y: 2.2, z: 60, rot: PI / 2, w: 0.9, h: 1.8 },

    // ---- foredeck (mooring deck) -------------------------------------------------------
    prop('winch', 20, 14.2, { rot: PI }), prop('winch', 27.4, 14.2, { rot: PI }),
    prop('bollard2', 15.2, 12.4, { rot: PI / 2 }), prop('bollard2', 32.8, 12.4, { rot: PI / 2 }),
    prop('bollard2', 19.2, 6.6), prop('bollard2', 28, 6.6),
    prop('vent_mushroom', 16.2, 21.4), prop('vent_mushroom', 31.4, 21), prop('vent_mushroom', 29.8, 18.2),
    prop('crate', 17.2, 17.4, { rot: 0.2 }), prop('crate', 18.3, 17.6, { rot: -0.1 }), prop('crate', 17.7, 17.5, { y: DECK + 1, rot: 0.5 }),
    prop('terminal', 21, 24.5, { rot: PI / 4 }),
    prop('lamp_post', 23.5, 5.9, { lightColor: 0xfff0d8, lightRange: 9, lightIntensity: 0.9 }),
    light(23.5, 10, 27.8, 0xffa860, 16, 1.5, { flicker: 0.04 }),
    light(10.6, 5, 19, 0xff2a18, 5, 1.0),
    light(37.4, 5, 19, 0x20ff60, 5, 1.0),

    // ---- promenades -------------------------------------------------------------------
    prop('lifeboat', 9.4, 40, { y: DECK + 0.6, shrink: 0.3 }), prop('lifeboat', 9.4, 60, { y: DECK + 0.6, shrink: 0.3 }), prop('lifeboat', 9.4, 80, { y: DECK + 0.6, shrink: 0.3 }),
    prop('lifeboat', 38.6, 46, { y: DECK + 0.6, rot: PI, shrink: 0.3 }), prop('lifeboat', 38.6, 66, { y: DECK + 0.6, rot: PI, shrink: 0.3 }), prop('lifeboat', 38.6, 86, { y: DECK + 0.6, rot: PI, shrink: 0.3 }),
    prop('vent_mushroom', 11.0, 51), prop('vent_mushroom', 36.8, 56), prop('vent_mushroom', 11.0, 70),
    prop('bench', 15.4, 49, { rot: PI / 2 }), prop('bench', 32.6, 75, { rot: -PI / 2 }),
    prop('crate', 36.6, 38, { rot: 0.3 }), prop('crate', 36.7, 39.1, { rot: -0.2 }),
    prop('barrel', 10.9, 88.4), prop('barrel', 11.3, 89.3),
    locker(15.6, 55, -PI / 2), locker(15.6, 55.7, -PI / 2), locker(32.4, 80, PI / 2),
    light(15.4, DECK + 3, 44, 0xcfe0ff, 9, 0.9),
    light(15.4, DECK + 3, 76, 0xffc880, 9, 0.8, { flicker: 0.1 }),
    light(32.6, DECK + 3, 52, 0xcfe0ff, 9, 0.9),
    light(32.6, DECK + 3, 84, 0xffc880, 9, 0.7),

    // ---- reception + stairwells ----------------------------------------------------------
    dry('bench', 20, 32.8), dry('bench', 26.5, 32.8),
    dry('crate', 29.5, 28.6), locker(17.35, 28.9, PI / 2), locker(17.35, 29.6, PI / 2),
    { type: 'decal', tex: 'poster_rorelsen', x: 24.5, y: DECK + 1.7, z: 27.97, rot: 0, w: 0.9, h: 1.8 },
    light(23, DECK + 2.8, 31, 0xffd7a0, 9, 1.0, { flicker: 0.05 }),

    // ---- car deck ---------------------------------------------------------------------------
    dry('truck_trailer', 18.8, 51),
    dry('truck_trailer', 18.8, 66.5),
    dry('volvo240', 23, 46.5, { tint: [0.75, 0.85, 1] }),
    dry('volvo240', 23, 54.5, { tint: [1, 0.85, 0.75] }),
    dry('tree_spruce', 23, 54.2, { y: 1.52, scale: 0.16, rot: PI / 2, collide: false, cut: false }),
    dry('volvo240', 23, 62.5),
    dry('volvo240', 23, 70.2, { tint: [0.9, 1, 0.85] }),
    dry('crate', 26.3, 44.2), dry('crate', 26.4, 45.3, { rot: 0.3 }), dry('crate', 26.3, 44.7, { y: 1, rot: 0.1 }),
    dry('barrel', 27.3, 57.6), dry('barrel', 26.8, 58.3), dry('barrel', 27.4, 58.9),
    dry('crate', 27.0, 64.2, { rot: -0.2 }), dry('crate', 27.0, 71.4),
    locker(17.4, 58.5, PI / 2), locker(17.4, 59.2, PI / 2),
    { type: 'decal', tex: 'poster_rorelsen', x: 17.03, y: 1.9, z: 74.1, rot: PI / 2, w: 0.9, h: 1.8 },
    light(22.5, 3.6, 48, 0xb8d8ff, 11, 1.0),
    light(22.5, 3.6, 62, 0xb8d8ff, 11, 0.9, { flicker: 0.35 }),
    light(24, 3.4, 73.5, 0xffb070, 7, 0.8),

    // ---- service corridor ----------------------------------------------------------------
    locker(30.6, 47, -PI / 2), locker(30.6, 61, -PI / 2), locker(30.6, 61.7, -PI / 2), locker(30.6, 76, -PI / 2),
    dry('barrel', 30.4, 56), dry('crate', 30.5, 85.6),
    light(29.8, 2.6, 58, 0xff5030, 7, 0.8, { flicker: 0.2 }),

    // ---- the hold: Järnjätten under a tarpaulin ---------------------------------------
    dry('jarnjatten', 20.3, 80.3, { rot: PI / 4, scale: 0.46, shrink: 0.9, cut: true }),
    // The tarpaulin has slid off its back and lies in heaps on the floor.
    { type: 'box', tex: 'sons_cloth', x0: 17.2, x1: 19.4, z0: 83.8, z1: 86.0, y0: 0, y1: 0.32, uvScale: 1.5 },
    { type: 'box', tex: 'sons_cloth', x0: 17.5, x1: 19.0, z0: 84.3, z1: 85.5, y0: 0.32, y1: 0.55, uvScale: 1.5 },
    dry('crate', 26.3, 77.2), dry('crate', 26.4, 78.3, { rot: 0.4 }), dry('crate', 26.3, 77.6, { y: 1 }),
    dry('barrel', 26.9, 86.9), dry('barrel', 27.3, 86.3),
    dry('crate', 26.5, 84.6, { rot: 0.2 }),
    locker(26.6, 83, -PI / 2),
    light(24.8, 3.2, 81.5, 0xffc070, 9, 1.4, { flicker: 0.05 }),
    { type: 'door', id: 'aft_door', x: 18, z: 87.55, rot: 0, locked: true },

    // ---- aft deck: Vargen's arena ----------------------------------------------------
    prop('container', 14.6, 108.5, { shrink: 0 }),
    prop('container', 33.2, 107.5, { rot: PI, tint: [0.8, 1, 0.9], shrink: 0 }),
    prop('container', 33.2, 107.5, { y: DECK + 2.6, rot: PI, tint: [1, 0.75, 0.7], shrink: 0 }),
    prop('lifeboat', 9.4, 117.5, { y: DECK + 0.6, shrink: 0.3 }), prop('lifeboat', 38.6, 117.5, { y: DECK + 0.6, rot: PI, shrink: 0.3 }),
    prop('vent_mushroom', 18.6, 105.2), prop('vent_mushroom', 27.2, 111), prop('vent_mushroom', 21.2, 115.6), prop('vent_mushroom', 25.2, 103),
    prop('crate', 23.8, 108.6, { rot: 0.1 }), prop('crate', 24.9, 108.4, { rot: -0.2 }), prop('crate', 24.3, 108.5, { y: DECK + 1, rot: 0.4 }),
    prop('crate', 29.6, 117.2), prop('crate', 12.4, 104.2, { rot: 0.3 }),
    prop('crate', 29.2, 104.2, { rot: 0.2 }), prop('crate', 29.3, 105.3), prop('crate', 29.2, 104.7, { y: DECK + 1, rot: -0.3 }),
    prop('crate', 18.4, 113.6, { rot: -0.3 }), prop('crate', 19.5, 113.8),
    prop('barrel', 27.6, 118.2), prop('barrel', 28.2, 118.8), prop('barrel', 27.4, 118.9),
    prop('winch', 16, 121.4, { rot: PI }), prop('winch', 31.4, 121.4, { rot: PI }),
    prop('bollard2', 12.4, 123.4), prop('bollard2', 35.6, 123.4),
    { type: 'box', tex: 'metal_plate', x0: 20, x1: 27, z0: 121, z1: 123.6, y0: DECK, y1: DECK + 1.1, uvScale: 2 },
    light(23.5, 10.5, 97.6, 0xffb070, 15, 1.4, { flicker: 0.04 }),
    light(14, DECK + 3.5, 101, 0xcfe0ff, 9, 0.8),
    // Sinking alarm (switched on by the script once Vargen is down).
    light(23.5, DECK + 3.5, 24, 0xff2010, 14, 1.4, { strobe: 7, enabled: false, tag: 'alarm' }),
    light(23.5, DECK + 3.5, 60, 0xff2010, 12, 1.2, { strobe: 7, enabled: false, tag: 'alarm' }),

    // ---- guards ------------------------------------------------------------------------------
    { type: 'path', id: 'p_bow', points: [[18.5, 19.5, 3], [29, 19.5, 2], [29, 11.8, 2], [18.5, 11.8, 3]] },
    { type: 'path', id: 'p_port', points: [[12.4, 30, 4], [12.4, 52, 1], [12.4, 92, 4], [12.4, 52, 1]] },
    { type: 'path', id: 'p_star', points: [[35.2, 94, 3], [35.2, 60, 1], [35.2, 30, 4], [35.2, 60, 1]] },
    { type: 'path', id: 'p_car_w', points: [[21, 43.5, 3], [21, 60, 1], [21, 73, 3], [21, 60, 1]] },
    { type: 'path', id: 'p_car_e', points: [[25.5, 73, 2], [25.5, 60, 2], [25.5, 47, 3], [25.5, 60, 1]] },
    { type: 'path', id: 'p_corr', points: [[29.5, 44, 3], [29.5, 64, 1], [29.5, 86, 4], [29.5, 64, 1]] },
    { type: 'path', id: 'p_hold', points: [[20.6, 85.9, 3], [25.2, 85.9, 4]] },
    { type: 'guard', id: 'g_bow', x: 18.5, z: 19.5, rot: PI / 2, path: 'p_bow', group: 'a', thought: 'Sara sa kryssning. Jag tog med badbyxor.' },
    { type: 'guard', id: 'g_port', x: 12.4, z: 60, rot: 0, path: 'p_port', group: 'a' },
    { type: 'guard', id: 'g_star', x: 35.2, z: 70, rot: PI, path: 'p_star', group: 'a' },
    { type: 'guard', id: 'g_car_w', x: 21, z: 60, rot: 0, path: 'p_car_w', group: 'b' },
    { type: 'guard', id: 'g_car_e', x: 25.5, z: 66, rot: PI, path: 'p_car_e', group: 'b' },
    { type: 'guard', id: 'g_smoke', x: 26.9, z: 54.5, rot: -PI / 2, group: 'b', thought: 'Julgranen på Volvon. Någon ska hem. Det ska inte jag.' },
    { type: 'guard', id: 'g_corr', x: 29.5, z: 70, rot: PI, path: 'p_corr', group: 'b' },
    { type: 'guard', id: 'g_hold', x: 20.6, z: 85.9, rot: PI / 2, path: 'p_hold', group: 'c', thought: 'Den tittar på mig. Den har inga ögon, men den tittar.' },
    { type: 'guard', id: 'g_hold2', x: 26.6, z: 79.4, rot: 2.0, group: 'c' },

    // ---- pickups ---------------------------------------------------------------------------
    { type: 'pickup', kind: 'tranq', x: 20.5, z: 29 },
    { type: 'pickup', kind: 'repair', x: 26.4, z: 46.4 },
    { type: 'pickup', kind: 'battery', x: 30, z: 81.5 },
    { type: 'pickup', kind: 'tranq', x: 17.8, z: 44.5 },
    { type: 'pickup', kind: 'tranq', x: 25.8, z: 87.3 },
    { type: 'pickup', kind: 'repair', x: 12.2, z: 99.2 },
    { type: 'pickup', kind: 'tranq', x: 35.8, z: 99.2 },

    // ---- hide spots, triggers, uses, checkpoints ----------------------------------------
    { type: 'trigger', id: 'hide_bow', rect: [17, 16, 18, 18], hide: true },
    { type: 'trigger', id: 'hide_car', rect: [17, 42, 18, 44], hide: true },
    { type: 'trigger', id: 'hide_hold', rect: [17, 83, 18, 86], hide: true },
    { type: 'trigger', id: 'hide_prom', rect: [10, 38, 11, 42], hide: true },
    { type: 'trigger', id: 'deck', rect: [10, 29, 15, 33] },
    { type: 'trigger', id: 'deck_s', rect: [32, 29, 37, 33] },
    { type: 'trigger', id: 'cars', rect: [17, 42, 18, 43], checkpoint: 'cp_cars' },
    { type: 'trigger', id: 'cars_s', rect: [29, 42, 30, 43], checkpoint: 'cp_cars_s' },
    { type: 'trigger', id: 'hold', rect: [21, 76, 23, 76] },
    { type: 'trigger', id: 'hold_s', rect: [27, 80, 28, 81] },
    { type: 'trigger', id: 'aft', rect: [10, 97, 37, 101], repeat: true },
    { type: 'trigger', id: 'bow', rect: [13, 5, 34, 17], repeat: true },
    { type: 'use', id: 'photo', x: 23.4, z: 81.2, r: 1.8, label: 'Fotografera lasten', when: (g) => g.flags.fe_hold_seen && !g.flags.fe_photo },
    { type: 'marker', id: 'cp_start', x: 13.2, z: 27, yaw: 0 },
    { type: 'marker', id: 'cp_cars', x: 17.8, z: 43.2, yaw: 0 },
    { type: 'marker', id: 'cp_cars_s', x: 29.8, z: 43.2, yaw: 0 },
    { type: 'marker', id: 'cp_hold', x: 22, z: 76.4, yaw: 0 },
    { type: 'marker', id: 'cp_aft', x: 17.6, z: 98.2, yaw: 0 },
    { type: 'marker', id: 'reinforce', x: 23.5, z: 33, yaw: PI },

    // ---- Vargen ------------------------------------------------------------------------------
    {
      type: 'boss', kind: 'vargen', id: 'vargen', name: 'VARGEN', hidden: true,
      x: 21.5, z: 94.6, rot: 0,
      spots: [[21.5, 94.6], [15.2, 110.5], [33.2, 104.5], [23.5, 122.4], [29.8, 94.6], [33.2, 111.5]],
      cx: 23.5, cz: 110, r: 13,
    },
  ],

  stages: {
    ferry_deck: STAGE_INTRO,
    ferry_hold: STAGE_HOLD,
    // Per-cutscene stagings (the engine prefers these over the scene id).
    ferry_intro: STAGE_INTRO,
    ferry_vargen: STAGE_VARGEN,
    ferry_sink: STAGE_SINK,
  },

  script: {
    onStart(g, restore) {
      dryInteriors(g);
      this.hornT = 25;
      this.sinking = false;
      const f = g.flags;
      if (f.fe_photo) this.unlockAft(g);
      if (f.fe_vargen_down) this.startSinking(g);
      if (restore) {
        g.setObjective(f.fe_vargen_down ? 4 : f.fe_photo ? 2 : f.fe_cars ? 1 : 0);
        return;
      }
      g.hud.title = null;
      playOn(g, 'ferry_intro', STAGE_INTRO).then(() => {
        g.hud.showTitle(g.level.title, g.level.subtitle);
        g.radio('fe_start', () => g.setObjective(0));
      });
    },

    update(g, dt) {
      // Snow does not fall below deck.
      const cell = g.world.grid.cellAt(g.player.pos.x, g.player.pos.z);
      g.snow.visible = !cell?.indoor;
      if (cell?.indoor) g.gfx.postUniforms.uFrost.value = 0.04;
      // The ship's horn, now and then, somewhere in the storm.
      this.hornT -= dt;
      if (this.hornT <= 0) {
        this.hornT = this.sinking ? 9 + Math.random() * 5 : 40 + Math.random() * 30;
        g.audio.play('ship_horn', { pos: { x: 23.5, y: 20, z: 70 }, volume: this.sinking ? 1 : 0.7, refDistance: 30 });
      }
    },

    trigger(g, id) {
      const f = g.flags;
      if ((id === 'deck' || id === 'deck_s') && !f.fe_deck) {
        f.fe_deck = true;
        g.say('fe_deck');
      } else if ((id === 'cars' || id === 'cars_s') && !f.fe_cars) {
        f.fe_cars = true;
        g.setObjective(1);
        g.later(1.2, () => g.say('fe_cars'));
      } else if ((id === 'hold' || id === 'hold_s') && !f.fe_hold_seen) {
        f.fe_hold_seen = true;
        g.checkpoint('cp_hold');
        worldActors(g, false);
        g.snow.visible = false;
        cue(g, 'ferry_hold', {
          // Once he has walked in, he looks up at it.
          1: (cs) => { const h = cs.actor('henrik'); if (h) h.lookAt = h.pos.clone().set(...JATTE_HEAD); },
        });
        g.playCutscene('ferry_hold').then(() => {
          worldActors(g, true);
          const m = STAGE_HOLD.marks.mark_a;
          g.player.spawn(m[0], 0, m[1], -PI / 2);
          g.cam.snap(g.player.pos, PI / 2);
          g.hud.message('Fotografera maskinen.', '#c8e0b0', 3);
        });
      } else if (id === 'aft' && f.fe_photo && !f.fe_vargen_started) {
        this.meetVargen(g);
      } else if (id === 'bow' && f.fe_vargen_down && !this.ending) {
        this.ending = true;
        playOn(g, 'ferry_sink', STAGE_SINK, {
          // "Sen fanns det inget räcke": he goes over the rail into the sea.
          19: (cs, gg) => gg.later(1.1, () => {
            const h = cs.actor('henrik');
            if (!h) return;
            for (let i = 0; i < 18; i++) {
              const a = (i / 18) * PI * 2;
              gg.effects.spawn({ pos: h.pos.clone().set(h.pos.x, -2.8, 4.2), vel: h.pos.clone().set(Math.cos(a) * 1.6, 3 + (i % 3), Math.sin(a) * 1.6), tex: 'fx_smoke', size: 0.5, life: 1.5, gravity: 5, color: 0xdde8f4, grow: 0.9 });
            }
            h.setHidden(true);
          }),
        }).then(() => g.completeChapter());
      }
    },

    use(g, u) {
      if (u.id !== 'photo') return;
      g.flags.fe_photo = true;
      // Three pictures through the eye, each with a pale flash.
      [0, 2.2, 4.4].forEach((t) => g.later(t, () => {
        g.effects.muzzleLight(g.player.eye(), 0xe8f4ff, 2.5, 8);
        g.audio.play('scan_on', { volume: 0.6 });
      }));
      g.say('fe_photo', () => g.radio('fe_hold', () => {
        this.unlockAft(g);
        g.setObjective(2);
        g.checkpoint('cp_hold');
      }));
    },

    unlockAft(g) {
      const d = g.door('aft_door');
      if (d) d.locked = false;
    },

    meetVargen(g) {
      const f = g.flags;
      const seen = f.fe_vargen_seen;
      // Save before the fight: a restore lands here and the fight starts again
      // (without the cutscene the second time).
      f.fe_vargen_seen = true;
      g.checkpoint('cp_aft');
      f.fe_vargen_started = true;
      const start = () => {
        const m = STAGE_VARGEN.marks.mark_a;
        g.player.spawn(m[0], DECK, m[1], PI);
        g.cam.snap(g.player.pos, 0);
        g.radio('fe_vargen', () => {
          const b = g.bosses.find((x) => x.def.id === 'vargen');
          if (!b) return;
          b.obj.visible = true;
          g.boss = b;
          g.bossActive = true;
          g.setObjective(3);
          g.audio.playMusic('music_boss_vargen', 1);
        });
      };
      if (seen) { start(); return; }
      // She is not there until the shot rings out.
      playOn(g, 'ferry_vargen', STAGE_VARGEN, { 0: (cs) => cs.actor('vargen')?.setHidden(true) }).then(start);
    },

    bossDown(g) {
      g.flags.fe_vargen_down = true;
      g.later(2, () => g.radio('fe_vargen_down', () => {
        g.setObjective(4);
        this.startSinking(g);
        g.checkpoint('cp_aft');
      }));
    },

    startSinking(g) {
      this.sinking = true;
      this.hornT = 1;
      for (const l of g.lights.lights) if (l.tag === 'alarm') l.enabled = true;
      g.snow.configure({ blizzard: 0.85, wind: [1.1, 0.5] });
      g.cam.shake = 0.6;
    },
  },
};
