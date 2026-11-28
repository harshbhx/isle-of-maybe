// Ghost pings (ADV-6.6): a logged-in hunter's current tile, read from the server's own hunt record
// (never from the client), at most once every 2 s per player. The rate key is the only thing kept.
import type { GhostMessage } from '../../shared/ghost.ts';
import { GHOST_EVERY_MS } from '../../shared/ghost.ts';
import { tierFor } from '../../shared/scoring.ts';
import { K } from '../store/keys.ts';
import type { Kv } from '../store/kv.ts';
import { ownsHunt, type Actor } from './actor.ts';

export const ghostPing = async (
  kv: Kv,
  actor: Actor,
  huntId: string,
  nowMs: number
): Promise<GhostMessage | null> => {
  if (!actor.loggedIn || actor.name === null) return null;
  const h = await kv.hGetAll(K.hunt(huntId));
  if (h.actorId === undefined || !ownsHunt(actor, h.actorId) || h.done === '1')
    return null;
  const last = Number((await kv.get(K.ghostRate(actor.id))) ?? 0);
  if (nowMs - last < GHOST_EVERY_MS) return null;
  await kv.set(K.ghostRate(actor.id), String(nowMs));
  await kv.expire(K.ghostRate(actor.id), 60);
  const finds = Number((await kv.hGet(K.user(actor.id), 'finds')) ?? 0) || 0;
  return {
    name: actor.name,
    x: Number(h.x) || 0,
    y: Number(h.y) || 0,
    tier: tierFor(finds),
  };
};
