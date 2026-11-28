// The rising tide (ADV-1): every hunt has a time limit, and the beach floods in three waves from
// the sea inwards. Pure; the caller passes elapsed time, so client and server agree.
import {
  H,
  SAND,
  W,
  WATER,
  idx,
  inBounds,
  type Island,
  type Tile,
} from './types.ts';

export const HUNT_SECONDS = 150;

/** [fraction of the time limit, tide level from then on] (ADV-1.3). */
export const TIDE_WAVES: readonly (readonly [number, number])[] = [
  [0.4, 1],
  [0.65, 2],
  [0.85, 3],
];
export const MAX_TIDE = 3;

/** Tide level 0–3 at `elapsedS` seconds into a hunt. */
export const tideLevel = (elapsedS: number): number => {
  let level = 0;
  for (const [f, l] of TIDE_WAVES) if (elapsedS >= f * HUNT_SECONDS) level = l;
  return level;
};

/** Seconds into a hunt when `level` arrives (level 0 → 0). */
export const tideAt = (level: number): number => {
  for (const [f, l] of TIDE_WAVES) if (l === level) return f * HUNT_SECONDS;
  return 0;
};

const sea = (terrain: Uint8Array, x: number, y: number): boolean =>
  !inBounds(x, y) || terrain[idx(x, y)] === WATER;

const N4: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Coast distance of every sand tile: 1 next to the sea, then +1 per 4-step through sand (ADV-1.2).
 * 0 for anything that never floods (grass, rock, landmarks, the sea itself).
 */
export const coastDistance = (island: Island): Uint8Array => {
  const t = island.terrain;
  const dist = new Uint8Array(W * H);
  const queue: number[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (t[idx(x, y)] !== SAND) continue;
      if (N4.some(([dx, dy]) => sea(t, x + dx, y + dy))) {
        dist[idx(x, y)] = 1;
        queue.push(idx(x, y));
      }
    }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q] ?? 0;
    const x = i % W;
    const y = (i - x) / W;
    const d = dist[i] ?? 0;
    if (d >= 255) continue;
    for (const [dx, dy] of N4) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const j = idx(nx, ny);
      if (t[j] !== SAND || (dist[j] ?? 0) !== 0) continue;
      dist[j] = d + 1;
      queue.push(j);
    }
  }
  return dist;
};

/** Is `tile` under water at tide `level`? */
export const flooded = (
  dist: Uint8Array,
  tile: Tile,
  level: number
): boolean => {
  if (!inBounds(tile.x, tile.y)) return false;
  const d = dist[idx(tile.x, tile.y)] ?? 0;
  return d > 0 && d <= level;
};
