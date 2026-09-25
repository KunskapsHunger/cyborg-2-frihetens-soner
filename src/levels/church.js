// Epilog — Lucia. Haga kyrka, 14 December, seven in the morning. A short
// walk with Maja across the snowy church square at dawn, past the Christmas
// market stalls under new snow (LINES.ep_1), to the tower door. Inside:
// candlelight, blue dawn in the tall windows, the family in the pews and
// Åtta in the last row. The lucia cutscene plays, then the ending.
//
// Pews stand on a raised wooden floor (bänkkvarter), which puts the seated
// actors' heads where the cutscene director frames close-ups.

const PI = Math.PI;

const STONE = { h: 14, wt: 'cobble', rt: 'roof_snow', wu: 3, wv: 3 };
const TOWER = { h: 34, wt: 'cobble', rt: 'roof_snow', wu: 3, wv: 3 };
const PLASTER = { h: 12, wt: 'office_wall', rt: 'roof_tar', wu: 5, wv: 12 };
const NAVE = { ft: 'lobby_marble', et: 'lobby_marble', floorScale: 3, indoor: true };
const SNOW = { ft: 'snow_fresh', et: 'sidewalk', floorScale: 4 };
const TRODDEN = { ft: 'snow_trodden', et: 'sidewalk', floorScale: 3 };

const prop = (model, x, z, o = {}) => ({ type: 'prop', model, x, z, ...o });
const dry = (model, x, z, o = {}) => prop(model, x, z, { snow: false, ...o });
const light = (x, y, z, color, range, intensity, o = {}) => ({ type: 'light', x, y, z, color, range, intensity, ...o });
const decal = (tex, x, y, z, w, h, o = {}) => ({ type: 'decal', tex, x, y, z, w, h, ...o });
const box = (tex, x0, x1, z0, z1, y0, y1, o = {}) => ({ type: 'box', tex, x0, x1, z0, z1, y0, y1, ...o });
const flame = (x, y, z, s = 0.12) => decal('fx_spark', x, y, z, s, s * 1.3, { lit: false, double: true });

// ---- pews ------------------------------------------------------------------------------
const PLATFORM = 0.45;
const ROW0 = 17.0;
const ROW_STEP = 1.1;
const ROWS = 21;
const rowZ = (i) => ROW0 + ROW_STEP * i; // front edge of the seat in row i
const seatZ = (i) => rowZ(i) + 0.02; // where a seated actor stands

// The back bench by the west door, where Åtta and Åström sit.
const BACK_Z = 42.62;
function backBench() {
  return [
    box('wood_floor', 21.3, 25.4, 42.0, 43.95, 0, PLATFORM, { uvScale: 2 }),
    box('wood_dark', 21.4, 25.3, BACK_Z - 0.02, BACK_Z + 0.43, PLATFORM + 0.38, PLATFORM + 0.45, { collide: false, uvScale: 1.5 }),
    box('wood_dark', 21.4, 25.3, BACK_Z + 0.43, BACK_Z + 0.5, PLATFORM + 0.45, PLATFORM + 1.05, { collide: false, uvScale: 1.5 }),
  ];
}

function pews() {
  const out = [
    // Raised wooden floors under the two pew blocks.
    box('wood_floor', 12.0, 18.8, 16.3, 40.9, 0, PLATFORM, { uvScale: 2 }),
    box('wood_floor', 21.2, 28.0, 16.3, 40.9, 0, PLATFORM, { uvScale: 2 }),
  ];
  for (let i = 0; i < ROWS; i++) {
    const z = rowZ(i);
    for (const [x0, x1] of [[12.2, 18.6], [21.4, 27.8]]) {
      out.push(box('wood_dark', x0, x1, z, z + 0.45, PLATFORM + 0.38, PLATFORM + 0.45, { collide: false, uvScale: 1.5 }));
      out.push(box('wood_dark', x0, x1, z + 0.45, z + 0.52, PLATFORM + 0.45, PLATFORM + 1.05, { collide: false, uvScale: 1.5 }));
    }
  }
  // Candles on the pew ends along the aisle, every third row.
  for (let i = 0; i < ROWS; i += 3) {
    const z = rowZ(i) + 0.48;
    for (const x of [18.55, 21.45]) {
      out.push(box('office_wall', x - 0.025, x + 0.025, z - 0.025, z + 0.025, PLATFORM + 1.05, PLATFORM + 1.3, { collide: false }));
      out.push(flame(x, PLATFORM + 1.37, z, 0.08));
    }
  }
  return out;
}

