// Tier flair (COM-6.1): a find that moves a cartographer into a new tier queues them; the daily
// job sets flair for the queue in batches of at most 100. Flair is a bonus: failures only log.
import { tierFor } from '../../shared/scoring.ts';
import { serverCopy } from '../copy.ts';
import { K } from '../store/keys.ts';
import { TTL, type Kv } from '../store/kv.ts';

export const FLAIR_BATCH = 100;
/** Enough for any realistic day; the rest waits for tomorrow. */
export const FLAIR_MAX_BATCHES = 5;

export type FlairRow = { username: string; text: string };
export type SetFlairs = (rows: FlairRow[]) => Promise<void>;

export const queueFlair = async (
  kv: Kv,
  userId: string,
  nowMs: number
): Promise<void> => {
  await kv.zAdd(K.flairPending(), { member: userId, score: nowMs });
  await kv.expire(K.flairPending(), TTL.flair);
};

/** Set flair for queued players; returns how many were set. */
export const applyFlairs = async (
  kv: Kv,
  setFlairs: SetFlairs
): Promise<number> => {
  let done = 0;
  for (let b = 0; b < FLAIR_MAX_BATCHES; b++) {
    const ids = (
      await kv.zRange(K.flairPending(), 0, FLAIR_BATCH - 1, { by: 'rank' })
    ).map((m) => m.member);
    if (ids.length === 0) break;
    const rows: FlairRow[] = [];
    for (const id of ids) {
      const u = await kv.hMGet(K.user(id), ['name', 'finds']);
      const name = u[0];
      if (name === null || name === undefined || name === '') continue;
      rows.push({
        username: name,
        text: serverCopy.tierName[tierFor(Number(u[1] ?? 0) || 0)],
      });
    }
    try {
      if (rows.length > 0) await setFlairs(rows);
    } catch (e) {
      console.error(`flair batch failed: ${String(e)}`);
      return done;
    }
    await kv.zRem(K.flairPending(), ids);
    done += rows.length;
  }
  return done;
};
