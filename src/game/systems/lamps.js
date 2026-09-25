import * as THREE from 'three';
import { audio } from '../../engine/audio.js';

// Shootable lamps: any prop with a light (street lamps, park lamps) can be
// shot out to darken an area. Registers hit targets in game.shootables,
// which the hitscan checks next to guards and drones.

const RADIUS = 0.35;
const tmp = new THREE.Vector3();

export class Lamps {
  load(game, world) {
    this.targets = world.props
      .filter((p) => p.light && p.def.shootable !== false)
      .map((p) => ({
        prop: p,
        pos: p.light.pos.clone(),
        hitTest(origin, dir, maxDist) {
          if (!p.light.enabled) return null;
          tmp.copy(this.pos).sub(origin);
          const t = tmp.dot(dir);
          if (t < 0 || t > maxDist) return null;
          const d2 = tmp.lengthSq() - t * t;
          return d2 > RADIUS * RADIUS ? null : { dist: t - Math.sqrt(RADIUS * RADIUS - d2), part: 'lamp' };
        },
        onHit(g) {
          p.light.enabled = false;
          audio.play('glass_break', { pos: this.pos, volume: 0.9 });
          g.effects.impact(this.pos, { x: 0, y: -1, z: 0 }, 'metal');
          g.emitNoise(this.pos.clone(), 6);
          // Own material copy (keeping the shared light uniforms) so other lamps stay lit.
          p.obj.traverse((o) => {
            const m = o.isMesh && o.material.uniforms?.uEmissive ? o.material : null;
            if (!m) return;
            const dark = m.clone();
            dark.uniforms = { ...m.uniforms, uEmissive: { value: m.uniforms.uEmissive.value.clone().setRGB(0, 0, 0) } };
            o.material = dark;
          });
        },
      }));
    game.shootables = [...(game.shootables ?? []), ...this.targets];
  }

  clear(game) { game.shootables = []; this.targets = []; }
}
