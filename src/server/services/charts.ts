// Reading charts and choosing the three a player is offered (HUNT-1). The only place that turns a
// stored chart into its public form, so chest coordinates cannot leak from here (HUNT-1.5).
import type { ChartPublic, PickResponse, PickSlot } from '../../shared/api.ts';
import type { ChartPiece, Depth } from '../../shared/types.ts';
import { K } from '../store/keys.ts';
import type { Kv } from '../store/kv.ts';
import type { Actor } from './actor.ts';

export const MAX_HUNTS_PER_DAY = 3;

export type StoredChart = {
  id: string;
  day: string;
  authorId: string;
  authorName: string;
  pieces: ChartPiece[];
  chest: { x: number; y: number };
  depth: Depth;
  hidden: boolean;
  captain: boolean;
};

const DEPTHS: readonly Depth[] = ['shallow', 'buried', 'deep'];
const num = (v: string | undefined): number =>
  v === undefined ? 0 : Number(v) || 0;

const parsePieces = (raw: string | undefined): ChartPiece[] => {
  try {
    const v: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export const readChart = async (
  kv: Kv,
  id: string
): Promise<StoredChart | null> => {
  const h = await kv.hGetAll(K.chart(id));
  if (h.day === undefined) return null;
  return {
    id,
    day: h.day,
    authorId: h.authorId ?? '',
    authorName: h.authorName ?? '',
    pieces: parsePieces(h.pieces),
    chest: { x: num(h.chestX), y: num(h.chestY) },
    depth: DEPTHS.find((d) => d === h.depth) ?? 'shallow',
    hidden: h.hidden === '1',
    captain: h.captain === '1',
  };
};

export const readStats = async (
  kv: Kv,
  id: string
): Promise<{
  attempts: number;
  finds: number;
  trueVotes: number;
  cursedVotes: number;
  reports: number;
}> => {
  const s = await kv.hGetAll(K.chartStats(id));
  return {
    attempts: num(s.attempts),
    finds: num(s.finds),
    trueVotes: num(s.trueVotes),
    cursedVotes: num(s.cursedVotes),
    reports: num(s.reports),
  };
};

/** The public view of a chart. Deliberately built field by field: no chest, no author id. */
export const toPublic = async (
  kv: Kv,
  c: StoredChart
): Promise<ChartPublic> => {
  const s = await readStats(kv, c.id);
  return {
    id: c.id,
    day: c.day,
    author: c.authorName,
    captain: c.captain,
    pieces: c.pieces,
    depth: c.depth,
    attempts: s.attempts,
    finds: s.finds,
    trueVotes: s.trueVotes,
    cursedVotes: s.cursedVotes,
  };
};

export const usedCharts = async (
  kv: Kv,
  actor: Actor,
  day: string
): Promise<string[]> => {
  try {
    const v: unknown = JSON.parse(
      (await kv.hGet(K.userDay(actor.id, day), 'used')) ?? '[]'
    );
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
};

/** Can this actor hunt this chart today? (HUNT-1.2, HUNT-2.3) */
export const eligible = (
  c: StoredChart,
  actor: Actor,
  day: string,
  used: readonly string[]
): boolean =>
  c.day === day &&
  !c.hidden &&
  c.authorId !== actor.id &&
  !used.includes(c.id) &&
  (actor.loggedIn || c.captain);

const firstEligible = async (
  kv: Kv,
  ids: readonly string[],
  ok: (c: StoredChart) => boolean
): Promise<StoredChart | null> => {
  for (const id of ids) {
    const c = await readChart(kv, id);
    if (c !== null && ok(c)) return c;
  }
  return null;
};

const SCAN = 25;

/** Trusted, Fresh and Old Captain charts, filling empty slots with captain charts (HUNT-1.1, HUNT-1.3). */
export const pickCharts = async (
  kv: Kv,
  actor: Actor,
  day: string
): Promise<PickResponse> => {
  const used = await usedCharts(kv, actor, day);
  const taken = new Set<string>();
  const ok = (c: StoredChart): boolean =>
    eligible(c, actor, day, used) && !taken.has(c.id);
  const out: { slot: PickSlot; c: StoredChart }[] = [];

  if (actor.loggedIn) {
    const trustIds = (
      await kv.zRange(K.chartsTrust(day), 0, SCAN - 1, {
        by: 'rank',
        reverse: true,
      })
    ).map((m) => m.member);
    const trusted = await firstEligible(
      kv,
      trustIds,
      (c) => ok(c) && !c.captain
    );
    if (trusted !== null) {
      out.push({ slot: 'trusted', c: trusted });
      taken.add(trusted.id);
    }
    const freshIds = (
      await kv.zRange(K.chartsAttempts(day), 0, SCAN - 1, { by: 'rank' })
    ).map((m) => m.member);
    const fresh = await firstEligible(kv, freshIds, (c) => ok(c) && !c.captain);
    if (fresh !== null) {
      out.push({ slot: 'fresh', c: fresh });
      taken.add(fresh.id);
    }
  }

  const captainIds = (await kv.zRange(K.chartsCaptain(day), 0, -1)).map(
    (m) => m.member
  );
  for (const id of captainIds) {
    if (out.length >= 3) break;
    const c = await readChart(kv, id);
    if (c !== null && ok(c)) {
      out.push({ slot: 'captain', c });
      taken.add(c.id);
    }
  }

  return {
    charts: await Promise.all(
      out.map(async ({ slot, c }) => ({ slot, chart: await toPublic(kv, c) }))
    ),
  };
};
