import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays } from '../../shared/day.ts';
import { tierProgress } from '../../shared/scoring.ts';
import { K } from '../store/keys.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import {
  DAY,
  NOW,
  addChart,
  alice,
  anon,
  bob,
  postDay,
} from '../testing/fixtures.ts';
import { dispatchFor } from './dispatch.ts';
import { initFor } from './init.ts';
import { markStreak, readStreak } from './streak.ts';

const DAY_MS = 86_400_000;

test('DAY-4.1 finishing hunts sets one bit per UTC day, in a key that expires', async () => {
  const kv = new FakeKv();
  for (const i of [3, 2, 1]) await markStreak(kv, alice.id, NOW - i * DAY_MS);
  await markStreak(kv, alice.id, NOW - DAY_MS);
  assert.equal(await readStreak(kv, alice.id, NOW), 3);
  await markStreak(kv, alice.id, NOW);
  assert.equal(await readStreak(kv, alice.id, NOW), 4);
  assert.deepEqual(kv.keysWithoutTtl(), []);
  assert.ok(kv.data.has(K.streak(alice.id, 2026)));
});

test('DAY-4.2 the streak reads last year’s key on 1 January', async () => {
  const kv = new FakeKv();
  const jan2 = Date.parse('2027-01-02T09:00:00Z');
  for (const i of [3, 2, 1, 0])
    await markStreak(kv, alice.id, jan2 - i * DAY_MS);
  assert.equal(await readStreak(kv, alice.id, jan2), 4);
});

/** Bob charted on each of the last few days; days with no chart are skipped. */
const charted = async (
  kv: FakeKv,
  daysAgo: number,
  id: string,
  finds: number,
  depth = 'deep'
): Promise<void> => {
  const day = addDays(DAY, -daysAgo);
  await addChart(kv, { id, author: bob, day, depth });
  await kv.hSet(K.userDay(bob.id, day), { chartId: id });
  await kv.hSet(K.chartStats(id), {
    attempts: String(finds * 2),
    finds: String(finds),
    trueVotes: '2',
    cursedVotes: '1',
  });
};

test('DAY-5.1 the Dispatch lists your charts from the last 3 days with live counts', async () => {
  const kv = new FakeKv();
  await charted(kv, 1, 'b1', 4);
  await charted(kv, 3, 'b3', 1, 'shallow');
  await charted(kv, 4, 'b4', 9);
  const d = await dispatchFor(kv, bob, DAY, 6);
  assert.deepEqual(
    d.charts.map((c) => c.chartId),
    ['b1', 'b3']
  );
  const [b1] = d.charts;
  assert.ok(b1 !== undefined);
  assert.equal(b1.attempts, 8);
  assert.equal(b1.finds, 4);
  assert.equal(b1.trueVotes, 2);
  assert.equal(b1.cursedVotes, 1);
  assert.equal(b1.salvage, 4 * 30);
  assert.equal(d.charts[1]?.salvage, 10);
  assert.deepEqual(d.tier, {
    tier: 'mapmaker',
    finds: 6,
    next: { tier: 'navigator', at: 25 },
  });
  assert.equal(JSON.stringify(d).includes('chest'), false);
  assert.deepEqual((await dispatchFor(kv, anon, DAY, 0)).charts, []);
});

test('DAY-5.1 init carries the streak and the Dispatch', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  await charted(kv, 1, 'b1', 2);
  await markStreak(kv, bob.id, NOW - DAY_MS);
  const r = await initFor(kv, bob, DAY, NOW);
  assert.equal(r.user.streak, 1);
  assert.equal(r.dispatch.charts.length, 1);
  assert.equal((await initFor(kv, anon, DAY, NOW)).user.streak, 0);
});

test('DAY-5.1 tier progress names the next tier and its threshold', () => {
  assert.deepEqual(tierProgress(0), {
    tier: 'deckhand',
    finds: 0,
    next: { tier: 'mapmaker', at: 5 },
  });
  assert.deepEqual(tierProgress(30), {
    tier: 'navigator',
    finds: 30,
    next: { tier: 'cartographer', at: 75 },
  });
  assert.equal(tierProgress(500).next, null);
});
