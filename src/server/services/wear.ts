// Crowd-worn paths on the server (ADV-6.4, D32): each finished hunt adds 1 to every distinct tile
// it crossed; the levels are rebuilt from the counts at most once a minute. Never per player.
import { encodeWear } from '../../shared/wear.ts';
import { getBit } from '../../shared/bits.ts';
import { H, W } from '../../shared/types.ts';
import { K } from '../store/keys.ts';
import { TTL, type Kv } from '../store/kv.ts';

export const WEAR_REBUILD_MS = 60_000;

/** Add one hunt's trail (a seen-style bitmask of the tiles it stepped on). */
export const recordTrail = async (
  kv: Kv,
  day: string,
  trail: Uint8Array
): Promise<void> => {
  let any = false;
  for (let i = 0; i < W * H; i++) {
    if (!getBit(trail, i)) continue;
    await kv.hIncrBy(K.wear(day), String(i), 1);
    any = true;
  }
  if (any) await kv.expire(K.wear(day), TTL.dayCounts);
};

export const wearFor = async (
  kv: Kv,
  day: string,
  nowMs: number
): Promise<{ levels: string }> => {
  const cached = await kv.hGetAll(K.wearCache(day));
  if (
    cached.levels !== undefined &&
    nowMs - (Number(cached.at) || 0) < WEAR_REBUILD_MS
  )
    return { levels: cached.levels };
  const levels = encodeWear(await kv.hGetAll(K.wear(day)));
  await kv.hSet(K.wearCache(day), { levels, at: String(nowMs) });
  await kv.expire(K.wearCache(day), TTL.dayCounts);
  return { levels };
};
