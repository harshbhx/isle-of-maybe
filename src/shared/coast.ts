// Coastline loops from the island's land mask by marching squares (CHART-2.1). Used by the
// chart editor (SVG) and the server's share image, so both draw the same shore.
import { H, W, WATER, idx, type Tile } from './types.ts';

export type Pt = { x: number; y: number };

const land = (terrain: Uint8Array, x: number, y: number): number =>
  x < 0 || y < 0 || x >= W || y >= H || terrain[idx(x, y)] === WATER ? 0 : 1;

/** Corner value: share of land among the four tiles touching tile-corner (cx, cy). */
const corner = (terrain: Uint8Array, cx: number, cy: number): number =>
  (land(terrain, cx - 1, cy - 1) +
    land(terrain, cx, cy - 1) +
    land(terrain, cx - 1, cy) +
    land(terrain, cx, cy)) /
  4;

const key = (p: Pt): string => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;

/**
 * Closed loops in tile units (a tile spans [x, x+1]). Outer shores and lake shores alike;
 * fill with the even-odd rule.
 */
export const coastLoops = (terrain: Uint8Array): Pt[][] => {
  const segs: [Pt, Pt][] = [];
  const lerp = (a: number, b: number): number => (0.5 - a) / (b - a);
  for (let cy = 0; cy < H + 1; cy++) {
    for (let cx = 0; cx < W + 1; cx++) {
      const tl = corner(terrain, cx, cy);
      const tr = corner(terrain, cx + 1, cy);
      const br = corner(terrain, cx + 1, cy + 1);
      const bl = corner(terrain, cx, cy + 1);
      const c =
        (tl >= 0.5 ? 8 : 0) |
        (tr >= 0.5 ? 4 : 0) |
        (br >= 0.5 ? 2 : 0) |
        (bl >= 0.5 ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const top: Pt = { x: cx + lerp(tl, tr), y: cy };
      const right: Pt = { x: cx + 1, y: cy + lerp(tr, br) };
      const bottom: Pt = { x: cx + lerp(bl, br), y: cy + 1 };
      const left: Pt = { x: cx, y: cy + lerp(tl, bl) };
      const mid = (tl + tr + br + bl) / 4 >= 0.5;
      const add = (a: Pt, b: Pt): void => void segs.push([a, b]);
      switch (c) {
        case 1:
        case 14:
          add(left, bottom);
          break;
        case 2:
        case 13:
          add(bottom, right);
          break;
        case 3:
        case 12:
          add(left, right);
          break;
        case 4:
        case 11:
          add(top, right);
          break;
        case 6:
        case 9:
          add(top, bottom);
          break;
        case 7:
        case 8:
          add(left, top);
          break;
        case 5:
          if (mid) {
            add(left, top);
            add(bottom, right);
          } else {
            add(left, bottom);
            add(top, right);
          }
          break;
        case 10:
          if (mid) {
            add(left, bottom);
            add(top, right);
          } else {
            add(left, top);
            add(bottom, right);
          }
          break;
      }
    }
  }
  // Link segments end to end into loops.
  const ends = new Map<string, number[]>();
  segs.forEach(([a, b], i) => {
    for (const p of [a, b]) {
      const k = key(p);
      const list = ends.get(k);
      if (list === undefined) ends.set(k, [i]);
      else list.push(i);
    }
  });
  const used = new Uint8Array(segs.length);
  const loops: Pt[][] = [];
  for (let s = 0; s < segs.length; s++) {
    if (used[s] === 1) continue;
    const first = segs[s];
    if (first === undefined) continue;
    used[s] = 1;
    const loop: Pt[] = [first[0], first[1]];
    let tail = first[1];
    for (;;) {
      const next = (ends.get(key(tail)) ?? []).find((i) => used[i] === 0);
      if (next === undefined) break;
      used[next] = 1;
      const seg = segs[next];
      if (seg === undefined) break;
      tail = key(seg[0]) === key(tail) ? seg[1] : seg[0];
      if (key(tail) === key(loop[0] ?? tail)) break;
      loop.push(tail);
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
};

/** Centre of a tile in tile units. */
export const centre = (t: Tile): Pt => ({ x: t.x + 0.5, y: t.y + 0.5 });

/** Chaikin corner cutting on a closed loop, so the shore reads as drawn, not gridded. */
export const smoothLoop = (loop: readonly Pt[], rounds = 2): Pt[] => {
  let pts: Pt[] = [...loop];
  for (let r = 0; r < rounds; r++) {
    const out: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (a === undefined || b === undefined) continue;
      out.push(
        { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 },
        { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 }
      );
    }
    pts = out;
  }
  return pts;
};
