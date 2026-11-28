// Shared plumbing for /api routes: who is calling, which day this post is, and error responses.
import type { Context } from 'hono';
import { context, redis } from '@devvit/web/server';
import type { ApiErrorBody } from '../../shared/api.ts';
import { ApiError, toApiError } from '../store/errors.ts';
import { K } from '../store/keys.ts';
import type { Kv } from '../store/kv.ts';
import { actorFrom, type Actor } from '../services/actor.ts';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const kv: Kv = redis;

export const currentActor = (): Actor =>
  actorFrom(
    {
      userId: context.userId,
      username: context.username,
      loid: context.loid,
    },
    crypto.randomUUID()
  );

/** The UTC day of the post being viewed, from post data or the post → day index. */
export const postDay = async (): Promise<string> => {
  const fromData = context.postData?.day;
  if (typeof fromData === 'string' && DAY_RE.test(fromData)) return fromData;
  if (context.postId !== undefined) {
    const d = await kv.get(K.postDay(context.postId));
    if (d !== undefined) return d;
  }
  throw new ApiError('not_found', 'this post is not an island');
};

/** Run a handler and turn thrown errors into JSON error responses. */
export const handle = async <T>(
  c: Context,
  fn: () => Promise<T>
): Promise<Response> => {
  try {
    return c.json(await fn(), 200);
  } catch (e) {
    const err = toApiError(e);
    if (err.status >= 500 || err.code === 'bad_request')
      console.error(`api ${c.req.path}: ${err.message}`);
    return c.json<ApiErrorBody>(
      { error: err.code, message: err.message },
      err.status
    );
  }
};

export { rateLimit } from './http-limits.ts';
