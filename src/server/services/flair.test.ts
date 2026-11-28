import assert from 'node:assert/strict';
import { test } from 'node:test';
import { K } from '../store/keys.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import {
  DAY,
  NOW,
  addChart,
  alice,
  bob,
  nullPort,
  postDay,
} from '../testing/fixtures.ts';
import { runDaily } from './daily.ts';
import { applyFlairs, queueFlair, type FlairRow } from './flair.ts';
import { dig, startHunt } from './hunts.ts';
import { requireDay } from './island.ts';

test('COM-6.1 a find that crosses a tier threshold queues the author for flair', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  const { island } = await requireDay(kv, DAY);
  await kv.hSet(K.user(bob.id), { name: 'bob', finds: '4' });
  await addChart(kv, { id: 'bobs', author: bob, chest: island.dock });
  await startHunt(kv, alice, DAY, 'bobs', 'h');
  const r = await dig(kv, alice, 'h', island.dock, NOW);
  assert.equal(r.found, true);
  assert.equal(await kv.zScore(K.flairPending(), bob.id), NOW);
  assert.ok(kv.ttl.has(K.flairPending()));
});

test('COM-6.1 the daily job sets tier flair in batches of at most 100 and clears the queue', async () => {
  const kv = new FakeKv();
  for (let i = 0; i < 150; i++) {
    await kv.hSet(K.user(`t2_u${i}`), {
      name: `u${i}`,
      finds: i === 0 ? '200' : '5',
    });
    await queueFlair(kv, `t2_u${i}`, NOW + i);
  }
  await queueFlair(kv, 't2_noname', NOW + 999);
  const calls: FlairRow[][] = [];
  await runDaily(
    kv,
    { ...nullPort, setFlairs: async (rows) => void calls.push(rows) },
    NOW
  );
  assert.deepEqual(
    calls.map((c) => c.length),
    [100, 50]
  );
  assert.deepEqual(calls[0]?.[0], {
    username: 'u0',
    text: 'Legend of the Isles',
  });
  assert.deepEqual(calls[0]?.[1], { username: 'u1', text: 'Mapmaker' });
  assert.equal(await kv.zCard(K.flairPending()), 0);
});

test('COM-6.1 a flair failure keeps the queue and never breaks the daily job', async () => {
  const kv = new FakeKv();
  await kv.hSet(K.user(bob.id), { name: 'bob', finds: '5' });
  await queueFlair(kv, bob.id, NOW);
  const r = await runDaily(
    kv,
    {
      ...nullPort,
      setFlairs: async () => {
        throw new Error('reddit down');
      },
    },
    NOW
  );
  assert.equal(r.created, true);
  assert.equal(await kv.zCard(K.flairPending()), 1);
  assert.equal(await applyFlairs(kv, async () => {}), 1);
});
