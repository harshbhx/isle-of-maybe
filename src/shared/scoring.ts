// Gold, salvage, trust and tiers (ENG-4.2 – ENG-4.5). Change these only through a spec change.
import { depthMult } from './depth.ts';
import type { Depth } from './types.ts';

/** Gold for finding a chest (ENG-4.2). `shovelsLeft` is counted after the finding dig. */
export const finderGold = (
  depth: Depth,
  shovelsLeft: number,
  steps: number,
  shortest: number
): number => {
  const routeBonus = steps <= 1.5 * shortest ? 20 : 0;
  return depthMult(depth) * (40 + 20 * shovelsLeft) + routeBonus;
};

/** Salvage gold for the chart's author per find (ENG-4.3). */
export const salvage = (depth: Depth): number => 10 * depthMult(depth);

export type ChartStats = {
  attempts: number;
  finds: number;
  trueVotes: number;
  cursedVotes: number;
};

/** Trust score used to rank charts (ENG-4.4). */
export const trustScore = (s: ChartStats): number => {
  const votes = s.trueVotes + s.cursedVotes;
  return (
    (s.finds + 1) / (s.attempts + 2) +
    (0.05 * (s.trueVotes - s.cursedVotes)) / Math.max(1, votes)
  );
};

export type Tier =
  'deckhand' | 'mapmaker' | 'navigator' | 'cartographer' | 'legend';

export const TIER_THRESHOLDS: readonly (readonly [Tier, number])[] = [
  ['legend', 200],
  ['cartographer', 75],
  ['navigator', 25],
  ['mapmaker', 5],
  ['deckhand', 0],
];

/** Tier for all-time finds of a player's chests (ENG-4.5). */
export const tierFor = (finds: number): Tier => {
  for (const [tier, min] of TIER_THRESHOLDS) if (finds >= min) return tier;
  return 'deckhand';
};

export type TierProgress = {
  tier: Tier;
  finds: number;
  /** The next tier and the all-time finds it needs; null at the top. */
  next: { tier: Tier; at: number } | null;
};

/** Where a player stands on the tier ladder, for the Dispatch (DAY-5.1). */
export const tierProgress = (finds: number): TierProgress => {
  const tier = tierFor(finds);
  const i = TIER_THRESHOLDS.findIndex(([t]) => t === tier);
  const up = i > 0 ? TIER_THRESHOLDS[i - 1] : undefined;
  return {
    tier,
    finds,
    next: up === undefined ? null : { tier: up[0], at: up[1] },
  };
};
