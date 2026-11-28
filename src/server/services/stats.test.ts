import assert from 'node:assert/strict';
import { test } from 'node:test';
import { statsFormFor } from '../routes/review-form.ts';
import { K } from '../store/keys.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import { DAY, NOW, alice, bob, postDay } from '../testing/fixtures.ts';
import { giveUp, startHunt } from './hunts.ts';
import { dayStats, recentStats, statsLines } from './stats.ts';

const D1 = '2026-12-06';

test('SHIP-3.1 finishing a hunt records the player for that UTC day, with a TTL', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  await startHunt(kv, alice, DAY, `cap-${DAY}-0`, 'h');
  await giveUp(kv, alice, 'h', NOW);
  assert.equal(await kv.zCard(K.dayPlayers(DAY)), 1);
  assert.ok(kv.ttl.has(K.dayPlayers(DAY)));
});

test('SHIP-3.1 stats give players, charts, hunts per chart, find rate and return rates', async () => {
  const kv = new FakeKv();
  for (const u of ['a', 'b', 'c', 'd'])
    await kv.zAdd(K.dayPlayers(D1), { member: u, score: 1 });
  for (const u of ['a', 'b', 'x'])
    await kv.zAdd(K.dayPlayers(DAY), { member: u, score: 1 });
  await kv.hSet(K.dayCounts(D1), { hunts: '10', found: '4' });
  await kv.zAdd(K.chartsAttempts(D1), { member: 'c1', score: 6 });
  await kv.zAdd(K.chartsAttempts(D1), { member: 'c2', score: 2 });
  const s = await dayStats(kv, D1, DAY);
  assert.deepEqual(
    {
      players: s.players,
      charts: s.charts,
      hunts: s.hunts,
      chartHunts: s.chartHunts,
      found: s.found,
      r1: s.return1,
      r3: s.return3,
    },
    {
      players: 4,
      charts: 2,
      hunts: 10,
      chartHunts: 8,
      found: 4,
      r1: 0.5,
      r3: null,
    }
  );
  const lines = statsLines([s]);
  assert.match(
    lines[0] ?? '',
    /4 players · 2 charts · 10 hunts \(4\.0\/chart\) · find rate 40% · back next day 50% · day 3 –/
  );
  assert.equal((await recentStats(kv, DAY, 7)).length, 7);
  assert.ok(JSON.stringify(statsFormFor(lines)).includes('find rate 40%'));
  assert.equal(JSON.stringify(statsFormFor(lines)).includes(bob.id), false);
});
