// Sends live activity over Devvit realtime. Best effort: errors are logged, never thrown.
import { realtime } from '@devvit/web/server';
import type { LiveKind } from '../../shared/live.ts';
import { liveChannel } from '../../shared/live.ts';
import { liveMessage } from '../services/live.ts';
import { kv } from './http.ts';

export const announce = async (day: string, kind: LiveKind): Promise<void> => {
  try {
    await realtime.send(liveChannel(day), await liveMessage(kv, day, kind));
  } catch (e) {
    console.error(`live ${kind}: ${String(e)}`);
  }
};
