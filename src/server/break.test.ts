// Break tests: a hostile client trying to cheat, scrape or overload the server (docs/01-RED-TEAM.md §D).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from './store/errors.ts';
import { K } from './store/keys.ts';
import { neighbors4, walkable } from '../shared/path.ts';
import { idx } from '../shared/types.ts';
import { FakeKv } from './testing/fake-kv.ts';
import { DAY, NOW, addChart, alice, bob, postDay } from './testing/fixtures.ts';
import { buryChest } from './services/bury.ts';
import { giveUp, startHunt } from './services/hunts.ts';
import { requireDay } from './services/island.ts';
import { addSeen } from './services/seen.ts';

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

test('CHART-1.7 you cannot bury before finishing a hunt', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  const { island } = await requireDay(kv, DAY);
  await startHunt(kv, alice, DAY, `cap-${DAY}-0`, 'h');
  // Starting a hunt uncovers the tiles around the dock; that alone must not unlock burying.
  const near = neighbors4(island.dock).find(
    (t) =>
      walkable(island.terrain, t.x, t.y) &&
      !island.landmarks.some((l) => l.at.x === t.x && l.at.y === t.y)
  );
  assert.ok(near !== undefined);
  await addSeen(kv, alice.id, DAY, [idx(near.x, near.y)]);
  await assert.rejects(
    buryChest(kv, alice, DAY, near, NOW),
    (e: unknown) => e instanceof ApiError && e.code === 'conflict'
  );
  await giveUp(kv, alice, 'h', NOW);
  assert.deepEqual((await buryChest(kv, alice, DAY, near, NOW)).at, near);
});
