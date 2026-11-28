// Player reports and moderator review (COM-1.2, COM-1.3). Three reports hide a chart and queue it;
// a moderator restores or deletes it from the subreddit menu.
import type { ReportResponse } from '../../shared/api.ts';
import { ApiError } from '../store/errors.ts';
import { K } from '../store/keys.ts';
import { TTL, hIncrTtl, hSetOnce, hSetTtl, type Kv } from '../store/kv.ts';
import type { Actor } from './actor.ts';
import { readChart, readStats } from './charts.ts';

export const REPORTS_TO_HIDE = 3;
export const REVIEW_PAGE = 20;

/** One report per player per chart; the third hides the chart and queues it for review. */
export const reportChart = async (
  kv: Kv,
  actor: Actor,
  chartId: string,
  nowMs: number
): Promise<ReportResponse> => {
  if (!actor.loggedIn)
    throw new ApiError('not_logged_in', 'log in to report charts');
  const chart = await readChart(kv, chartId);
  if (chart === null) throw new ApiError('not_found', 'no such chart');
  if (chart.captain || chart.authorId === actor.id) {
    throw new ApiError('forbidden', 'you cannot report this chart');
  }
  const first = await hSetOnce(
    kv,
    K.chartReporters(chartId),
    actor.id,
    '1',
    TTL.reports
  );
  if (!first) return { reported: true };
  const n = await hIncrTtl(kv, K.chartStats(chartId), 'reports', 1, TTL.chart);
  if (n >= REPORTS_TO_HIDE && !chart.hidden) {
    await hSetTtl(kv, K.chart(chartId), { hidden: '1' }, TTL.chart);
    await kv.zAdd(K.reportsQueue(), { member: chartId, score: nowMs });
    await kv.expire(K.reportsQueue(), TTL.reports);
  }
  return { reported: true };
};

export type QueuedChart = {
  id: string;
  author: string;
  day: string;
  reports: number;
};

/** The oldest hidden charts first, at most 20. Charts that expired drop out of the queue. */
export const reviewQueue = async (kv: Kv): Promise<QueuedChart[]> => {
  const ids = (
    await kv.zRange(K.reportsQueue(), 0, REVIEW_PAGE * 2 - 1, { by: 'rank' })
  ).map((m) => m.member);
  const out: QueuedChart[] = [];
  for (const id of ids) {
    const c = await readChart(kv, id);
    if (c === null) {
      await kv.zRem(K.reportsQueue(), [id]);
      continue;
    }
    const s = await readStats(kv, id);
    out.push({ id, author: c.authorName, day: c.day, reports: s.reports });
    if (out.length >= REVIEW_PAGE) break;
  }
  return out;
};

/** Show the chart again. Reporters stay recorded, so the same players can't hide it again. */
export const restoreChart = async (kv: Kv, chartId: string): Promise<void> => {
  if ((await readChart(kv, chartId)) === null) return;
  await hSetTtl(kv, K.chart(chartId), { hidden: '0' }, TTL.chart);
  await hSetTtl(kv, K.chartStats(chartId), { reports: '0' }, TTL.chart);
  await kv.zRem(K.reportsQueue(), [chartId]);
};

/** Remove the chart and everything that points at it. */
export const deleteChart = async (kv: Kv, chartId: string): Promise<void> => {
  const chart = await readChart(kv, chartId);
  if (chart !== null) {
    await kv.zRem(K.chartsTrust(chart.day), [chartId]);
    await kv.zRem(K.chartsAttempts(chart.day), [chartId]);
  }
  await kv.del(
    K.chart(chartId),
    K.chartStats(chartId),
    K.chartVotes(chartId),
    K.chartReporters(chartId)
  );
  await kv.zRem(K.reportsQueue(), [chartId]);
};

/**
 * The author removes their own chart (COM-1.6; Devvit Rules: users can remove their own content).
 * Everything that points at it goes, and the author's day record forgets it; the chest stays buried
 * so a deletion can't be used to bury again the same day.
 */
export const deleteOwnChart = async (
  kv: Kv,
  actor: Actor,
  chartId: string
): Promise<{ deleted: true }> => {
  const chart = await readChart(kv, chartId);
  if (chart === null || chart.captain)
    throw new ApiError('not_found', 'no such chart');
  if (!actor.loggedIn || chart.authorId !== actor.id)
    throw new ApiError('forbidden', 'you can only delete your own chart');
  await deleteChart(kv, chartId);
  await kv.hDel(K.userDay(actor.id, chart.day), ['chartId']);
  return { deleted: true };
};

export type ReviewAction = 'restore' | 'delete';

export const applyReview = async (
  kv: Kv,
  chartIds: readonly string[],
  action: ReviewAction
): Promise<number> => {
  for (const id of chartIds) {
    if (action === 'restore') await restoreChart(kv, id);
    else await deleteChart(kv, id);
  }
  return chartIds.length;
};
