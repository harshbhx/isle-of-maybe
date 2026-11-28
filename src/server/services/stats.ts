// Evidence for the write-up (SHIP-3.1): per day, players, player charts, hunts, hunts per chart,
// find rate, and how many of that day's players came back the next day and three days later.
import { addDays, dayNumber } from '../../shared/day.ts';
import { K } from '../store/keys.ts';
import type { Kv } from '../store/kv.ts';

export type DayStats = {
  day: string;
  dayNumber: number;
  players: number;
  charts: number;
  hunts: number;
  chartHunts: number;
  found: number;
  /** Share of this day's players who also played the next day / three days later; null if not yet known. */
  return1: number | null;
  return3: number | null;
};

const MAX_MEMBERS = 5000;
const num = (v: string | undefined): number =>
  v === undefined ? 0 : Number(v) || 0;

const players = async (kv: Kv, day: string): Promise<Set<string>> =>
  new Set(
    (
      await kv.zRange(K.dayPlayers(day), 0, MAX_MEMBERS - 1, { by: 'rank' })
    ).map((m) => m.member)
  );

const overlap = (a: Set<string>, b: Set<string>): number => {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
};

export const dayStats = async (
  kv: Kv,
  day: string,
  today: string
): Promise<DayStats> => {
  const counts = await kv.hGetAll(K.dayCounts(day));
  const charts = await kv.zRange(K.chartsAttempts(day), 0, MAX_MEMBERS - 1, {
    by: 'rank',
  });
  const p = await players(kv, day);
  const ret = async (after: number): Promise<number | null> => {
    const later = addDays(day, after);
    if (later > today || p.size === 0) return null;
    return overlap(p, await players(kv, later)) / p.size;
  };
  return {
    day,
    dayNumber: dayNumber(day),
    players: p.size,
    charts: charts.length,
    hunts: num(counts.hunts),
    chartHunts: charts.reduce((s, m) => s + m.score, 0),
    found: num(counts.found),
    return1: await ret(1),
    return3: await ret(3),
  };
};

/** The last `days` days, newest first. */
export const recentStats = async (
  kv: Kv,
  today: string,
  days = 7
): Promise<DayStats[]> => {
  const out: DayStats[] = [];
  for (let i = 0; i < days; i++)
    out.push(await dayStats(kv, addDays(today, -i), today));
  return out;
};

const pct = (v: number | null): string =>
  v === null ? '–' : `${Math.round(v * 100)}%`;

/** One line per day for the moderator form. */
export const statsLines = (rows: readonly DayStats[]): string[] =>
  rows.map(
    (r) =>
      `Day ${r.dayNumber} (${r.day}): ${r.players} players · ${r.charts} charts · ${r.hunts} hunts (${
        r.charts === 0 ? 0 : (r.chartHunts / r.charts).toFixed(1)
      }/chart) · find rate ${r.hunts === 0 ? '–' : `${Math.round((100 * r.found) / r.hunts)}%`} · back next day ${pct(r.return1)} · day 3 ${pct(r.return3)}`
  );
