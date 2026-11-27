// Grid geometry: walkability, A*, reachability, fog reveal and distances (ENG-3).
import {
  GRASS,
  H,
  SAND,
  W,
  idx,
  inBounds,
  type Island,
  type Tile,
} from './types.ts';

export const chebyshev = (a: Tile, b: Tile): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const manhattan = (a: Tile, b: Tile): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const euclid = (a: Tile, b: Tile): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const walkableCode = (code: number | undefined): boolean =>
  code === SAND || code === GRASS;

export const walkable = (terrain: Uint8Array, x: number, y: number): boolean =>
  inBounds(x, y) && walkableCode(terrain[idx(x, y)]);

const DIRS: readonly Tile[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export const neighbors4 = (t: Tile): Tile[] =>
  DIRS.map((d) => ({ x: t.x + d.x, y: t.y + d.y }));

export const isAdjacent4 = (a: Tile, b: Tile): boolean => manhattan(a, b) === 1;

/** Number of walkable tiles reachable from `from` (4-directional). */
export const reachableCount = (terrain: Uint8Array, from: Tile): number => {
  if (!walkable(terrain, from.x, from.y)) return 0;
  const seen = new Uint8Array(W * H);
  const stack: Tile[] = [from];
  seen[idx(from.x, from.y)] = 1;
  let n = 0;
  while (stack.length > 0) {
    const t = stack.pop();
    if (t === undefined) break;
    n++;
    for (const nb of neighbors4(t)) {
      if (!walkable(terrain, nb.x, nb.y)) continue;
      const i = idx(nb.x, nb.y);
      if (seen[i] === 1) continue;
      seen[i] = 1;
      stack.push(nb);
    }
  }
  return n;
};

export const walkableCount = (terrain: Uint8Array): number => {
  let n = 0;
  for (const c of terrain) if (walkableCode(c)) n++;
  return n;
};

/** True when every walkable tile is reachable from `from`. */
export const allConnected = (terrain: Uint8Array, from: Tile): boolean =>
  reachableCount(terrain, from) === walkableCount(terrain);

/** Shortest 4-directional path from a to b (both inclusive), or null (ENG-3.1). */
export const aStar = (terrain: Uint8Array, a: Tile, b: Tile): Tile[] | null => {
  if (!walkable(terrain, a.x, a.y) || !walkable(terrain, b.x, b.y)) return null;
  const n = W * H;
  const g = new Float64Array(n).fill(Infinity);
  const f = new Float64Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open: number[] = [];
  const start = idx(a.x, a.y);
  const goal = idx(b.x, b.y);
  g[start] = 0;
  f[start] = manhattan(a, b);
  open.push(start);
  while (open.length > 0) {
    // 1,600 tiles: a linear scan for the best open node is fast enough (< 2 ms).
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      if ((f[open[i] ?? 0] ?? Infinity) < (f[open[bi] ?? 0] ?? Infinity))
        bi = i;
    }
    const cur = open[bi];
    if (cur === undefined) break;
    open.splice(bi, 1);
    if (cur === goal) {
      const out: Tile[] = [];
      for (let c = cur; c !== -1; c = came[c] ?? -1)
        out.push({ x: c % W, y: Math.floor(c / W) });
      return out.reverse();
    }
    closed[cur] = 1;
    const ct = { x: cur % W, y: Math.floor(cur / W) };
    for (const nb of neighbors4(ct)) {
      if (!walkable(terrain, nb.x, nb.y)) continue;
      const ni = idx(nb.x, nb.y);
      if (closed[ni] === 1) continue;
      const tentative = (g[cur] ?? Infinity) + 1;
      if (tentative < (g[ni] ?? Infinity)) {
        came[ni] = cur;
        g[ni] = tentative;
        f[ni] = tentative + manhattan(nb, b);
        if (!open.includes(ni)) open.push(ni);
      }
    }
  }
  return null;
};

/** Tile indices within Euclidean radius r of t (inside the grid) (ENG-3.3). */
export const revealAround = (t: Tile, r: number): number[] => {
  const out: number[] = [];
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const x = t.x + dx;
      const y = t.y + dy;
      if (inBounds(x, y) && dx * dx + dy * dy <= r * r) out.push(idx(x, y));
    }
  }
  return out;
};

/** A dig at `dig` finds a chest at `chest` when Chebyshev distance ≤ 1 (ENG-3.4). */
export const digFinds = (dig: Tile, chest: Tile): boolean =>
  chebyshev(dig, chest) <= 1;

/** Length of the shortest walk from the dock to a tile, or Infinity. */
export const shortestSteps = (island: Island, to: Tile): number => {
  const p = aStar(island.terrain, island.dock, to);
  return p === null ? Infinity : p.length - 1;
};
