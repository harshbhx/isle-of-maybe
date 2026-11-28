// The island's relief for the 3D view (UI-3.1, UI-3.6): what each tile looks like and how high it
// stands, where low cloud covers the land, and which landmarks may show. Pure, so both renderers agree.
import { LANTERN_RANGE } from './day.ts';
import { hash32 } from './rng.ts';
import {
  GRASS,
  H,
  LANDMARK,
  ROCK,
  SAND,
  W,
  WATER,
  idx,
  type Island,
  type Tile,
} from './types.ts';

export type TileKind = 'water' | 'sand' | 'grass' | 'rock' | 'jungle' | 'pond';

/** Top height of each kind in tile units (water is drawn by the sea, not the terrain). Blocked
 * tiles are a raised mound; the trees and boulders on top are what block the way. */
export const TOP: Readonly<Record<TileKind, number>> = {
  water: 0,
  pond: 0.2,
  sand: 0.32,
  grass: 0.62,
  jungle: 0.74,
  rock: 0.76,
};

/**
 * What a tile looks like. Blocked tiles split into jungle, pond and rock exactly as the 2D renderer
 * paints them (same hash), so a player switching views sees the same island.
 */
export const tileKind = (island: Island, x: number, y: number): TileKind => {
  const code = island.terrain[idx(x, y)];
  if (code === undefined || code === WATER) return 'water';
  if (code === SAND) return 'sand';
  if (code === GRASS || code === LANDMARK) return 'grass';
  if (code === ROCK) {
    const h = hash32(`${island.seed}|${x},${y}`);
    if (island.modifier === 'jungle' || h % 4 === 0) return 'jungle';
    return h % 5 === 0 ? 'pond' : 'rock';
  }
  return 'grass';
};

/** Height of a tile's top. Grass rolls a little so the island doesn't look machined. */
export const tileTop = (island: Island, x: number, y: number): number => {
  const k = tileKind(island, x, y);
  if (k !== 'grass') return TOP[k];
  return TOP.grass + (hash32(`${island.seed}|h${x},${y}`) % 3) * 0.04;
};

/** Tile centre in world units, with the island centred on the origin (x east, z south). */
export const toWorld = (t: {
  x: number;
  y: number;
}): { x: number; z: number } => ({
  x: t.x + 0.5 - W / 2,
  z: t.y + 0.5 - H / 2,
});

/** The tile under a world point, or null off the grid. */
export const toTile = (wx: number, wz: number): Tile | null => {
  const x = Math.floor(wx + W / 2);
  const y = Math.floor(wz + H / 2);
  return x < 0 || y < 0 || x >= W || y >= H ? null : { x, y };
};

const bit = (mask: Uint8Array, i: number): boolean =>
  (((mask[i >> 3] ?? 0) >> (i & 7)) & 1) === 1;

/** Tiles that carry low cloud while unseen: all land, and the water touching it. */
export const cloudTiles = (island: Island): number[] => {
  const out: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++)
        for (let dx = -1; dx <= 1 && !near; dx++) {
          const c =
            island.terrain[
              idx(
                Math.min(W - 1, Math.max(0, x + dx)),
                Math.min(H - 1, Math.max(0, y + dy))
              )
            ];
          if (c !== undefined && c !== WATER) near = true;
        }
      if (near) out.push(idx(x, y));
    }
  }
  return out;
};

/**
 * Whether a landmark may be drawn (UI-3.6): when its tile is seen (or nothing is fogged), or on
 * Lantern night within LANTERN_RANGE of the sailor. Never otherwise, so 3D never leaks the map.
 */
export const landmarkVisible = (
  island: Island,
  seen: Uint8Array | null,
  sailor: { x: number; y: number } | null,
  at: Tile
): 'shown' | 'lantern' | 'hidden' => {
  if (seen === null || bit(seen, idx(at.x, at.y))) return 'shown';
  if (
    island.modifier === 'lanterns' &&
    sailor !== null &&
    Math.hypot(at.x - sailor.x, at.y - sailor.y) <= LANTERN_RANGE
  )
    return 'lantern';
  return 'hidden';
};

/** Cloud state of a tile: gone when seen, thin next to a seen tile, full otherwise. */
export const cloudAt = (
  seen: Uint8Array | null,
  i: number
): 'none' | 'thin' | 'full' => {
  if (seen === null || bit(seen, i)) return 'none';
  const x = i % W;
  const y = Math.floor(i / W);
  const edge =
    (x > 0 && bit(seen, i - 1)) ||
    (x < W - 1 && bit(seen, i + 1)) ||
    (y > 0 && bit(seen, i - W)) ||
    (y < H - 1 && bit(seen, i + W));
  return edge ? 'thin' : 'full';
};

/** How many tiles fit across the screen's short side at a zoom step (0 = the whole island). The 3D
 * view sits closer than the flat one (13 tiles at 1×) because perspective already shows more. */
export const tilesAcross = (zoom: number): number =>
  zoom <= 0 ? 44 : 13 / zoom;
