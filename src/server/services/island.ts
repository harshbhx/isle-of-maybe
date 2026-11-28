// Loads a day's frozen island (seed + modifier from the day record) with a per-instance cache.
import type { Modifier } from '../../shared/day.ts';
import { generateIsland } from '../../shared/island.ts';
import type { Island } from '../../shared/types.ts';
import { ApiError } from '../store/errors.ts';
import { K } from '../store/keys.ts';
import type { Kv } from '../store/kv.ts';

export type DayRecord = {
  day: string;
  postId: string;
  seed: string;
  modifier: Modifier;
  name: string;
  shareCommentId: string;
  /** Who named this island from the comments, or '' (DAY-6.2). */
  namedBy: string;
};

const MODIFIERS: readonly Modifier[] = [
  'clear',
  'twins',
  'lowtide',
  'jungle',
  'fog',
  'lanterns',
  'storm',
];
export const asModifier = (v: string | undefined): Modifier =>
  MODIFIERS.find((m) => m === v) ?? 'clear';

export const readDay = async (
  kv: Kv,
  day: string
): Promise<DayRecord | null> => {
  const h = await kv.hGetAll(K.day(day));
  if (h.seed === undefined || h.postId === undefined || h.postId === 'pending')
    return null;
  return {
    day,
    postId: h.postId,
    seed: h.seed,
    modifier: asModifier(h.modifier),
    name: h.name ?? '',
    shareCommentId: h.shareCommentId ?? '',
    namedBy: h.namedBy ?? '',
  };
};

const cache = new Map<string, Island>();

export const islandOf = (rec: Pick<DayRecord, 'seed' | 'modifier'>): Island => {
  const k = `${rec.seed}|${rec.modifier}`;
  let isl = cache.get(k);
  if (isl === undefined) {
    isl = generateIsland(rec.seed, rec.modifier);
    cache.set(k, isl);
  }
  return isl;
};

export const requireDay = async (
  kv: Kv,
  day: string
): Promise<{ rec: DayRecord; island: Island }> => {
  const rec = await readDay(kv, day);
  if (rec === null) throw new ApiError('not_found', `no island for ${day}`);
  return { rec, island: islandOf(rec) };
};
