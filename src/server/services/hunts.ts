// Server-authoritative hunts (HUNT-2 – HUNT-4). The client only proposes steps and digs; the
// server replays them with the shared rules, and the chest stays here until the hunt ends.
import type {
  DigResponse,
  HuntStartResponse,
  Reveal,
  StepsResponse,
} from '../../shared/api.ts';
import { chartX } from '../../shared/chart.ts';
import { revealRadius, utcDay } from '../../shared/day.ts';
import {
  digFinds,
  euclid,
  isAdjacent4,
  revealAround,
  shortestSteps,
  walkable,
} from '../../shared/path.ts';
import {
  finderGold,
  salvage,
  tierFor,
  trustScore,
} from '../../shared/scoring.ts';
import type { Island, Tile } from '../../shared/types.ts';
import { ApiError } from '../store/errors.ts';
import { K } from '../store/keys.ts';
import {
  TTL,
  hIncrTtl,
  hSetOnce,
  hSetTtl,
  zIncrTtl,
  type Kv,
} from '../store/kv.ts';
import { ownsHunt, type Actor } from './actor.ts';
import {
  MAX_HUNTS_PER_DAY,
  eligible,
  readChart,
  readStats,
  usedCharts,
  usedField,
} from './charts.ts';
import { requireDay } from './island.ts';
import { addSeen } from './seen.ts';
import { queueFlair } from './flair.ts';
import { markStreak } from './streak.ts';
import { weekKey } from './weeks.ts';

export const SHOVELS = 3;
export const MAX_STEPS_PER_CALL = 200;

type Hunt = {
  id: string;
  actorId: string;
  chartId: string;
  day: string;
  at: Tile;
  steps: number;
  shovels: number;
  index: number;
  done: boolean;
};

const num = (v: string | undefined): number =>
  v === undefined ? 0 : Number(v) || 0;

const loadHunt = async (kv: Kv, actor: Actor, id: string): Promise<Hunt> => {
  const h = await kv.hGetAll(K.hunt(id));
  if (h.actorId === undefined) throw new ApiError('not_found', 'no such hunt');
  if (!ownsHunt(actor, h.actorId))
    throw new ApiError('forbidden', 'not your hunt');
  return {
    id,
    actorId: h.actorId,
    chartId: h.chartId ?? '',
    day: h.day ?? '',
    at: { x: num(h.x), y: num(h.y) },
    steps: num(h.steps),
    shovels: num(h.shovels),
    index: num(h.index),
    done: h.done === '1',
  };
};

const reveal = async (
  kv: Kv,
  actor: Actor,
  day: string,
  island: Island,
  tiles: readonly Tile[]
): Promise<void> => {
  if (!actor.loggedIn) return; // Seen tiles only matter for burying, which needs an account.
  const r = revealRadius(island.modifier);
  const set = new Set<number>();
  for (const t of tiles) for (const i of revealAround(t, r)) set.add(i);
  await addSeen(kv, actor.id, day, set);
};

/** Start a hunt at the dock with 3 shovels (HUNT-2.1 – HUNT-2.3). */
export const startHunt = async (
  kv: Kv,
  actor: Actor,
  day: string,
  chartId: string,
  huntId: string
): Promise<HuntStartResponse> => {
  const { island } = await requireDay(kv, day);
  const chart = await readChart(kv, chartId);
  if (chart === null) throw new ApiError('not_found', 'no such chart');
  const used = await usedCharts(kv, actor, day);
  if (!eligible(chart, actor, day, used))
    throw new ApiError('forbidden', 'you cannot hunt this chart');
  const udKey = K.userDay(actor.id, day);
  if (num(await kv.hGet(udKey, 'hunts')) >= MAX_HUNTS_PER_DAY)
    throw new ApiError('conflict', 'no hunts left today');

  // Claim the chart and the hunt slot atomically: parallel starts must not slip past either.
  if (!(await hSetOnce(kv, udKey, usedField(chartId), '1', TTL.userDay))) {
    throw new ApiError('conflict', 'you already hunted this chart');
  }
  const n = await hIncrTtl(kv, udKey, 'hunts', 1, TTL.userDay);
  if (n > MAX_HUNTS_PER_DAY) {
    await kv.hIncrBy(udKey, 'hunts', -1);
    await kv.hDel(udKey, [usedField(chartId)]);
    throw new ApiError('conflict', 'no hunts left today');
  }
  await hSetTtl(
    kv,
    K.hunt(huntId),
    {
      actorId: actor.id,
      chartId,
      day,
      x: String(island.dock.x),
      y: String(island.dock.y),
      steps: '0',
      shovels: String(SHOVELS),
      index: '0',
      done: '0',
    },
    TTL.hunt
  );
  await reveal(kv, actor, day, island, [island.dock]);
  return { huntId, at: island.dock, shovels: SHOVELS };
};

