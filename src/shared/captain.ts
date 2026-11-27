// Old Captain chests and charts: game-made content so a quiet island is never empty (ENG-6).
import { validateChart } from './chart.ts';
import { depthClass } from './depth.ts';
import { aStar, euclid, walkable } from './path.ts';
import { at, int, pick, shuffle, type Rng } from './rng.ts';
import {
  H,
  W,
  inBounds,
  type ChartPiece,
  type Depth,
  type Island,
  type Tile,
} from './types.ts';

const clamp = (v: number): number => Math.max(0, Math.min(W - 1, v));

/** Three chest tiles, one per depth class where possible (ENG-6.2). */
export const captainChests = (
  island: Island,
  rng: Rng
): { at: Tile; depth: Depth }[] => {
  const byDepth: Record<Depth, Tile[]> = { shallow: [], buried: [], deep: [] };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!walkable(island.terrain, x, y)) continue;
      if (x === island.dock.x && y === island.dock.y) continue;
      byDepth[depthClass({ x, y }, island.landmarks)].push({ x, y });
    }
  }
  const all = [...byDepth.shallow, ...byDepth.buried, ...byDepth.deep];
  const out: { at: Tile; depth: Depth }[] = [];
  for (const d of ['shallow', 'buried', 'deep'] as const) {
    const pool = byDepth[d].length > 0 ? byDepth[d] : all;
    const t = pick(rng, pool);
    out.push({ at: t, depth: depthClass(t, island.landmarks) });
  }
  return out;
};

/** Perpendicular distance from p to segment ab. */
const segDist = (p: Tile, a: Tile, b: Tile): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return euclid(p, a);
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)
  );
  return euclid(p, { x: a.x + t * dx, y: a.y + t * dy });
};

/** Ramer–Douglas–Peucker simplification. */
const rdp = (pts: readonly Tile[], eps: number): Tile[] => {
  if (pts.length <= 2) return pts.slice();
  const a = at(pts, 0);
  const b = at(pts, pts.length - 1);
  let maxD = -1;
  let maxI = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(at(pts, i), a, b);
    if (d > maxD) {
      maxD = d;
      maxI = i;
    }
  }
  if (maxD <= eps) return [a, b];
  const left = rdp(pts.slice(0, maxI + 1), eps);
  const right = rdp(pts.slice(maxI), eps);
  return [...left.slice(0, -1), ...right];
};

const simplifyTo = (pts: readonly Tile[], maxPoints: number): Tile[] => {
  let eps = 0.5;
  let out = rdp(pts, eps);
  while (out.length > maxPoints) {
    eps *= 1.5;
    out = rdp(pts, eps);
  }
  return out;
};

const jitter = (rng: Rng, t: Tile, min: number, max: number): Tile => {
  for (let i = 0; i < 20; i++) {
    const dx = int(rng, -max, max);
    const dy = int(rng, -max, max);
    const d = Math.max(Math.abs(dx), Math.abs(dy));
    if (d < min || d > max) continue;
    const x = t.x + dx;
    const y = t.y + dy;
    if (inBounds(x, y)) return { x, y };
  }
  return { x: clamp(t.x + min), y: clamp(t.y) };
};

/** An honest-ish chart to a chest, drawn the way a hurried captain would (ENG-6.1). */
export const captainChart = (
  island: Island,
  chest: Tile,
  rng: Rng
): ChartPiece[] => {
  const nearest = island.landmarks
    .slice()
    .sort((a, b) => euclid(a.at, chest) - euclid(b.at, chest))
    .slice(0, int(rng, 3, 5));
  const stamps: ChartPiece[] = shuffle(rng, nearest).map((l) => {
    const j = jitter(rng, l.at, 0, 1);
    return { k: 'stamp', t: l.type, x: j.x, y: j.y };
  });

  const route = aStar(island.terrain, island.dock, chest) ?? [
    island.dock,
    chest,
  ];
  const pts = simplifyTo(route, 9);
  if (pts.length > 2) {
    const i = int(rng, 1, pts.length - 2);
    pts[i] = jitter(rng, at(pts, i), 1, 2);
  }
  const cleaned = pts.filter(
    (p, i) => i === 0 || p.x !== at(pts, i - 1).x || p.y !== at(pts, i - 1).y
  );

  const x = jitter(rng, chest, 1, 2);
  const pieces: ChartPiece[] = [...stamps];
  if (cleaned.length >= 2) pieces.push({ k: 'path', pts: cleaned });
  pieces.push({ k: 'x', x: x.x, y: x.y });

  const check = validateChart(pieces);
  if (!check.ok) throw new Error(`captain chart invalid: ${check.reason}`);
  return pieces;
};
