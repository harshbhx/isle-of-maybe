import assert from 'node:assert/strict';
import { test } from 'node:test';
import { K } from '../store/keys.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import {
  DAY,
  NOW,
  addChart,
  alice,
  anon,
  bob,
  carol,
  postDay,
} from '../testing/fixtures.ts';
import { pickCharts } from './charts.ts';
import { initFor } from './init.ts';

const slots = async (kv: FakeKv, who = alice): Promise<string[]> =>
  (await pickCharts(kv, who, DAY)).charts.map((c) => `${c.slot}:${c.chart.id}`);

test('HUNT-1.1 offers Trusted, Fresh and Old Captain', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  await addChart(kv, { id: 'top', author: bob, trust: 0.9, attempts: 10 });
  await addChart(kv, { id: 'new', author: carol, trust: 0.5, attempts: 0 });
  assert.deepEqual(await slots(kv), [
    'trusted:top',
    'fresh:new',
    `captain:cap-${DAY}-0`,
  ]);
});

test('HUNT-1.2 never offers your own, hidden or already-hunted charts', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  await addChart(kv, { id: 'mine', author: alice, trust: 0.99 });
  await addChart(kv, { id: 'hidden', author: bob, trust: 0.95, hidden: true });
  await addChart(kv, { id: 'done', author: bob, trust: 0.9 });
  await addChart(kv, { id: 'ok', author: carol, trust: 0.6 });
  await kv.hSet(K.userDay(alice.id, DAY), { used: JSON.stringify(['done']) });
  const ids = (await pickCharts(kv, alice, DAY)).charts.map((c) => c.chart.id);
  assert.ok(
    !ids.includes('mine') && !ids.includes('hidden') && !ids.includes('done')
  );
  assert.ok(ids.includes('ok'));
});

test('HUNT-1.3 empty slots are filled with Old Captain charts', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  assert.deepEqual(
    await slots(kv),
    [0, 1, 2].map((i) => `captain:cap-${DAY}-${i}`)
  );
  await addChart(kv, { id: 'only', author: bob });
  assert.deepEqual(await slots(kv), [
    'trusted:only',
    `captain:cap-${DAY}-0`,
    `captain:cap-${DAY}-1`,
  ]);
});

test('HUNT-2.3 logged-out viewers are only offered Old Captain charts', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  await addChart(kv, { id: 'player', author: bob });
  const s = await slots(kv, anon);
  assert.equal(s.length, 3);
  assert.ok(s.every((x) => x.startsWith('captain:')));
});

test('HUNT-1.5 picker responses carry only public chart fields, never the chest', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  await addChart(kv, { id: 'secret', author: bob, chest: { x: 17, y: 23 } });
  const res = await pickCharts(kv, alice, DAY);
  const json = JSON.stringify(res);
  assert.ok(!json.includes('chest'));
  assert.ok(!json.includes(bob.id), 'author ids stay private');
  const publicKeys = [
    'attempts',
    'author',
    'captain',
    'cursedVotes',
    'day',
    'depth',
    'finds',
    'id',
    'pieces',
    'trueVotes',
  ];
  for (const { chart } of res.charts) {
    assert.deepEqual(Object.keys(chart).sort(), publicKeys);
    if (!chart.captain) continue;
    const h = await kv.hGetAll(K.chart(chart.id));
    const chest = { x: Number(h.chestX), y: Number(h.chestY) };
    for (const p of chart.pieces) {
      const pts = p.k === 'path' ? p.pts : [p];
      assert.ok(
        pts.every((t) => t.x !== chest.x || t.y !== chest.y),
        `${chart.id} shows its chest`
      );
    }
  }
});

test('HUNT-1.1 init returns the post day, island and player state', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  const r = await initFor(kv, alice, DAY, NOW);
  assert.equal(r.day, DAY);
  assert.equal(r.dayNumber, 3);
  assert.equal(r.isToday, true);
  assert.equal(r.user.huntsLeft, 3);
  assert.equal(r.user.buried, false);
  assert.equal(r.user.tier, 'deckhand');
  const later = await initFor(kv, alice, DAY, NOW + 86_400_000);
  assert.equal(later.isToday, false);
  await assert.rejects(initFor(kv, alice, '2026-12-01', NOW));
});
