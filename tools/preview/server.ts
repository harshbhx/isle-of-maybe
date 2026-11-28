// Local preview: the real /api router (createApi) on an in-memory store, plus the built client.
// For screenshots and quick checks without Reddit. Never deployed.
//   npm run build && npm run preview:local   →   http://localhost:5180/game.html
//   PREVIEW_DAY=2026-12-09 npm run preview:local   →   the same, as if it were that UTC day (screenshots)
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { utcDay } from '../../src/shared/day.ts';
import { depthClass } from '../../src/shared/depth.ts';
import { aStar, walkable } from '../../src/shared/path.ts';
import { rngFor } from '../../src/shared/rng.ts';
import type { ChartPiece } from '../../src/shared/types.ts';
import { createApi } from '../../src/server/routes/app.ts';
import { actorFrom } from '../../src/server/services/actor.ts';
import { runDaily } from '../../src/server/services/daily.ts';
import { requireDay } from '../../src/server/services/island.ts';
import { K } from '../../src/server/store/keys.ts';
import { FakeKv } from '../../src/server/testing/fake-kv.ts';

const kv = new FakeKv();
// Optional fake calendar day, so screenshots show launch-week day numbers instead of "Day -6".
const fakeDay = process.env.PREVIEW_DAY;
const offset =
  fakeDay !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(fakeDay)
    ? Date.parse(`${fakeDay}T00:00:00Z`) +
      (Date.now() % 86_400_000) -
      Date.now()
    : 0;
const clock = (): number => Date.now() + offset;
const now = clock();
const day = utcDay(now);
const port0 = {
  createPost: async () => 't3_preview',
  stickyComment: async () => 't1_sticky',
  setFlairs: async () => {},
  replies: async () => [],
  crewGoal: async () => 50,
};

// Yesterday's island with a chart by "you", so the Dispatch and the Hall have something to show.
const yNow = now - 86_400_000;
const yesterday = utcDay(yNow);
await runDaily(kv, port0, yNow);
{
  const { island: yIsland } = await requireDay(kv, yesterday);
  const chest = yIsland.landmarks[0]?.at ?? yIsland.dock;
  const pieces: ChartPiece[] = [
    ...yIsland.landmarks.slice(1, 4).map((l): ChartPiece => ({
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
    ...island.landmarks.slice(0, 3 + i).map((l): ChartPiece => ({
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

// The crowd's worn paths (ADV-6.4): earlier hunters walked from the dock towards the strangers'
// chests, a few dozen times in all, so the preview shows the trails a busy day leaves.
{
  const trails = rngFor(`${day}|wear`);
  for (let h = 0; h < 140; h++) {
    const to = { x: Math.floor(trails() * 40), y: Math.floor(trails() * 40) };
    if (!walkable(island.terrain, to.x, to.y)) continue;
    const route = aStar(island.terrain, island.dock, to) ?? [];
    const seen = new Set(
      route
        .slice(0, Math.max(6, Math.floor(route.length * (0.5 + trails() / 2))))
        .map((t) => t.y * 40 + t.x)
    );
    for (const i of seen) await kv.hIncrBy(K.wear(day), String(i), 1);
  }
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
    now: clock,
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
