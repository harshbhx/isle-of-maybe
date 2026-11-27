// The tiles a player has uncovered on a day, as a 1,600-bit mask stored in hex (HUNT-3.2).
// Burying is only allowed on these tiles (CHART-1.4), so only the server ever writes them.
import { H, W } from '../../shared/types.ts';
import { K } from '../store/keys.ts';
import { TTL, type Kv } from '../store/kv.ts';

const BYTES = (W * H) / 8;

const fromHex = (hex: string | undefined): Uint8Array => {
  const out = new Uint8Array(BYTES);
  if (hex === undefined || hex.length !== BYTES * 2) return out;
  for (let i = 0; i < BYTES; i++)
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0;
  return out;
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export const readSeen = async (
  kv: Kv,
  userId: string,
  day: string
): Promise<Uint8Array> => fromHex(await kv.get(K.seen(userId, day)));

export const hasSeen = (mask: Uint8Array, tileIndex: number): boolean =>
  (((mask[tileIndex >> 3] ?? 0) >> (tileIndex & 7)) & 1) === 1;

export const addSeen = async (
  kv: Kv,
  userId: string,
  day: string,
  tileIndices: Iterable<number>
): Promise<void> => {
  const mask = await readSeen(kv, userId, day);
  for (const i of tileIndices)
    mask[i >> 3] = (mask[i >> 3] ?? 0) | (1 << (i & 7));
  await kv.set(K.seen(userId, day), toHex(mask));
  await kv.expire(K.seen(userId, day), TTL.seen);
};

/** All seen tile indices, for the client's bury view (CHART-1.2). */
export const seenIndices = (mask: Uint8Array): number[] => {
  const out: number[] = [];
  for (let i = 0; i < W * H; i++) if (hasSeen(mask, i)) out.push(i);
  return out;
};
