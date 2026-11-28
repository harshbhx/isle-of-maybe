// Client-side fog: which tiles the player has uncovered (visual only; the server keeps its own).
import { revealAround } from '../../shared/path.ts';
import { H, W, type Tile } from '../../shared/types.ts';

export const emptyMask = (): Uint8Array => new Uint8Array((W * H) / 8);

export const reveal = (
  mask: Uint8Array,
  tiles: readonly Tile[],
  r: number
): Uint8Array => {
  const next = new Uint8Array(mask);
  for (const t of tiles)
    for (const i of revealAround(t, r))
      next[i >> 3] = (next[i >> 3] ?? 0) | (1 << (i & 7));
  return next;
};
