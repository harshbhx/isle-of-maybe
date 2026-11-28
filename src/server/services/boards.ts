// Leaderboards and the Hall of Charts (COM-3, COM-4). Chart boards skip Old Captain and hidden
// charts and never carry chest positions: every chart goes out through toPublic.
import type {
  BoardKind,
  BoardResponse,
  BoardRow,
  HallDay,
  HallResponse,
} from '../../shared/api.ts';
import { LAUNCH_DAY, addDays, dayNumber } from '../../shared/day.ts';
import { K } from '../store/keys.ts';
import { TTL, type Kv } from '../store/kv.ts';
import type { Actor } from './actor.ts';
import { readChart, readStats, toPublic, type StoredChart } from './charts.ts';
import { islandOf, readDay } from './island.ts';
import { weekKey } from './weeks.ts';

export const BOARD_SIZE = 10;
export const TRUSTED_MIN_ATTEMPTS = 3;
export const CURSED_MIN_ATTEMPTS = 5;
export const HALL_DAYS = 14;
/** How far down a chart index we look when filtering. */
const SCAN = 200;

const nameOf = async (kv: Kv, userId: string): Promise<string> =>
  (await kv.hGet(K.user(userId), 'name')) ?? '';

const playerChart = (c: StoredChart | null): c is StoredChart =>
  c !== null && !c.captain && !c.hidden;

/** A gold or finds board stored as a zset of user ids. */
const userBoard = async (
  kv: Kv,
  kind: BoardKind,
  key: string,
  actor: Actor
): Promise<BoardResponse> => {
  const top = await kv.zRange(key, 0, BOARD_SIZE - 1, {
    by: 'rank',
    reverse: true,
  });
  const rows: BoardRow[] = [];
  for (const [i, m] of top.entries()) {
    rows.push({
      rank: i + 1,
      name: await nameOf(kv, m.member),
      value: m.score,
    });
  }
  let me: BoardRow | null = null;
  if (actor.loggedIn) {
    const score = await kv.zScore(key, actor.id);
    const asc = await kv.zRank(key, actor.id);
    if (score !== undefined && asc !== undefined) {
      const rank = (await kv.zCard(key)) - asc;
      me = { rank, name: await nameOf(kv, actor.id), value: score };
    }
  }
  return { kind, rows, me };
};

type Ranked = { authorId: string; row: BoardRow };

/** All ranked player charts for a day; cached for 30 s because every open of the board needs it. */
const rankedCharts = async (kv: Kv, day: string): Promise<Ranked[]> => {
  const cached = await kv.get(K.trustedCache(day));
  if (cached !== undefined) {
    const list: Ranked[] = JSON.parse(cached);
    return list;
  }
  const ids = await kv.zRange(K.chartsTrust(day), 0, SCAN - 1, {
    by: 'rank',
    reverse: true,
  });
  const list: Ranked[] = [];
  for (const m of ids) {
    const c = await readChart(kv, m.member);
    if (!playerChart(c)) continue;
    const s = await readStats(kv, c.id);
    if (s.attempts < TRUSTED_MIN_ATTEMPTS) continue;
    list.push({
      authorId: c.authorId,
      row: {
        rank: list.length + 1,
        name: c.authorName,
        value: Math.round((100 * s.finds) / s.attempts),
        chart: { id: c.id, attempts: s.attempts, finds: s.finds },
      },
    });
  }
  await kv.set(K.trustedCache(day), JSON.stringify(list));
  await kv.expire(K.trustedCache(day), TTL.trustedCache);
  return list;
};

/** Today's most trusted player charts with at least 3 attempts (COM-3.1, COM-3.3). */
const trustedBoard = async (
  kv: Kv,
  day: string,
  actor: Actor
): Promise<BoardResponse> => {
  const list = await rankedCharts(kv, day);
  const mine = actor.loggedIn
    ? list.find((r) => r.authorId === actor.id)
    : undefined;
  return {
    kind: 'trusted',
    rows: list.slice(0, BOARD_SIZE).map((r) => r.row),
    me: mine?.row ?? null,
  };
};

export const board = async (
  kv: Kv,
  kind: BoardKind,
  day: string,
  actor: Actor
): Promise<BoardResponse> => {
  switch (kind) {
    case 'trusted':
      return trustedBoard(kv, day, actor);
    case 'goldDay':
      return userBoard(kv, kind, K.boardGoldDay(day), actor);
    case 'goldWeek':
      return userBoard(kv, kind, K.boardGoldWeek(weekKey(day)), actor);
    case 'cartographers':
      return userBoard(kv, kind, K.boardCartographers(), actor);
  }
};

const hallDay = async (kv: Kv, day: string): Promise<HallDay | null> => {
  const rec = await readDay(kv, day);
  if (rec === null) return null;
  const top: StoredChart[] = [];
  for (const m of await kv.zRange(K.chartsTrust(day), 0, SCAN - 1, {
    by: 'rank',
    reverse: true,
  })) {
    const c = await readChart(kv, m.member);
    if (!playerChart(c) || (await readStats(kv, c.id)).attempts === 0) continue;
    top.push(c);
    if (top.length >= 3) break;
  }
  let cursed: StoredChart | null = null;
  let worst = Infinity;
  for (const m of await kv.zRange(K.chartsAttempts(day), 0, SCAN - 1, {
    by: 'rank',
    reverse: true,
  })) {
    if (m.score < CURSED_MIN_ATTEMPTS) break;
    const c = await readChart(kv, m.member);
    if (!playerChart(c)) continue;
    const s = await readStats(kv, c.id);
    const rate = s.finds / Math.max(1, s.attempts);
    if (rate < worst) {
      worst = rate;
      cursed = c;
    }
  }
  return {
    day,
    dayNumber: dayNumber(day),
    island: rec.name !== '' ? rec.name : islandOf(rec).name,
    top: await Promise.all(top.map((c) => toPublic(kv, c))),
    cursed: cursed === null ? null : await toPublic(kv, cursed),
  };
};

/** Past days, newest first, up to 14, never before launch (COM-4). Cached for 10 minutes. */
export const hall = async (kv: Kv, today: string): Promise<HallResponse> => {
  const cached = await kv.get(K.hallCache(today));
  if (cached !== undefined) {
    const r: HallResponse = JSON.parse(cached);
    return r;
  }
  const days: HallDay[] = [];
  for (let i = 1; i <= HALL_DAYS; i++) {
    const day = addDays(today, -i);
    if (day < LAUNCH_DAY) break;
    const d = await hallDay(kv, day);
    if (d !== null) days.push(d);
  }
  await kv.set(K.hallCache(today), JSON.stringify({ days }));
  await kv.expire(K.hallCache(today), TTL.hallCache);
  return { days };
};
