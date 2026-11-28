// /internal routes: the daily scheduler task, the install trigger and moderator menu items (DAY-1).
import { Hono } from 'hono';
import { context, redis, type TaskResponse } from '@devvit/web/server';
import type { TriggerResponse, UiResponse } from '@devvit/web/shared';
import { serverCopy } from '../copy.ts';
import { redditPort } from '../jobs/reddit-port.ts';
import { runDaily } from '../services/daily.ts';
import { utcDay } from '../../shared/day.ts';
import { onCommentDeleted, onPostDeleted } from '../services/cleanup.ts';
import { applyReview, reviewQueue } from '../services/reports.ts';
import { isRecord } from '../store/guards.ts';
import { parseReview, reviewFormFor, statsFormFor } from './review-form.ts';
import { recentStats, statsLines } from '../services/stats.ts';

export const internal = new Hono();

const postUrl = (postId: string): string =>
  `https://reddit.com/r/${context.subredditName}/comments/${postId.replace(/^t3_/, '')}`;

internal.post('/jobs/daily', async (c) => {
  try {
    const r = await runDaily(redis, redditPort, Date.now());
    console.log(
      `daily: day ${r.dayNumber} ${r.created ? 'posted' : 'already posted'} ${r.postId}`
    );
    return c.json<TaskResponse>({}, 200);
  } catch (e) {
    console.error(`daily job failed: ${String(e)}`);
    return c.json<TaskResponse>({}, 500);
  }
});

internal.post('/triggers/install', async (c) => {
  try {
    const r = await runDaily(redis, redditPort, Date.now());
    return c.json<TriggerResponse>(
      { status: 'success', message: `day ${r.dayNumber}: ${r.postId}` },
      200
    );
  } catch (e) {
    console.error(`install: daily job failed: ${String(e)}`);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'daily job failed' },
      400
    );
  }
});

const menuRun = async (): Promise<UiResponse> => {
  try {
    const r = await runDaily(redis, redditPort, Date.now());
    return {
      showToast: r.created
        ? serverCopy.toastPosted(r.dayNumber)
        : serverCopy.toastAlready(r.dayNumber),
      navigateTo: postUrl(r.postId),
    };
  } catch (e) {
    console.error(`menu: daily job failed: ${String(e)}`);
    return { showToast: serverCopy.toastFailed };
  }
};

internal.post('/menu/post-today', async (c) =>
  c.json<UiResponse>(await menuRun(), 200)
);
internal.post('/menu/rerun', async (c) =>
  c.json<UiResponse>(await menuRun(), 200)
);

/** Moderator menu: list hidden charts for review (COM-1.3). */
internal.post('/menu/review', async (c) => {
  try {
    return c.json<UiResponse>(reviewFormFor(await reviewQueue(redis)), 200);
  } catch (e) {
    console.error(`review menu failed: ${String(e)}`);
    return c.json<UiResponse>({ showToast: serverCopy.toastFailed }, 200);
  }
});

internal.post('/forms/review', async (c) => {
  const picked = parseReview(await c.req.json().catch(() => null));
  if (picked === null)
    return c.json<UiResponse>({ showToast: serverCopy.reviewNone }, 200);
  try {
    const n = await applyReview(redis, picked.chartIds, picked.action);
    return c.json<UiResponse>(
      {
        showToast:
          picked.action === 'restore'
            ? serverCopy.reviewRestored(n)
            : serverCopy.reviewDeleted(n),
      },
      200
    );
  } catch (e) {
    console.error(`review form failed: ${String(e)}`);
    return c.json<UiResponse>({ showToast: serverCopy.toastFailed }, 200);
  }
});

const idField = async (
  body: Promise<unknown>,
  field: 'postId' | 'commentId'
): Promise<string | null> => {
  const b = await body.catch(() => null);
  const v = isRecord(b) ? b[field] : undefined;
  return typeof v === 'string' && v !== '' ? v : null;
};

/** COM-1.4: a deleted island post removes that day's charts, stats and indexes. */
internal.post('/triggers/post-delete', async (c) => {
  const postId = await idField(c.req.json(), 'postId');
  try {
    const n = postId === null ? 0 : await onPostDeleted(redis, postId);
    return c.json<TriggerResponse>(
      { status: 'success', message: `removed ${n}` },
      200
    );
  } catch (e) {
    console.error(`post-delete: ${String(e)}`);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'cleanup failed' },
      400
    );
  }
});

/** COM-2.5: a deleted share comment clears the chart's link to it. */
internal.post('/triggers/comment-delete', async (c) => {
  const commentId = await idField(c.req.json(), 'commentId');
  try {
    if (commentId !== null) await onCommentDeleted(redis, commentId);
    return c.json<TriggerResponse>({ status: 'success' }, 200);
  } catch (e) {
    console.error(`comment-delete: ${String(e)}`);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'cleanup failed' },
      400
    );
  }
});

/** Moderator menu: daily players, charts, hunts, find rate and return rates (SHIP-3.1). */
internal.post('/menu/stats', async (c) => {
  try {
    const lines = statsLines(await recentStats(redis, utcDay(Date.now())));
    return c.json<UiResponse>(statsFormFor(lines), 200);
  } catch (e) {
    console.error(`stats menu failed: ${String(e)}`);
    return c.json<UiResponse>({ showToast: serverCopy.toastFailed }, 200);
  }
});

internal.post('/forms/stats', (c) => c.json<UiResponse>({}, 200));
