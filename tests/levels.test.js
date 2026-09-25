import { describe, it, expect } from 'vitest';
import { CityGrid } from '../src/levels/city.js';
import { LEVELS, CHAPTERS } from '../src/levels/index.js';
import { findPath } from '../src/game/pathfinding.js';
import { COMICS } from '../src/story/comics.js';

// Every level is built on a bare grid (no props) and each interactive point
// must be walkable from the spawn point.

function build(def) {
  const grid = new CityGrid(def.size[0], def.size[1]);
  def.build(grid);
  return grid;
}

// True if some walkable cell within `to.r` of the target can be reached.
function reachable(grid, from, to) {
  const sx = Math.floor(from.x), sz = Math.floor(from.z);
  const r = to.r ?? 0.5;
  for (let gz = Math.floor(to.z - r); gz <= Math.floor(to.z + r); gz++) {
    for (let gx = Math.floor(to.x - r); gx <= Math.floor(to.x + r); gx++) {
      if (Math.hypot(gx + 0.5 - to.x, gz + 0.5 - to.z) > r + 0.71) continue;
      if (gx === sx && gz === sz) return true;
      if (findPath(grid, sx, sz, gx, gz, { maxNodes: 200000 })) return true;
    }
  }
  return false;
}

const center = (rect) => ({ x: (rect[0] + rect[2]) / 2, z: (rect[1] + rect[3]) / 2 });

function targets(def) {
  const out = [];
  for (const e of def.entities) {
    if (e.type === 'use' || e.type === 'pickup') out.push({ label: `${e.type}:${e.id ?? e.kind}`, x: e.x, z: e.z, r: e.r ?? 1.2 });
    if (e.type === 'trigger') out.push({ label: `trigger:${e.id}`, ...center(e.rect) });
  }
  return out;
}

describe('levels', () => {
  it('every chapter points at a defined level and a known comic', () => {
    for (const c of CHAPTERS) {
      expect(LEVELS[c.id], c.id).toBeTruthy();
      if (c.comic) expect(COMICS[c.comic], c.comic).toBeTruthy();
    }
  });

  for (const [id, def] of Object.entries(LEVELS)) {
    describe(id, () => {
      const grid = build(def);

      it('spawns on a walkable cell', () => {
        const c = grid.get(Math.floor(def.spawn.x), Math.floor(def.spawn.z));
        expect(c).toBeTruthy();
        expect(c.water).toBeFalsy();
      });

      it('has unique entity ids', () => {
        const ids = def.entities.filter((e) => e.id && e.type !== 'prop').map((e) => `${e.type}:${e.id}`);
        expect(new Set(ids).size).toBe(ids.length);
      });

      for (const t of targets(def)) {
        it(`reaches ${t.label}`, () => {
          expect(reachable(grid, def.spawn, t)).toBe(true);
        });
      }
    });
  }
});
