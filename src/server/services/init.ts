// Everything the client needs on open: the post's island, today's counts and the player's state.
import type {
  InitResponse,
  MyChestState,
  UserState,
} from '../../shared/api.ts';
import type { Grade } from '../../shared/chart.ts';
import { dayNumber, utcDay } from '../../shared/day.ts';
import { depthClass } from '../../shared/depth.ts';
import { tierFor } from '../../shared/scoring.ts';
import type { Island } from '../../shared/types.ts';
import { K } from '../store/keys.ts';
import { TTL, hSetTtl, type Kv } from '../store/kv.ts';
import type { Actor } from './actor.ts';
import { MAX_HUNTS_PER_DAY, readStats } from './charts.ts';
import { dispatchFor } from './dispatch.ts';
import { readDay, requireDay } from './island.ts';
import { readStreak } from './streak.ts';

const num = (v: string | undefined): number =>
  v === undefined ? 0 : Number(v) || 0;

const GRADES: readonly Grade[] = ['sharp', 'steady', 'wobbly', 'cursed'];

/** The caller's own chest on this island, if they buried one (author-only, CHART-4.1). */
const myChest = async (
  kv: Kv,
  ud: Record<string, string>,
  island: Island
): Promise<MyChestState | null> => {
  if (
    ud.buried === undefined ||
    ud.chestX === undefined ||
    ud.chestY === undefined
  )
    return null;
  const at = { x: num(ud.chestX), y: num(ud.chestY) };
  const stats =
    ud.chartId === undefined ? null : await readStats(kv, ud.chartId);
  return {
    at,
    depth: depthClass(at, island.landmarks),
    grade: GRADES.find((g) => g === ud.grade) ?? null,
    attempts: stats?.attempts ?? 0,
    finds: stats?.finds ?? 0,
  };
};

export const userState = async (
  kv: Kv,
  actor: Actor,
  day: string,
  nowMs: number,
  island: Island
): Promise<UserState> => {
  const [u, ud] = await Promise.all([
    kv.hGetAll(K.user(actor.id)),
    kv.hGetAll(K.userDay(actor.id, day)),
  ]);
  const huntsToday = num(ud.hunts);
  const finds = num(u.finds);
  return {
    loggedIn: actor.loggedIn,
    name: actor.name,
    huntsToday,
    huntsLeft: Math.max(0, MAX_HUNTS_PER_DAY - huntsToday),
    buried: ud.buried !== undefined,
    chartId: ud.chartId ?? null,
    gold: num(u.gold),
    finds,
    tier: tierFor(finds),
    streak: actor.loggedIn ? await readStreak(kv, actor.id, nowMs) : 0,
    practiced: u.practiced === '1',
    chest: actor.loggedIn ? await myChest(kv, ud, island) : null,
  };
};

const todayPost = async (
  kv: Kv,
  today: string
): Promise<InitResponse['todayPost']> => {
  const rec = await readDay(kv, today);
  return rec === null
    ? null
    : { postId: rec.postId, dayNumber: dayNumber(today) };
};

export const initFor = async (
  kv: Kv,
  actor: Actor,
  day: string,
  nowMs: number
): Promise<InitResponse> => {
  const { rec, island } = await requireDay(kv, day);
  const today = utcDay(nowMs);
  const counts = await kv.hGetAll(K.dayCounts(day));
  const user = await userState(kv, actor, day, nowMs, island);
  return {
    day,
    dayNumber: dayNumber(day),
    today,
    isToday: day === today,
    todayPost: day === today ? null : await todayPost(kv, today),
    island: { seed: rec.seed, modifier: rec.modifier, name: island.name },
    counts: {
      buried: num(counts.buried),
      found: num(counts.found),
      hunts: num(counts.hunts),
    },
    user,
    dispatch: await dispatchFor(kv, actor, today, user.finds),
  };
};

/** Remember that this player finished or skipped Practice Cove (UI-9.2). */
export const markPracticed = async (
  kv: Kv,
  actor: Actor
): Promise<{ practiced: true }> => {
  await hSetTtl(kv, K.user(actor.id), { practiced: '1' }, TTL.user);
  return { practiced: true };
};
