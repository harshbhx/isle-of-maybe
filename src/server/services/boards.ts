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
import type { Kv } from '../store/kv.ts';
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

/** Today's most trusted player charts with at least 3 attempts (COM-3.1, COM-3.3). */
const trustedBoard = async (
  kv: Kv,
  day: string,
  actor: Actor
): Promise<BoardResponse> => {
  const ids = await kv.zRange(K.chartsTrust(day), 0, SCAN - 1, {
    by: 'rank',
    reverse: true,
  });
  const rows: BoardRow[] = [];
  let me: BoardRow | null = null;
  let pos = 0;
  for (const m of ids) {
    const c = await readChart(kv, m.member);
    if (!playerChart(c)) continue;
    const s = await readStats(kv, c.id);
    if (s.attempts < TRUSTED_MIN_ATTEMPTS) continue;
    pos++;
    const row: BoardRow = {
      rank: pos,
      name: c.authorName,
      value: Math.round((100 * s.finds) / s.attempts),
      chart: { id: c.id, attempts: s.attempts, finds: s.finds },
    };
    if (pos <= BOARD_SIZE) rows.push(row);
    if (actor.loggedIn && c.authorId === actor.id) me = row;
    if (pos >= BOARD_SIZE && (me !== null || !actor.loggedIn)) break;
  }
  return { kind: 'trusted', rows, me };
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

/** Past days, newest first, up to 14, never before launch (COM-4). */
export const hall = async (kv: Kv, today: string): Promise<HallResponse> => {
  const days: HallDay[] = [];
  for (let i = 1; i <= HALL_DAYS; i++) {
    const day = addDays(today, -i);
    if (day < LAUNCH_DAY) break;
    const d = await hallDay(kv, day);
    if (d !== null) days.push(d);
  }
  return { days };
};
