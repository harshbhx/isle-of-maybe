// Core engine types shared by client and server.
import type { Modifier } from './day.ts';

export const W = 40;
export const H = 40;

export type Tile = { x: number; y: number };

export const LANDMARK_TYPES = [
  'palm',
  'twinPalms',
  'boulder',
  'skullRock',
  'hut',
  'wreck',
  'well',
  'statue',
  'campfire',
  'cave',
] as const;
export type LandmarkType = (typeof LANDMARK_TYPES)[number];

export type Landmark = { id: number; type: LandmarkType; at: Tile };

/** Terrain codes: walkable = SAND | GRASS. */
export const WATER = 0;
export const SAND = 1;
export const GRASS = 2;
export const ROCK = 3;
export const LANDMARK = 4;

export type Island = {
  seed: string;
  modifier: Modifier;
  name: string;
  /** Row-major W×H terrain codes. */
  terrain: Uint8Array;
  landmarks: Landmark[];
  dock: Tile;
};

export type Depth = 'shallow' | 'buried' | 'deep';

export type ChartPiece =
  | { k: 'stamp'; t: LandmarkType; x: number; y: number }
  | { k: 'path'; pts: Tile[] }
  | { k: 'x'; x: number; y: number };

export const idx = (x: number, y: number): number => y * W + x;
export const inBounds = (x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < W && y < H;
