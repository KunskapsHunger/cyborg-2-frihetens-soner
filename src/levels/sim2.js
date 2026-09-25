// II. SIMULERINGEN — Enhet Åttas VR-pass 3001. En cyan trådmodell av Göteborg
// i svart: sex rum i rad från söder till norr och sedan österut. Varje rum
// lär ut en ny förmåga (skåp, kartong, knacka, hålla upp, lyssna in) och den
// sista gården har snö som vakterna läser spår i. Vakterna är hologram.
//
//   R0 väckningskammaren (start)      z 108–118
//   R1 skåpen          (dörr d1)      z 84–99
//   R2 kartongen                      z 60–77
//   R3 knacka          (mittblock)    z 36–53
//   R4 hålla upp       (dörr d4)      z 14–29
//   R5 snögården, lyssna in, utgång   x 44–75, z 6–44
//
// Blir Åtta upptäckt återställs rummet (simuleringen avbryter passet).

import { PHASE } from '../game/alarm.js';

const PI = Math.PI;
const W = 80;
const D = 124;

// Hologram tints: sim guards and wireframe props.
const HOLO = [0.55, 1.45, 1.9];
const HOLO_PROP = [0.45, 1.3, 1.8];

const FLOOR = { ft: 'sim_wall_top', et: 'sim_grid', floorScale: 2, indoor: true };
const SEAM = { ft: 'sim_noise_floor', et: 'sim_grid', floorScale: 3, indoor: true };
const SNOW = { ft: 'snow_fresh', et: 'sim_grid', floorScale: 4 };
const WALL = { h: 3.5, wt: 'sim_grid', rt: 'sim_wall_top', wu: 4, wv: 4 };
const CONTAINER = { h: 2.6, wt: 'sim_grid', rt: 'sim_wall_top', wu: 3, wv: 2.6 };
const LOW = { h: 1.1, wt: 'sim_grid', rt: 'sim_wall_top', wu: 4, wv: 4 };

// Deterministic 0..1 per tile, for the wireframe skyline.
const hash = (x, z) => {
  let h = (x * 374761393 + z * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Block cells that border the walkable area become low room walls. */
function lowerRoomWalls(g) {
  const near = (x, z) => {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) if (g.get(x + dx, z + dz)) return true;
    }
    return false;
  };
  const edits = [];
  for (let z = 0; z < g.depth; z++) {
    for (let x = 0; x < g.width; x++) {
      const b = g.blockAt(x, z);
      if (b && b.h > WALL.h && near(x, z)) edits.push([x, z]);
    }
  }
  for (const [x, z] of edits) g.blocks.set(z * g.width + x, WALL);
}

// Where the simulation puts Åtta back when a guard sees him.
const ROOM_OF = {
  cp_start: 'cp_start', cp_locker: 'cp_locker', cp_box: 'cp_box', cp_knock: 'cp_knock', cp_hold: 'cp_hold', cp_snow: 'cp_snow',
};

