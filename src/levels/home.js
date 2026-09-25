// Prolog — Advent. Kålltorp, 12 December 2047, evening. The Sandells' ground-
// floor flat in a row of landshövdingehus with advent stars in the windows.
// The prolog cutscene plays in the kitchen (Henrik fixes the Christmas
// lights, Elsa sings, the news, Åström calls). Then a short, quiet walk: out
// through the snowy yard past the kick sled and the carpet-beating rack,
// across the plowed street with Volvos under snow, to the tram terminus where
// the last tram towards the city waits with its lights on. Henrik gets on.
//
// Interior trick: the flat is carved out of the building with a ring of low
// wallpapered walls; a downward-facing ceiling (single-sided decals) closes
// it for the cutscene cameras inside and is invisible from the chase camera
// above.

const PI = Math.PI;
const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

const HOUSE = { h: 10, wt: 'facade_haga', rt: 'roof_snow', wu: 10, wv: 10 };
const WALL = { h: 3.4, wt: 'wallpaper_home', rt: 'wood_dark', wu: 1.6, wv: 1.6 };
const FLOOR = { ft: 'wood_floor', et: 'wood_dark', floorScale: 2, indoor: true };
const SNOW = { ft: 'snow_fresh', et: 'sidewalk', floorScale: 4 };
const TRODDEN = { ft: 'snow_trodden', et: 'sidewalk', floorScale: 3 };

const prop = (model, x, z, o = {}) => ({ type: 'prop', model, x, z, ...o });
const light = (x, y, z, color, range, intensity, o = {}) => ({ type: 'light', x, y, z, color, range, intensity, ...o });
const decal = (tex, x, y, z, w, h, o = {}) => ({ type: 'decal', tex, x, y, z, w, h, ...o });
const box = (tex, x0, x1, z0, z1, y0, y1, o = {}) => ({ type: 'box', tex, x0, x1, z0, z1, y0, y1, ...o });
// Furniture indoors does not collect snow.
const dry = (model, x, z, o = {}) => prop(model, x, z, { snow: false, ...o });

/** The flat's floor gets its own material copy without procedural snow. */
function dryFloor(g) {
  const city = g.world.root.getObjectByName('city');
  for (const m of city?.children ?? []) {
    if (m.name !== 'city_wood_floor') continue;
    const mat = m.material.clone();
    mat.uniforms = { ...m.material.uniforms, uSnowOn: { value: 0 } };
    m.material = mat;
  }
}

// Warm windows on the yard facade and across the street.
const WINDOWS = [
  [6, 4.6], [13, 7.9], [17, 4.6], [39, 4.6], [45, 7.9], [49, 4.6], [9, 7.9], [42, 4.6],
].map(([x, y]) => decal('window_lit', x, y, 18.03, 1.1, 1.3, { lit: false }))
  .concat([[5, 4.6], [11, 7.9], [18, 4.6], [24, 7.9], [31, 4.6], [36, 7.9]]
    .map(([x, y]) => decal('window_lit', x, y, 45.97, 1.1, 1.3, { lit: false, rot: PI })));

// Plaster ceiling over the flat, facing down: seen from inside, culled from above.
function ceiling() {
  const out = [];
  for (let x = 20; x < 34; x += 2) for (let z = 4; z < 16; z += 2) {
    out.push(decal('office_wall', x + 1, 3.38, z + 1, 2, 2, { rx: PI / 2 }));
  }
  return out;
}

// A string of Christmas lights across the kitchen window.
function bulbs(x0, x1, z, y) {
  const out = [];
  for (let i = 0; i <= 8; i++) {
    const x = x0 + ((x1 - x0) * i) / 8;
    out.push(decal('fx_spark', x, y - Math.sin((i / 8) * PI) * 0.18, z, 0.16, 0.16, { lit: false, rot: PI }));
  }
  return out;
}

// Carpet-beating rack (piskställning), the most Swedish thing in any yard.
function beatingRack(x, z) {
  return [
    box('gun_metal', x - 1.6, x - 1.5, z - 0.05, z + 0.05, 0, 1.9),
    box('gun_metal', x + 1.5, x + 1.6, z - 0.05, z + 0.05, 0, 1.9),
    box('gun_metal', x - 1.6, x + 1.6, z - 0.04, z + 0.04, 1.82, 1.9, { collide: false }),
    box('snow_fresh', x - 1.6, x + 1.6, z - 0.06, z + 0.06, 1.9, 1.96, { collide: false }),
  ];
}

