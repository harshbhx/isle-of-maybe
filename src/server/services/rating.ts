// True / Cursed votes on a chart you have hunted (HUNT-5.1). One vote per player per chart;
// votes nudge the chart's trust score, which orders the Trusted slot.
import type { RateResponse, Vote } from '../../shared/api.ts';
import { trustScore } from '../../shared/scoring.ts';
import { ApiError } from '../store/errors.ts';
import { K } from '../store/keys.ts';
import { TTL, hIncrTtl, hSetOnce, type Kv } from '../store/kv.ts';
import type { Actor } from './actor.ts';
import { readChart, readStats } from './charts.ts';

export const rateChart = async (
  kv: Kv,
  actor: Actor,
  chartId: string,
  vote: Vote
): Promise<RateResponse> => {
  if (!actor.loggedIn)
    throw new ApiError('not_logged_in', 'log in to rate charts');
  const chart = await readChart(kv, chartId);
  if (chart === null) throw new ApiError('not_found', 'no such chart');
  if ((await kv.hGet(K.userHunted(actor.id), chartId)) === undefined) {
    throw new ApiError('forbidden', 'finish a hunt on this chart first');
  }
  if (!(await hSetOnce(kv, K.chartVotes(chartId), actor.id, vote, TTL.chart))) {
    throw new ApiError('conflict', 'you already rated this chart');
  }
  await hIncrTtl(
    kv,
    K.chartStats(chartId),
    vote === 'true' ? 'trueVotes' : 'cursedVotes',
    1,
    TTL.chart
  );
  const stats = await readStats(kv, chartId);
  if (!chart.captain) {
    await kv.zAdd(K.chartsTrust(chart.day), {
      member: chartId,
      score: trustScore(stats),
    });
    await kv.expire(K.chartsTrust(chart.day), TTL.chart);
  }
  return { trueVotes: stats.trueVotes, cursedVotes: stats.cursedVotes };
};
