// Karlatornet's geometry helpers and entity list (split out of tower.js).
// Floors: lobby y 0, office y 3.6, tech floor y 7.2 — see tower.js for the map.

export const PI = Math.PI;
export const F0 = 0;
export const F1 = 3.6;
export const F2 = 7.2;
export const H_LOBBY = 6.5;
export const H_OFFICE = F1 + 4;
export const H_TECH = F2 + 4.2;
export const FACADE_Z = 45;

// ---------------------------------------------------------------- helpers

export const prop = (model, x, z, o = {}) => ({ type: 'prop', model, x, z, ...o });
export const box = (tex, x0, x1, z0, z1, y0, y1, o = {}) => ({ type: 'box', tex, x0, x1, z0, z1, y0, y1, ...o });
export const light = (x, y, z, color, range, intensity, o = {}) => ({ type: 'light', x, y, z, color, range, intensity, ...o });
export const decal = (tex, x, y, z, w, h, rot = 0, o = {}) => ({ type: 'decal', tex, x, y, z, w, h, rot, ...o });
export const guard = (id, x, z, rot, group, o = {}) => ({ type: 'guard', id, x, z, rot, group, ...o });
export const path = (id, points) => ({ type: 'path', id, points });
export const locker = (x, z, rot) => ({ type: 'locker', x, z, rot });
export const marker = (id, x, z, yaw, camYaw = yaw + PI) => ({ type: 'marker', id, x, z, yaw, camYaw });
export const npc = (id, model, x, z, rot, o = {}) => ({ type: 'npc', id, model, x, z, rot, ...o });
export const hide = (id, rect) => ({ type: 'trigger', id, rect, hide: true });

/** Structural pillar (1×1×4 m) topped up to the wall height, with an optional C4 charge. */
export function pillar(x, z, floor, top, bomb = null) {
  const out = [prop('pillar_tower', x, z)];
  if (top > floor + 4.05) out.push(box('concrete_raw', x - 0.5, x + 0.5, z - 0.5, z + 0.5, floor + 4, top, { cut: true, collide: false }));
  if (bomb) {
    out.push({ type: 'bomb', id: bomb.id, x: x + Math.sin(bomb.rot) * 0.5, y: floor + 1.2, z: z + Math.cos(bomb.rot) * 0.5, rot: bomb.rot });
  }
  return out;
}

/** Glass curtain wall: steel mullions every 2 m on the sill plus transoms. */
export function glazing(x0, x1, floor, top, transoms) {
  const out = [];
  for (let x = x0; x <= x1 + 0.01; x += 2) {
    out.push(box('elevator_steel', x - 0.07, x + 0.07, FACADE_Z + 0.3, FACADE_Z + 0.55, floor + 0.3, top, { cut: true, collide: false }));
  }
  for (const y of transoms) {
    out.push(box('elevator_steel', x0, x1, FACADE_Z + 0.3, FACADE_Z + 0.55, floor + y - 0.12, floor + y + 0.12, { cut: true, collide: false }));
  }
  return out;
}

/** Back-to-back office desks with chairs, `n` wide, starting at x. */
export function deskIsland(x, z, n, o = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const dx = x + i * 1.65;
    out.push(prop('office_desk', dx, z, { rot: 0 }), prop('office_desk', dx, z + 0.85, { rot: PI }));
    if (!o.noChairs) {
      out.push(prop('office_chair', dx + (i % 2 ? 0.15 : -0.1), z - 0.75, { rot: PI + (i % 3) * 0.3, collide: false }));
      out.push(prop('office_chair', dx - 0.1, z + 1.65, { rot: (i % 2) * 0.5, collide: false }));
    }
  }
  out.push(box('office_wall', x - 0.8, x + (n - 1) * 1.65 + 0.8, z + 0.36, z + 0.5, F1, F1 + 1.35));
  return out;
}

/** Row of server racks along x. */
export function rackRow(x, z, n, rot) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(prop('server_rack', x + i * 0.62, z, { rot, cut: true }));
  return out;
}


