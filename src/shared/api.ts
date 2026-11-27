// Request and response types shared by the client and the /api routes (docs/05-ARCHITECTURE.md §4).
import type { Modifier } from './day.ts';
import type { Tier } from './scoring.ts';
import type { ChartPiece, Depth } from './types.ts';

export type ApiErrorBody = { error: string; message: string };

/** A chart as any player may see it. Never carries the chest position (HUNT-1.5). */
export type ChartPublic = {
  id: string;
  day: string;
  author: string;
  captain: boolean;
  pieces: ChartPiece[];
  depth: Depth;
  attempts: number;
  finds: number;
  trueVotes: number;
  cursedVotes: number;
};

export type PickSlot = 'trusted' | 'fresh' | 'captain';

export type PickResponse = { charts: { slot: PickSlot; chart: ChartPublic }[] };

export type UserState = {
  loggedIn: boolean;
  name: string | null;
  huntsToday: number;
  huntsLeft: number;
  buried: boolean;
  chartId: string | null;
  gold: number;
  finds: number;
  tier: Tier;
};

export type InitResponse = {
  /** The day of the post being viewed. */
  day: string;
  dayNumber: number;
  /** Today's UTC day; differs from `day` on an old post. */
  today: string;
  isToday: boolean;
  island: { seed: string; modifier: Modifier; name: string };
  counts: { buried: number; found: number; hunts: number };
  user: UserState;
};
