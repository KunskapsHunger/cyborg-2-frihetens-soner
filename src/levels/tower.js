// V. KARLATORNET — the Big Shell chapter (Åtta).
//
// The skyscraper is laid out as three floors side by side, each one a storey
// higher than the last, joined by real concrete stairwells (trapphus):
//
//   LOBBY (y 0)      x 3–46    service wing, marble atrium, julgran, turnstiles,
//                              reception, dead elevators, glass facade on the river
//   TRAPPHUS A       x 47–61   stairs up 3.6 m
//   KONTORSPLANET    x 62–105  open office, corridor, conference room (hostages),
//                    (y 3.6)   pantry, corner office
//   TRAPPHUS B       x 106–119 stairs up 3.6 m (locked until the hostages are found)
//   TEKNIKPLANET     x 120–152 HVAC, Arkivet's server racks, the Minnesläsaren
//                    (y 7.2)   arena and the elevator to the roof
//
// Flow: tower_lobby → to_start → spray (to_bombs) → freeze 4 charges (2 lobby,
// 2 office; to_bomb_1..4) → to_bomb_last → conference room opens → tower_hostages
// → stairwell B opens → to_reader → arena: tower_reader + READER monologue →
// boss (to_reader_ports after a few dodges) → tower_reader_down → to_reader_down
// → to_elevator (radio.js order: before the meeting) → tower_elevator → roof.

import { READER } from '../story/lines.js';
import { readerMonologue } from '../game/bosses/reader.js';

import { PI, F0, F1, F2, H_LOBBY, H_OFFICE, H_TECH, FACADE_Z, box, marker, npc, hide, TOWER_ENTITIES } from './towerParts.js';
// ---------------------------------------------------------------- stages

const STAGE = {
  tower_lobby: {
    actors: {
      atta: { x: 14.6, z: 39.6, rot: 2.75 },
      guard1: { x: 33.6, z: 30.2, rot: PI / 2 },
      guard2: { x: 36.2, z: 30.6, rot: -PI / 2 },
      police1: { x: 27.6, z: 8.4, rot: PI / 2, pose: 'dead' },
    },
    marks: { mark_a: [15.6, 35.8] },
    establish: { pos: [45.2, 8.5, 43.8], look: [27, 1.2, 19], fov: 55 },
  },
  tower_hostages: {
    actors: {
      atta: { x: 86.5, z: 30.4, rot: 0 },
      guard1: { x: 85.2, z: 31.8, rot: PI },
      elsa: { x: 88.8, z: 34.6, rot: -2.6 },
      hostage1: { x: 84.2, z: 39.1, rot: PI, pose: 'sit' },
      hostage2: { x: 87.6, z: 39.1, rot: PI, pose: 'sit' },
      hostage3: { x: 82.1, z: 37.0, rot: PI / 2, pose: 'sit' },
    },
    marks: { mark_a: [87.6, 32.3], mark_b: [86.5, 28.7] },
    props: { crown: [87.6, F1 + 1.32, 32.3] },
    establish: { pos: [78.4, F1 + 4.6, 43.4], look: [86.5, F1 + 0.8, 33], fov: 52 },
  },
  tower_tech: {
    actors: {
      atta: { x: 134, z: 30.6, rot: 0 },
      reader: { x: 134, z: 35.2, rot: PI },
    },
    establish: { pos: [137.2, F2 + 6, 43.5], look: [134, F2 + 1, 32], fov: 55 },
  },
  tower_elevator: {
    actors: {
      atta: { x: 142.8, z: 36.1, rot: 1.7 },
      henrik: { x: 146.4, z: 35.3, rot: -1.7 },
    },
    marks: { mark_a: [146.4, 32.7], mark_b: [150.2, 34.0] },
    establish: { pos: [139.8, F2 + 2.6, 31.5], look: [148, F2 + 1.3, 34.4], fov: 50 },
  },
};

// Locked doors on raised floors need their own blocker (the door's collision
// box is authored at y 0..3). [x0, z0, x1, z1, floor]
const BLOCKERS = {
  conf_door: [85, 26.7, 88, 27.3, F1],
  stairB_low: [105.7, 6, 106.3, 9, F1],
  arena_door: [134, 22.7, 137, 23.3, F2],
  elev_door: [146.7, 32, 147.3, 36, F2],
};

