// Request and response types shared by the client and the /api routes (docs/05-ARCHITECTURE.md §4).
import type { Modifier } from './day.ts';
import type { InkCheck } from './chart.ts';
import type { Tier, TierProgress } from './scoring.ts';
import type { ChartPiece, Depth, Tile } from './types.ts';

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
  /** Consecutive days with a finished hunt, ending today or yesterday (DAY-4.2). */
  streak: number;
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
  dispatch: Dispatch;
};

/** How one of your charts from the last 3 days did (DAY-5.1). */
export type DispatchChart = {
  day: string;
  dayNumber: number;
  chartId: string;
  depth: Depth;
  attempts: number;
  finds: number;
  trueVotes: number;
  cursedVotes: number;
  /** Gold you earned from finders of this chart. */
  salvage: number;
};

/** Newest first. Empty when you have no chart from the last 3 days. */
export type Dispatch = { charts: DispatchChart[]; tier: TierProgress };

export type HuntStartRequest = { chartId: string };
export type HuntStartResponse = { huntId: string; at: Tile; shovels: number };

/** Steps from index `from` onward; resending an already-applied batch is a no-op. */
export type StepsRequest = { huntId: string; from: number; steps: Tile[] };
export type StepsResponse = { at: Tile; index: number };

export type DigRequest = { huntId: string; at: Tile };

/** Sent only when a hunt ends: the one moment the chest position leaves the server. */
export type Reveal = {
  found: boolean;
  chest: Tile;
  chartX: Tile | null;
  /** Paces between the chart's X and the chest. */
  distance: number | null;
  gold: number;
  steps: number;
  shovelsLeft: number;
};

export type DigResponse = {
  found: boolean;
  shovelsLeft: number;
  done: boolean;
  reveal?: Reveal;
};
export type GiveUpRequest = { huntId: string };

/** Today's seen-tiles mask as hex (see `src/shared/seen.ts`); the bury screen fogs everything else. */
export type SeenResponse = { mask: string };

export type BuryRequest = { at: Tile };
export type BuryResponse = { at: Tile; depth: Depth };

export type ChartSubmitRequest = { pieces: ChartPiece[] };
export type ChartSubmitResponse = { chartId: string; ink: InkCheck };

export type Vote = 'true' | 'cursed';
export const VOTES: readonly Vote[] = ['true', 'cursed'];
export type RateRequest = { chartId: string; vote: Vote };
export type RateResponse = { trueVotes: number; cursedVotes: number };

export type ReportRequest = { chartId: string };
/** Always the same answer, so reporting reveals nothing about other reports. */
export type ReportResponse = { reported: true };
