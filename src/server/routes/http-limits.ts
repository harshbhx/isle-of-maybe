// Per-caller rate limit for /api calls (HUNT-6.1). Kept free of Devvit imports so tests can load it.
import { ApiError } from '../store/errors.ts';
import { K } from '../store/keys.ts';
import { TTL, type Kv } from '../store/kv.ts';
import type { Actor } from '../services/actor.ts';

export const MAX_CALLS_PER_SECOND = 10;

/** At most 10 API calls per second per caller. */
export const rateLimit = async (
  store: Kv,
  actor: Actor,
  nowMs: number
): Promise<void> => {
  const key = K.rate(actor.id, Math.floor(nowMs / 1000));
  const n = await store.incrBy(key, 1);
  await store.expire(key, TTL.rate);
  if (n > MAX_CALLS_PER_SECOND) throw new ApiError('rate_limited', 'slow down');
};
