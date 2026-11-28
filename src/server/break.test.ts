// Break tests: a hostile client trying to cheat, scrape or overload the server (docs/01-RED-TEAM.md §D).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { K } from './store/keys.ts';
import { FakeKv } from './testing/fake-kv.ts';
import { DAY, addChart, alice, bob, postDay } from './testing/fixtures.ts';
import { startHunt } from './services/hunts.ts';

const settle = async <T>(
  ps: Promise<T>[]
): Promise<PromiseSettledResult<T>[]> => Promise.allSettled(ps);
const ok = (rs: PromiseSettledResult<unknown>[]) =>
  rs.filter((r) => r.status === 'fulfilled').length;

test('HUNT-2.2 parallel starts cannot exceed 3 hunts a day', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  for (const id of ['p1', 'p2', 'p3', 'p4', 'p5'])
    await addChart(kv, { id, author: bob });
  const rs = await settle(
    ['p1', 'p2', 'p3', 'p4', 'p5'].map((c, i) =>
      startHunt(kv, alice, DAY, c, `h${i}`)
    )
  );
  assert.equal(ok(rs), 3);
  assert.equal(await kv.hGet(K.userDay(alice.id, DAY), 'hunts'), '3');
});

test('HUNT-1.2 parallel starts cannot hunt the same chart twice', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  await addChart(kv, { id: 'twice', author: bob });
  const rs = await settle([
    startHunt(kv, alice, DAY, 'twice', 'a'),
    startHunt(kv, alice, DAY, 'twice', 'b'),
  ]);
  assert.equal(ok(rs), 1);
});
