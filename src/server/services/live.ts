// Builds the live message after a find or a burial. Sending is the route's job, so a realtime
// failure never fails the player's action (COM-5.1).
import type { LiveKind, LiveMessage } from '../../shared/live.ts';
import { K } from '../store/keys.ts';
import type { Kv } from '../store/kv.ts';

const num = (v: string | undefined): number =>
  v === undefined ? 0 : Number(v) || 0;

export const liveMessage = async (
  kv: Kv,
  day: string,
  kind: LiveKind
): Promise<LiveMessage> => {
  const c = await kv.hGetAll(K.dayCounts(day));
  return {
    kind,
    counts: { buried: num(c.buried), found: num(c.found), hunts: num(c.hunts) },
  };
};
