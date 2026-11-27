// Deterministic island generator (ENG-2). Same seed + modifier → same island everywhere.
import { type Modifier } from './day.ts';
import { islandName } from './names.ts';
import { OVERRIDES } from './overrides.ts';
import { allConnected, chebyshev, walkable } from './path.ts';
import { at, int, rngFor, shuffle, type Rng } from './rng.ts';
import {
  GRASS,
  H,
  LANDMARK,
  LANDMARK_TYPES,
  ROCK,
  SAND,
  W,
  WATER,
  idx,
  inBounds,
  type Island,
  type Landmark,
  type LandmarkType,
  type Tile,
} from './types.ts';
import { DEEP_MIN } from './depth.ts';

export const seedFor = (day: string): string =>
  OVERRIDES[day] ?? `maybe-${day}`;

/** Share of the grid that is land (ENG-2.1). */
export const landTarget = (m: Modifier): number =>
  m === 'lowtide' ? 0.7 : 0.6;
/** Share of land turned into rocks/ponds/jungle. */
const blockedTarget = (m: Modifier, rng: Rng): number =>
  m === 'jungle' ? 0.2 : 0.1 + rng() * 0.05;

const BORDER = 2;
const LANDMARK_SPACING = 4;
const DOCK_CLEARANCE = 3;
const MIN_DEEP_SHARE = 0.3;

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Bilinear value noise on a lattice with the given cell size. */
const valueNoise = (
  rng: Rng,
  cell: number
): ((x: number, y: number) => number) => {
  const gw = Math.ceil(W / cell) + 2;
  const grid = Array.from({ length: gw * gw }, () => rng());
  const g = (x: number, y: number): number => at(grid, y * gw + x);
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = smooth(fx - x0);
    const ty = smooth(fy - y0);
    const a = g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx;
    const b = g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx;
    return a * (1 - ty) + b * ty;
  };
};

const largestComponent = (land: Uint8Array): Uint8Array => {
  const label = new Int32Array(W * H).fill(-1);
  let best = -1;
  let bestSize = 0;
  let next = 0;
  for (let i = 0; i < W * H; i++) {
    if (land[i] !== 1 || label[i] !== -1) continue;
    const id = next++;
    let size = 0;
    const stack = [i];
    label[i] = id;
    while (stack.length > 0) {
      const c = stack.pop();
      if (c === undefined) break;
      size++;
      const cx = c % W;
      const cy = Math.floor(c / W);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!inBounds(nx, ny)) continue;
        const ni = idx(nx, ny);
        if (land[ni] === 1 && label[ni] === -1) {
          label[ni] = id;
          stack.push(ni);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
  }
  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (label[i] === best) out[i] = 1;
  return out;
};

const makeLand = (rng: Rng, share: number): Uint8Array => {
  const n1 = valueNoise(rng, 8);
  const n2 = valueNoise(rng, 4);
  const cx = (W - 1) / 2;
  const cy = (H - 1) / 2;
  const score = new Float64Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - cx, y - cy) / (W / 2);
      const noise = 0.65 * n1(x, y) + 0.35 * n2(x, y);
      const border =
        x < BORDER || y < BORDER || x >= W - BORDER || y >= H - BORDER;
      score[idx(x, y)] = border ? -Infinity : 1 - d + 0.45 * (noise - 0.5);
    }
  }
  const sorted = Array.from(score).sort((a, b) => b - a);
  const threshold = at(sorted, Math.floor(share * W * H));
  const land = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++)
    land[i] = (score[i] ?? -Infinity) > threshold ? 1 : 0;
  return largestComponent(land);
};

const findDock = (terrain: Uint8Array): Tile | null => {
  let best: Tile | null = null;
  const cx = (W - 1) / 2;
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W; x++) {
      if (terrain[idx(x, y)] !== SAND || terrain[idx(x, y + 1)] !== WATER)
        continue;
      if (
        best === null ||
        y > best.y ||
        (y === best.y && Math.abs(x - cx) < Math.abs(best.x - cx))
      ) {
        best = { x, y };
      }
    }
  }
  return best;
};

const placeBlocked = (
  terrain: Uint8Array,
  dock: Tile,
  rng: Rng,
  share: number
): void => {
  let land = 0;
  for (const c of terrain) if (c === SAND || c === GRASS) land++;
  const target = Math.round(land * share);
  let placed = 0;
  for (let tries = 0; tries < 400 && placed < target; tries++) {
    const x = int(rng, 0, W - 1);
    const y = int(rng, 0, H - 1);
    if (!walkable(terrain, x, y) || chebyshev({ x, y }, dock) <= 2) continue;
    const blob: number[] = [idx(x, y)];
    const size = int(rng, 1, 4);
    while (blob.length < size) {
      const base = at(blob, int(rng, 0, blob.length - 1));
      const bx = (base % W) + int(rng, -1, 1);
      const by = Math.floor(base / W) + int(rng, -1, 1);
      if (!walkable(terrain, bx, by) || chebyshev({ x: bx, y: by }, dock) <= 2)
        break;
      const bi = idx(bx, by);
      if (!blob.includes(bi)) blob.push(bi);
    }
    const before = blob.map((i) => terrain[i] ?? WATER);
    for (const i of blob) terrain[i] = ROCK;
    if (allConnected(terrain, dock)) {
      placed += blob.length;
    } else {
      blob.forEach((i, k) => {
        terrain[i] = before[k] ?? WATER;
      });
    }
  }
};

