// Live ghost explorers (ADV-6.6, ADV-6.7): other hunters on today's island, sent at most once every
// 2 s while they move. Only a name, a tile and a flair tier travel; nothing is stored.
import type { Tier } from './scoring.ts';

export type GhostMessage = { name: string; x: number; y: number; tier: Tier };

export const GHOST_EVERY_MS = 2000;
export const GHOST_FADE_MS = 10_000;
export const MAX_GHOSTS = 8;

/** One ghost channel per island day, apart from the counts channel (COM-5.1). No ':' allowed. */
export const ghostChannel = (day: string): string =>
  `ghost-${day.replaceAll('-', '')}`;
