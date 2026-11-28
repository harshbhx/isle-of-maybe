// Burying your own chest and submitting the chart for it (CHART-1.4, CHART-1.5, CHART-3, CHART-4).
// Both are once per player per UTC day, and only on today's island.
import type {
  BuryResponse,
  ChartSubmitResponse,
  SeenResponse,
} from '../../shared/api.ts';
import { inkCheck, validateChart } from '../../shared/chart.ts';
import { utcDay } from '../../shared/day.ts';
import { depthClass } from '../../shared/depth.ts';
import { walkable } from '../../shared/path.ts';
import { trustScore } from '../../shared/scoring.ts';
import { idx, type ChartPiece, type Tile } from '../../shared/types.ts';
import { ApiError } from '../store/errors.ts';
import { K } from '../store/keys.ts';
import { TTL, hIncrTtl, hSetOnce, hSetTtl, type Kv } from '../store/kv.ts';
import type { Actor } from './actor.ts';
import { requireDay } from './island.ts';
import { hasSeen, readSeen, readSeenHex } from './seen.ts';

const requireLogin = (actor: Actor): void => {
  if (!actor.loggedIn)
    throw new ApiError('not_logged_in', 'log in to bury a chest');
};

const requireToday = (day: string, nowMs: number): void => {
  if (day !== utcDay(nowMs))
    throw new ApiError('conflict', 'not_today: bury on today’s island');
};

/** The player's seen mask for the bury screen (CHART-1.2). */
export const seenFor = async (
  kv: Kv,
  actor: Actor,
  day: string
): Promise<SeenResponse> => {
  requireLogin(actor);
  return { mask: await readSeenHex(kv, actor.id, day) };
};

/** Bury on a seen, walkable tile that isn't the dock or a landmark, after a finished hunt; once a day (CHART-1.4, CHART-1.5, CHART-1.7). */
export const buryChest = async (
  kv: Kv,
  actor: Actor,
  day: string,
  at: Tile,
  nowMs: number
): Promise<BuryResponse> => {
  requireLogin(actor);
  requireToday(day, nowMs);
  const { island } = await requireDay(kv, day);
  const onDock = at.x === island.dock.x && at.y === island.dock.y;
  const onLandmark = island.landmarks.some(
    (l) => l.at.x === at.x && l.at.y === at.y
  );
  if (!walkable(island.terrain, at.x, at.y) || onDock || onLandmark) {
    throw new ApiError('bad_request', 'you cannot bury there');
  }
  if (!hasSeen(await readSeen(kv, actor.id, day), idx(at.x, at.y))) {
    throw new ApiError('bad_request', 'you have not explored that tile');
  }
  const udKey = K.userDay(actor.id, day);
  if ((await kv.hGet(udKey, 'finished')) === undefined) {
    throw new ApiError('conflict', 'finish a hunt before you bury');
  }
  if (!(await hSetOnce(kv, udKey, 'buried', '1', TTL.userDay))) {
    throw new ApiError('conflict', 'you already buried today');
  }
  await hSetTtl(
    kv,
    udKey,
    { chestX: String(at.x), chestY: String(at.y) },
    TTL.userDay
  );
  await hIncrTtl(kv, K.dayCounts(day), 'buried', 1, TTL.dayCounts);
  return { at, depth: depthClass(at, island.landmarks) };
};

/** Store today's chart for the buried chest and grade it (CHART-3.1 – CHART-3.3, CHART-4.1). */
export const submitChart = async (
  kv: Kv,
  actor: Actor,
  day: string,
  pieces: ChartPiece[],
  chartId: string,
  nowMs: number
): Promise<ChartSubmitResponse> => {
  requireLogin(actor);
  requireToday(day, nowMs);
  const check = validateChart(pieces);
  if (!check.ok) throw new ApiError('bad_request', check.reason);
  const { island } = await requireDay(kv, day);
  const udKey = K.userDay(actor.id, day);
  const ud = await kv.hGetAll(udKey);
  if (ud.buried === undefined)
    throw new ApiError('conflict', 'bury your chest first');
  const chest = { x: Number(ud.chestX), y: Number(ud.chestY) };
  if (!(await hSetOnce(kv, udKey, 'chartId', chartId, TTL.userDay))) {
    throw new ApiError('conflict', 'you already charted today');
  }

  await hSetTtl(
    kv,
    K.chart(chartId),
    {
      day,
      authorId: actor.id,
      authorName: actor.name ?? '',
      pieces: JSON.stringify(pieces),
      chestX: String(chest.x),
      chestY: String(chest.y),
      depth: depthClass(chest, island.landmarks),
      createdAt: String(nowMs),
      hidden: '0',
      captain: '0',
    },
    TTL.chart
  );
  const stats = {
    attempts: 0,
    finds: 0,
    trueVotes: 0,
    cursedVotes: 0,
    reports: 0,
  };
  await hSetTtl(
    kv,
    K.chartStats(chartId),
    Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, String(v)])),
    TTL.chart
  );
  await kv.zAdd(K.chartsTrust(day), {
    member: chartId,
    score: trustScore(stats),
  });
  await kv.expire(K.chartsTrust(day), TTL.chart);
  await kv.zAdd(K.chartsAttempts(day), { member: chartId, score: 0 });
  await kv.expire(K.chartsAttempts(day), TTL.chart);
  if (actor.name !== null)
    await hSetTtl(kv, K.user(actor.id), { name: actor.name }, TTL.user);
  const ink = inkCheck(island, chest, pieces);
  await hSetTtl(kv, udKey, { grade: ink.grade }, TTL.userDay);
  return { chartId, ink };
};