const DUP_HOSTAGES = ['h_elsa', 'h_1', 'h_2', 'h_3', 'conf_guard'];
const floorOf = (x) => (x < 47 ? 'lobby' : x < 62 ? 'stairA' : x < 106 ? 'office' : x < 120 ? 'stairB' : 'tech');
const REINFORCE = { lobby: 'reinforce_lobby', stairA: 'reinforce_lobby', office: 'reinforce_office', stairB: 'reinforce_office', tech: 'reinforce_tech' };

/**
 * Blocking notes for a running cutscene: `cues[beat](actor)` runs as soon as
 * that beat starts (timers also tick during cutscenes). The camera frames
 * close-ups at standing head height, so seated/lying speakers get stood up here.
 */
function direct(g, id, cues) {
  let started = false;
  let next = 0;
  const beats = Object.keys(cues).map(Number).sort((a, b) => a - b);
  const poll = (tries) => {
    const a = g.cutscene.active;
    if (a && a.id === id) {
      started = true;
      const actor = (n) => a.actors.get(n) ?? null;
      while (next < beats.length && beats[next] <= a.beat) cues[beats[next++]](actor);
    } else if (started || tries <= 0) return;
    // > max frame dt (0.05): a timer re-armed from a timer must not fire in the same frame.
    if (next < beats.length) g.later(0.1, () => poll(tries - 1));
  };
  poll(150);
}

// ---------------------------------------------------------------- level

