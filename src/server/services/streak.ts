// Reading and writing a player's streak bits, one key per UTC year (DAY-4.1, DAY-4.2).
import { bitsFromHex, bitsToHex, getBit, setBit } from '../../shared/bits.ts';
import { utcDay } from '../../shared/day.ts';
import {
  STREAK_BYTES,
  dayOfYear,
  streakLength,
  yearOf,
} from '../../shared/streak.ts';
import { K } from '../store/keys.ts';
import { TTL, type Kv } from '../store/kv.ts';

const readYear = async (
  kv: Kv,
  userId: string,
  year: number
): Promise<Uint8Array> =>
  bitsFromHex(await kv.get(K.streak(userId, year)), STREAK_BYTES);

/** Set today's bit when a hunt finishes. Same-day repeats are harmless. */
export const markStreak = async (
  kv: Kv,
  userId: string,
  nowMs: number
): Promise<void> => {
  const day = utcDay(nowMs);
  const year = yearOf(day);
  const bits = await readYear(kv, userId, year);
  setBit(bits, dayOfYear(day));
  await kv.set(K.streak(userId, year), bitsToHex(bits));
  await kv.expire(K.streak(userId, year), TTL.streak);
};

/** Current streak, reading this year and last so it carries across 1 January. */
export const readStreak = async (
  kv: Kv,
  userId: string,
  nowMs: number
): Promise<number> => {
  const today = utcDay(nowMs);
  const y = yearOf(today);
  const years = new Map([
    [y, await readYear(kv, userId, y)],
    [y - 1, await readYear(kv, userId, y - 1)],
  ]);
  const isSet = (day: string): boolean => {
    const bits = years.get(yearOf(day));
    return bits !== undefined && getBit(bits, dayOfYear(day));
  };
  return streakLength(isSet, today);
};
