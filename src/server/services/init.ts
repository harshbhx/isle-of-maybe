// Everything the client needs on open: the post's island, today's counts and the player's state.
import type { InitResponse, UserState } from '../../shared/api.ts';
import { dayNumber, utcDay } from '../../shared/day.ts';
import { tierFor } from '../../shared/scoring.ts';
import { K } from '../store/keys.ts';
import type { Kv } from '../store/kv.ts';
import type { Actor } from './actor.ts';
import { MAX_HUNTS_PER_DAY } from './charts.ts';
import { requireDay } from './island.ts';

const num = (v: string | undefined): number =>
  v === undefined ? 0 : Number(v) || 0;

export const userState = async (
  kv: Kv,
  actor: Actor,
  day: string
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
  };
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
  return {
    day,
    dayNumber: dayNumber(day),
    today,
    isToday: day === today,
    island: { seed: rec.seed, modifier: rec.modifier, name: island.name },
    counts: {
      buried: num(counts.buried),
      found: num(counts.found),
      hunts: num(counts.hunts),
    },
    user: await userState(kv, actor, day),
  };
};