/** Apply a batch of steps. Idempotent by step index; all-or-nothing on bad steps (HUNT-3.1 – HUNT-3.3). */
export const applySteps = async (
  kv: Kv,
  actor: Actor,
  huntId: string,
  from: number,
  steps: readonly Tile[]
): Promise<StepsResponse> => {
  const hunt = await loadHunt(kv, actor, huntId);
  if (hunt.done) throw new ApiError('conflict', 'hunt is over');
  if (from > hunt.index)
    throw new ApiError('conflict', `expected steps from index ${hunt.index}`);
  const fresh = steps.slice(hunt.index - from);
  if (fresh.length === 0) return { at: hunt.at, index: hunt.index };

  const { island } = await requireDay(kv, hunt.day);
  let prev = hunt.at;
  for (const s of fresh) {
    if (!isAdjacent4(prev, s) || !walkable(island.terrain, s.x, s.y)) {
      throw new ApiError('bad_request', `illegal step to ${s.x},${s.y}`);
    }
    prev = s;
  }
  await hSetTtl(
    kv,
    K.hunt(huntId),
    {
      x: String(prev.x),
      y: String(prev.y),
      steps: String(hunt.steps + fresh.length),
      index: String(hunt.index + fresh.length),
    },
    TTL.hunt
  );
  await reveal(kv, actor, hunt.day, island, fresh);
  return { at: prev, index: hunt.index + fresh.length };
};