// ---- windows ----------------------------------------------------------------------------
function windows() {
  const out = [];
  for (let z = 15; z <= 39; z += 6) {
    out.push(decal('tower_glass', 11.03, 5.4, z, 1.3, 4.6, { rot: PI / 2, lit: false }));
    out.push(decal('tower_glass', 28.97, 5.4, z, 1.3, 4.6, { rot: -PI / 2, lit: false }));
    // Seen from the square: warm light behind the same windows.
    out.push(decal('window_lit', 7.97, 5.4, z, 1.3, 4.2, { rot: -PI / 2, lit: false }));
    out.push(decal('window_lit', 32.03, 5.4, z, 1.3, 4.2, { rot: PI / 2, lit: false }));
  }
  // The chancel window, and two narrow ones beside it.
  out.push(decal('tower_glass', 20, 5.8, 6.03, 3.2, 6.4, { lit: false }));
  out.push(decal('tower_glass', 16.2, 5.2, 6.03, 1.1, 4.4, { lit: false }));
  out.push(decal('tower_glass', 23.8, 5.2, 6.03, 1.1, 4.4, { lit: false }));
  return out;
}

// Stone buttresses along the long walls.
function buttresses() {
  const out = [];
  for (let z = 12; z <= 42; z += 6) {
    out.push(box('cobble', 7.2, 8, z - 0.4, z + 0.4, 0, 9, { uvScale: 3 }));
    out.push(box('cobble', 32, 32.8, z - 0.4, z + 0.4, 0, 9, { uvScale: 3 }));
  }
  return out;
}

// ---- candles -----------------------------------------------------------------------------
function altar() {
  const out = [
    box('lobby_marble', 18.4, 21.6, 6.8, 7.9, 0.3, 1.3),
    box('office_wall', 18.3, 21.7, 6.75, 7.95, 1.3, 1.34, { collide: false }),
    box('office_wall', 18.3, 21.7, 7.93, 7.97, 0.7, 1.34, { collide: false }),
  ];
  for (let i = 0; i < 6; i++) {
    const x = 18.7 + i * 0.52;
    const h = 0.4 + (i % 2) * 0.12;
    out.push(box('office_wall', x - 0.03, x + 0.03, 7.3, 7.36, 1.34, 1.34 + h, { collide: false }));
    out.push(flame(x, 1.42 + h, 7.33));
  }
  return out;
}

// A ljuskrona: a ring of candle flames hanging on a chain.
function chandelier(x, z, y = 5.4) {
  const out = [box('gun_metal', x - 0.02, x + 0.02, z - 0.02, z + 0.02, y + 0.2, 12, { collide: false })];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    out.push(flame(x + Math.sin(a) * 0.85, y, z + Math.cos(a) * 0.85, 0.11));
  }
  out.push(box('gun_metal', x - 0.9, x + 0.9, z - 0.9, z + 0.9, y - 0.12, y - 0.08, { collide: false }));
  return out;
}

// Candle stands on both sides of the chancel steps.
function candleStand(x, z) {
  const out = [box('gun_metal', x - 0.05, x + 0.05, z - 0.05, z + 0.05, 0, 1.1, { collide: false })];
  for (let i = -2; i <= 2; i++) {
    out.push(box('office_wall', x + i * 0.14 - 0.02, x + i * 0.14 + 0.02, z - 0.02, z + 0.02, 1.1, 1.35 - Math.abs(i) * 0.05, { collide: false }));
    out.push(flame(x + i * 0.14, 1.42 - Math.abs(i) * 0.05, z, 0.09));
  }
  return out;
}

