// The slice of Devvit's Redis client the game uses. Services take a Kv so tests can pass FakeKv.
import type { RedisClient } from '@devvit/web/server';

export type Kv = Pick<
  RedisClient,
  | 'get'
  | 'set'
  | 'del'
  | 'expire'
  | 'incrBy'
  | 'hGet'
  | 'hSet'
  | 'hSetNX'
  | 'hGetAll'
  | 'hIncrBy'
  | 'hDel'
  | 'hMGet'
  | 'zAdd'
  | 'zRange'
  | 'zRank'
  | 'zScore'
  | 'zIncrBy'
  | 'zRem'
  | 'zCard'
>;

const DAY_S = 86_400;

/** Expiry per key family, in seconds (docs/05-ARCHITECTURE.md §5, COM-1.5, CHART-4.1). */
export const TTL = {
  dayCounts: 40 * DAY_S,
  chart: 30 * DAY_S,
  user: 30 * DAY_S,
  userDay: 8 * DAY_S,
  seen: 2 * DAY_S,
  streak: 400 * DAY_S,
  hunt: 2 * DAY_S,
  board: 40 * DAY_S,
  reports: 30 * DAY_S,
  rate: 2,
} as const;

/** hSet + expire in one call, so no hash is ever written without a TTL. */
export const hSetTtl = async (
  kv: Kv,
  key: string,
  fields: Record<string, string>,
  ttl: number
): Promise<void> => {
  await kv.hSet(key, fields);
  await kv.expire(key, ttl);
};

/** hIncrBy + expire. */
export const hIncrTtl = async (
  kv: Kv,
  key: string,
  field: string,
  by: number,
  ttl: number
): Promise<number> => {
  const n = await kv.hIncrBy(key, field, by);
  await kv.expire(key, ttl);
  return n;
};

/** zIncrBy + expire. */
export const zIncrTtl = async (
  kv: Kv,
  key: string,
  member: string,
  by: number,
  ttl: number
): Promise<number> => {
  const n = await kv.zIncrBy(key, member, by);
  await kv.expire(key, ttl);
  return n;
};

/** hSetNX + expire; returns true when this call set the field. */
export const hSetOnce = async (
  kv: Kv,
  key: string,
  field: string,
  value: string,
  ttl: number
): Promise<boolean> => {
  const set = await kv.hSetNX(key, field, value);
  await kv.expire(key, ttl);
  return set === 1;
};
