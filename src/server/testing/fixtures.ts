// Test fixtures: a posted day and hand-made player charts in a FakeKv.
import type { ChartPiece } from '../../shared/types.ts';
import { K } from '../store/keys.ts';
import type { Actor } from '../services/actor.ts';
import { runDaily, type DailyPort } from '../services/daily.ts';
import type { FakeKv } from './fake-kv.ts';

export const DAY = '2026-12-07';
export const NOW = Date.parse(`${DAY}T06:00:00Z`);

export const alice: Actor = { id: 't2_alice', name: 'alice', loggedIn: true };
export const bob: Actor = { id: 't2_bob', name: 'bob', loggedIn: true };
export const carol: Actor = { id: 't2_carol', name: 'carol', loggedIn: true };
export const anon: Actor = { id: 'anon:loid1', name: null, loggedIn: false };

export const nullPort: DailyPort = {
  createPost: async () => 't3_day',
  stickyComment: async () => 't1_sticky',
  setFlairs: async () => {},
  replies: async () => [],
};

export const postDay = async (kv: FakeKv, now = NOW): Promise<void> => {
  await runDaily(kv, nullPort, now);
};

export const addChart = async (
  kv: FakeKv,
  o: {
    id: string;
    author: { id: string; name: string | null };
    chest?: { x: number; y: number };
    depth?: string;
    pieces?: ChartPiece[];
    trust?: number;
    attempts?: number;
    hidden?: boolean;
    day?: string;
  }
): Promise<void> => {
  const day = o.day ?? DAY;
  await kv.hSet(K.chart(o.id), {
    day,
    authorId: o.author.id,
    authorName: o.author.name ?? '',
    pieces: JSON.stringify(o.pieces ?? [{ k: 'x', x: 20, y: 20 }]),
    chestX: String(o.chest?.x ?? 20),
    chestY: String(o.chest?.y ?? 20),
    depth: o.depth ?? 'buried',
    createdAt: day,
    hidden: o.hidden === true ? '1' : '0',
    captain: '0',
  });
  await kv.hSet(K.chartStats(o.id), {
    attempts: String(o.attempts ?? 0),
    finds: '0',
    trueVotes: '0',
    cursedVotes: '0',
    reports: '0',
  });
  await kv.zAdd(K.chartsTrust(day), { member: o.id, score: o.trust ?? 0.5 });
  await kv.zAdd(K.chartsAttempts(day), {
    member: o.id,
    score: o.attempts ?? 0,
  });
};