// A Christmas tree with a spiral of bulbs (optionally with its own light).
function julgran(cx, cz, scale, lit = true) {
  const h = 10.4 * scale;
  const out = [prop('tree_spruce', cx, cz, { scale, shrink: 0.6 })];
  for (let i = 0; i < 16; i++) {
    const y = 0.5 + (i / 16) * (h - 1);
    const r = 2.1 * scale * (1 - y / h) + 0.12;
    const a = i * 2.4;
    out.push(decal('fx_spark', cx + Math.sin(a) * r, y, cz + Math.cos(a) * r, 0.18, 0.18, { lit: false, rot: a, double: true }));
  }
  if (lit) out.push(light(cx, 1.8, cz + 0.9, 0xffb050, 7, 1.0, { flicker: 0.08 }));
  return out;
}

// A market stall left under the snow after the Haga Christmas market.
function stall(x, z, rot) {
  const [dx, dz] = rot ? [1.3, 1.0] : [1.0, 1.3];
  return [
    box('wood_dark', x - dx, x - dx + 0.1, z - dz, z - dz + 0.1, 0, 2.3), box('wood_dark', x + dx - 0.1, x + dx, z - dz, z - dz + 0.1, 0, 2.3),
    box('wood_dark', x - dx, x - dx + 0.1, z + dz - 0.1, z + dz, 0, 2.3), box('wood_dark', x + dx - 0.1, x + dx, z + dz - 0.1, z + dz, 0, 2.3),
    box('stall_canvas', x - dx - 0.15, x + dx + 0.15, z - dz - 0.15, z + dz + 0.15, 2.3, 2.7, { collide: false, uvScale: 1.3 }),
    box('snow_fresh', x - dx - 0.12, x + dx + 0.12, z - dz - 0.12, z + dz + 0.12, 2.7, 2.85, { collide: false }),
    box('wood_dark', x - dx, x + dx, z - dz, z + dz, 0, 0.95),
    box('snow_fresh', x - dx, x + dx, z - dz, z + dz, 0.95, 1.02, { collide: false }),
  ];
}

// ---- the cutscene stage -----------------------------------------------------------------
const STAGE_CHURCH = {
  actors: {
    maja: { x: 22.3, z: seatZ(3), rot: PI },
    henrik: { x: 23.0, z: seatZ(3), rot: PI },
    atta: { x: 21.9, z: BACK_Z, rot: PI },
    astrom: { x: 22.6, z: BACK_Z, rot: PI },
    elsa: { x: 20, z: 15.0, rot: PI },
  },
  marks: {
    mark_a: [20, 10.6],
    mark_b: [20.5, 41.6],
  },
  props: { crown: [20, 1.64, 10.6] },
  establish: { pos: [20, 7.2, 42.6], look: [20, 2.2, 12], fov: 55 },
};

// ---- cutscene cues -----------------------------------------------------------------------
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

// The look inside the church (the level def holds the dawn outside).
const INSIDE = {
  ambient: [0.06, 0.05, 0.06],
  sky: [0.1, 0.09, 0.14],
  ground: [0.08, 0.05, 0.03],
  fogColor: [0.05, 0.04, 0.05],
  fog: [14, 70],
  bloom: 0.85,
};

/** Floors indoors get their own material copies without procedural snow. */
const DRY = new Set(['city_lobby_marble', 'city_office_carpet', 'city_wood_floor', 'city_cobble']);
function dryFloors(g) {
  const city = g.world.root.getObjectByName('city');
  for (const m of city?.children ?? []) {
    if (!DRY.has(m.name)) continue;
    const mat = m.material.clone();
    mat.uniforms = { ...m.material.uniforms, uSnowOn: { value: 0 } };
    m.material = mat;
  }
}

const pose = (cs, names, p) => { for (const n of names) { const a = cs.actor(n); if (a) a.pose = p; } };

