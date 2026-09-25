import { Grid, CELL, STEP_HEIGHT } from './grid.js';

// City grid: open ground cells (streets, yards, room floors, water) and solid
// "block" cells (buildings, interior walls) that carry a height and facade.
// Outdoors there is no ceiling; the camera looks down from above like MGS.

export const OPEN_CEIL = 60;

export const GROUND = { floor: 0, ceil: OPEN_CEIL, vault: 0, ft: 'asphalt_wet', et: 'sidewalk', floorScale: 4, noise: 0 };

export class CityGrid extends Grid {
  constructor(width, depth) {
    super(width, depth);
    this.blocks = new Map();
  }

  /** Open ground (streets, yards, room floors). */
  open(x0, z0, x1, z1, props = {}) {
    this.carve(x0, z0, x1, z1, { ...GROUND, ...props });
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.blocks.delete(z * this.width + x);
    }
  }

  /** Water surface: visible, not walkable, transparent to sight and bullets. */
  water(x0, z0, x1, z1, props = {}) {
    this.carve(x0, z0, x1, z1, { ...GROUND, floor: -1.4, ft: 'water', floorScale: 6, water: true, et: 'metal_rust', ...props });
  }

  /**
   * Solid block (building or wall) of height h.
   * @param {object} b  { h, wt, rt, wu, wv, lower, lowerH }
   */
  block(x0, z0, x1, z1, b) {
    const info = { h: 12, wt: 'facade_concrete', rt: 'roof_tar', wu: 4, wv: 3, lower: null, lowerH: 3, ...b };
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        if (!this.inBounds(x, z)) continue;
        this.cells[z * this.width + x] = null;
        this.blocks.set(z * this.width + x, info);
      }
    }
    this.dist = null;
  }

  blockAt(x, z) {
    return this.blocks.get(z * this.width + x) ?? null;
  }

  cellBlocks(x, z, footY, h) {
    const c = this.get(x, z);
    if (!c || c.water) return true;
    if (c.floor > footY + STEP_HEIGHT) return true;
    if (c.ceil < Math.max(footY, c.floor) + h) return true;
    return false;
  }

  /** Solid for sight/bullets: buildings up to their height, boxes, floors. */
  pointSolid(x, y, z) {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    const c = this.get(cx, cz);
    if (!c) {
      const b = this.blockAt(cx, cz);
      return !b || y < b.h;
    }
    if (y < c.floor || y > c.ceil) return true;
    for (const bx of this.boxes) {
      if (bx.seeThrough) continue;
      if (x >= bx.minX && x <= bx.maxX && z >= bx.minZ && z <= bx.maxZ && y >= bx.bottom && y <= bx.top) return true;
    }
    return false;
  }
}
