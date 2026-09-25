import * as THREE from 'three';
import { CityGrid } from '../levels/city.js';
import { buildCityMesh } from '../levels/cityMesh.js';
import { instantiateModel, findPart, materialFor, preloadTextures } from '../engine/assets.js';

// Builds a playable world from a level definition: city grid + meshes, props
// with colliders and lights, decals and boxes. Dynamic actors (guards,
// cameras, drones, NPCs, pickups, doors, triggers) are returned as spawn lists.

const PROP_LIGHTS = {
  streetlight: { part: 'light', color: 0xffa050, range: 11, intensity: 1.3, flicker: 0.03 },
  lamp_post: { part: 'light', color: 0xffd8a0, range: 8, intensity: 1.0, flicker: 0.08 },
  terminal: { part: 'light', color: 0x40ffd0, range: 3, intensity: 0.7, flicker: 0 },
  holo_projector: { part: 'beam', color: 0x60e0ff, range: 5, intensity: 0.9, flicker: 0.3 },
};

// Large or tall props dissolve when they block the camera's view.
const CUT_PROPS = new Set(['crane', 'container', 'tram', 'pylon', 'ferris_wheel', 'coaster', 'tree_birch', 'tree_spruce', 'hallplats', 'streetlight', 'server_rack', 'lab_pod', 'locker', 'carousel', 'boat']);

export async function buildWorld(def, lights) {
  const grid = new CityGrid(def.size[0], def.size[1]);
  def.build(grid);

  const texNames = new Set();
  for (const c of grid.cells) if (c) { texNames.add(c.ft); if (c.et) texNames.add(c.et); }
  for (const b of grid.blocks.values()) { texNames.add(b.wt); texNames.add(b.rt); if (b.lower) texNames.add(b.lower); }
  for (const e of def.entities) if (e.tex) texNames.add(e.tex);
  await preloadTextures([...texNames]);

  const root = new THREE.Group();
  root.name = `world_${def.id}`;
  root.add(buildCityMesh(grid));

  const spawns = { guards: [], cameras: [], drones: [], bosses: [], npcs: [], pickups: [], triggers: [], uses: [], doors: [], paths: {}, markers: {}, extra: {} };
  const props = [];
  const tasks = [];
  for (const e of def.entities) {
    switch (e.type) {
      case 'light':
        lights.add({ pos: new THREE.Vector3(e.x, e.y ?? 3, e.z), color: e.color, range: e.range, intensity: e.intensity, flicker: e.flicker, strobe: e.strobe, tag: e.tag, enabled: e.enabled });
        break;
      case 'prop': tasks.push(placeProp(e, root, grid, lights).then((p) => props.push(p))); break;
      case 'decal': placeDecal(e, root); break;
      case 'box': placeBox(e, root, grid); break;
      case 'guard': spawns.guards.push(e); break;
      case 'camera': spawns.cameras.push(e); break;
      case 'drone': spawns.drones.push(e); break;
      case 'boss': spawns.bosses.push(e); break;
      case 'npc': spawns.npcs.push(e); break;
      case 'pickup': spawns.pickups.push(e); break;
      case 'trigger': spawns.triggers.push({ ...e, fired: false }); break;
      case 'use': spawns.uses.push({ ...e }); break;
      case 'door': spawns.doors.push(e); break;
      case 'path': spawns.paths[e.id] = e.points; break;
      case 'marker': spawns.markers[e.id] = e; break;
      // Sequel entities (lockers, bombs, stages …) are handled by game systems.
      default: (spawns.extra[e.type] ??= []).push(e);
    }
  }
  await Promise.all(tasks);
  return { def, grid, root, props, spawns };
}

async function placeProp(e, root, grid, lights) {
  const cut = e.cut ?? CUT_PROPS.has(e.model);
  const obj = await instantiateModel(e.model, { unique: !!e.unique || !!e.tint, cut, snow: e.snow !== false });
  const y = e.y ?? Math.max(0, grid.floorAt(e.x, e.z));
  obj.position.set(e.x, y, e.z);
  obj.rotation.set(e.rx ?? 0, e.rot ?? 0, e.rz ?? 0, 'YXZ');
  if (e.scale) obj.scale.setScalar(e.scale);
  if (e.tint) obj.traverse((o) => { if (o.isMesh && o.material.uniforms) o.material.uniforms.uTint.value.setRGB(...e.tint); });
  root.add(obj);
  obj.updateMatrixWorld(true);
  if (e.rx || e.rz) {
    const minY = new THREE.Box3().setFromObject(obj).min.y;
    if (minY < y) { obj.position.y += y - minY; obj.updateMatrixWorld(true); }
  }
  const prop = { def: e, obj, box: null, light: null };
  if (e.collide !== false) {
    const bb = new THREE.Box3().setFromObject(obj);
    const s = e.shrink ?? 0.05;
    prop.box = grid.addBox(bb.min.x + s, bb.min.z + s, bb.max.x - s, bb.max.z - s, bb.min.y, e.top ?? bb.max.y, e.id ?? e.model);
    prop.box.seeThrough = !!e.seeThrough;
  }
  const pl = PROP_LIGHTS[e.model];
  if (pl && e.light !== false) {
    const part = findPart(obj, pl.part);
    const pos = new THREE.Vector3();
    if (part) part.getWorldPosition(pos); else pos.set(e.x, y + 3, e.z);
    prop.light = lights.add({ pos, color: e.lightColor ?? pl.color, range: e.lightRange ?? pl.range, intensity: e.lightIntensity ?? pl.intensity, flicker: e.flicker ?? pl.flicker, tag: e.id });
  }
  return prop;
}

function placeDecal(e, root) {
  const mat = materialFor(e.tex, { lit: e.lit ?? true, side: e.double ? THREE.DoubleSide : THREE.FrontSide, ...(e.cut ? { cut: true } : {}) });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(e.w ?? 1, e.h ?? 1), mat);
  mesh.position.set(e.x, e.y ?? 2, e.z);
  mesh.rotation.set(e.rx ?? 0, e.rot ?? 0, 0, 'YXZ');
  mesh.name = `decal_${e.tex}`;
  root.add(mesh);
}

function placeBox(e, root, grid) {
  const w = e.x1 - e.x0, d = e.z1 - e.z0, h = e.y1 - e.y0;
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const n = geo.attributes.normal;
  const s = e.uvScale ?? 2;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [su, sv] = ay > 0.5 ? [w, d] : ax > 0.5 ? [d, h] : [w, h];
    uv.setXY(i, uv.getX(i) * su / s, uv.getY(i) * sv / s);
  }
  const mesh = new THREE.Mesh(geo, materialFor(e.tex ?? 'metal_plate', { cut: e.cut ?? h > 1.5, ...(e.snow === false ? {} : { snow: true }) }));
  mesh.position.set((e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2, (e.z0 + e.z1) / 2);
  root.add(mesh);
  if (e.collide !== false) {
    const box = grid.addBox(e.x0, e.z0, e.x1, e.z1, e.y0, e.y1, e.id ?? 'box');
    box.seeThrough = !!e.seeThrough;
  }
}