export default {
  id: 'tower',
  title: 'KARLATORNET',
  subtitle: 'Luciadagen, kväll',
  player: 'atta',
  mode: 'mission',
  size: [156, 60],
  spawn: { x: 5.5, z: 41.5, yaw: PI / 2, camYaw: -PI / 2 },
  loadout: { tranq: 12, pistol: 0, repair: 1, items: ['box'] },
  guardModel: 'sons_guard', guardWeapon: 'rifle2', barks: 'sons',
  ambient: [0.17, 0.19, 0.24],
  sky: [0.07, 0.09, 0.13],
  ground: [0.06, 0.07, 0.09],
  fogColor: [0.1, 0.12, 0.16],
  fog: [26, 90],
  ambientLight: 0.28,
  snow: 0,
  snowfall: false,
  grade: { lift: [0.0, 0.006, 0.02], gamma: [1, 1, 0.98], gain: [1.02, 1.0, 1.06], saturation: 0.86 },
  bloom: 0.42, exposure: 1.25, frost: 0.05, grain: 0.025,
  music: 'music_tower', ambience: 'amb_tower', ambienceVolume: 0.55,
  sounds: [
    { name: 'hum_broken', x: 27.5, y: 2, z: 6.8, volume: 0.5, ref: 3, max: 18 },
    { name: 'holo_hum', x: 143, y: F2 + 1.5, z: 14, volume: 0.5, ref: 3, max: 16 },
    { name: 'holo_hum', x: 134, y: F2 + 1, z: 34, volume: 0.45, ref: 3, max: 18 },
  ],
  codec: ['kall', 'linnea'], codecKey: 'tower',
  saveContact: 'linnea',

  build(g) {
    const marble = { h: H_LOBBY, wt: 'lobby_marble', rt: 'roof_tar', wu: 4, wv: 4 };
    const concrete = (h) => ({ h, wt: 'concrete_raw', rt: 'roof_tar', wu: 4, wv: 4 });
    const officeWall = { h: H_OFFICE, wt: 'office_wall', rt: 'roof_tar', wu: 3, wv: 4 };
    const serviceWall = { h: 4.2, wt: 'office_wall', rt: 'roof_tar', wu: 3, wv: 4.2 };
    const shed = { h: 4.2, wt: 'metal_corrugated', rt: 'roof_tar', wu: 2, wv: 2 };
    const glass = (h) => ({ h, wt: 'tower_glass', rt: 'elevator_steel', wu: 8, wv: 8 });
    const lobby = { floor: F0, ft: 'lobby_marble', et: 'lobby_marble', floorScale: 4, indoor: true };
    const service = { floor: F0, ft: 'concrete_raw', et: 'concrete_raw', floorScale: 4, indoor: true };
    const carpet = { floor: F1, ft: 'office_carpet', et: 'office_wall', floorScale: 2, indoor: true };
    const tech = { floor: F2, ft: 'concrete_raw', et: 'concrete_raw', floorScale: 4, indoor: true };

    // Building mass per section (walls take their section's material).
    g.block(0, 0, 11, 44, serviceWall);
    g.block(0, 35, 2, 44, shed);
    g.block(3, 44, 11, 44, shed);
    g.block(7, 35, 11, 35, shed);
    g.block(11, 36, 11, 43, shed);
    g.block(12, 0, 46, 44, marble);
    g.block(47, 0, 61, 44, concrete(H_OFFICE));
    g.block(62, 0, 105, 44, officeWall);
    g.block(106, 0, 119, 44, concrete(H_TECH));
    g.block(120, 0, 155, 44, concrete(H_TECH));
    // South facade: low glass sills where the floors look out over the river.
    g.block(0, FACADE_Z, 12, FACADE_Z, glass(H_LOBBY));
    g.block(13, FACADE_Z, 46, FACADE_Z, glass(F0 + 0.3));
    g.block(47, FACADE_Z, 61, FACADE_Z, glass(H_OFFICE));
    g.block(62, FACADE_Z, 105, FACADE_Z, glass(F1 + 0.3));
    g.block(106, FACADE_Z, 119, FACADE_Z, glass(H_TECH));
    g.block(120, FACADE_Z, 152, FACADE_Z, glass(F2 + 0.3));
    g.block(153, FACADE_Z, 155, FACADE_Z, glass(H_TECH));

    // --- LOBBY (y 0)
    g.open(3, 3, 10, 9, { ...service, ft: 'office_carpet', floorScale: 2 }); // vaktrum
    g.open(3, 10, 6, 35, service); // service corridor
    g.open(8, 13, 10, 23, { ...service, ft: 'tile_lab', floorScale: 2 }); // staff lockers
    g.open(7, 17, 7, 18, service);
    g.open(7, 26, 12, 28, service); // passage to the atrium
    g.open(3, 36, 10, 43, service); // loading dock
    g.open(11, 38, 12, 40, service); // dock door
    g.open(13, 10, 46, 44, lobby); // atrium
    g.open(20, 6, 34, 9, lobby); // elevator bank
    g.open(40, 6, 46, 9, lobby); // stairwell vestibule

    // --- TRAPPHUS A (0 → 3.6)
    g.open(47, 6, 49, 8, service);
    for (let x = 50; x <= 57; x++) g.open(x, 6, x, 8, { ...service, floor: 0.4 * (x - 49) });
    g.open(58, 6, 61, 8, { ...service, floor: F1 });

    // --- KONTORSPLANET (y 3.6)
    g.open(62, 6, 90, 20, carpet); // open office
    g.open(64, 21, 66, 21, carpet);
    g.open(78, 21, 80, 21, carpet);
    g.open(91, 14, 91, 16, carpet);
    g.open(92, 6, 105, 20, { ...carpet, ft: 'tile_lab' }); // pantry and copy room
    g.open(100, 21, 102, 21, carpet);
    g.open(62, 22, 105, 25, carpet); // corridor
    g.open(66, 26, 68, 26, carpet);
    g.open(62, 27, 74, 44, carpet); // south-west office
    g.open(85, 26, 87, 27, carpet); // conference door
    g.open(77, 28, 95, 44, { ...carpet, ft: 'wood_floor', floorScale: 1.6 }); // conference room
    g.open(101, 26, 103, 26, carpet);
    g.open(99, 27, 105, 44, { ...carpet, ft: 'wood_floor', floorScale: 1.6 }); // corner office

    // --- TRAPPHUS B (3.6 → 7.2)
    g.open(106, 6, 108, 8, { ...tech, floor: F1 });
    for (let x = 109; x <= 116; x++) g.open(x, 6, x, 8, { ...tech, floor: F1 + 0.4 * (x - 108) });
    g.open(117, 6, 119, 8, tech);

    // --- TEKNIKPLANET (y 7.2)
    g.open(120, 6, 152, 21, tech); // HVAC and server hall
    g.open(134, 22, 136, 23, tech); // arena door
    g.open(122, 24, 146, 44, { ...tech, ft: 'floor_lab', floorScale: 2 }); // Arkivet (arena)
    g.open(147, 32, 150, 35, { ...tech, ft: 'elevator_steel', floorScale: 2 }); // elevator recess

    // --- Outside: snowy quay and the frozen river
    g.open(0, 46, 155, 50, { floor: 0, ft: 'snow_fresh', et: 'concrete_raw', floorScale: 4 });
    g.open(0, 51, 155, 59, { floor: -0.8, ft: 'ice_river', et: 'concrete_raw', floorScale: 6 });
  },

  entities: TOWER_ENTITIES,

  stages: STAGE,

  // ================================================================ SCRIPT
  script: {
    onStart(g, restore) {
      this.st = { busy: false, fight: null, monologue: null, floor: null, hits: 0, ports: false, fade: 0, carDoors: 0, said: {}, blockers: {} };
      const boss = g.bosses[0];
      if (boss) boss.obj.visible = false;
      for (const id of ['conf_guard', 'henrik_elev', 'reader_body']) g.npc(id)?.setHidden(true);
      this.applyLocks(g);
      if (restore) { this.restoreState(g); return; }
      this.scene(g, 'tower_lobby', { hide: ['police_body'], look: [['guard1', 'guard2'], ['guard2', 'guard1']] }).then(() => {
        const [x, z] = STAGE.tower_lobby.marks.mark_a;
        g.player.spawn(x, F0, z, 2.2);
        g.cam.snap(g.player.pos, 2.2 + PI);
        g.radio('to_start', () => g.setObjective(0));
      });
    },

    // --- helpers -----------------------------------------------------------
    /** Play a cutscene with its gameplay doubles hidden and actors facing each other. */
    scene(g, id, { hide: hidden = [], look = [], cues = {} } = {}) {
      this.setDoubles(g, true, hidden);
      const facing = (actor) => {
        for (const [a, b] of look) { const A = actor(a), B = actor(b); if (A && B) A.lookAt = B.pos; }
      };
      direct(g, id, { ...cues, 0: (actor) => { facing(actor); cues[0]?.(actor); } });
      return g.playCutscene(id).then(() => this.setDoubles(g, false, hidden));
    },

    setDoubles(g, hidden, npcs) {
      // Remember who was visible (bodies stashed in lockers stay hidden).
      if (hidden) this.st.shown = new Set(g.guards.filter((gd) => gd.obj.visible));
      for (const gd of g.guards) {
        gd.obj.visible = !hidden && (this.st.shown?.has(gd) ?? true);
        if (gd.cone) gd.cone.visible = false;
      }
      for (const c of g.cameras) if (c.cone) c.cone.visible = false;
      for (const id of npcs) g.npc(id)?.setHidden(hidden);
    },

    lock(g, id, locked) {
      const d = g.door(id);
      if (d) d.locked = locked;
      const b = this.st.blockers[id];
      if (locked && !b && BLOCKERS[id]) {
        const [x0, z0, x1, z1, f] = BLOCKERS[id];
        this.st.blockers[id] = g.world.grid.addBox(x0, z0, x1, z1, f, f + 3, 'door_lock');
      } else if (!locked && b) {
        g.world.grid.removeBox(b);
        delete this.st.blockers[id];
      }
    },

    applyLocks(g) {
      this.lock(g, 'conf_door', !g.flags.to_bombsDone);
      this.lock(g, 'stairB_low', !g.flags.to_hostages);
      this.lock(g, 'elev_door', !g.flags.to_elevOpen);
      this.lock(g, 'arena_door', false);
    },

    placeNpc(g, id, x, z, yaw, pose = 'idle', floor = F1) {
      const n = g.npc(id);
      if (!n) return;
      n.setHidden(false);
      n.pos.set(x, floor, z);
      n.yaw = yaw;
      n.pose = pose;
      n.lookAt = null;
    },

    objectiveFromFlags(g) {
      const f = g.flags;
      if (f.to_readerDown) return 4;
      if (f.to_hostages) return 3;
      if (f.to_bombsDone) return 2;
      return f.to_spray || g.inv.items.has('spray') ? 1 : 0;
    },

    restoreState(g) {
      const frozen = new Set(g.flags.to_frozen ?? []);
      for (const b of g.sys.bombs.list) {
        if (frozen.has(b.def.id) && !b.frozen) { b.frozen = true; g.sys.bombs.freezeLook(b); }
      }
      if (g.flags.to_hostages) this.hostagesAfter(g);
      if (g.flags.to_readerDown) this.placeNpc(g, 'reader_body', 134, 35.2, PI, 'lie', F2);
      if (g.flags.to_elevOpen) this.openElevator(g, false);
      g.setObjective(this.objectiveFromFlags(g));
    },

    // --- hooks ---------------------------------------------------------------
    pickup(g, def) {
      if (def.item !== 'spray') return;
      g.flags.to_spray = true;
      g.radio('to_bombs', () => g.setObjective(Math.max(1, this.objectiveFromFlags(g))));
    },

    bombFrozen(g, id, remaining) {
      g.flags.to_frozen = [...(g.flags.to_frozen ?? []), id];
      const n = Math.max(1, Math.min(4, 4 - remaining));
      if (remaining > 0) {
        g.say(`to_bomb_${n}`);
        g.checkpoint();
        return;
      }
      g.flags.to_bombsDone = true;
      g.checkpoint();
      g.say(`to_bomb_${n}`, () => g.radio('to_bomb_last', () => {
        this.lock(g, 'conf_door', false);
        g.setObjective(2);
        g.hud.message('Konferensrummet är upplåst.', '#c8e0b0', 4);
      }));
    },

    trigger(g, id) {
      const f = g.flags;
      switch (id) {
        case 'spray_hint':
          if (!g.inv.items.has('spray') && !this.st.said.sprayHint) {
            this.st.said.sprayHint = true;
            g.hud.message('Du har ingen frysspray. Leta i vaktrummet.', '#e0b050', 4);
          }
          break;
        case 'office_arrive':
          g.hud.message('KONTORSPLANET', '#9ab0c8', 3);
          if (!g.inv.items.has('spray')) g.hud.message('Frysspray finns i lobbyns vaktrum.', '#e0b050', 4);
          break;
        case 'conf_enter':
          if (f.to_bombsDone && !f.to_hostages) this.hostageScene(g);
          break;
        case 'hostage_1':
        case 'hostage_2':
          if (f.to_hostages && !this.st.said[id] && !this.st.busy) {
            this.st.said[id] = true;
            g.say(id === 'hostage_1' ? 'to_hostage_1' : 'to_hostage_2');
          }
          break;
        case 'tech_arrive':
          g.hud.message('TEKNIKPLANET', '#9ab0c8', 3);
          if (f.to_hostages && !f.to_readerRadio) { f.to_readerRadio = true; g.radio('to_reader'); }
          break;
        case 'arena':
          if (!f.to_readerDown && !this.st.fight) this.startReader(g);
          break;
        case 'elev_hall':
          if (f.to_readerDown && !f.to_elevOpen && !this.st.busy) {
            this.st.busy = true;
            g.radio('to_elevator', () => { this.st.busy = false; this.openElevator(g, true); });
          }
          break;
        default:
      }
    },

    use(g, u) {
      if (u.id === 'dead_elev') g.hud.message('Hissarna är avstängda. Trapphuset.', '#9ab0c8', 3);
      else if (u.id === 'conf_locked') g.hud.message('Låst inifrån. Laddningarna först.', '#e0b050', 3);
      else if (u.id === 'stairB_locked') g.hud.message('Trapphuset är låst från konferensrummets system.', '#e0b050', 3);
      else if (u.id === 'elevator' && !this.st.busy) this.finale(g, u);
    },

    // --- the hostages ------------------------------------------------------------
    hostageScene(g) {
      if (this.st.busy) return;
      this.st.busy = true;
      g.alarm.reset();
      const look = [['elsa', 'atta'], ['hostage1', 'atta'], ['hostage2', 'atta'], ['hostage3', 'atta']];
      const cues = {
        // The ledamot stands up to demand someone in charge.
        3: (actor) => { const h = actor('hostage1'); if (h) { h.pose = 'idle'; h.pos.z -= 0.45; } },
        // Elsa stays on her feet for her close-ups (and walks, not sits).
        6: (actor) => { const e = actor('elsa'); if (e) e.pose = 'idle'; },
      };
      this.scene(g, 'tower_hostages', { hide: DUP_HOSTAGES, look, cues }).then(() => {
        this.st.busy = false;
        g.flags.to_hostages = true;
        this.hostagesAfter(g);
        const [x, z] = STAGE.tower_hostages.marks.mark_b;
        g.player.spawn(x, F1, z, PI);
        g.cam.snap(g.player.pos, 0);
        g.setObjective(3);
        g.checkpoint('cp_conf');
      });
    },

    hostagesAfter(g) {
      const [ex, ez] = STAGE.tower_hostages.marks.mark_a;
      this.placeNpc(g, 'h_elsa', ex, ez, PI * 0.95);
      this.placeNpc(g, 'conf_guard', 85.2, 31.8, -PI / 2, 'lie');
      this.placeNpc(g, 'h_1', 84.2, 38.65, PI);
      for (const id of ['h_2', 'h_3']) g.npc(id)?.setHidden(false);
      this.lock(g, 'stairB_low', false);
    },

    // --- Minnesläsaren ------------------------------------------------------
    startReader(g) {
      this.st.fight = 'intro';
      this.lock(g, 'arena_door', true);
      g.alarm.reset();
      this.scene(g, 'tower_reader', { look: [['atta', 'reader'], ['reader', 'atta']] }).then(() => {
        const b = g.bosses[0];
        g.player.spawn(134, F2, 30.6, 0);
        if (!b) { this.st.fight = null; return; }
        b.pos.set(134, F2, 35.2);
        b.obj.visible = true;
        b.obj.position.set(134, F2 + 0.6, 35.2);
        b.obj.rotation.set(0, PI, 0);
        g.cinematic = { pos: [137.8, F2 + 2.3, 29.4], look: [134, F2 + 1.5, 35.2] };
        this.st.monologue = { t: 0, pulse: 1.5 };
        g.hud.say(readerMonologue(READER), () => this.beginFight(g));
      });
    },

    beginFight(g) {
      const b = g.bosses[0];
      g.cinematic = null;
      this.st.monologue = null;
      this.st.fight = 'on';
      b.teleT = 2.5;
      b.ringT = 2;
      g.boss = b;
      g.bossActive = true;
      g.audio.playMusic('music_boss_reader', 1);
      g.setObjective(3);
    },

    readerDodge(g, count) {
      const p = READER.predict ?? [];
      if (p.length && (count <= 2 || count % 4 === 0)) g.hud.say([{ who: 'reader', text: p[(count - 1) % p.length] }]);
      if (count >= 3 && !this.st.ports) {
        this.st.ports = true;
        g.later(1.4, () => g.radio('to_reader_ports'));
      }
    },

    bossPhase(g, b, phase) {
      this.st.hits += 1;
      const lines = READER.ports ?? [];
      const say = (i) => lines[i] && g.hud.say([{ who: 'reader', text: lines[i] }]);
      if (this.st.hits === 1) say(0);
      else if (phase === 2 && !this.st.said.phase2) { this.st.said.phase2 = true; say(1); }
      else if (this.st.hits === 7) say(2);
    },

    bossDown(g, b) {
      g.flags.to_readerDown = true;
      this.st.fight = 'down';
      b.obj.visible = false;
      this.placeNpc(g, 'reader_body', b.pos.x, b.pos.z, b.yaw, 'lie', F2);
      this.lock(g, 'arena_door', false);
      const down = (READER.down ?? []).map((text) => ({ who: 'reader', text }));
      g.hud.say(down, () => {
        const cues = {
          6: (actor) => { const r = actor('reader'); if (r) r.pose = 'kneel'; },
          7: (actor) => { const r = actor('reader'); if (r) r.pose = 'lie'; },
        };
        this.scene(g, 'tower_reader_down', { hide: ['reader_body'], look: [['atta', 'reader'], ['reader', 'atta']], cues }).then(() => {
          this.placeNpc(g, 'reader_body', 134, 35.2, PI, 'lie', F2);
          g.player.spawn(134, F2, 30.6, 0);
          g.radio('to_reader_down', () => {
            g.setObjective(4);
            g.checkpoint('cp_elevator');
          });
        });
      });
    },

    // --- the elevator -----------------------------------------------------------
    openElevator(g, ding) {
      g.flags.to_elevOpen = true;
      this.lock(g, 'elev_door', false);
      this.st.carDoors = 1;
      this.placeNpc(g, 'henrik_elev', 146.4, 35.3, -1.7, 'idle', F2);
      if (ding) {
        g.audio.play('elevator_ding', { pos: g.player.pos.clone().set(147, F2 + 1.5, 34), volume: 1 });
        g.hud.message('Hissen har kommit.', '#c8e0b0', 3);
      }
    },

    finale(g, u) {
      this.st.busy = true;
      u.done = true;
      this.slideCarDoors(g, 10);
      this.scene(g, 'tower_elevator', { hide: ['henrik_elev'], look: [['atta', 'henrik'], ['henrik', 'atta']] }).then(() => {
        g.flags.to_astrom = true;
        g.npc('henrik_elev')?.setHidden(true);
        this.st.fade = 0.001;
      });
    },

    update(g, dt) {
      const st = this.st;
      if (!st) return;
      // Backup squads enter on the floor the player is on.
      const floor = floorOf(g.player.pos.x);
      if (floor !== st.floor) {
        st.floor = floor;
        const m = g.marker(REINFORCE[floor]);
        if (m) g.world.spawns.markers.reinforce = m;
      }
      // Minnesläsaren reads the player: hovering, glitching, skippable.
      if (st.monologue) {
        const b = g.bosses[0];
        st.monologue.t += dt;
        b.obj.position.y = F2 + 0.6 + Math.sin(st.monologue.t * 1.7) * 0.15;
        b.rig.update(dt, { aim: 0.3, handsUp: Math.sin(st.monologue.t * 0.8) > 0.6 ? 0.4 : 0 });
        st.monologue.pulse -= dt;
        if (st.monologue.pulse <= 0) { st.monologue.pulse = 3 + Math.random() * 3; g.glitchPulse(0.22, 0.25); }
        if (g.input.anyPressed('Space', 'Enter') && st.monologue.t > 0.5) g.hud.nextSub();
      }
      // Roof elevator car doors slide open.
      if (st.carDoors > 0 && st.carDoors < 2) this.slideCarDoors(g, dt);
      // Fade out after the elevator, then the roof.
      if (st.fade > 0) {
        st.fade += dt / 1.4;
        g.gfx.postUniforms.uFade.value = Math.min(1, st.fade);
        if (st.fade >= 1.25) { st.fade = 0; g.completeChapter(); }
      }
    },

    slideCarDoors(g, dt) {
      const car = g.world.props.find((p) => p.def.id === 'roof_elevator');
      if (!car) { this.st.carDoors = 2; return; }
      const l = car.obj.getObjectByName('door_l'), r = car.obj.getObjectByName('door_r');
      this.st.carT = Math.min(1, (this.st.carT ?? 0) + dt * 0.8);
      if (l) { l.userData.bx ??= l.position.x; l.position.x = l.userData.bx - this.st.carT * 1.15; }
      if (r) { r.userData.bx ??= r.position.x; r.position.x = r.userData.bx + this.st.carT * 1.15; }
      if (this.st.carT >= 1) this.st.carDoors = 2;
    },

    onLeave(g) {
      g.gfx.postUniforms.uFade.value = 0;
      if (this.st) this.st.monologue = null;
    },
  },
};
