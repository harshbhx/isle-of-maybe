// The island's sculpted height field (ADV-4.1, ADV-4.4): smooth beaches that step up with coast
// distance (so the rising tide covers exactly the sand the rules flood), rolling grass, raised
// cliffs and jungle floor, and a sea floor that falls away. Deterministic from the seed.
import { hash32 } from '../../../../shared/rng.ts';
import { tileKind } from '../../../../shared/relief.ts';
import { coastDistance } from '../../../../shared/tide.ts';
import { H, W, WATER, idx, type Island } from '../../../../shared/types.ts';

/** Samples per tile edge. */
export const RES = 3;
/** Tiles of sea floor drawn around the 40×40 grid. */
export const MARGIN = 10;
const G = W + MARGIN * 2;
export const SAMPLES = G * RES + 1;
/** World x/z of sample 0 (tile 0 starts at −W/2). */
export const ORIGIN = -W / 2 - MARGIN;
export const STEP = 1 / RES;

/** Sea level at each tide level (ADV-1.3): each sits between two beach terraces. */
export const SEA_LEVELS: readonly number[] = [0.12, 0.235, 0.305, 0.375];
/** Beach height by coast distance 1, 2, 3, 4+ (between the sea levels above). */
const BEACH = [0.2, 0.27, 0.34, 0.41];

export type Heights = {
  data: Float32Array;
  /** Height at a world point (bilinear). */
  at: (wx: number, wz: number) => number;
  min: number;
  max: number;
};

const noise2 = (seed: number, x: number, y: number): number => {
  // Value noise on an integer lattice, smoothly interpolated.
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const r = (a: number, b: number): number =>
    (hash32(`${seed}|${a},${b}`) % 1000) / 1000;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = r(xi, yi) + (r(xi + 1, yi) - r(xi, yi)) * sx;
  const b = r(xi, yi + 1) + (r(xi + 1, yi + 1) - r(xi, yi + 1)) * sx;
  return a + (b - a) * sy;
};

/** Target height of every tile (including the margin), before smoothing. */
const tileTargets = (island: Island): Float32Array => {
  const seed = hash32(island.seed);
  const coast = coastDistance(island);
  // Distance (in tiles, capped) from any land, for the sea floor; and inland distance for hills.
  const landDist = new Float32Array(G * G).fill(99);
  const isLand = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < W && y < H && island.terrain[idx(x, y)] !== WATER;
  for (let gy = 0; gy < G; gy++)
    for (let gx = 0; gx < G; gx++) {
      let best = 99;
      const tx = gx - MARGIN;
      const ty = gy - MARGIN;
      for (let dy = -6; dy <= 6; dy++)
        for (let dx = -6; dx <= 6; dx++)
          if (isLand(tx + dx, ty + dy))
            best = Math.min(best, Math.hypot(dx, dy));
      landDist[gy * G + gx] = best;
    }
  const out = new Float32Array(G * G);
  for (let gy = 0; gy < G; gy++)
    for (let gx = 0; gx < G; gx++) {
      const tx = gx - MARGIN;
      const ty = gy - MARGIN;
      const inGrid = tx >= 0 && ty >= 0 && tx < W && ty < H;
      const kind = inGrid ? tileKind(island, tx, ty) : 'water';
      const n = noise2(seed, gx * 0.35, gy * 0.35);
      let h: number;
      switch (kind) {
        case 'water': {
          const d = landDist[gy * G + gx] ?? 99;
          h = d > 50 ? -2.6 : -0.12 - Math.min(2.5, d * 0.42) + n * 0.1;
          break;
        }
        case 'sand': {
          const d = coast[idx(tx, ty)] ?? 4;
          h = BEACH[Math.min(3, Math.max(0, d - 1))] ?? 0.41;
          break;
        }
        case 'grass':
          h = 0.5 + n * 0.22;
          break;
        case 'jungle':
          h = 0.62 + n * 0.25;
          break;
        case 'rock':
          h =
            1.15 +
            n * 0.75 +
            (hash32(`${island.seed}|c${tx},${ty}`) % 5) * 0.08;
          break;
        case 'pond':
          h = 0.02;
          break;
      }
      out[gy * G + gx] = h;
    }
  return out;
};

export const buildHeights = (island: Island): Heights => {
  const seed = hash32(`${island.seed}:fine`);
  const t = tileTargets(island);
  const tile = (gx: number, gy: number): number =>
    t[
      Math.min(G - 1, Math.max(0, gy)) * G + Math.min(G - 1, Math.max(0, gx))
    ] ?? 0;
  const raw = new Float32Array(SAMPLES * SAMPLES);
  for (let sy = 0; sy < SAMPLES; sy++)
    for (let sx = 0; sx < SAMPLES; sx++) {
      // Sample position in tile units; tile centres sit at +0.5.
      const u = sx * STEP - 0.5;
      const v = sy * STEP - 0.5;
      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const fx = u - x0;
      const fy = v - y0;
      // Smoothstep weights keep terraces flat in the middle of each tile and blend at the edges.
      const wx = fx * fx * (3 - 2 * fx);
      const wy = fy * fy * (3 - 2 * fy);
      const a = tile(x0, y0) + (tile(x0 + 1, y0) - tile(x0, y0)) * wx;
      const b =
        tile(x0, y0 + 1) + (tile(x0 + 1, y0 + 1) - tile(x0, y0 + 1)) * wx;
      let h = a + (b - a) * wy;
      const fine = noise2(seed, sx * 0.6, sy * 0.6) - 0.5;
      h += fine * (h > 0.45 ? 0.08 : 0.025);
      raw[sy * SAMPLES + sx] = h;
    }
  // One light blur pass softens the joins without moving beach terraces across tile centres.
  const data = new Float32Array(raw.length);
  let min = Infinity;
  let max = -Infinity;
  for (let sy = 0; sy < SAMPLES; sy++)
    for (let sx = 0; sx < SAMPLES; sx++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = sx + dx;
          const y = sy + dy;
          if (x < 0 || y < 0 || x >= SAMPLES || y >= SAMPLES) continue;
          const w = dx === 0 && dy === 0 ? 4 : 1;
          sum += (raw[y * SAMPLES + x] ?? 0) * w;
          n += w;
        }
      const h = sum / n;
      data[sy * SAMPLES + sx] = h;
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
  const at = (wx: number, wz: number): number => {
    const u = Math.min(SAMPLES - 1.001, Math.max(0, (wx - ORIGIN) / STEP));
    const v = Math.min(SAMPLES - 1.001, Math.max(0, (wz - ORIGIN) / STEP));
    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    const fx = u - x0;
    const fy = v - y0;
    const s = (x: number, y: number): number => data[y * SAMPLES + x] ?? 0;
    const a = s(x0, y0) + (s(x0 + 1, y0) - s(x0, y0)) * fx;
    const b = s(x0, y0 + 1) + (s(x0 + 1, y0 + 1) - s(x0, y0 + 1)) * fx;
    return a + (b - a) * fy;
  };
  return { data, at, min, max };
};
