// 2.5D cell grid: each 1 m cell is solid rock or open space with a floor
// height, a ceiling height and surface textures. Levels are authored by
// carving rectangles. The grid answers collision / line-of-sight queries.

export const CELL = 1;
export const STEP_HEIGHT = 0.45;

export class Grid {
  constructor(width, depth) {
    this.width = width;
    this.depth = depth;
    this.cells = new Array(width * depth).fill(null);
    this.boxes = [];
    this.tracks = [];
    this.dist = null;
  }

  inBounds(x, z) {
    return x >= 0 && z >= 0 && x < this.width && z < this.depth;
  }

  get(x, z) {
    if (!this.inBounds(x, z)) return null;
    return this.cells[z * this.width + x];
  }

  cellAt(wx, wz) {
    return this.get(Math.floor(wx / CELL), Math.floor(wz / CELL));
  }

  /**
   * Carve an inclusive rectangle of open cells.
   * @param {object} props  floor, ceil, vault, ft, wt, ct, et, noise, wallH, zone, toxic
   */
  carve(x0, z0, x1, z1, props) {
    const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0];
    const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0];
    for (let z = az; z <= bz; z++) {
      for (let x = ax; x <= bx; x++) {
        if (!this.inBounds(x, z)) continue;
        this.cells[z * this.width + x] = { ...DEFAULT_CELL, ...props };
      }
    }
    this.dist = null;
  }

  /** Modify props of already-open cells in a rectangle. */
  paint(x0, z0, x1, z1, props) {
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        const c = this.get(x, z);
        if (c) this.cells[z * this.width + x] = { ...c, ...props };
      }
    }
    this.dist = null;
  }

  fillSolid(x0, z0, x1, z1) {
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        if (this.inBounds(x, z)) this.cells[z * this.width + x] = null;
      }
    }
    this.dist = null;
  }

  /** Solid axis-aligned box (props, train cars). top = walkable surface. */
  addBox(minX, minZ, maxX, maxZ, bottom, top, tag = null) {
    const box = { minX, minZ, maxX, maxZ, bottom, top, tag };
    this.boxes.push(box);
    return box;
  }

  removeBox(box) {
    this.boxes = this.boxes.filter((b) => b !== box);
  }

  /** Distance (in cells, capped) from every cell to the nearest solid cell. */
  distanceField() {
    if (this.dist) return this.dist;
    const { width, depth } = this;
    const dist = new Float32Array(width * depth).fill(Infinity);
    const queue = [];
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        if (!this.cells[z * width + x]) {
          dist[z * width + x] = 0;
          queue.push(x, z);
        }
      }
    }
    for (let i = 0; i < queue.length; i += 2) {
      const x = queue[i], z = queue[i + 1];
      const d = dist[z * width + x] + 1;
      for (const [dx, dz] of NEIGHBOURS4) {
        const nx = x + dx, nz = z + dz;
        if (!this.inBounds(nx, nz)) continue;
        const k = nz * width + nx;
        if (dist[k] > d) { dist[k] = d; queue.push(nx, nz); }
      }
    }
    this.dist = dist;
    return dist;
  }

  /** Walkable floor height under a point (considering boxes up to maxY). */
  floorAt(wx, wz, maxY = Infinity) {
    const c = this.cellAt(wx, wz);
    let h = c ? c.floor : -Infinity;
    for (const b of this.boxes) {
      if (wx >= b.minX && wx <= b.maxX && wz >= b.minZ && wz <= b.maxZ && b.top <= maxY && b.top > h) h = b.top;
    }
    return h;
  }

  ceilAt(wx, wz) {
    const c = this.cellAt(wx, wz);
    return c ? c.ceil : -Infinity;
  }

  /**
   * Can a body with feet at footY and height h stand in cell (x,z)?
   * Blocks on solid rock, ledges higher than a step, or low ceilings.
   */
  cellBlocks(x, z, footY, h) {
    const c = this.get(x, z);
    if (!c) return true;
    if (c.floor > footY + STEP_HEIGHT) return true;
    if (c.ceil < Math.max(footY, c.floor) + h) return true;
    return false;
  }

  boxBlocks(b, footY, h) {
    return b.top > footY + STEP_HEIGHT && b.bottom < footY + h;
  }

  /**
   * Resolve a circle (x,z,r) against blocking cells and boxes. Returns the
   * corrected position. Iterative push-out; good enough for 1 m cells.
   */
  collideCircle(px, pz, r, footY, h) {
    let x = px, z = pz;
    for (let iter = 0; iter < 3; iter++) {
      const cx0 = Math.floor((x - r) / CELL), cx1 = Math.floor((x + r) / CELL);
      const cz0 = Math.floor((z - r) / CELL), cz1 = Math.floor((z + r) / CELL);
      for (let cz = cz0; cz <= cz1; cz++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          if (!this.cellBlocks(cx, cz, footY, h)) continue;
          [x, z] = pushOutOfRect(x, z, r, cx * CELL, cz * CELL, (cx + 1) * CELL, (cz + 1) * CELL);
        }
      }
      for (const b of this.boxes) {
        if (!this.boxBlocks(b, footY, h)) continue;
        [x, z] = pushOutOfRect(x, z, r, b.minX, b.minZ, b.maxX, b.maxZ);
      }
    }
    return [x, z];
  }

  /** 3D point is inside rock / box? */
  pointSolid(x, y, z) {
    const c = this.cellAt(x, z);
    if (!c || y < c.floor || y > (c.ceilMax ?? c.ceil)) return true;
    for (const b of this.boxes) {
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && y >= b.bottom && y <= b.top) return true;
    }
    return false;
  }

  /**
   * March a ray through the world. Returns {dist, point, normal} of the first
   * solid hit or null within maxDist.
   */
  raycast(ox, oy, oz, dx, dy, dz, maxDist = 60, step = 0.08) {
    for (let t = step; t <= maxDist; t += step) {
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      if (this.pointSolid(x, y, z)) {
        // Refine with a short binary search.
        let lo = t - step, hi = t;
        for (let i = 0; i < 6; i++) {
          const m = (lo + hi) / 2;
          if (this.pointSolid(ox + dx * m, oy + dy * m, oz + dz * m)) hi = m; else lo = m;
        }
        const hx = ox + dx * lo, hy = oy + dy * lo, hz = oz + dz * lo;
        return { dist: lo, point: { x: hx, y: hy, z: hz }, normal: this.guessNormal(hx, hy, hz, dx, dy, dz) };
      }
    }
    return null;
  }

  guessNormal(x, y, z, dx, dy, dz) {
    const e = 0.12;
    const sx = this.pointSolid(x + Math.sign(dx) * e, y, z);
    const sy = this.pointSolid(x, y + Math.sign(dy) * e, z);
    const sz = this.pointSolid(x, y, z + Math.sign(dz) * e);
    if (sy && !sx && !sz) return { x: 0, y: -Math.sign(dy), z: 0 };
    if (sx && !sz) return { x: -Math.sign(dx), y: 0, z: 0 };
    if (sz && !sx) return { x: 0, y: 0, z: -Math.sign(dz) };
    return { x: -dx, y: -dy, z: -dz };
  }

  /** Line of sight between two eye points (for AI). */
  lineOfSight(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.01) return true;
    const hit = this.raycast(ax, ay, az, dx / len, dy / len, dz / len, len, 0.25);
    return !hit;
  }

  walkable(x, z) {
    return !!this.get(x, z);
  }
}

function pushOutOfRect(x, z, r, minX, minZ, maxX, maxZ) {
  const nx = Math.max(minX, Math.min(x, maxX));
  const nz = Math.max(minZ, Math.min(z, maxZ));
  const dx = x - nx, dz = z - nz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return [x, z];
  if (d2 > 1e-8) {
    const d = Math.sqrt(d2);
    return [nx + (dx / d) * r, nz + (dz / d) * r];
  }
  // Centre inside rect: push out along the shallowest axis.
  const left = x - minX, right = maxX - x, top = z - minZ, bottom = maxZ - z;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return [minX - r, z];
  if (m === right) return [maxX + r, z];
  if (m === top) return [x, minZ - r];
  return [x, maxZ + r];
}

export const NEIGHBOURS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const DEFAULT_CELL = {
  floor: 0,
  ceil: 4,
  vault: 0,
  ft: 'concrete_floor',
  wt: 'rock_raw',
  ct: 'rock_raw',
  et: 'concrete_floor',
  wallH: 3,
  wallU: 3,
  wallV: 3,
  floorScale: 2,
  noise: 0.18,
  zone: null,
  toxic: false,
};