export const TOWER_ENTITIES = [
    // =============================================================== LOBBY
    // Vaktrum (security office): monitors, the freeze spray.
    prop('office_desk', 8.4, 4.1, { rot: 0 }),
    prop('office_chair', 8.4, 5.1, { rot: PI, collide: false }),
    prop('terminal', 5.2, 3.35, { rot: 0 }),
    prop('tv_old', 3.6, 4.4, { rot: PI / 2 }),
    prop('tv_old', 3.6, 5.5, { rot: PI / 2 }),
    prop('office_desk', 4.0, 7.6, { rot: PI / 2, light: false }),
    locker(9.65, 8.6, PI),
    decal('poster_minnes', 10.98, 2.2, 6.5, 0.8, 1.6, -PI / 2),
    { type: 'pickup', kind: 'item', item: 'spray', label: 'Frysspray', x: 7.9, z: 4.4, y: 0.8 },
    // Service corridor
    locker(3.35, 29.6, PI / 2),
    locker(3.35, 30.25, PI / 2),
    prop('box', 5.9, 13.2, { rot: 0.3 }),
    prop('box', 5.95, 14.1, { rot: -0.2 }),
    prop('crate', 3.6, 22.6),
    decal('poster_irorelse', 6.98, 1.7, 21.5, 0.8, 1.6, -PI / 2),
    decal('graffiti_1', 3.02, 1.6, 33.2, 1.8, 0.9, PI / 2),
    // Staff locker room
    locker(10.65, 14.3, -PI / 2),
    locker(10.65, 14.95, -PI / 2),
    locker(10.65, 15.6, -PI / 2),
    locker(10.65, 16.25, -PI / 2),
    prop('bench', 8.8, 19.2, { rot: PI / 2 }),
    { type: 'pickup', kind: 'repair', x: 9.3, z: 22.4 },
    // Loading dock (spawn): crates, moving boxes, a cold sodium lamp.
    prop('crate', 3.6, 37.1), prop('crate', 4.7, 37.1), prop('crate', 3.6, 38.2),
    prop('crate', 3.6, 37.1, { y: 1.0, rot: 0.2, collide: false }),
    prop('box', 9.4, 42.6, { rot: 0.4 }), prop('box', 8.5, 43.3, { rot: -0.3 }),
    prop('box', 9.5, 42.6, { y: 0.8, rot: 0.1, collide: false }),
    prop('barrel', 9.6, 36.6), prop('barrel', 8.9, 36.5),
    { type: 'pickup', kind: 'tranq', x: 7.4, z: 36.7 },
    hide('dock_corner', [3, 39, 3, 40]),

    // Atrium: elevator bank (dead), the police officer under the red flag.
    prop('elevator', 23, 4.95, { rot: 0 }),
    prop('elevator', 27.5, 4.95, { rot: 0 }),
    prop('elevator', 32, 4.95, { rot: 0 }),
    npc('police_body', 'police', 27.6, 8.4, PI / 2, { pose: 'dead', name: 'Polis' }),
    decal('crane_red', 26.6, 0.34, 8.45, 1.5, 1.1, 0.12, { rx: -PI / 2 }),
    decal('poster_folkradet', 27.5, 4.55, 6.03, 1.6, 3.2),
    decal('poster_irorelse', 27.6, 4.2, 6.06, 1.2, 2.4),
    decal('poster_folkradet', 25.25, 1.7, 6.03, 0.9, 1.8),
    decal('graffiti_1', 25.3, 1.8, 6.06, 1.8, 0.9),
    decal('poster_folkradet', 29.75, 1.7, 6.03, 0.9, 1.8),
    { type: 'use', id: 'dead_elev', x: 27.5, z: 7.4, label: 'Tryck på hissknappen', r: 1.3 },
    // Turnstiles and low glass barriers in front of the elevators.
    ...[21.5, 23.2, 24.9, 26.6, 28.3, 30.0, 31.7, 33.4].map((x) => box('elevator_steel', x - 0.17, x + 0.17, 12.3, 13.7, F0, 1.0)),
    box('tower_glass', 13, 21.3, 12.9, 13.1, F0, 1.0),
    box('tower_glass', 33.6, 39.5, 12.9, 13.1, F0, 1.0),
    // Reception desk, with the tower's name hanging above it.
    decal('neon_karlatornet', 29.5, 3.3, 21.8, 5, 1.25, 0, { lit: false, double: true }),
    { type: 'light', x: 29.5, y: 3.2, z: 23, color: 0x80d8ff, range: 6, intensity: 0.6, flicker: 0.04 },
    box('wood_dark', 25.5, 33.5, 21.4, 22.2, F0, 1.1),
    box('wood_dark', 25.5, 26.3, 18.0, 21.4, F0, 1.1),
    box('wood_dark', 32.7, 33.5, 18.0, 21.4, F0, 1.1),
    box('lobby_marble', 25.4, 33.6, 21.3, 22.3, 1.1, 1.18),
    prop('office_desk', 29.5, 18.9, { rot: PI }),
    prop('terminal', 27.1, 19.0, { light: false }),
    prop('terminal', 31.9, 19.0, { light: false }),
    // Pillars (bomb 1 by the julgran, bomb 2 by the turnstiles).
    ...pillar(17, 17, F0, H_LOBBY, { id: 'bomb_2', rot: PI }),
    ...pillar(17, 31, F0, H_LOBBY),
    ...pillar(42, 17, F0, H_LOBBY),
    ...pillar(42, 31, F0, H_LOBBY, { id: 'bomb_1', rot: -PI / 2 }),
    // The julgran, three storeys of plastic spruce.
    prop('tree_spruce', 37.5, 37.5, { shrink: 1.75, scale: 1.05 }),
    prop('planter', 16.8, 34.1, { rot: PI / 2 }),
    prop('planter', 14.2, 43.9),
    prop('planter', 44.6, 43.9),
    prop('planter', 22, 24.2),
    prop('planter', 37, 24.2),
    prop('bench', 44.8, 23, { rot: -PI / 2 }),
    prop('terminal', 20.2, 26.2, { light: false, rot: PI / 2 }),
    // Waiting area by the glass.
    prop('sofa', 19.4, 40.6, { rot: 0 }),
    prop('sofa', 22.6, 40.6, { rot: 0 }),
    prop('table', 21, 42.4),
    // The main entrance, barricaded by Frihetens söner.
    prop('barrier', 26.8, 42.6), prop('barrier', 28.9, 42.6, { rot: 0.1 }), prop('barrier', 31.0, 42.5, { rot: -0.08 }),
    prop('crate', 27.2, 43.9), prop('crate', 32.4, 43.8, { rot: 0.3 }), prop('crate', 29.6, 43.95),
    prop('box', 33.6, 42.7, { rot: 0.5 }),
    // Folkrådet's banners, defaced.
    decal('poster_folkradet', 46.98, 4.2, 22, 2.0, 4.0, -PI / 2),
    decal('poster_irorelse', 46.96, 3.8, 21.4, 1.3, 2.6, -PI / 2),
    decal('graffiti_1', 46.95, 1.6, 26.5, 2.4, 1.2, -PI / 2),
    decal('poster_folkradet', 13.03, 2.2, 16, 1.0, 2.0, PI / 2),
    decal('poster_irorelse', 13.03, 2.1, 22.5, 1.0, 2.0, PI / 2),
    decal('poster_irorelse', 13.03, 2.1, 33.5, 1.0, 2.0, PI / 2),
    ...glazing(13, 47, F0, H_LOBBY, [3.3, 6.3]),
    // Lobby guards: singers by the tree, shield line, reception, service, vestibule.
    guard('lobby_g1', 33.6, 30.2, PI / 2, 'a', { path: 'lob_tree' }),
    path('lob_tree', [[33, 32.6, 2.5], [33, 41.6, 1], [41.8, 41.6, 2], [41.8, 34, 1.5]]),
    guard('lobby_g2', 36.2, 30.6, -PI / 2, 'a', { path: 'lob_gates', shield: true }),
    path('lob_gates', [[15, 15.4, 2], [38.5, 15.4, 3]]),
    guard('lobby_g3', 29.5, 34.2, -PI / 2, 'b', { path: 'lob_glass', shield: true }),
    path('lob_glass', [[20.5, 34.2, 2.5], [29.5, 34.2, 1.5], [29.5, 39.2, 2], [24.5, 38.8, 1]]),
    guard('lobby_desk', 29.5, 20.2, 0, 'b'),
    guard('lobby_g5', 5, 12, 0, 'c', { path: 'lob_service' }),
    path('lob_service', [[5, 11, 3], [5, 34, 1], [6.5, 40.5, 2.5], [5, 34, 1]]),
    guard('lobby_g6', 22, 10.6, PI / 2, 'c', { path: 'lob_bank' }),
    path('lob_bank', [[21, 10.6, 2], [44, 10.6, 1], [44, 7.6, 3]]),
    { type: 'camera', id: 'cam_bank', x: 34.7, y: F0 + 4.2, z: 6.3, rot: -0.7, sweep: 0.7 },
    { type: 'camera', id: 'cam_dock', x: 3.3, y: F0 + 3.4, z: 36.3, rot: PI / 4, sweep: 0.5 },
    { type: 'trigger', id: 'spray_hint', rect: [42, 6, 46, 9], repeat: true },
    marker('reinforce', 44, 7.5, PI),
    marker('reinforce_lobby', 44, 7.5, PI),
    // Lobby lights: cold glass, warm tree and desk, emergency glow at the elevators.
    light(19, 4.5, 42.5, 0x7090c8, 13, 0.95),
    light(40, 4.5, 42.5, 0x7090c8, 13, 0.95),
    light(37.5, 3.2, 37.5, 0xffb060, 9, 1.25, { flicker: 0.06 }),
    light(29.5, 2.6, 19.8, 0xffd8a0, 7, 0.9),
    light(27.5, 3.4, 9.2, 0xff6a30, 10, 1.0, { flicker: 0.22 }),
    light(7, 3, 40, 0xffa050, 8, 1.0, { flicker: 0.04 }),
    light(5, 3, 22, 0xc8d8e8, 7, 0.75, { flicker: 0.3 }),

    // =============================================================== TRAPPHUS A
    { type: 'door', id: 'stairA_low', x: 47, z: 7.5, rot: PI / 2 },
    { type: 'door', id: 'stairA_high', x: 62, z: 7.5, rot: PI / 2 },
    light(53.5, 3.8, 7.5, 0x60ff90, 7, 0.55),
    decal('poster_irorelse', 53.5, 2.9, 6.02, 0.9, 1.8),
    { type: 'trigger', id: 'office_arrive', rect: [58, 6, 61, 8], checkpoint: 'cp_office' },
    marker('cp_office', 60, 7.5, PI / 2, -PI / 2),

    // =============================================================== KONTORSPLANET
    // Reception by the stairs.
    prop('planter', 63, 11.8, { rot: PI / 2 }),
    prop('sofa', 64.2, 17.9, { rot: PI / 2 }),
    // Open office: two islands west, two east, pillars in the aisle.
    ...deskIsland(67.4, 9.6, 4),
    ...deskIsland(67.4, 15.0, 4),
    ...deskIsland(81.2, 9.6, 4),
    ...deskIsland(81.2, 15.0, 4),
    ...pillar(76.5, 12.5, F1, H_OFFICE, { id: 'bomb_3', rot: PI / 2 }),
    ...pillar(76.5, 16.8, F1, H_OFFICE),
    prop('planter', 89.2, 12.5, { rot: PI / 2 }),
    decal('poster_irorelse', 76.5, F1 + 2.1, 6.02, 1.0, 2.0),
    decal('graffiti_1', 70, F1 + 2.2, 6.03, 2.4, 1.2),
    // Pantry and copy room.
    box('office_wall', 92.1, 97.2, 6.05, 6.8, F1, F1 + 0.95),
    box('elevator_steel', 92.0, 97.3, 6.0, 6.85, F1 + 0.95, F1 + 1.0),
    prop('terminal', 96.6, 6.4, { light: false }),
    prop('table', 96.5, 12.5), prop('chair', 95.6, 12.5, { rot: PI / 2 }), prop('chair', 97.4, 12.6, { rot: -PI / 2 }),
    box('office_wall', 99.0, 99.2, 6, 11.5, F1, F1 + 1.8),
    prop('server_rack', 103.8, 6.6, { rot: 0 }),
    prop('terminal', 101.0, 6.5, { light: false }),
    locker(104.65, 15.4, -PI / 2),
    locker(104.65, 16.05, -PI / 2),
    { type: 'pickup', kind: 'tranq', x: 94.2, z: 6.45, y: 1.0 },
    { type: 'pickup', kind: 'battery', x: 101.2, z: 9.5 },
    hide('copy_corner', [104, 9, 105, 10]),
    // Corridor
    prop('planter', 71, 25.3), prop('planter', 93, 25.3),
    decal('poster_folkradet', 72.5, F1 + 1.9, 22.02, 1.0, 2.0),
    decal('graffiti_1', 72.5, F1 + 1.6, 22.04, 2.0, 1.0),
    decal('poster_irorelse', 90, F1 + 1.9, 22.02, 1.0, 2.0),
    decal('poster_irorelse', 83.4, F1 + 1.9, 25.98, 1.0, 2.0, PI),
    // South-west office (bomb 4).
    ...deskIsland(64.6, 30.2, 4, { noChairs: false }),
    ...pillar(68, 36.5, F1, H_OFFICE, { id: 'bomb_4', rot: PI }),
    prop('sofa', 72.8, 41, { rot: -PI / 2 }),
    prop('table', 71.3, 41),
    prop('planter', 63.2, 43.9),
    prop('office_desk', 64.2, 36.5, { rot: PI / 2 }),
    prop('office_chair', 65.1, 36.5, { rot: -PI / 2, collide: false }),
    locker(62.35, 39.2, PI / 2),
    locker(62.35, 39.85, PI / 2),
    hide('sw_corner', [62, 43, 62, 44]),
    // Conference room: the hostages at the long table, candles still burning.
    prop('conf_table', 86, 37),
    prop('office_chair', 84.2, 39.1, { rot: PI, collide: false }),
    prop('office_chair', 87.6, 39.1, { rot: PI, collide: false }),
    prop('office_chair', 82.1, 37.0, { rot: PI / 2, collide: false }),
    prop('office_chair', 89.9, 37.1, { rot: -PI / 2, collide: false }),
    prop('office_chair', 84.0, 35.0, { rot: 0, collide: false }),
    prop('office_chair', 86.6, 35.0, { rot: 0, collide: false }),
    prop('office_chair', 80.6, 41.4, { rot: PI * 0.8, collide: false }),
    prop('tv_old', 93.8, 37, { rot: -PI / 2 }),
    prop('planter', 94.3, 43.9),
    prop('planter', 77.8, 43.9),
    decal('poster_folkradet', 95.98, F1 + 2.0, 32.5, 1.0, 2.0, -PI / 2),
    npc('h_elsa', 'elsa_lucia', 88.8, 34.6, -2.6, { name: 'Elsa' }),
    npc('h_1', 'civilian2', 84.2, 39.1, PI, { pose: 'sit', name: 'Ledamot' }),
    npc('h_2', 'civilian2', 87.6, 39.1, PI, { pose: 'sit', name: 'Ledamot', tint: [0.8, 0.85, 1.0] }),
    npc('h_3', 'civilian2', 82.1, 37.0, PI / 2, { pose: 'sit', name: 'Gisslan', tint: [1.1, 0.95, 0.85] }),
    npc('h_tarna1', 'civilian2', 84.0, 35.0, 0, { pose: 'sit', name: 'Tärna', scale: 0.74, tint: [1.55, 1.55, 1.6] }),
    npc('h_tarna2', 'civilian2', 86.6, 35.0, 0, { pose: 'sit', name: 'Tärna', scale: 0.72, tint: [1.55, 1.55, 1.6] }),
    npc('h_4', 'civilian2', 80.6, 41.4, PI * 0.8, { pose: 'sit', name: 'Gisslan', tint: [0.9, 0.9, 0.9] }),
    npc('h_tarna3', 'civilian2', 82.2, 43.2, PI, { pose: 'crouch', name: 'Tärna', scale: 0.7, tint: [1.55, 1.55, 1.6] }),
    npc('h_tarna4', 'civilian2', 83.4, 43.4, PI * 1.1, { pose: 'crouch', name: 'Tärna', scale: 0.73, tint: [1.55, 1.55, 1.6] }),
    npc('h_tarna5', 'civilian2', 90.6, 43.3, PI * 0.9, { pose: 'crouch', name: 'Stjärngosse', scale: 0.75, tint: [1.5, 1.5, 1.55] }),
    npc('h_5', 'civilian2', 93.6, 30.2, -PI * 0.7, { pose: 'crouch', name: 'Ledamot', tint: [0.7, 0.72, 0.8] }),
    prop('table', 94.2, 40.5, { rot: PI / 2 }),
    prop('table', 94.2, 42.0, { rot: PI / 2 }),
    prop('box', 94.3, 41.2, { y: 0.8, scale: 0.5, rot: 0.3, collide: false }),
    prop('sofa', 78.1, 32, { rot: PI / 2 }),
    prop('box', 78.3, 35.2, { rot: 0.2 }),
    decal('poster_folkradet', 77.02, F1 + 2.2, 38, 1.1, 2.2, PI / 2),
    decal('graffiti_1', 77.03, F1 + 1.4, 38.6, 2.0, 1.0, PI / 2),
    npc('conf_guard', 'sons_guard', 85.2, 31.8, PI, { name: 'Vakt' }),
    { type: 'door', id: 'conf_door', x: 86.5, z: 27, rot: 0, locked: true },
    { type: 'use', id: 'conf_locked', x: 86.5, z: 25.4, label: 'Konferensrummet', r: 1.3, when: (g) => !g.flags.to_bombsDone },
    { type: 'trigger', id: 'conf_enter', rect: [84, 28, 88, 30] },
    { type: 'trigger', id: 'hostage_1', rect: [78, 33, 81, 40], repeat: true },
    { type: 'trigger', id: 'hostage_2', rect: [90, 33, 93, 41], repeat: true },
    marker('cp_conf', 86.5, 28.7, PI, 0),
    // Corner office
    prop('office_desk', 102, 38.2, { rot: PI }),
    prop('office_chair', 102, 39.2, { rot: 0, collide: false }),
    prop('sofa', 104.4, 31, { rot: -PI / 2 }),
    prop('planter', 99.8, 43.9),
    { type: 'pickup', kind: 'repair', x: 100.6, z: 43 },
    // Office glazing, guards, cameras.
    ...glazing(62, 106, F1, H_OFFICE, [3.9]),
    guard('office_g1', 64, 23.5, PI / 2, 'd', { path: 'off_corr' }),
    path('off_corr', [[63.2, 23.4, 2], [104.2, 23.4, 2.5]]),
    guard('office_g2', 70, 7.8, PI / 2, 'd', { path: 'off_north' }),
    path('off_north', [[65.7, 7.8, 2], [89.3, 7.8, 2], [89.3, 18.6, 2], [79.5, 18.6, 1], [65.7, 18.6, 2]]),
    guard('office_g3', 63.5, 28.5, PI / 2, 'e', { path: 'off_sw' }),
    path('off_sw', [[63.3, 28.4, 2], [73.3, 28.4, 1], [73.3, 38.2, 2], [66.5, 42.8, 1.5], [63.3, 40.8, 1]]),
    guard('office_door', 86.5, 23.9, PI, 'e'),
    guard('office_g5', 93.5, 17, PI / 2, 'e', { path: 'off_ne' }),
    path('off_ne', [[93.5, 17.5, 2], [103.4, 17.5, 1], [103.4, 13, 2], [93.5, 13.8, 1.5]]),
    { type: 'camera', id: 'cam_corr', x: 62.3, y: F1 + 3.1, z: 22.3, rot: PI / 2, sweep: 0.55 },
    { type: 'camera', id: 'cam_open', x: 90.7, y: F1 + 3.1, z: 6.3, rot: -PI / 4 - 0.1, sweep: 0.6 },
    marker('reinforce_office', 104.5, 23.5, -PI / 2),
    light(71, F1 + 3.1, 12.5, 0x90b0d8, 11, 0.9),
    light(84, F1 + 3, 23.6, 0xffa040, 10, 0.9, { flicker: 0.12 }),
    light(86, F1 + 1.8, 36.8, 0xffc070, 8, 1.15, { flicker: 0.16 }),
    light(68, F1 + 3.2, 42, 0x7090c8, 11, 0.85),
    light(98.5, F1 + 2.8, 10, 0xffe0b0, 7, 0.8),

    // =============================================================== TRAPPHUS B
    { type: 'door', id: 'stairB_low', x: 106, z: 7.5, rot: PI / 2, locked: true },
    { type: 'door', id: 'stairB_high', x: 120, z: 7.5, rot: PI / 2 },
    { type: 'use', id: 'stairB_locked', x: 104.6, z: 7.5, label: 'Trapphus B', r: 1.3, when: (g) => !g.flags.to_hostages },
    light(112.5, F1 + 3.8, 7.5, 0x60ff90, 7, 0.55),
    { type: 'trigger', id: 'tech_arrive', rect: [117, 6, 119, 8], checkpoint: 'cp_tech' },
    marker('cp_tech', 118.5, 7.5, PI / 2, -PI / 2),

    // =============================================================== TEKNIKPLANET
    // HVAC plant: air handlers, overhead ducts, risers.
    box('hvac_duct', 123, 126, 10, 13, F2, F2 + 2.4),
    box('hvac_duct', 123, 126, 16, 19, F2, F2 + 2.4),
    box('hvac_duct', 128.5, 131, 15.5, 19, F2, F2 + 1.3),
    box('hvac_duct', 120, 133, 14.2, 14.9, F2 + 2.9, F2 + 3.5, { collide: false, cut: true }),
    box('hvac_duct', 124.2, 124.9, 6, 10, F2 + 2.4, F2 + 3.0, { collide: false, cut: true }),
    box('hvac_duct', 131.6, 132.3, 6, 21, F2 + 3.1, F2 + 3.7, { collide: false, cut: true }),
    box('metal_plate', 127.6, 128.0, 6.1, 6.5, F2, H_TECH, { cut: true }),
    box('metal_plate', 133.6, 134.0, 6.1, 6.5, F2, H_TECH, { cut: true }),
    ...pillar(129.5, 11, F2, H_TECH),
    prop('crate', 121, 9.8), prop('crate', 121.1, 10.9, { rot: 0.2 }),
    prop('barrel', 130.4, 8.3), prop('barrel', 131.1, 8.6),
    locker(120.35, 16.4, PI / 2),
    locker(120.35, 17.05, PI / 2),
    { type: 'pickup', kind: 'pistol', x: 121.3, z: 20.4 },
    hide('hvac_corner', [127, 13, 127, 13]),
    // Arkivet's servers: racks in rows, a cyan glow.
    ...rackRow(139, 9.2, 8, 0),
    ...rackRow(139, 12.4, 8, PI),
    ...rackRow(139, 16.2, 8, 0),
    ...rackRow(145.4, 9.2, 8, 0),
    ...rackRow(145.4, 12.4, 8, PI),
    ...rackRow(145.4, 16.2, 8, 0),
    ...pillar(136.5, 13, F2, H_TECH),
    decal('neon_sim', 143.5, F2 + 3.2, 6.03, 3.2, 0.8, 0, { lit: false }),
    { type: 'pickup', kind: 'battery', x: 151.2, z: 20.4 },
    // Arena: Arkivet's reading room behind the glass.
    { type: 'door', id: 'arena_door', x: 135.5, z: 23, rot: 0 },
    ...rackRow(122.6, 24.8, 10, 0),
    ...rackRow(140.2, 24.8, 10, 0),
    ...pillar(127, 29, F2, H_TECH),
    ...pillar(141, 29, F2, H_TECH),
    ...pillar(127, 39, F2, H_TECH),
    ...pillar(141, 39, F2, H_TECH),
    prop('holo_projector', 134, 34),
    prop('lab_pod', 123.4, 30, { rot: PI / 2, cut: true }),
    prop('lab_pod', 123.4, 38, { rot: PI / 2, cut: true }),
    prop('lab_pod', 144.8, 27.4, { rot: -PI / 2, cut: true }),
    prop('lab_pod', 144.8, 40, { rot: -PI / 2, cut: true }),
    box('gun_metal', 124.2, 133.6, 33.9, 34.1, F2, F2 + 0.06, { collide: false }),
    box('gun_metal', 134.4, 144, 33.9, 34.1, F2, F2 + 0.06, { collide: false }),
    box('gun_metal', 133.9, 134.1, 25.4, 33.6, F2, F2 + 0.06, { collide: false }),
    box('gun_metal', 133.9, 134.1, 34.4, 43.6, F2, F2 + 0.06, { collide: false }),
    prop('terminal', 131, 34, { light: false, rot: PI / 2 }),
    prop('terminal', 137, 34, { light: false, rot: -PI / 2 }),
    decal('neon_sim', 128.5, F2 + 3.4, 24.02, 3.2, 0.8, 0, { lit: false }),
    decal('graffiti_1', 122.02, F2 + 1.8, 35, 2.4, 1.2, PI / 2),
    ...glazing(122, 146, F2, H_TECH, [4.0]),
    {
      type: 'boss', kind: 'reader', name: 'MINNESLÄSAREN', hidden: true,
      x: 134, z: 35.2, rot: PI, cx: 134, cz: 34, r: 11,
      spots: [[128.5, 31], [139.5, 31], [124.5, 36], [143.5, 36], [134, 41.5], [134, 29.5], [131, 37.5]],
    },
    npc('reader_body', 'reader', 134, 35.2, PI, { pose: 'lie', name: 'Minnesläsaren' }),
    { type: 'trigger', id: 'arena', rect: [132, 24, 138, 26], checkpoint: 'cp_arena' },
    marker('cp_arena', 135.5, 20.4, 0, PI),
    // The roof elevator in the arena's east wall, sealed until she is down.
    prop('elevator', 149, 34, { id: 'roof_elevator', rot: -PI / 2, scale: 1.6, collide: false, unique: true }),
    npc('henrik_elev', 'henrik2', 146.4, 35.3, -1.7, { name: 'Henrik' }),
    { type: 'trigger', id: 'elev_hall', rect: [139, 29, 146, 38], repeat: true },
    { type: 'use', id: 'elevator', x: 145.6, z: 34, label: 'Kliv in i hissen', r: 1.8, when: (g) => !!g.flags.to_elevOpen },
    marker('cp_elevator', 136, 33.5, PI / 2, -PI / 2),
    // Tech guards and camera.
    guard('tech_g1', 122, 8, PI / 2, 'f', { path: 'tech_hvac' }),
    path('tech_hvac', [[122, 8, 2], [127.5, 8, 1], [127.5, 14.6, 1.5], [133.2, 14.6, 1], [133.2, 20.5, 2], [122.5, 20.8, 1]]),
    guard('tech_g2', 137.6, 8, 0, 'f', { path: 'tech_racks' }),
    path('tech_racks', [[137.6, 7.8, 1.5], [137.6, 20.5, 1], [151.3, 20.5, 2], [151.3, 14.3, 1], [144.4, 14.3, 2], [144.4, 7.8, 1]]),
    guard('tech_post', 133.2, 21, PI / 2, 'f', { path: 'tech_door' }),
    path('tech_door', [[128, 21, 3], [141, 21, 3]]),
    { type: 'camera', id: 'cam_racks', x: 151.7, y: F2 + 3.3, z: 6.3, rot: -PI / 4 - 0.1, sweep: 0.6 },
    marker('reinforce_tech', 121.5, 7.5, PI / 2),
    light(127, F2 + 3.2, 13, 0x80a8c8, 10, 0.85),
    light(143, F2 + 2.6, 14.3, 0x40e0d0, 9, 0.95, { flicker: 0.05 }),
    light(134, F2 + 4, 33, 0x9a70ff, 14, 0.8, { flicker: 0.1 }),
    light(134, F2 + 3.2, 42.5, 0x7090c8, 12, 0.75),
    light(146, F2 + 3, 34, 0xffd090, 6, 0.8),

    // =============================================================== OUTSIDE
    prop('streetlight', 21, 48.6, { rot: PI }),
    prop('streetlight', 84, 48.6, { rot: PI }),
    prop('streetlight', 136, 48.6, { rot: PI }),
    prop('barrier', 26, 47.3), prop('barrier', 28.2, 47.3), prop('barrier', 30.4, 47.3, { rot: 0.1 }), prop('barrier', 32.6, 47.3),
    prop('volvo240', 38.5, 48.6, { rot: PI / 2 }),
    npc('police_out1', 'police', 28.6, 48.5, PI, { name: 'Polis' }),
    npc('police_out2', 'police', 33.8, 48.9, PI * 0.85, { name: 'Polis' }),
    prop('bench', 60, 49.3), prop('bench', 110, 49.3),
    light(38.5, 1.9, 48.6, 0x3050ff, 7, 1.1, { strobe: 5 }),
];