export default {
  id: 'church',
  title: 'LUCIA',
  subtitle: 'Haga kyrka, 14 december 2047',
  player: 'henrik2',
  mode: 'family',
  size: [40, 72],
  spawn: { x: 19.6, z: 68, yaw: PI },
  camYaw: 0,
  loadout: { tranq: 0, pistol: 0, repair: 0 },

  ambient: [0.075, 0.085, 0.14],
  sky: [0.13, 0.15, 0.26],
  ground: [0.07, 0.07, 0.1],
  fogColor: [0.13, 0.145, 0.24],
  fog: [14, 72],
  ambientLight: 0.5,
  snow: 0.9,
  snowfall: true,
  blizzard: 0,
  wind: [0.12, 0.05],
  snowGround: true,
  grade: { lift: [0.015, 0.008, 0.02], gamma: [0.98, 1, 1.02], gain: [1.08, 1.01, 0.96], saturation: 0.95 },
  bloom: 0.7,
  exposure: 1.3,
  frost: 0.05,
  grain: 0.018,
  playerLight: 0xd8c8c0,
  music: 'music_lucia',
  ambience: 'amb_blizzard',
  ambienceVolume: 0.25,
  codec: [],
  codecKey: 'church',
  saveContact: 'astrom',

  build(g) {
    g.open(0, 0, 39, 71, SNOW);
    g.open(18, 51, 21, 71, TRODDEN);
    g.open(10, 51, 29, 53, TRODDEN);
    // Church: stone shell, plastered interior, tower over the door.
    g.block(8, 3, 31, 47, STONE);
    g.block(10, 5, 29, 45, PLASTER);
    g.open(11, 12, 28, 43, NAVE);
    g.open(19, 12, 20, 43, { ...NAVE, ft: 'office_carpet', floorScale: 2 });
    g.open(13, 6, 26, 11, { ...NAVE, ft: 'wood_floor', floor: 0.3, floorScale: 2 });
    g.block(15, 46, 24, 50, TOWER);
    g.block(17, 47, 22, 50, { ...TOWER, h: 40 });
    g.block(18, 48, 21, 50, { ...TOWER, h: 45, wt: 'roof_tar' });
    g.block(19, 48, 20, 49, { ...TOWER, h: 50, wt: 'roof_tar' });
    g.open(19, 44, 20, 50, { ...NAVE, ft: 'cobble', floorScale: 2 });
  },

  entities: [
    // ---- the nave -----------------------------------------------------------------------
    ...pews(),
    ...backBench(),
    ...windows(),
    ...altar(),
    ...chandelier(20, 19.5),
    ...chandelier(20, 31.5),
    ...candleStand(16.8, 11.4),
    ...candleStand(23.2, 11.4),
    ...julgran(14.4, 8.4, 0.36, false),
    ...julgran(25.6, 8.4, 0.36, false),
    // Pulpit on the north-west pillar, and the gallery front at the back.
    box('wood_dark', 12.2, 13.4, 11.9, 13.1, 0, 1.25),
    box('wood_dark', 12.0, 13.6, 11.7, 13.3, 2.9, 3.0, { collide: false }),
    box('wood_dark', 11, 29, 43.3, 43.9, 5.2, 6.1, { collide: false }),
    box('wood_dark', 11, 29, 43.3, 44, 5.0, 5.2, { collide: false }),
    // Hymn boards.
    box('wood_dark', 26.8, 27.6, 11.9, 12.0, 2.0, 3.0, { collide: false }),
    decal('office_wall', 20, 0.305, 8.9, 3.6, 1.8, { rx: -PI / 2 }),
    // Dawn through the windows, candles within.
    light(12.3, 5.5, 18, 0x5f80d8, 8, 0.9),
    light(12.3, 5.5, 33, 0x5f80d8, 8, 0.8),
    light(27.7, 5.5, 24, 0x5f80d8, 8, 0.9),
    light(27.7, 5.5, 39, 0x5f80d8, 8, 0.7),
    light(20, 6.5, 7, 0x7b98ea, 10, 1.0),
    light(18.9, 1.9, 7.6, 0xffb45a, 6, 1.3, { flicker: 0.12 }),
    light(21.1, 1.9, 7.6, 0xffb45a, 6, 1.2, { flicker: 0.14 }),
    light(20, 5.2, 19.5, 0xffc070, 13, 1.25, { flicker: 0.05 }),
    light(20, 5.2, 31.5, 0xffc070, 13, 1.15, { flicker: 0.06 }),
    light(16.8, 1.6, 11.8, 0xffa850, 5, 0.9, { flicker: 0.15 }),
    light(23.2, 1.6, 11.8, 0xffa850, 5, 0.9, { flicker: 0.15 }),
    // The lucia crown: a small warm light that follows Elsa (moved by the script).
    light(20, 1.9, 15, 0xffc878, 4.5, 1.2, { flicker: 0.2, tag: 'crown' }),

    // ---- the square -----------------------------------------------------------------------
    prop('tree_spruce', 6, 56, { shrink: 1.2, scale: 0.7 }),
    prop('tree_spruce', 34, 57, { shrink: 1.2, scale: 0.75 }),
    prop('tree_spruce', 4, 65, { shrink: 1.2 }),
    prop('tree_spruce', 36, 67, { shrink: 1.2, scale: 0.85 }),
    prop('tree_spruce', 3, 30, { shrink: 1.2, scale: 0.9 }), prop('tree_spruce', 36, 22, { shrink: 1.2 }),
    prop('lamp_post', 15.5, 55.5), prop('lamp_post', 24.5, 55.5),
    prop('bench', 11.5, 58, { rot: PI / 2 }), prop('bench', 28.5, 58, { rot: -PI / 2 }),
    ...stall(8.5, 62, false),
    ...stall(31.2, 62.5, false),
    ...julgran(26.5, 66, 0.42),
    prop('fence', 2, 44, { rot: PI / 2 }), prop('fence', 2, 48, { rot: PI / 2 }),
    prop('fence', 38, 44, { rot: PI / 2 }), prop('fence', 38, 48, { rot: PI / 2 }),
    flame(20, 3.6, 50.1, 0.35),
    decal('window_lit', 20, 8.5, 51.03, 1.2, 3.2, { lit: false }),
    decal('window_lit', 20, 22, 51.03, 1.6, 2.6, { lit: false }),
    decal('window_lit', 17.5, 12, 51.03, 0.9, 2.4, { lit: false }),
    decal('window_lit', 22.5, 12, 51.03, 0.9, 2.4, { lit: false }),
    ...buttresses(),
    // Stone over the door passage, so the tower stays whole above the doorway.
    box('cobble', 19, 21, 46, 51, 3.6, 40, { collide: false, uvScale: 3 }),
    box('roof_tar', 19, 21, 48, 50, 40, 45, { collide: false, uvScale: 3 }),
    box('roof_tar', 19, 20.99, 48, 49.99, 45, 50, { collide: false, uvScale: 3 }),
    box('office_wall', 19, 21, 44, 46, 3.6, 12, { collide: false, uvScale: 12 }),
    light(20, 3.3, 50.8, 0xffc070, 7, 1.1, { flicker: 0.06 }),
    light(20, 2.4, 45.5, 0xffb060, 6, 0.9),

    // ---- people -------------------------------------------------------------------------
    { type: 'npc', id: 'maja', model: 'maja2', name: 'Maja', x: 18.5, z: 67.2, rot: PI },
    { type: 'npc', id: 'c1', model: 'civilian2', name: 'Kyrkobesökare', x: 12, z: 64, rot: PI, tint: [0.9, 0.85, 1] },
    { type: 'npc', id: 'c2', model: 'civilian2', name: 'Kyrkobesökare', x: 29, z: 66, rot: PI, tint: [1, 0.85, 0.8] },
    { type: 'npc', id: 'c3', model: 'civilian2', name: 'Kyrkobesökare', x: 21.4, z: 58, rot: PI, tint: [0.8, 0.95, 0.85] },

    { type: 'trigger', id: 'door', rect: [19, 48, 20, 50] },
    { type: 'marker', id: 'cp_start', x: 19.6, z: 68, yaw: PI },
  ],

  stages: { church: STAGE_CHURCH },

  script: {
    onStart(g) {
      dryFloors(g);
      this.inside = false;
      this.epDone = false;
      this.wantIn = false;
      this.maja = g.npc('maja');
      this.maja?.walk([[18.6, 60], [18.9, 52.5], [19.3, 50.6]], 1.05).then(() => { this.maja.lookAt = g.player.pos; });
      const goers = [['c1', [[14, 56], [19.2, 52], [19.6, 47]]], ['c2', [[26, 58], [20.4, 52], [20.2, 47]]], ['c3', [[20.6, 52], [19.8, 47]]]];
      goers.forEach(([id, pts], i) => g.later(i * 2.5, () => g.npc(id)?.walk(pts, 1.15).then(() => g.npc(id)?.setHidden(true))));
      const bell = (t, v) => g.later(t, () => g.audio.play('church_bell', { pos: { x: 19.5, y: 28, z: 48 }, volume: v, refDistance: 30 }));
      bell(2.5, 1);
      bell(9, 0.9);
      bell(20, 0.9);
      g.later(3.5, () => g.say('ep_1', () => {
        this.epDone = true;
        if (this.wantIn) this.enter(g);
      }));
    },

    update(g) {
      // Maja keeps pace: she waits when Henrik lags behind.
      const m = this.maja;
      if (m?.route) m.speed = m.pos.distanceTo(g.player.pos) > 5 ? 0 : 1.05;
    },

    trigger(g, id) {
      if (id !== 'door' || this.wantIn) return;
      this.wantIn = true;
      g.player.frozen = true;
      if (this.epDone || g.skipCutscenes) this.enter(g);
    },

    enter(g) {
      if (this.inside) return;
      this.inside = true;
      g.snow.visible = false;
      const crown = g.lights.lights.find((l) => l.tag === 'crown');
      cue(g, 'epilog_church', {
        0: (cs, gg) => { gg.snow.visible = false; },
        // The congregation rises when lucia comes in …
        2: (cs) => {
          pose(cs, ['henrik', 'maja', 'atta', 'astrom'], 'idle');
          const e = cs.actor('elsa'), h = cs.actor('henrik');
          if (e && h) e.lookAt = h.pos;
        },
        // … and sits down again after the song.
        11: (cs) => pose(cs, ['henrik', 'maja', 'atta', 'astrom'], 'sit'),
        // Elsa goes to the back bench (most of the aisle happens off screen).
        12: (cs, gg) => {
          const e = cs.actor('elsa');
          if (!e) return;
          e.lookAt = null;
          e.pos.set(20.1, 0, 38.4);
          e.walk([[...STAGE_CHURCH.marks.mark_b]], 1.3);
          gg.camera.position.set(e.pos.x + 3, 1.7, e.pos.z - 1);
        },
        // Åtta stands up when she speaks to him: it is an order, of a kind.
        13: (cs) => pose(cs, ['atta'], 'idle'),
        21: (cs) => pose(cs, ['atta'], 'sit'),
        every: (cs) => {
          const e = cs.actor('elsa');
          if (crown && e) crown.pos.set(e.pos.x, e.pos.y + 1.7, e.pos.z);
        },
      });
      // Candlelight: darker, warmer air inside than on the square.
      import('../engine/material.js').then(({ sharedUniforms: u }) => {
        u.uAmbient.value.setRGB(...INSIDE.ambient);
        u.uSkyColor.value.setRGB(...INSIDE.sky);
        u.uGroundColor.value.setRGB(...INSIDE.ground);
        u.uFogColor.value.setRGB(...INSIDE.fogColor);
        u.uFogNear.value = INSIDE.fog[0];
        u.uFogFar.value = INSIDE.fog[1];
        g.gfx.postUniforms.uBloom.value = INSIDE.bloom * (g.bloomScale ?? 1);
        g.gfx.postUniforms.uFrost.value = 0;
      }).finally(() => g.playCutscene('epilog_church').then(() => g.playEnding()));
    },
  },
};
