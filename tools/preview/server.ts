// Local preview: the real /api router (createApi) on an in-memory store, plus the built client.
// For screenshots and quick checks without Reddit. Never deployed.
//   npm run build && npm run preview:local   →   http://localhost:5180/game.html
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { utcDay } from '../../src/shared/day.ts';
import { depthClass } from '../../src/shared/depth.ts';
import { walkable } from '../../src/shared/path.ts';
import { rngFor } from '../../src/shared/rng.ts';
import type { ChartPiece } from '../../src/shared/types.ts';
import { createApi } from '../../src/server/routes/app.ts';
import { actorFrom } from '../../src/server/services/actor.ts';
import { runDaily } from '../../src/server/services/daily.ts';
import { requireDay } from '../../src/server/services/island.ts';
import { K } from '../../src/server/store/keys.ts';
import { FakeKv } from '../../src/server/testing/fake-kv.ts';

const kv = new FakeKv();
const now = Date.now();
const day = utcDay(now);
const port0 = {
  createPost: async () => 't3_preview',
  stickyComment: async () => 't1_sticky',
  setFlairs: async () => {},
};

// Yesterday's island with a chart by "you", so the Dispatch and the Hall have something to show.
const yNow = now - 86_400_000;
const yesterday = utcDay(yNow);
await runDaily(kv, port0, yNow);
{
  const { island: yIsland } = await requireDay(kv, yesterday);
  const chest = yIsland.landmarks[0]?.at ?? yIsland.dock;
  const pieces: ChartPiece[] = [
    ...yIsland.landmarks
      .slice(1, 4)
      .map((l): ChartPiece => ({
        k: 'stamp',
        t: l.type,
        x: l.at.x,
        y: l.at.y + 1,
      })),
    { k: 'x', x: chest.x + 1, y: chest.y },
  ];
  await kv.hSet(K.chart('yours-y'), {
    day: yesterday,
    authorId: 't2_you',
    authorName: 'you',
    pieces: JSON.stringify(pieces),
    chestX: String(chest.x),
    chestY: String(chest.y + 1),
    depth: 'deep',
    createdAt: String(yNow),
    hidden: '0',
    captain: '0',
  });
  await kv.hSet(K.chartStats('yours-y'), {
    attempts: '14',
    finds: '9',
    trueVotes: '12',
    cursedVotes: '2',
    reports: '0',
  });
  await kv.zAdd(K.chartsTrust(yesterday), { member: 'yours-y', score: 0.6 });
  await kv.zAdd(K.chartsAttempts(yesterday), { member: 'yours-y', score: 14 });
  await kv.hSet(K.userDay('t2_you', yesterday), { chartId: 'yours-y' });
  await kv.hSet(K.user('t2_you'), { name: 'you', gold: '1240', finds: '31' });
}
await runDaily(kv, port0, now);
const { island } = await requireDay(kv, day);

// A few strangers' charts, drawn "from memory": landmarks nudged, X a little off.
const rnd = rngFor(`${day}|preview`);
const sailors = ['marlin', 'kelpie', 'saltwhisker', 'brine_owl'];
for (const [i, name] of sailors.entries()) {
  let chest = island.dock;
  for (let tries = 0; tries < 500; tries++) {
    const t = { x: Math.floor(rnd() * 40), y: Math.floor(rnd() * 40) };
    if (
      walkable(island.terrain, t.x, t.y) &&
      Math.abs(t.x - island.dock.x) + Math.abs(t.y - island.dock.y) > 8
    ) {
      chest = t;
      break;
    }
  }
  const off = (): number => Math.round((rnd() - 0.5) * 4);
  const pieces: ChartPiece[] = [
    ...island.landmarks
      .slice(0, 3 + i)
      .map((l): ChartPiece => ({
        k: 'stamp',
        t: l.type,
        x: l.at.x + off(),
        y: l.at.y + off(),
      })),
    { k: 'path', pts: [island.dock, { x: island.dock.x, y: chest.y }, chest] },
    { k: 'x', x: chest.x + off(), y: chest.y + off() },
  ];
  const id = `preview-${i}`;
  await kv.hSet(K.chart(id), {
    day,
    authorId: `t2_${name}`,
    authorName: name,
    pieces: JSON.stringify(pieces),
    chestX: String(chest.x),
    chestY: String(chest.y),
    depth: depthClass(chest, island.landmarks),
    createdAt: String(now),
    hidden: '0',
    captain: '0',
    ...(i === 0 ? { note: 'closer' } : {}),
  });
  const attempts = [9, 0, 4, 2][i] ?? 0;
  const finds = [7, 0, 1, 2][i] ?? 0;
  await kv.hSet(K.chartStats(id), {
    attempts: String(attempts),
    finds: String(finds),
    trueVotes: String(finds),
    cursedVotes: '1',
    reports: '0',
  });
  await kv.zAdd(K.chartsTrust(day), {
    member: id,
    score: (finds + 1) / (attempts + 2),
  });
  await kv.zAdd(K.chartsAttempts(day), { member: id, score: attempts });
  await kv.hSet(K.user(`t2_${name}`), {
    name,
    gold: String(400 - i * 90),
    finds: String(finds * 3),
  });
  await kv.zAdd(K.boardGoldDay(day), {
    member: `t2_${name}`,
    score: 400 - i * 90,
  });
}
await kv.hSet(K.dayCounts(day), { buried: '38', found: '51', hunts: '120' });

const anon = process.env.PREVIEW_ANON === '1';
const you = actorFrom(
  anon ? { loid: 'preview' } : { userId: 't2_you', username: 'you' }
);
let n = 0;
const app = new Hono();
app.route(
  '/api',
  createApi({
    kv,
    actor: () => you,
    postDay: async () => day,
    now: () => Date.now(),
    newId: () => `p${++n}`,
    announce: async () => {},
    sharePort: {
      upload: async () => 'https://example.invalid/chart.png',
      comment: async () => 't1_preview',
    },
  })
);
app.use('/*', serveStatic({ root: './dist/client' }));
const port = Number(process.env.PORT ?? 5180);
serve({ fetch: app.fetch, port });
console.log(
  `preview on http://localhost:${port}/game.html (day ${day}, ${anon ? 'logged out' : 'u/you'})`
);