export default {
  id: 'sim2',
  title: 'II. SIMULERINGEN',
  subtitle: 'Simulering 2.0, pass 3001',
  player: 'atta',
  mode: 'mission',
  size: [W, D],
  spawn: { x: 27.5, z: 110.5, yaw: 0 },
  camYaw: 0,
  loadout: { tranq: 8, pistol: 0, repair: 1, items: [] },
  guardModel: 'sons_guard',
  guardWeapon: 'rifle2',
  barks: 'sons',
  noRadioCheck: true,

  ambient: [0.15, 0.23, 0.29],
  sky: [0.01, 0.03, 0.05],
  ground: [0.02, 0.08, 0.1],
  fogColor: [0.0, 0.015, 0.025],
  fog: [22, 78],
  ambientLight: 0.32,
  playerLight: 0x8fe8ff,
  playerLightIntensity: 0.5,
  snow: 0,
  snowfall: false,
  snowGround: true,
  snowFill: 14,           // the sim's snow does not stay: prints fill in fast
  grade: { lift: [0, 0.01, 0.02], gamma: [1, 0.98, 0.95], gain: [0.95, 1.02, 1.08], saturation: 1.0 },
  bloom: 0.5,
  exposure: 1.1,
  frost: 0,
  grain: 0.03,
  music: 'music_sneak2',
  alertMusic: 'music_alert2',
  evasionMusic: 'music_evasion2',
  ambience: 'amb_sim',
  ambienceVolume: 0.55,
  sounds: [
    { name: 'holo_hum', x: 27.5, y: 1.5, z: 114, volume: 0.35, ref: 2, max: 14 },
    { name: 'holo_hum', x: 74, y: 1.5, z: 9, volume: 0.4, ref: 2, max: 16 },
  ],
  codec: ['kall', 'linnea'],
  codecKey: 'sim2',
  saveContact: 'linnea',

  build(g) {
    // Wireframe Gothenburg: 6 m city blocks of hashed heights, with a few
    // landmarks that rise over the rooms.
    for (let bz = 0; bz < D; bz += 6) {
      for (let bx = 0; bx < W; bx += 6) {
        const h = 5 + Math.floor(hash(bx, bz) * 14);
        g.block(bx, bz, Math.min(bx + 5, W - 1), Math.min(bz + 5, D - 1), { ...WALL, h });
      }
    }

    // R0: the wake-up chamber.
    g.open(21, 108, 34, 118, FLOOR);
    g.open(26, 100, 29, 107, FLOOR);
    g.open(26, 100, 29, 101, SEAM);
    // R1: lockers.
    g.open(14, 84, 41, 99, FLOOR);
    g.open(26, 78, 28, 83, SEAM);
    // R2: the box.
    g.open(10, 60, 45, 77, FLOOR);
    g.open(12, 54, 14, 59, SEAM);
    // R3: knocking. A solid block in the middle makes a ring.
    g.open(8, 36, 31, 53, FLOOR);
    g.open(18, 30, 20, 35, SEAM);
    // R4: hold-up hall.
    g.open(6, 14, 40, 29, FLOOR);
    g.open(41, 20, 43, 22, SEAM);
    // R5: the snow yard (a wireframe harbour).
    g.open(44, 6, 75, 44, SNOW);

    lowerRoomWalls(g);

    // Room furniture made of the grid itself.
    g.block(16, 41, 23, 47, WALL);                        // R3 central block
    for (const x of [14, 20, 26, 32]) {                    // R4 pillars
      g.block(x, 17, x, 17, WALL);
      g.block(x, 26, x, 26, WALL);
    }
    g.block(17, 70, 18, 70, LOW);                          // R2 low cover
    g.block(31, 64, 33, 64, LOW);
    g.block(38, 71, 38, 72, LOW);
    g.block(24, 88, 25, 89, LOW);                          // R1 low cover
    g.block(31, 92, 32, 93, LOW);
    g.block(9, 20, 10, 21, LOW);                           // R4 low cover
    g.block(36, 26, 37, 27, LOW);

    // R5: wireframe containers (one stacked two high).
    g.block(50, 7, 52, 18, CONTAINER);
    g.block(54, 27, 65, 29, { ...CONTAINER, h: 5.2 });
    g.block(68, 10, 70, 21, CONTAINER);
    g.block(52, 39, 63, 41, CONTAINER);

    // Wireframe landmarks on the skyline.
    g.block(60, 50, 65, 55, { ...WALL, h: 44 });           // "Karlatornet"
    g.block(0, 60, 5, 71, { ...WALL, h: 24 });
    g.block(48, 84, 59, 89, { ...WALL, h: 20 });
  },

  entities: [
    // ---- markers / checkpoints ---------------------------------------------------
    { type: 'marker', id: 'cp_start', x: 27.5, z: 110.5, yaw: 0 },
    { type: 'marker', id: 'cp_locker', x: 27.5, z: 101, yaw: 0 },
    { type: 'marker', id: 'cp_box', x: 27.5, z: 78.8, yaw: 0 },
    { type: 'marker', id: 'cp_knock', x: 13.5, z: 55.5, yaw: 0 },
    { type: 'marker', id: 'cp_hold', x: 19.5, z: 31.5, yaw: 0 },
    { type: 'marker', id: 'cp_snow', x: 45.5, z: 21.5, yaw: -PI / 2, camYaw: -PI / 2 },

    // ---- R0: wake-up chamber -----------------------------------------------------
    { type: 'prop', model: 'lab_pod', x: 23.2, z: 115.5, rot: PI / 2, tint: HOLO_PROP },
    { type: 'prop', model: 'lab_pod', x: 31.8, z: 115.5, rot: -PI / 2, tint: HOLO_PROP },
    { type: 'prop', model: 'holo_projector', x: 27.5, z: 117.4, collide: false },
    { type: 'prop', model: 'terminal', x: 33.4, z: 110, rot: -PI / 2, tint: HOLO_PROP, light: false },
    { type: 'prop', model: 'office_chair', x: 32.4, z: 110.3, rot: PI / 2, tint: HOLO_PROP },
    { type: 'decal', tex: 'neon_sim', x: 23.3, y: 2.6, z: 108.03, w: 3.6, h: 0.9, lit: false },
    { type: 'decal', tex: 'poster_lugnet', x: 32.2, y: 1.8, z: 108.03, w: 1.1, h: 2.2 },
    { type: 'light', x: 27.5, y: 3.2, z: 112, color: 0x50d8ff, range: 11, intensity: 1.1 },

    // ---- R1: lockers -------------------------------------------------------------
    { type: 'trigger', id: 'r_locker', rect: [14, 94, 41, 99], checkpoint: 'cp_locker' },
    { type: 'locker', x: 14.35, z: 90, rot: PI / 2 },
    { type: 'locker', x: 14.35, z: 92, rot: PI / 2 },
    { type: 'locker', x: 14.35, z: 94, rot: PI / 2 },
    { type: 'locker', x: 41.65, z: 91, rot: -PI / 2 },
    { type: 'locker', x: 41.65, z: 96, rot: -PI / 2 },
    { type: 'path', id: 'p_locker', points: [[19, 87, 3], [36, 87, 2.5], [36, 91, 2], [19, 91, 3]] },
    { type: 'guard', id: 'g_locker', x: 19, z: 87, rot: PI / 2, path: 'p_locker', tint: HOLO },
    { type: 'trigger', id: 'hint_locker', rect: [25, 82, 30, 85], repeat: true },
    { type: 'door', id: 'd1', x: 27.5, z: 80.5, rot: 0, locked: true },
    { type: 'prop', model: 'bench', x: 36, z: 98.5, rot: PI, tint: HOLO_PROP },
    { type: 'prop', model: 'lamp_post', x: 21, z: 97.5, tint: HOLO_PROP, light: false },
    { type: 'decal', tex: 'poster_minnes', x: 20, y: 1.8, z: 84.03, w: 1.1, h: 2.2, rot: 0 },
    { type: 'light', x: 16.5, y: 3, z: 92, color: 0x40c8ff, range: 9, intensity: 1.0 },
    { type: 'light', x: 36, y: 3.2, z: 88, color: 0x3080ff, range: 10, intensity: 0.9 },

    // ---- R2: the box -------------------------------------------------------------
    { type: 'trigger', id: 'r_box', rect: [26, 76, 28, 79], checkpoint: 'cp_box' },
    { type: 'pickup', kind: 'item', item: 'box', x: 27.5, z: 75.5, label: 'Kartong (B)' },
    { type: 'path', id: 'p_box1', points: [[14, 66, 3], [41, 66, 3.5]] },
    { type: 'path', id: 'p_box2', points: [[22, 62, 3], [22, 73, 3.5]] },
    { type: 'guard', id: 'g_box1', x: 41, z: 66, rot: -PI / 2, path: 'p_box1', tint: HOLO },
    { type: 'guard', id: 'g_box2', x: 22, z: 70, rot: 0, path: 'p_box2', tint: HOLO },
    { type: 'trigger', id: 'box_done', rect: [12, 54, 14, 57] },
    { type: 'prop', model: 'hallplats', x: 42.3, z: 73.5, rot: -PI / 2, tint: HOLO_PROP },
    { type: 'prop', model: 'volvo240', x: 40.5, z: 62.5, rot: PI / 2 + 0.2, tint: HOLO_PROP },
    { type: 'prop', model: 'crate', x: 11, z: 75.8, tint: HOLO_PROP },
    { type: 'prop', model: 'crate', x: 11, z: 74.7, rot: 0.4, tint: HOLO_PROP },
    { type: 'decal', tex: 'sign_hallplats', x: 45.97, y: 2.4, z: 70, w: 1, h: 1, rot: -PI / 2 },
    { type: 'light', x: 27.5, y: 3.4, z: 70, color: 0x50e0ff, range: 13, intensity: 1.0 },
    { type: 'light', x: 13, y: 2.8, z: 60.5, color: 0xff6a3a, range: 7, intensity: 0.9 },

    // ---- R3: knocking ------------------------------------------------------------
    { type: 'trigger', id: 'r_knock', rect: [12, 54, 14, 56], checkpoint: 'cp_knock' },
    { type: 'path', id: 'p_knock', points: [[19.5, 37.4, 1.2], [19.5, 38.9, 12]] },
    { type: 'guard', id: 'g_knock', x: 19.5, z: 38.9, rot: 0, path: 'p_knock', wait: 12, tint: HOLO },
    { type: 'trigger', id: 'hint_knock', rect: [9, 42, 15, 46] },
    { type: 'locker', x: 31.65, z: 51.5, rot: -PI / 2 },
    { type: 'pickup', kind: 'tranq', x: 9.5, z: 51.5 },
    { type: 'trigger', id: 'knock_done', rect: [18, 30, 20, 33] },
    { type: 'prop', model: 'bench', x: 27.5, z: 37, rot: 0, tint: HOLO_PROP },
    { type: 'prop', model: 'crate', x: 9, z: 37, tint: HOLO_PROP },
    { type: 'prop', model: 'crate', x: 9.2, z: 38.1, rot: 0.5, tint: HOLO_PROP },
    { type: 'prop', model: 'crate', x: 9.1, z: 37.5, y: 1, rot: 0.2, tint: HOLO_PROP },
    { type: 'decal', tex: 'poster_rorelsen', x: 15.98, y: 1.8, z: 44, w: 1.1, h: 2.2, rot: -PI / 2 },
    { type: 'light', x: 12, y: 3, z: 44, color: 0x3aa8ff, range: 9, intensity: 0.8 },
    { type: 'light', x: 19.5, y: 3.2, z: 36.5, color: 0xff7040, range: 7, intensity: 0.9 },

    // ---- R4: hold-up -------------------------------------------------------------
    { type: 'trigger', id: 'r_hold', rect: [18, 30, 20, 32], checkpoint: 'cp_hold' },
    { type: 'path', id: 'p_hold', points: [[10, 22, 4], [36, 22, 5]] },
    { type: 'guard', id: 'g_hold', x: 36, z: 22, rot: PI / 2, path: 'p_hold', wait: 3, tint: HOLO },
    { type: 'trigger', id: 'hint_hold', rect: [38, 19, 40, 24], repeat: true },
    { type: 'door', id: 'd4', x: 42.5, z: 21.5, rot: PI / 2, locked: true },
    { type: 'pickup', kind: 'repair', x: 7.5, z: 15.5 },
    { type: 'prop', model: 'server_rack', x: 7, z: 27.5, rot: PI / 2, tint: HOLO_PROP },
    { type: 'prop', model: 'server_rack', x: 7, z: 26.3, rot: PI / 2, tint: HOLO_PROP },
    { type: 'prop', model: 'office_desk', x: 37.5, z: 15, rot: PI, tint: HOLO_PROP },
    { type: 'prop', model: 'office_chair', x: 37.4, z: 16.1, rot: 0.4, tint: HOLO_PROP },
    { type: 'light', x: 23, y: 3.4, z: 22, color: 0x48d0ff, range: 14, intensity: 1.0 },
    { type: 'light', x: 39, y: 3, z: 21.5, color: 0xff6a3a, range: 4.5, intensity: 0.8 },

    // ---- R5: the snow yard -------------------------------------------------------
    { type: 'trigger', id: 'r_snow', rect: [44, 19, 46, 24], checkpoint: 'cp_snow' },
    { type: 'prop', model: 'volvo240', x: 71.5, z: 35, rot: 0.3, tint: HOLO_PROP },
    { type: 'prop', model: 'bollard2', x: 47, z: 42.5, tint: HOLO_PROP },
    { type: 'prop', model: 'bollard2', x: 55, z: 43.3, tint: HOLO_PROP },
    { type: 'prop', model: 'tree_spruce', x: 73.5, z: 42.5, tint: HOLO_PROP, scale: 0.8 },
    { type: 'prop', model: 'barrel', x: 46.4, z: 40.2, tint: HOLO_PROP },
    { type: 'prop', model: 'barrel', x: 47.2, z: 40.9, tint: HOLO_PROP },
    { type: 'prop', model: 'crate', x: 66.5, z: 44.3, tint: HOLO_PROP },
    { type: 'prop', model: 'crate', x: 67.6, z: 44.2, rot: 0.3, tint: HOLO_PROP },
    { type: 'prop', model: 'lamp_post', x: 46, z: 30, tint: HOLO_PROP, light: false },
    { type: 'prop', model: 'lamp_post', x: 66.5, z: 7, tint: HOLO_PROP, light: false },
    { type: 'prop', model: 'bollard2', x: 60, z: 6.5, tint: HOLO_PROP },
    { type: 'path', id: 'p_s1', points: [[48, 24.5, 3], [71, 24.5, 2], [71, 33, 3], [48, 33, 2]] },
    { type: 'path', id: 'p_s2', points: [[56, 9, 4], [64, 9, 2], [64, 20, 4]] },
    { type: 'path', id: 'p_s3', points: [[48, 43, 3], [73, 43, 4]] },
    { type: 'guard', id: 'g_s1', x: 60, z: 33, rot: -PI / 2, path: 'p_s1', tint: HOLO },
    { type: 'guard', id: 'g_s2', x: 64, z: 12, rot: 0, path: 'p_s2', tint: HOLO },
    { type: 'guard', id: 'g_s3', x: 60, z: 43, rot: PI / 2, path: 'p_s3', tint: HOLO },
    { type: 'pickup', kind: 'battery', x: 46.5, z: 8 },
    { type: 'pickup', kind: 'tranq', x: 74.5, z: 27 },
    { type: 'trigger', id: 'hint_exit', rect: [71, 6, 75, 10], repeat: true },
    { type: 'use', id: 'exit', x: 74, z: 8, r: 2, label: 'Avsluta passet', when: (g) => !!g.flags.s2_scan },
    { type: 'prop', model: 'holo_projector', x: 74.6, z: 7, collide: false },
    { type: 'decal', tex: 'neon_sim', x: 75.98, y: 2.7, z: 8, w: 3.6, h: 0.9, rot: -PI / 2, lit: false },
    { type: 'light', x: 52, y: 4, z: 22, color: 0x40b8ff, range: 12, intensity: 0.3 },
    { type: 'light', x: 66, y: 4, z: 36, color: 0x3a90ff, range: 12, intensity: 0.3 },
    { type: 'light', x: 61, y: 4, z: 13, color: 0x40b8ff, range: 11, intensity: 0.3 },
    { type: 'light', x: 74, y: 3, z: 8, color: 0xffa050, range: 9, intensity: 1.6, tag: 's2_exit', enabled: false },
  ],

  stages: {
    sim2: {
      actors: { atta: { x: 27.5, z: 114.2, rot: PI, pose: 'lie' } },
      marks: { mark_a: [27.5, 110.5] },
      establish: { pos: [34.3, 4.2, 108.4], look: [27.5, 0.4, 114.5], fov: 55 },
    },
  },

  script: {
    onStart(g, restore) {
      this.room = ROOM_OF[restore?.checkpoint] ?? 'cp_start';
      this.resetting = false;
      this.tracksHinted = false;
      this.applyFlags(g);
      if (restore) {
        g.setObjective(this.objective(g));
        return;
      }
      g.playCutscene('sim2_intro').then(() => {
        g.radio('s2_intro', () => g.setObjective(0));
      });
    },

    objective(g) {
      const f = g.flags;
      if (f.s2_hold) return 4;
      if (f.s2_knock) return 3;
      if (f.s2_box) return 2;
      if (f.s2_locker) return 1;
      return 0;
    },

    applyFlags(g) {
      if (g.flags.s2_locker) g.door('d1') && (g.door('d1').locked = false);
      if (g.flags.s2_hold) {
        g.door('d4') && (g.door('d4').locked = false);
        this.dissolve(g, g.guard('g_hold'));
      }
      if (g.flags.s2_scan) this.revealExit(g);
    },

    trigger(g, id) {
      const f = g.flags;
      switch (id) {
        case 'r_locker': this.room = 'cp_locker'; g.radio('s2_locker'); break;
        case 'hint_locker':
          if (!f.s2_locker) g.hud.message('Dörren öppnas när du har gömt dig i ett skåp (E).', '#7fe0ff', 2.5);
          break;
        case 'r_box': this.room = 'cp_box'; g.radio('s2_box'); break;
        case 'box_done':
          if (!f.s2_box) { f.s2_box = true; g.setObjective(2); g.audio.play('ui_select', { volume: 0.6 }); }
          break;
        case 'r_knock': this.room = 'cp_knock'; g.radio('s2_knock'); break;
        case 'hint_knock':
          if (!f.s2_knock) g.hud.message('Knacka på väggen (F) och smyg runt blocket medan vakten letar.', '#7fe0ff', 3.5);
          break;
        case 'knock_done':
          if (!f.s2_knock) { f.s2_knock = true; g.setObjective(3); g.audio.play('ui_select', { volume: 0.6 }); }
          break;
        case 'r_hold': this.room = 'cp_hold'; g.radio('s2_holdup'); break;
        case 'hint_hold':
          if (!f.s2_hold) g.hud.message('Dörren öppnas när du har skakat en vakt (sikta bakifrån, E).', '#7fe0ff', 2.5);
          break;
        case 'r_snow':
          this.room = 'cp_snow';
          g.setObjective(4);
          g.radio('s2_scan', () => g.hud.message('Snö. Du lämnar spår, och vakterna följer dem.', '#7fe0ff', 4));
          break;
        case 'hint_exit':
          if (!f.s2_scan) g.hud.message('Utgången är låst. Lyssna in på en vakt (håll R).', '#7fe0ff', 2.5);
          break;
        default:
      }
    },

    update(g) {
      const f = g.flags;
      if (!f.s2_locker && g.sys.lockers.inside) {
        f.s2_locker = true;
        g.door('d1').locked = false;
        g.setObjective(1);
        g.audio.play('ui_select', { volume: 0.6 });
        g.hud.message('Godkänt. Dörren norrut är öppen.', '#7fe0ff', 3);
      }
      const hold = g.guard('g_hold');
      if (!f.s2_hold && hold?.shaken) {
        f.s2_hold = true;
        g.door('d4').locked = false;
        g.setObjective(4);
        g.later(1.3, () => this.dissolve(g, hold));
      }
      if (!this.tracksHinted && this.room === 'cp_snow' && g.guards.some((x) => x.state === 'tracks')) {
        this.tracksHinted = true;
        g.hud.message('Vakten följer dina spår.', '#ffb070', 3);
      }
      // Seen: the simulation aborts the room and puts Åtta back.
      if (g.alarm.phase === PHASE.ALERT && !this.resetting) {
        this.resetting = true;
        g.later(1.0, () => this.resetRoom(g));
      }
    },

    onScan(g) {
      if (g.flags.s2_scan || this.room !== 'cp_snow') return;
      g.flags.s2_scan = true;
      this.revealExit(g);
      g.hud.message('Utgången är markerad: nordöstra hörnet.', '#ffc080', 4);
    },

    use(g, u) {
      if (u.id !== 'exit') return;
      u.done = true;
      g.glitchPulse(0.5, 0.6);
      g.radio('s2_end', () => {
        g.glitchPulse(0.9, 1.2);
        g.later(0.8, () => g.completeChapter());
      });
    },

    revealExit(g) {
      const l = g.lights.lights.find((x) => x.tag === 's2_exit');
      if (l) l.enabled = true;
    },

    /** A shaken hologram guard flickers out of the simulation. */
    dissolve(g, guard) {
      if (!guard || guard.vanished) return;
      guard.vanished = true;
      g.glitchPulse(0.35, 0.3);
      guard.knockOut();
      guard.knockT = 1e9;
      guard.hiddenBody = true;
      guard.found = true;
      guard.obj.visible = false;
      guard.pos.set(guard.def.x, -40, guard.def.z);
      if (guard.cone) guard.cone.visible = false;
      if (guard.shadow) guard.shadow.visible = false;
    },

    resetRoom(g) {
      this.resetting = false;
      if (g.player.dead || g.alarm.phase === PHASE.NORMAL) return;
      g.glitchPulse(0.8, 0.7);
      g.hud.message('UPPTÄCKT. SIMULERINGEN ÅTERSTÄLLER RUMMET.', '#ff6a50', 3);
      const cb = g.alarm.onPhase;
      g.alarm.reset();
      g.alarm.onPhase = cb;
      g.onAlarmPhase(PHASE.NORMAL);
      if (g.sys.lockers.inside) g.sys.lockers.exit(g);
      if (g.player.carrying) { g.player.carrying.carried = false; g.player.carrying = null; }
      g.sys.box.off(g, true);
      for (const gd of g.guards) {
        if (gd.vanished || gd.state === 'dead') continue;
        const y = Math.max(0, g.world.grid.floorAt(gd.def.x, gd.def.z));
        gd.pos.set(gd.def.x, y, gd.def.z);
        gd.yaw = gd.def.rot ?? 0;
        gd.state = 'patrol';
        gd.awareness = 0;
        gd.route = null;
        gd.investigate = null;
        gd.lockerTarget = null;
        gd.seesPlayer = false;
        gd.pathIndex = 0;
        gd.wait = gd.def.wait ?? 0;
        gd.iconT = 0;
        gd.hp = 100;
        gd.drugged = false;
        gd.found = false;
        gd.hiddenBody = false;
        gd.carried = false;
        gd.obj.visible = true;
      }
      g.footprints?.clear();
      const m = g.marker(this.room) ?? g.marker('cp_start');
      g.player.spawn(m.x, Math.max(0, g.world.grid.floorAt(m.x, m.z)), m.z, m.yaw ?? 0);
      g.cam.snap(g.player.pos, m.camYaw ?? m.yaw ?? 0);
    },
  },
};
