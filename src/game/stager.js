import * as THREE from 'three';
import { sharedUniforms } from '../engine/material.js';
import { instantiateModel, getTexture, loadTexture } from '../engine/assets.js';
import { drawText } from '../engine/bitmapFont.js';
import { ART } from '../story/comics.js';
import { SHOTS, SCENE_LEVEL, SCENE_DEFAULT } from '../story/art.js';
import { LEVELS } from '../levels/index.js';
import { buildWorld } from './world.js';
import { LightManager } from './lights.js';
import { Humanoid } from './humanoid.js';
import { PORTRAIT_TEX } from './ui.js';

const portraitTex = (who) => PORTRAIT_TEX[who] ?? `portrait_${who}`;

// Renders comic panels: stages a scene (a level world + posed actors + camera
// + lights) and captures a PS1 still. Worlds are built once and cached.

const POSES = {
  stand: {}, walk: { speed: 1.5 }, run: { speed: 5 }, crouch: { crouch: 1 }, aim: { aim: 1 },
  sit: { sit: 1 }, talk: { talk: 1 }, reach: { reach: 1 }, carry: { carry: 1 }, choke: { choke: 1 },
  hurt: { hurt: 1 }, lie: {}, fall: {}, kneel: { crouch: 1 },
};

export class Stager {
  constructor(game) {
    this.game = game;
    this.worlds = new Map();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 160);
  }

  async render(artId, w, h) {
    try {
      if (!artId || artId === 'black') return solid(w, h, '#050505');
      if (artId.startsWith('portrait:')) {
        // Wait for the texture, or its first panel shows only the name.
        await loadTexture(portraitTex(artId.slice(9)));
        return portrait(artId.slice(9), w, h);
      }
      const art = ART[artId];
      const spec = SHOTS[artId] ?? SCENE_DEFAULT[art?.scene] ?? null;
      if (!spec) return solid(w, h, '#0c0e10');
      return await this.stage(spec, w, h);
    } catch (err) {
      console.warn('[stager] failed', artId, err);
      return solid(w, h, '#0c0e10');
    }
  }

  async world(levelId) {
    if (this.worlds.has(levelId)) return this.worlds.get(levelId);
    const lights = new LightManager();
    const w = await buildWorld(LEVELS[levelId], lights);
    const entry = { world: w, lights };
    this.worlds.set(levelId, entry);
    return entry;
  }

  async stage(spec, w, h) {
    const levelId = spec.level ?? SCENE_LEVEL[spec.scene];
    const { world, lights } = await this.world(levelId);
    const def = LEVELS[levelId];
    const scene = this.scene;
    scene.clear();
    scene.add(world.root);
    const actors = [];
    for (const a of spec.actors ?? []) actors.push(await this.actor(a, world, scene));
    for (const p of spec.props ?? []) {
      const obj = await instantiateModel(p.model, { unique: true });
      obj.position.set(p.x, p.y ?? 0, p.z);
      obj.rotation.set(p.rx ?? 0, p.rot ?? 0, p.rz ?? 0, 'YXZ');
      if (p.scale) obj.scale.setScalar(p.scale);
      scene.add(obj);
    }
    // Atmosphere (incl. the level's PS2 look: snow cover, grade, exposure)
    const at = { ...def, ...spec.atmo };
    this.game.applyLook?.(at);
    sharedUniforms.uAmbient.value.setRGB(...(at.ambient ?? [0.1, 0.1, 0.12]));
    sharedUniforms.uSkyColor.value.setRGB(...(at.sky ?? [0, 0, 0]));
    sharedUniforms.uFogColor.value.setRGB(...(at.fogColor ?? [0.1, 0.1, 0.12]));
    sharedUniforms.uFogNear.value = at.fog?.[0] ?? 12;
    sharedUniforms.uFogFar.value = at.fog?.[1] ?? 60;
    sharedUniforms.uCutTarget.value.set(0, 9999, 0);
    sharedUniforms.uThermal.value = 0;
    const extra = (spec.lights ?? []).map((l) => lights.add({ ...l, pos: new THREE.Vector3(...l.pos) }));
    const cam = this.camera;
    cam.fov = spec.cam.fov ?? 50;
    cam.position.set(...spec.cam.pos);
    cam.lookAt(new THREE.Vector3(...spec.cam.look));
    cam.updateMatrixWorld();
    if (spec.spot) {
      sharedUniforms.uSpotPos.value.set(...spec.spot.pos);
      sharedUniforms.uSpotDir.value.set(...spec.spot.dir).normalize();
      sharedUniforms.uSpotColor.value.setRGB(...(spec.spot.color ?? [1.4, 1.35, 1.2]));
    } else sharedUniforms.uSpotColor.value.setRGB(0, 0, 0);
    // Optional set dressing built by the spec (geometry levels create in their
    // scripts, which never run here); it may return a cleanup function.
    const set = new THREE.Group();
    scene.add(set);
    const undo = spec.build ? await spec.build(set, { world, camera: cam, lights }) : null;
    lights.update(0, cam.position);
    const img = this.game.gfx.renderStill(scene, cam, w, h);
    undo?.();
    scene.remove(set);
    for (const l of extra) lights.remove(l);
    for (const a of actors) scene.remove(a);
    scene.remove(world.root);
    if (this.game.level) this.game.applyLook?.(this.game.level);
    return img;
  }

  async actor(a, world, scene) {
    const obj = await instantiateModel(a.model, { unique: true });
    if (a.scale) obj.scale.setScalar(a.scale);
    const y = a.y ?? Math.max(0, world.grid.floorAt(a.x, a.z));
    obj.position.set(a.x, y, a.z);
    const rig = new Humanoid(obj);
    const pose = { ...(POSES[a.pose] ?? {}), ...(a.state ?? {}) };
    for (let i = 0; i < 12; i++) rig.update(0.1, pose);
    if (a.pose === 'lie') { obj.rotation.set(-Math.PI / 2, a.rot ?? 0, 0, 'YXZ'); obj.position.y += 0.2; }
    else if (a.pose === 'fall') obj.rotation.set(a.rx ?? -1.2, a.rot ?? 0, a.rz ?? 0.4, 'YXZ');
    else obj.rotation.set(a.rx ?? 0, a.rot ?? 0, 0, 'YXZ');
    if (a.holo) {
      obj.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        m.transparent = true;
        m.depthWrite = false;
        m.blending = THREE.AdditiveBlending;
        m.uniforms.uLit.value = 0;
        m.uniforms.uColor.value.setRGB(0.35, 0.85, 1.0);
        m.uniforms.uOpacity.value = 0.75;
        m.uniforms.uAlphaTest.value = 0.01;
      });
    }
    if (a.tint) obj.traverse((o) => { if (o.isMesh) o.material.uniforms.uTint.value.setRGB(...a.tint); });
    scene.add(obj);
    return obj;
  }
}

function solid(w, h, color) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  return c;
}

function portrait(who, w, h) {
  const c = solid(w, h, '#031a14');
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const tex = getTexture(portraitTex(who)) ?? null;
  if (!tex) loadTexture(portraitTex(who));
  const img = tex?.image;
  if (img && img.width > 8) {
    const s = Math.min(w, h) * 0.95;
    g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s);
  } else drawText(g, who.toUpperCase(), w / 2, h / 2 - 4, '#60e0c0', { align: 'center' });
  for (let y = 0; y < h; y += 2) { g.fillStyle = 'rgba(0,30,20,0.25)'; g.fillRect(0, y, w, 1); }
  return c;
}
