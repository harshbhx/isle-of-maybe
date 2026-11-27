// The tiles a player has uncovered on a day (HUNT-3.2). Burying is only allowed on these tiles
// (CHART-1.4), so only the server ever writes them.
import { markSeen, seenFromHex, seenToHex } from '../../shared/seen.ts';
import { K } from '../store/keys.ts';
import { TTL, type Kv } from '../store/kv.ts';

export { hasSeen } from '../../shared/seen.ts';

export const readSeenHex = async (
  kv: Kv,
  userId: string,
  day: string
): Promise<string> => seenToHex(seenFromHex(await kv.get(K.seen(userId, day))));

export const readSeen = async (
  kv: Kv,
  userId: string,
  day: string
): Promise<Uint8Array> => seenFromHex(await kv.get(K.seen(userId, day)));

export const addSeen = async (
  kv: Kv,
  userId: string,
  day: string,
  tileIndices: Iterable<number>
): Promise<void> => {
  const mask = await readSeen(kv, userId, day);
  for (const i of tileIndices) markSeen(mask, i);
  await kv.set(K.seen(userId, day), seenToHex(mask));
  await kv.expire(K.seen(userId, day), TTL.seen);
};
