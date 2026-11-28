// Honouring deletions (COM-1.4, COM-2.5): a deleted island post takes its day's charts, stats and
// indexes with it; a deleted share comment clears the chart's link so it can be shared again.
import { K } from '../store/keys.ts';
import type { Kv } from '../store/kv.ts';
import { deleteChart } from './reports.ts';

/** Returns how many charts were removed; 0 when the post wasn't an island. */
export const onPostDeleted = async (
  kv: Kv,
  postId: string
): Promise<number> => {
  const day = await kv.get(K.postDay(postId));
  if (day === undefined) return 0;
  if ((await kv.hGet(K.day(day), 'postId')) !== postId) {
    await kv.del(K.postDay(postId));
    return 0;
  }
  const ids = new Set<string>();
  for (const key of [
    K.chartsTrust(day),
    K.chartsAttempts(day),
    K.chartsCaptain(day),
  ]) {
    for (const m of await kv.zRange(key, 0, -1)) ids.add(m.member);
  }
  for (const id of ids) await deleteChart(kv, id);
  await kv.del(
    K.chartsTrust(day),
    K.chartsAttempts(day),
    K.chartsCaptain(day),
    K.dayCounts(day),
    K.trustedCache(day),
    K.day(day),
    K.postDay(postId)
  );
  return ids.size;
};

export const onCommentDeleted = async (
  kv: Kv,
  commentId: string
): Promise<boolean> => {
  const chartId = await kv.get(K.shareComment(commentId));
  if (chartId === undefined) return false;
  if ((await kv.hGet(K.chart(chartId), 'shareCommentId')) === commentId) {
    await kv.hDel(K.chart(chartId), ['shareCommentId']);
  }
  await kv.del(K.shareComment(commentId));
  return true;
};