const endHunt = async (
  kv: Kv,
  actor: Actor,
  hunt: Hunt,
  found: boolean,
  shovelsLeft: number,
  nowMs: number
): Promise<Reveal> => {
  // Exactly once, even if the client double-taps (no double pay).
  const first = (await kv.hSetNX(K.hunt(hunt.id), 'ended', '1')) === 1;
  if (!first) {
    const stored = await kv.hGet(K.hunt(hunt.id), 'reveal');
    if (stored !== undefined) return JSON.parse(stored);
    throw new ApiError('conflict', 'hunt is ending');
  }
  const { island } = await requireDay(kv, hunt.day);
  const chart = await readChart(kv, hunt.chartId);
  if (chart === null) throw new ApiError('not_found', 'chart expired');
  const x = chartX(chart.pieces);
  const gold = found
    ? finderGold(
        chart.depth,
        shovelsLeft,
        hunt.steps,
        shortestSteps(island, chart.chest)
      )
    : 0;

  // Chart stats and rankings (HUNT-4.4, HUNT-4.5).
  await hIncrTtl(kv, K.chartStats(chart.id), 'attempts', 1, TTL.chart);
  if (found) await hIncrTtl(kv, K.chartStats(chart.id), 'finds', 1, TTL.chart);
  if (!chart.captain) {
    await kv.zAdd(K.chartsTrust(hunt.day), {
      member: chart.id,
      score: trustScore(await readStats(kv, chart.id)),
    });
    await kv.expire(K.chartsTrust(hunt.day), TTL.chart);
    await zIncrTtl(kv, K.chartsAttempts(hunt.day), chart.id, 1, TTL.chart);
  }
  await hIncrTtl(kv, K.dayCounts(hunt.day), 'hunts', 1, TTL.dayCounts);
  await kv.zAdd(K.dayPlayers(utcDay(nowMs)), {
    member: actor.id,
    score: nowMs,
  });
  await kv.expire(K.dayPlayers(utcDay(nowMs)), TTL.players);
  if (found)
    await hIncrTtl(kv, K.dayCounts(hunt.day), 'found', 1, TTL.dayCounts);

  if (actor.loggedIn) {
    // Unlocks burying on this island (CHART-1.7).
    await hIncrTtl(
      kv,
      K.userDay(actor.id, hunt.day),
      'finished',
      1,
      TTL.userDay
    );
    await hSetTtl(
      kv,
      K.userHunted(actor.id),
      { [chart.id]: found ? 'found' : 'missed' },
      TTL.chart
    );
    await markStreak(kv, actor.id, nowMs);
    if (actor.name !== null)
      await hSetTtl(kv, K.user(actor.id), { name: actor.name }, TTL.user);
    if (gold > 0) {
      await hIncrTtl(kv, K.user(actor.id), 'gold', gold, TTL.user);
      await zIncrTtl(kv, K.boardGoldDay(hunt.day), actor.id, gold, TTL.board);
      await zIncrTtl(
        kv,
        K.boardGoldWeek(weekKey(hunt.day)),
        actor.id,
        gold,
        TTL.board
      );
    }
  }
  if (found && !chart.captain) {
    const pay = salvage(chart.depth);
    const finds = await hIncrTtl(
      kv,
      K.user(chart.authorId),
      'finds',
      1,
      TTL.user
    );
    if (tierFor(finds) !== tierFor(finds - 1))
      await queueFlair(kv, chart.authorId, nowMs);
    await hIncrTtl(kv, K.user(chart.authorId), 'gold', pay, TTL.user);
    await zIncrTtl(kv, K.boardCartographers(), chart.authorId, 1, TTL.board);
  }

  const result: Reveal = {
    found,
    chest: chart.chest,
    chartX: x,
    distance: x === null ? null : Math.round(euclid(x, chart.chest)),
    gold,
    steps: hunt.steps,
    shovelsLeft,
  };
  await hSetTtl(
    kv,
    K.hunt(hunt.id),
    { done: '1', reveal: JSON.stringify(result) },
    TTL.hunt
  );
  return result;
};

/** Dig where you stand (HUNT-4.1, HUNT-4.2). */
export const dig = async (
  kv: Kv,
  actor: Actor,
  huntId: string,
  at: Tile,
  nowMs: number
): Promise<DigResponse> => {
  const hunt = await loadHunt(kv, actor, huntId);
  if (hunt.done) throw new ApiError('conflict', 'hunt is over');
  if (at.x !== hunt.at.x || at.y !== hunt.at.y)
    throw new ApiError('bad_request', 'you can only dig where you stand');
  if (hunt.shovels <= 0) throw new ApiError('conflict', 'no shovels left');
  const chart = await readChart(kv, hunt.chartId);
  if (chart === null) throw new ApiError('not_found', 'chart expired');

  const shovelsLeft = hunt.shovels - 1;
  await hSetTtl(kv, K.hunt(huntId), { shovels: String(shovelsLeft) }, TTL.hunt);
  const found = digFinds(at, chart.chest);
  if (!found && shovelsLeft > 0)
    return { found: false, shovelsLeft, done: false };
  return {
    found,
    shovelsLeft,
    done: true,
    reveal: await endHunt(kv, actor, hunt, found, shovelsLeft, nowMs),
  };
};

export const giveUp = async (
  kv: Kv,
  actor: Actor,
  huntId: string,
  nowMs: number
): Promise<Reveal> => {
  const hunt = await loadHunt(kv, actor, huntId);
  if (hunt.done) {
    const stored = await kv.hGet(K.hunt(huntId), 'reveal');
    if (stored !== undefined) return JSON.parse(stored);
  }
  return endHunt(kv, actor, hunt, false, hunt.shovels, nowMs);
};
