// A* over the level grid (8-connected, no corner cutting). Movement between
// cells is allowed when the floor rise is within the agent's climb height.

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
];

class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(node, f) {
    const a = this.items;
    a.push({ node, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top.node;
  }
}

function canStep(grid, from, to, climb, height) {
  if (!to || to.water) return false;
  if (to.floor - from.floor > climb) return false;
  if (to.ceil - to.floor < height) return false;
  return true;
}

/**
 * @returns {Array<[number,number]>|null} list of cell coords from start (exclusive) to goal
 */
export function findPath(grid, sx, sz, gx, gz, { climb = 0.45, height = 1.7, maxNodes = 4000 } = {}) {
  if (!grid.get(gx, gz) || !grid.get(sx, sz)) return null;
  const W = grid.width;
  const key = (x, z) => z * W + x;
  const start = key(sx, sz), goal = key(gx, gz);
  const g = new Map([[start, 0]]);
  const came = new Map();
  const open = new MinHeap();
  const h = (x, z) => Math.hypot(x - gx, z - gz);
  open.push(start, h(sx, sz));
  const closed = new Set();
  let expanded = 0;
  while (open.size) {
    const cur = open.pop();
    if (cur === goal) break;
    if (closed.has(cur)) continue;
    closed.add(cur);
    if (++expanded > maxNodes) return null;
    const cx = cur % W, cz = (cur - cx) / W;
    const cc = grid.get(cx, cz);
    for (const [dx, dz, cost] of DIRS) {
      const nx = cx + dx, nz = cz + dz;
      const nc = grid.get(nx, nz);
      if (!canStep(grid, cc, nc, climb, height)) continue;
      if (dx && dz && (!grid.get(cx + dx, cz) || !grid.get(cx, cz + dz))) continue;
      if (dx && dz && (!canStep(grid, cc, grid.get(cx + dx, cz), climb, height) || !canStep(grid, cc, grid.get(cx, cz + dz), climb, height))) continue;
      const nk = key(nx, nz);
      const ng = g.get(cur) + cost + Math.abs(nc.floor - cc.floor) * 0.5;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        came.set(nk, cur);
        open.push(nk, ng + h(nx, nz));
      }
    }
  }
  if (!came.has(goal)) return null;
  const path = [];
  for (let k = goal; k !== start; k = came.get(k)) {
    const x = k % W;
    path.push([x, (k - x) / W]);
  }
  return path.reverse();
}