// Kick sled (spark) built from boxes: runners, seat, handle.
function kickSled(x, z) {
  return [
    box('gun_metal', x - 0.22, x - 0.18, z - 0.9, z + 0.8, 0, 0.04, { collide: false }),
    box('gun_metal', x + 0.18, x + 0.22, z - 0.9, z + 0.8, 0, 0.04, { collide: false }),
    box('wood_dark', x - 0.24, x + 0.24, z + 0.2, z + 0.6, 0.45, 0.5),
    box('gun_metal', x - 0.22, x - 0.18, z + 0.55, z + 0.6, 0, 1.0, { collide: false }),
    box('gun_metal', x + 0.18, x + 0.22, z + 0.55, z + 0.6, 0, 1.0, { collide: false }),
    box('wood_dark', x - 0.26, x + 0.26, z + 0.55, z + 0.62, 0.95, 1.02, { collide: false }),
  ];
}

// The yard's Christmas tree: a spruce with a spiral of warm bulbs.
function julgran(cx, cz) {
  const out = [prop('tree_spruce', cx, cz, { scale: 0.45, shrink: 0.6 })];
  for (let i = 0; i < 18; i++) {
    const h = 0.55 + i * 0.21;
    const r = 0.98 * (1 - h / 4.7) + 0.12;
    const a = i * 2.4;
    out.push(decal('fx_spark', cx + Math.sin(a) * r, h, cz + Math.cos(a) * r, 0.2, 0.2, { lit: false, rot: a, double: true }));
  }
  out.push(light(cx, 1.8, cz + 0.8, 0xffb050, 7, 1.1, { flicker: 0.08 }));
  return out;
}

// Low snow banks where the path has been shovelled.
function banks(x0, x1, z0, z1) {
  return [box('snow_fresh', x0, x1, z0, z1, 0, 0.35, { collide: false, uvScale: 2 })];
}

// Snow-capped hedge along the yard.
function hedge(x0, x1) {
  return [
    box('hedge', x0, x1, 34.15, 34.95, 0, 1.15, { uvScale: 1.2 }),
    box('snow_fresh', x0 - 0.05, x1 + 0.05, 34.1, 35.0, 1.15, 1.3, { collide: false, uvScale: 2 }),
  ];
}

// ---- cutscene stage: the kitchen --------------------------------------------------
const STAGE_HOME = {
  actors: {
    henrik: { x: 29.5, z: 9.6, rot: PI, pose: 'kneel' },
    elsa: { x: 31.7, z: 5.6, rot: -PI / 2 },
    maja: { x: 31.4, z: 11.8, rot: -PI / 2 },
  },
  marks: {
    mark_a: [29.5, 7.6],
    mark_b: [25.5, 9.2],
    mark_c: [27.4, 10.6],
  },
  props: { screen: [21.3, 0.78, 5.5] },
  establish: { pos: [22.5, 2.6, 31], look: [27, 3.8, 16], fov: 55 },
};

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

