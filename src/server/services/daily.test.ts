import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateChart } from '../../shared/chart.ts';
import { generateIsland } from '../../shared/island.ts';
import { K } from '../store/keys.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import { DAY, alice } from '../testing/fixtures.ts';
import { initFor } from './init.ts';
import { captainChartId, runDaily, type DailyPort } from './daily.ts';
import { readDay } from './island.ts';

const NOW = Date.parse('2026-12-07T00:00:05Z'); // Monday, day 3

const fakePort = (): DailyPort & {
  posts: string[];
  stickies: string[];
  failSticky: boolean;
} => {
  const posts: string[] = [];
  const stickies: string[] = [];
  const port = {
    posts,
    stickies,
    failSticky: false,
    createPost: async (title: string) => {
      posts.push(title);
      return `t3_post${posts.length}`;
    },
    stickyComment: async (postId: string) => {
      if (port.failSticky) throw new Error('reddit down');
      stickies.push(postId);
      return `t1_c${stickies.length}`;
    },
    setFlairs: async () => {},
    replies: async () => [],
  };
  return port;
};

test('DAY-1.1 creates one post for today with title and post data', async () => {
  const kv = new FakeKv();
  const port = fakePort();
  const r = await runDaily(kv, port, NOW);
  assert.equal(r.created, true);
  assert.equal(r.day, '2026-12-07');
  assert.equal(r.dayNumber, 3);
  assert.equal(port.posts.length, 1);
  assert.match(port.posts[0] ?? '', /^Isle of Maybe · Day 3 — /);
  const rec = await readDay(kv, '2026-12-07');
  assert.ok(rec !== null);
  assert.equal(rec.postId, 't3_post1');
  assert.equal(rec.modifier, 'clear');
  assert.equal(await kv.get(K.postDay('t3_post1')), '2026-12-07');
});

test('DAY-1.5 running again is idempotent: no second post', async () => {
  const kv = new FakeKv();
  const port = fakePort();
  await runDaily(kv, port, NOW);
  const again = await runDaily(kv, port, NOW + 60_000);
  assert.equal(again.created, false);
  assert.equal(again.postId, 't3_post1');
  assert.equal(port.posts.length, 1);
  assert.equal(port.stickies.length, 1);
});

test('DAY-1.2 the share thread is stickied, and filled in later if the first try failed', async () => {
  const kv = new FakeKv();
  const port = fakePort();
  port.failSticky = true;
  await assert.rejects(runDaily(kv, port, NOW));
  port.failSticky = false;
  const r = await runDaily(kv, port, NOW);
  assert.equal(r.created, false);
  assert.equal(port.posts.length, 1);
  assert.equal((await readDay(kv, '2026-12-07'))?.shareCommentId, 't1_c1');
});

test('DAY-1.3 three valid Old Captain charts are stored with chests, one per depth', async () => {
  const kv = new FakeKv();
  await runDaily(kv, fakePort(), NOW);
  const ids = (await kv.zRange(K.chartsCaptain('2026-12-07'), 0, -1)).map(
    (m) => m.member
  );
  assert.deepEqual(
    ids,
    [0, 1, 2].map((i) => captainChartId('2026-12-07', i))
  );
  const depths: string[] = [];
  for (const id of ids) {
    const h = await kv.hGetAll(K.chart(id));
    assert.equal(h.captain, '1');
    assert.deepEqual(validateChart(JSON.parse(h.pieces ?? '[]')), { ok: true });
    depths.push(h.depth ?? '');
  }
  assert.deepEqual(depths, ['shallow', 'buried', 'deep']);
});

test('DAY-1.6 the seed is frozen once stored', async () => {
  const kv = new FakeKv();
  await kv.hSet(K.day('2026-12-07'), { seed: 'frozen-seed' });
  await runDaily(kv, fakePort(), NOW);
  const rec = await readDay(kv, '2026-12-07');
  assert.equal(rec?.seed, generateIsland('frozen-seed', 'clear').seed);
});

test('CHART-4.1 the daily job leaves no player-data key without a TTL', async () => {
  const kv = new FakeKv();
  await runDaily(kv, fakePort(), NOW);
  // day:{d} is the tiny frozen day record and is kept on purpose (Architecture §5).
  assert.deepEqual(
    kv.keysWithoutTtl((k) => /^day:\d{4}-\d{2}-\d{2}$/.test(k)),
    []
  );
});

test("DAY-6.2 yesterday's top usable reply names today's island, with credit", async () => {
  const kv = new FakeKv();
  const day1 = fakePort();
  await runDaily(kv, day1, NOW - 86_400_000);
  const asked: string[] = [];
  const day2 = {
    ...fakePort(),
    replies: async (id: string) => {
      asked.push(id);
      return [
        { author: 'troll', body: 'Shit Rock', score: 90, removed: false },
        { author: 'gull', body: 'gull  hollow', score: 30, removed: false },
      ];
    },
  };
  await runDaily(kv, day2, NOW);
  assert.deepEqual(asked, ['t1_c1']);
  assert.equal(day2.posts[0], 'Isle of Maybe · Day 3 — Gull Hollow');
  const init = await initFor(kv, alice, DAY, NOW);
  assert.equal(init.island.name, 'Gull Hollow');
  assert.equal(init.island.namedBy, 'gull');
});

test('DAY-6.2 with no usable reply (or a failing call) the generated name stays', async () => {
  const kv = new FakeKv();
  await runDaily(kv, fakePort(), NOW - 86_400_000);
  const port = {
    ...fakePort(),
    replies: async () => {
      throw new Error('reddit down');
    },
  };
  await runDaily(kv, port, NOW);
  const init = await initFor(kv, alice, DAY, NOW);
  assert.equal(init.island.namedBy, null);
  assert.ok(init.island.name.length > 0);
});
