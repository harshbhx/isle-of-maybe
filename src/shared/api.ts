// Request and response types shared by the client and the /api routes (docs/05-ARCHITECTURE.md §4).
import type { Modifier } from './day.ts';
import type { Grade, InkCheck } from './chart.ts';
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

export type PickSlot = 'challenge' | 'trusted' | 'fresh' | 'captain';

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
  /** Finished or skipped Practice Cove (UI-9.2). */
  practiced: boolean;
  /** Your own chest on this island. Only its author ever gets its position (CHART-4.1). */
  chest: MyChestState | null;
};

export type MyChestState = {
  at: Tile;
  depth: Depth;
  /** Null until the chart is submitted. */
  grade: Grade | null;
  /** How your chart is doing today (W9: "n sailors picked up your chart"). */
  attempts: number;
  finds: number;
};

export type InitResponse = {
  /** The day of the post being viewed. */
  day: string;
  dayNumber: number;
  /** Today's UTC day; differs from `day` on an old post. */
  today: string;
  isToday: boolean;
  /** Today's island post, when this post is an older day (DAY-3.3). */
  todayPost: { postId: string; dayNumber: number } | null;
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
  /** That day's island and your chart, for the thumbnail (W2). */
  island: { seed: string; modifier: Modifier; name: string };
  pieces: ChartPiece[];
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

export type BoardKind = 'trusted' | 'goldDay' | 'goldWeek' | 'cartographers';
export const BOARD_KINDS: readonly BoardKind[] = [
  'trusted',
  'goldDay',
  'goldWeek',
  'cartographers',
];

/** One line of a board. Chart boards also carry the chart's id and counts. */
export type BoardRow = {
  rank: number;
  name: string;
  value: number;
  chart?: { id: string; attempts: number; finds: number };
};

/** Top 10 plus the requesting player's own line, even outside the top 10 (COM-3.2). */
export type BoardResponse = {
  kind: BoardKind;
  rows: BoardRow[];
  me: BoardRow | null;
};

export type HallDay = {
  day: string;
  dayNumber: number;
  island: string;
  /** That day's frozen seed and modifier, so the client can draw its coastline. */
  seed: string;
  modifier: Modifier;
  top: ChartPublic[];
  /** Lowest find rate among charts with at least 5 attempts (COM-4.4). */
  cursed: ChartPublic | null;
};
export type HallResponse = { days: HallDay[] };

/** Exactly what "Share my chart" will post (COM-2.7). `image` is a PNG data URL. */
export type SharePreview = { image: string; text: string; shared: boolean };
export type ShareResponse = { commentId: string };
