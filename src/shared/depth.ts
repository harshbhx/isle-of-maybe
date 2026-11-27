// How deep a chest is: distance to the nearest landmark decides the payout multiplier (ENG-4.1).
import { chebyshev } from './path.ts';
import type { Depth, Landmark, Tile } from './types.ts';

/** Chebyshev distance at or above which a chest is Deep. */
export const DEEP_MIN = 5;
/** Chebyshev distance at or above which a chest is Buried (below = Shallow). */
export const BURIED_MIN = 3;

export const nearestLandmarkDistance = (
  t: Tile,
  landmarks: readonly Landmark[]
): number =>
  landmarks.reduce((m, l) => Math.min(m, chebyshev(l.at, t)), Infinity);

export const depthClass = (t: Tile, landmarks: readonly Landmark[]): Depth => {
  const d = nearestLandmarkDistance(t, landmarks);
  return d >= DEEP_MIN ? 'deep' : d >= BURIED_MIN ? 'buried' : 'shallow';
};

export const depthMult = (d: Depth): number =>
  d === 'deep' ? 3 : d === 'buried' ? 2 : 1;