export default {
  id: 'home',
  title: 'ADVENT',
  subtitle: 'Kålltorp, 12 december 2047',
  player: 'henrik2',
  mode: 'family',
  size: [56, 66],
  spawn: { x: 32.9, z: 14.2, yaw: 0 },
  camYaw: PI,
  loadout: { tranq: 0, pistol: 0, repair: 0 },

  ambient: [0.1, 0.11, 0.17],
  sky: [0.11, 0.14, 0.22],
  ground: [0.08, 0.09, 0.13],
  fogColor: [0.12, 0.14, 0.21],
  fog: [14, 64],
  ambientLight: 0.4,
  snow: 0.9,
  snowfall: true,
  blizzard: 0.08,
  wind: [0.25, 0.1],
  snowGround: true,
  grade: { lift: [0.01, 0.01, 0.03], gamma: [1, 1, 1], gain: [1.04, 1, 1.02], saturation: 0.92 },
  bloom: 0.5,
  exposure: 1.3,
  frost: 0.12,
  grain: 0.02,
  playerLight: 0xb0bcd0,
  music: 'music_title2',
  ambience: 'amb_blizzard',
  ambienceVolume: 0.35,
  codec: ['astrom'],
  codecKey: 'home',
  saveContact: 'astrom',

  build(g) {
    // Everything outside: snowy yard, plowed street, tram terminus.
    g.open(0, 18, 55, 65, SNOW);
    g.open(0, 35, 55, 36, TRODDEN);
    g.open(0, 37, 55, 43, { ft: 'snow_asphalt', et: 'sidewalk', floorScale: 5 });
    g.open(0, 44, 55, 45, TRODDEN);
    // Footpath through the yard, from the stairwell door to the gate.
    g.open(30, 18, 33, 20, TRODDEN);
    g.open(27, 21, 29, 34, TRODDEN);
    // Houses: our row (north) and the row across the street (south).
    g.block(0, 0, 55, 17, HOUSE);
    g.block(0, 46, 40, 65, { ...HOUSE, wt: 'facade_landshovding', wu: 8, wv: 5, h: 11 });
    // Tram terminus: platform and track going south.
    g.open(41, 46, 45, 65, { ...TRODDEN, floor: 0.2, et: 'sidewalk' });
    g.open(46, 44, 47, 65, { ft: 'tram_rails', et: 'sidewalk', floorScale: 2 });
    g.open(48, 46, 55, 65, SNOW);
    // The flat: kitchen and living room in one, low wallpapered walls.
    g.block(19, 3, 34, 16, WALL);
    g.open(20, 4, 33, 15, FLOOR);
    // Stairwell door out to the yard.
    g.open(32, 16, 33, 16, FLOOR);
    g.open(32, 17, 33, 17, { ...TRODDEN, indoor: true });
  },

  entities: [
    ...WINDOWS,
    ...ceiling(),
    ...bulbs(22.6, 25.4, 15.94, 2.35),
    // ---- the flat -----------------------------------------------------------------------
    decal('tower_glass', 24, 1.7, 15.97, 1.6, 1.4, { rot: PI }),
    decal('tower_glass', 29.8, 1.7, 15.97, 1.6, 1.4, { rot: PI }),
    box('wood_dark', 23.1, 24.9, 15.7, 16, 0.85, 0.95, { collide: false }),
    box('wood_dark', 28.9, 30.7, 15.7, 16, 0.85, 0.95, { collide: false }),
    decal('portrait_elsa', 25.2, 1.75, 4.03, 0.5, 0.5),
    decal('portrait_maja', 26, 1.75, 4.03, 0.5, 0.5),
    decal('portrait_henrik', 25.6, 2.35, 4.03, 0.45, 0.45),
    dry('table', 30.2, 11.8, { rot: PI / 2 }),
    dry('chair', 31.4, 11.8, { rot: -PI / 2, collide: false }),
    dry('chair', 29.0, 11.8, { rot: PI / 2 }),
    dry('chair', 30.2, 13.0, { rot: PI }),
    dry('music_box', 30.1, 12.2, { y: 0.76, collide: false }),
    dry('sofa', 20.6, 9.6, { rot: PI / 2 }),
    dry('desk', 20.5, 13.6, { rot: PI / 2 }),
    dry('chair', 21.4, 13.6, { rot: -PI / 2 }),
    dry('planter', 26.6, 15.4, { scale: 0.6 }),
    decal('fx_spark', 29.8, 2.2, 15.9, 0.55, 0.55, { lit: false, rot: PI }),
    dry('tv_old', 21.1, 5.3, { rot: PI / 4 }),
    dry('box', 29.5, 8.85, { rot: 0.2, scale: 0.7 }),
    box('wood_dark', 30.2, 33.95, 4, 4.7, 0, 0.9),
    box('metal_plate', 30.2, 33.95, 4, 4.72, 0.9, 0.94, { collide: false }),
    box('wood_dark', 30.2, 33.95, 4, 4.4, 1.6, 2.4, { collide: false }),
    box('office_wall', 33.15, 33.95, 7.1, 7.9, 0, 1.85, { uvScale: 1.9 }),
    light(28.2, 2.9, 9.4, 0xffc47a, 10, 1.25, { flicker: 0.03 }),
    light(21.8, 1.0, 6.0, 0x6d8cff, 4.5, 0.9, { flicker: 0.45 }),
    light(24, 2.3, 15.3, 0xffb050, 3.5, 0.7, { flicker: 0.08 }),
    light(32.9, 2.8, 18.4, 0xffd08a, 6, 0.9),

    // ---- the yard ------------------------------------------------------------------------
    prop('tree_spruce', 9, 25, { shrink: 1.2 }),
    prop('tree_spruce', 45.5, 23, { shrink: 1.2, scale: 0.7 }),
    prop('tree_spruce', 50, 30, { shrink: 1.2, scale: 0.7 }),
    prop('lamp_post', 17, 26.5),
    prop('lamp_post', 38.5, 24.5),
    prop('bench', 17.5, 22.2, { rot: 0 }),
    ...julgran(21.5, 27.5),
    ...banks(26.35, 26.85, 21, 33.8),
    ...banks(29.15, 29.65, 21, 33.8),
    ...banks(29.6, 33.9, 20.95, 21.4),
    prop('table', 12.5, 21.8),
    prop('chair', 11.5, 21.8, { rot: PI / 2 }), prop('chair', 13.5, 21.8, { rot: -PI / 2 }),
    prop('crate', 7.4, 19.4, { rot: 0.1 }), prop('box', 7.3, 20.4, { rot: 0.4 }),
    prop('fence', 6, 21.4, { rot: 0 }),
    prop('tree_spruce', 36, 31.5, { shrink: 1.2, scale: 0.7 }),
    prop('dumpster', 4.2, 19.6, { rot: 0 }), prop('dumpster', 5.8, 19.6, { rot: 0 }),
    ...beatingRack(40, 30),
    ...kickSled(34.2, 20.5),
    prop('fence', 2.4, 27, { rot: PI / 2 }), prop('fence', 2.4, 31, { rot: PI / 2 }),
    ...hedge(0, 26.6),
    ...hedge(30.4, 55),

    // ---- the street ----------------------------------------------------------------------
    prop('streetlight', 8, 35.4, { rot: 0 }),
    prop('streetlight', 26, 35.4, { rot: 0 }),
    prop('streetlight', 40, 44.6, { rot: PI }),
    prop('volvo240', 13, 37.8, { rot: PI / 2, tint: [0.7, 0.78, 0.95] }),
    prop('volvo240', 19.5, 37.8, { rot: PI / 2, tint: [1, 0.9, 0.7] }),
    prop('volvo240', 35, 37.8, { rot: -PI / 2 }),
    prop('volvo240', 8, 43, { rot: -PI / 2, tint: [0.75, 0.9, 0.8] }),
    box('snow_fresh', 0, 55, 36.8, 37.05, 0, 0.22, { collide: false, uvScale: 3 }),
    box('snow_fresh', 0, 55, 43.95, 44.2, 0, 0.22, { collide: false, uvScale: 3 }),
    prop('bollard', 25.5, 35.5), prop('bollard', 30.5, 35.5),

    // ---- the tram terminus ---------------------------------------------------------------
    prop('hallplats', 43.2, 53.5, { rot: -PI / 2 }),
    prop('bench', 42.4, 58, { rot: PI / 2 }),
    prop('tram', 47, 110, { id: 'tram', collide: false, cut: true }),
    prop('tree_spruce', 52, 50, { shrink: 1.2 }),
    prop('tree_spruce', 53, 58, { shrink: 1.2, scale: 0.8 }),
    prop('tree_spruce', 51, 63, { shrink: 1.2, scale: 0.7 }),
    light(43.6, 2.7, 53.5, 0xdfeeff, 6, 0.9),
    light(47, 2.6, 55.5, 0xfff0c0, 11, 1.2, { enabled: false, tag: 'tram' }),
    light(14, 4.5, 45, 0xffb870, 7, 0.7),

    // ---- neighbours ---------------------------------------------------------------------
    { type: 'npc', id: 'neighbour', model: 'civilian2', name: 'Grannen', x: 44.2, z: 25.5, rot: -PI / 2, pose: 'reach', tint: [0.8, 0.85, 1] },
    { type: 'npc', id: 'waiting', model: 'civilian2', name: 'Resenär', x: 44.6, z: 50.6, rot: PI / 2, tint: [1, 0.9, 0.85] },
    { type: 'npc', id: 'maja', model: 'maja2', name: 'Maja', x: 31.4, z: 11.8, rot: -PI / 2, pose: 'sit' },
    { type: 'npc', id: 'elsa', model: 'elsa_lucia', name: 'Elsa', x: 24, z: 15.2, rot: 0 },

    // ---- flow -----------------------------------------------------------------------------
    { type: 'trigger', id: 'yard', rect: [30, 18, 33, 19] },
    { type: 'trigger', id: 'street', rect: [26, 35, 30, 36] },
    { type: 'trigger', id: 'stop', rect: [41, 46, 45, 50] },
    { type: 'use', id: 'board', x: 45.2, z: 55.5, r: 2.2, label: 'Kliv på spårvagnen', when: (g) => g.flags.ho_tram },
    { type: 'marker', id: 'cp_start', x: 32.9, z: 14.2, yaw: 0 },
  ],

  stages: { home: STAGE_HOME },

  script: {
    onStart(g, restore) {
      dryFloor(g);
      this.tramZ = 110;
      this.tramGo = false;
      this.tram = g.world.props.find((p) => p.def.id === 'tram');
      if (restore) { this.afterCutscene(g); return; }
      g.hud.title = null;
      for (const n of [g.npc('maja'), g.npc('elsa')]) n?.setHidden(true);
      // Snow only while the camera is outside (the establishing shot).
      cue(g, 'prolog_home', {
        0: (cs, gg) => { gg.snow.visible = true; },
        1: (cs, gg) => { gg.snow.visible = false; },
        // Poses do not survive a walk: stand up before moving.
        4: (cs) => { const e = cs.actor('elsa'); const h = cs.actor('henrik'); if (e && h) e.lookAt = h.pos; },
        // Maja gets up from the table when she turns to Henrik.
        12: (cs) => { const m = cs.actor('maja'); if (m) m.pose = 'idle'; },
        15: (cs) => { const h = cs.actor('henrik'); if (h) h.pose = 'idle'; },
        19: (cs) => {
          const m = cs.actor('maja'), h = cs.actor('henrik');
          if (m) m.pose = 'idle';
          if (m && h) { m.lookAt = h.pos; h.lookAt = m.pos; }
        },
      });
      g.playCutscene('prolog_home').then(() => this.afterCutscene(g));
    },

    afterCutscene(g) {
      for (const n of [g.npc('maja'), g.npc('elsa')]) n?.setHidden(false);
      const maja = g.npc('maja');
      if (maja) maja.lookAt = g.player.pos;
      g.hud.showTitle(g.level.title, g.level.subtitle);
      g.later(4, () => g.hud.setObjective('Gå till spårvagnen vid ändhållplatsen.'));
    },

    update(g, dt) {
      const cell = g.world.grid.cellAt(g.player.pos.x, g.player.pos.z);
      g.snow.visible = !cell?.indoor;
      // The tram rolls in from the south and stops at the platform.
      if (this.tram && this.tramGo && this.tramZ > 55.5) {
        this.tramZ = Math.max(55.5, this.tramZ - dt * Math.max(1.2, (this.tramZ - 55.5) * 0.45));
        this.tram.obj.position.z = this.tramZ;
        if (this.tramZ <= 55.5) this.tramArrived(g);
      }
      if (this.leaving && this.tram) {
        this.leaveV = Math.min(6, (this.leaveV ?? 0) + dt * 1.2);
        this.tramZ += dt * this.leaveV;
        this.tram.obj.position.z = this.tramZ;
        for (const l of g.lights.lights) if (l.tag === 'tram') l.pos.z = this.tramZ;
      }
    },

    trigger(g, id) {
      if (id === 'yard') {
        g.audio.play('wind_gust_2', { volume: 0.5 });
      } else if (id === 'street') {
        g.audio.play('tram_bell', { pos: { x: 47, y: 2, z: 90 }, volume: 0.5, refDistance: 20 });
      } else if (id === 'stop' && !this.tramGo) {
        this.tramGo = true;
        g.audio.play('tram_pass', { pos: { x: 47, y: 1, z: 80 }, volume: 0.9, refDistance: 14 });
      }
    },

    tramArrived(g) {
      g.flags.ho_tram = true;
      for (const l of g.lights.lights) if (l.tag === 'tram') l.enabled = true;
      g.audio.play('tram_bell', { pos: { x: 47, y: 2, z: 55 }, volume: 1 });
      g.audio.play('door_slide', { pos: { x: 46, y: 1, z: 55 }, volume: 0.6, rate: 0.8 });
    },

    use(g, u) {
      if (u.id !== 'board' || this.leaving) return;
      u.done = true;
      g.audio.play('door_slide', { pos: { x: 46, y: 1, z: 55 }, volume: 0.6, rate: 0.8 });
      g.player.obj.visible = false;
      g.player.frozen = true;
      g.cinematic = { pos: [42.2, 1.9, 46.2], look: [47, 2.2, 57] };
      g.later(1.2, () => {
        this.leaving = true;
        g.audio.play('tram_bell', { pos: { x: 47, y: 2, z: 55 }, volume: 0.9 });
      });
      g.later(7, () => g.completeChapter());
    },
  },
};