const placeLandmarks = (
  terrain: Uint8Array,
  dock: Tile,
  rng: Rng,
  modifier: Modifier
): Landmark[] => {
  const distinct = int(rng, 8, 10);
  const types = shuffle(rng, LANDMARK_TYPES).slice(0, distinct);
  const twins: LandmarkType[] = modifier === 'twins' ? types.slice(0, 2) : [];
  const candidates: Tile[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (
        walkable(terrain, x, y) &&
        chebyshev({ x, y }, dock) >= DOCK_CLEARANCE
      )
        candidates.push({ x, y });
    }
  }
  const order = shuffle(rng, candidates);
  const placed: Landmark[] = [];
  const tryPlace = (type: LandmarkType, ok: (t: Tile) => boolean): boolean => {
    for (const t of order) {
      if (!walkable(terrain, t.x, t.y)) continue;
      if (placed.some((p) => chebyshev(p.at, t) < LANDMARK_SPACING)) continue;
      if (!ok(t)) continue;
      const i = idx(t.x, t.y);
      const prev = terrain[i] ?? GRASS;
      terrain[i] = LANDMARK;
      if (!allConnected(terrain, dock)) {
        terrain[i] = prev;
        continue;
      }
      placed.push({ id: placed.length, type, at: t });
      return true;
    }
    return false;
  };
  for (const type of types) tryPlace(type, () => true);
  for (const type of twins) {
    const first = placed.find((p) => p.type === type);
    if (first === undefined) continue;
    tryPlace(type, (t) => {
      const d = chebyshev(first.at, t);
      return d >= 6 && d <= 10;
    });
  }
  return placed;
};

/** Share of walkable land at least DEEP_MIN tiles (Chebyshev) from every landmark. */
export const deepShare = (
  terrain: Uint8Array,
  landmarks: readonly Landmark[]
): number => {
  let walk = 0;
  let deep = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!walkable(terrain, x, y)) continue;
      walk++;
      if (landmarks.every((l) => chebyshev(l.at, { x, y }) >= DEEP_MIN)) deep++;
    }
  }
  return walk === 0 ? 0 : deep / walk;
};

type Attempt = { island: Island; problems: string[] };

const attempt = (seed: string, modifier: Modifier): Attempt => {
  const rng = rngFor(seed);
  const land = makeLand(rng, landTarget(modifier));
  const terrain = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (land[i] !== 1) continue;
      const coastal = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => land[idx(x + (dx ?? 0), y + (dy ?? 0))] !== 1);
      terrain[i] = coastal ? SAND : GRASS;
    }
  }
  const problems: string[] = [];
  const dock = findDock(terrain) ?? { x: 0, y: 0 };
  if (terrain[idx(dock.x, dock.y)] !== SAND) problems.push('no dock');
  placeBlocked(terrain, dock, rng, blockedTarget(modifier, rng));
  const landmarks = placeLandmarks(terrain, dock, rng, modifier);
  const name = islandName(rng);

  let landTiles = 0;
  for (const c of terrain) if (c !== WATER) landTiles++;
  const share = landTiles / (W * H);
  const target = landTarget(modifier);
  if (Math.abs(share - target) > 0.05)
    problems.push(`land share ${share.toFixed(2)}`);
  const minLandmarks = modifier === 'twins' ? 10 : 8;
  if (landmarks.length < minLandmarks)
    problems.push(`only ${landmarks.length} landmarks`);
  if (!allConnected(terrain, dock)) problems.push('not connected');
  if (deepShare(terrain, landmarks) < MIN_DEEP_SHARE)
    problems.push('too little deep land');

  return {
    island: { seed, modifier, name, terrain, landmarks, dock },
    problems,
  };
};

/** Generate a valid island, re-rolling with `seed#n` up to 20 times (ENG-2.7). */
export const generateIsland = (seed: string, modifier: Modifier): Island => {
  const tried: string[] = [];
  for (let n = 0; n <= 20; n++) {
    const s = n === 0 ? seed : `${seed}#${n}`;
    const { island, problems } = attempt(s, modifier);
    if (problems.length === 0) return island;
    tried.push(`${s}: ${problems.join(', ')}`);
  }
  throw new Error(`no valid island for ${seed}: ${tried.join('; ')}`);
};

export const islandForDay = (day: string, modifier: Modifier): Island =>
  generateIsland(seedFor(day), modifier);
