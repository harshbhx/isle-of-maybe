// Hazards derived from the day's island (ADV-2, D28): quicksand patches and thicket at the
// jungle's edge, plus the minimum time each step takes. Derived, so island.ts output never changes.
import { tileKind } from './relief.ts';
import { at, int, rngFor } from './rng.ts';
import { walkable } from './path.ts';
import { GRASS, H, W, idx, inBounds, type Island, type Tile } from './types.ts';

export const STEP_SECONDS = 0.2;
export const THICKET_SECONDS = 0.4;
export const QUICKSAND_TRAP_SECONDS = 2.5;
/** Slack the server allows on top of the summed minimum times (ADV-2.3). */
export const PACE_SLACK_SECONDS = 1.5;

export type Hazards = { quicksand: Set<number>; thicket: Set<number> };

const N8: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Grass with 2+ jungle tiles among its 8 neighbours (ADV-2.2). */
const thicketTiles = (island: Island): Set<number> => {
  const out = new Set<number>();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (island.terrain[idx(x, y)] !== GRASS) continue;
      let n = 0;
      for (const [dx, dy] of N8)
        if (
          inBounds(x + dx, y + dy) &&
          tileKind(island, x + dx, y + dy) === 'jungle'
        )
          n++;
      if (n >= 2) out.add(idx(x, y));
    }
  return out;
};

/** 3–5 seeded patches of 2–4 walkable tiles, clear of the dock (ADV-2.1). */
const quicksandTiles = (island: Island, thicket: Set<number>): Set<number> => {
  const rng = rngFor(`${island.seed}:qs`);
  const nearDock = (x: number, y: number): boolean =>
    Math.max(Math.abs(x - island.dock.x), Math.abs(y - island.dock.y)) <= 1;
  const ok = (x: number, y: number): boolean =>
    walkable(island.terrain, x, y) &&
    !nearDock(x, y) &&
    !thicket.has(idx(x, y));
  const candidates: Tile[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (ok(x, y)) candidates.push({ x, y });
  const out = new Set<number>();
  if (candidates.length === 0) return out;
  const patches = int(rng, 3, 5);
  for (let p = 0; p < patches; p++) {
    const start = at(candidates, int(rng, 0, candidates.length - 1));
    const size = int(rng, 2, 4);
    const patch: Tile[] = [start];
    out.add(idx(start.x, start.y));
    for (let tries = 0; patch.length < size && tries < 20; tries++) {
      const from = at(patch, int(rng, 0, patch.length - 1));
      const [dx, dy] = at(N8.slice(0, 4), int(rng, 0, 3));
      const nx = from.x + dx;
      const ny = from.y + dy;
      if (!ok(nx, ny) || out.has(idx(nx, ny))) continue;
      patch.push({ x: nx, y: ny });
      out.add(idx(nx, ny));
    }
  }
  return out;
};

export const hazardsFor = (island: Island): Hazards => {
  const thicket = thicketTiles(island);
  return { thicket, quicksand: quicksandTiles(island, thicket) };
};

/** Minimum seconds a step onto `tile` takes (ADV-2.2). */
export const stepSeconds = (hz: Hazards, tile: Tile): number => {
  const i = idx(tile.x, tile.y);
  if (hz.quicksand.has(i)) return STEP_SECONDS + QUICKSAND_TRAP_SECONDS;
  if (hz.thicket.has(i)) return THICKET_SECONDS;
  return STEP_SECONDS;
};
