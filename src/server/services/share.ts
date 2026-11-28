// "Share my chart" (COM-2.2, COM-2.7): the server draws the image and writes the text from the
// stored chart, so the preview matches the post and a modified client can't post anything else.
import type { SharePreview, ShareResponse } from '../../shared/api.ts';
import { serverCopy } from '../copy.ts';
import { chartImage } from '../render/chart-image.ts';
import { pngDataUrl } from '../render/png.ts';
import { ApiError } from '../store/errors.ts';
import { K } from '../store/keys.ts';
import { TTL, hSetOnce, hSetTtl, type Kv } from '../store/kv.ts';
import type { Actor } from './actor.ts';
import { readChart, type StoredChart } from './charts.ts';
import { islandOf, readDay } from './island.ts';

export type SharePort = {
  /** Upload a PNG data URL; returns the hosted media URL. */
  upload: (dataUrl: string) => Promise<string>;
  /** Comment as the user under the share sticky; returns the comment id. */
  comment: (
    parentId: string,
    text: string,
    mediaUrl: string
  ) => Promise<string>;
};

type Prepared = {
  chart: StoredChart;
  image: string;
  text: string;
  stickyId: string;
};

const prepare = async (
  kv: Kv,
  actor: Actor,
  day: string
): Promise<Prepared> => {
  if (!actor.loggedIn) throw new ApiError('not_logged_in', 'log in to share');
  const chartId = await kv.hGet(K.userDay(actor.id, day), 'chartId');
  if (chartId === undefined)
    throw new ApiError('conflict', 'chart your chest first');
  const chart = await readChart(kv, chartId);
  if (chart === null || chart.hidden || chart.authorId !== actor.id) {
    throw new ApiError('not_found', 'no chart to share');
  }
  const rec = await readDay(kv, day);
  if (rec === null)
    throw new ApiError('not_found', 'this post is not an island');
  const island = islandOf(rec);
  return {
    chart,
    image: pngDataUrl(chartImage(island, chart.pieces, chart.depth)),
    text: serverCopy.shareComment(
      chart.depth,
      rec.name !== '' ? rec.name : island.name
    ),
    stickyId: rec.shareCommentId,
  };
};

export const sharePreview = async (
  kv: Kv,
  actor: Actor,
  day: string
): Promise<SharePreview> => {
  const p = await prepare(kv, actor, day);
  const posted = await kv.hGet(K.chart(p.chart.id), 'shareCommentId');
  return {
    image: p.image,
    text: p.text,
    shared: posted !== undefined && posted !== '',
  };
};

/** Post once per chart; again only after the earlier comment was deleted (COM-2.5 clears it). */
export const postShare = async (
  kv: Kv,
  actor: Actor,
  day: string,
  port: SharePort
): Promise<ShareResponse> => {
  const p = await prepare(kv, actor, day);
  if (p.stickyId === '')
    throw new ApiError('conflict', 'the share thread is missing');
  const key = K.chart(p.chart.id);
  if (!(await hSetOnce(kv, key, 'shareCommentId', 'pending', TTL.chart))) {
    throw new ApiError('conflict', 'already shared');
  }
  try {
    const mediaUrl = await port.upload(p.image);
    const commentId = await port.comment(p.stickyId, p.text, mediaUrl);
    await hSetTtl(kv, key, { shareCommentId: commentId }, TTL.chart);
    await kv.set(K.shareComment(commentId), p.chart.id);
    await kv.expire(K.shareComment(commentId), TTL.chart);
    return { commentId };
  } catch (e) {
    await kv.hDel(key, ['shareCommentId']);
    throw e;
  }
};
