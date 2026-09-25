import * as THREE from 'three';
import { sharedUniforms, MAX_POINT_LIGHTS } from '../engine/material.js';

// Chooses the nearest point lights to the camera each frame and writes them
// into the shared PS1 uniforms. Lights can flicker (fires, failing bulbs).

export class LightManager {
  constructor() {
    this.lights = [];
    this.time = 0;
  }

  clear() {
    this.lights = [];
  }

  /**
   * @param {object} l  {pos:Vector3, color:Color|number, range, intensity, flicker, strobe}
   */
  add(l) {
    const light = {
      pos: l.pos.clone(),
      color: new THREE.Color(l.color ?? 0xffcc88),
      range: l.range ?? 8,
      intensity: l.intensity ?? 1,
      flicker: l.flicker ?? 0,
      strobe: l.strobe ?? 0,
      seed: Math.random() * 100,
      enabled: l.enabled ?? true,
      ttl: l.ttl ?? Infinity,
      decay: l.decay ?? 0,
      tag: l.tag ?? null,
    };
    this.lights.push(light);
    return light;
  }

  remove(light) {
    this.lights = this.lights.filter((l) => l !== light);
  }

  update(dt, camPos) {
    this.time += dt;
    const t = this.time;
    for (const l of this.lights) {
      if (l.ttl !== Infinity) {
        l.ttl -= dt;
        if (l.decay) l.intensity = Math.max(0, l.intensity - l.decay * dt);
      }
    }
    this.lights = this.lights.filter((l) => l.ttl > 0);
    const active = this.lights
      .filter((l) => l.enabled && l.intensity > 0)
      .map((l) => ({ l, d: l.pos.distanceToSquared(camPos) - l.range * l.range * 0.5 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_POINT_LIGHTS);
    const pos = sharedUniforms.uPointPos.value;
    const col = sharedUniforms.uPointColor.value;
    const range = sharedUniforms.uPointRange.value;
    for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
      const entry = active[i];
      if (!entry) {
        col[i].setRGB(0, 0, 0);
        range[i] = 1;
        pos[i].set(0, -999, 0);
        continue;
      }
      const l = entry.l;
      let k = l.intensity;
      if (l.flicker) {
        const n = Math.sin(t * 13 + l.seed) * 0.5 + Math.sin(t * 7.3 + l.seed * 2) * 0.3 + Math.sin(t * 23 + l.seed) * 0.2;
        k *= 1 - l.flicker * (0.5 + 0.5 * n) * 0.6;
      }
      if (l.strobe) {
        const on = Math.sin(t * l.strobe + l.seed) > -0.2 || Math.sin(t * 31 + l.seed) > 0.7;
        k *= on ? 1 : 0.08;
      }
      pos[i].copy(l.pos);
      col[i].copy(l.color).multiplyScalar(k);
      range[i] = l.range;
    }
  }
}
