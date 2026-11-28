import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FakeKv } from '../testing/fake-kv.ts';
import { DAY, NOW, alice, anon, bob, postDay } from '../testing/fixtures.ts';
import { ghostPing } from './ghost.ts';
import { applySteps, giveUp, startHunt } from './hunts.ts';
import { requireDay } from './island.ts';
import { aStar, walkable } from '../../shared/path.ts';

const ready = async (): Promise<FakeKv> => {
  const kv = new FakeKv();
  await postDay(kv);
  return kv;
};

test('ADV-6.6 a ghost ping carries the server’s tile, the name and tier, at most every 2 s', async () => {
  const kv = await ready();
  const { island } = await requireDay(kv, DAY);
  await startHunt(kv, alice, DAY, `cap-${DAY}-0`, 'g');
  let to = island.dock;
  for (let y = island.dock.y - 3; y < island.dock.y; y++)
    if (walkable(island.terrain, island.dock.x, y))
      to = { x: island.dock.x, y };
  const route = aStar(island.terrain, island.dock, to) ?? [];
  await applySteps(kv, alice, 'g', 0, route.slice(1));
  const m = await ghostPing(kv, alice, 'g', NOW);
  assert.deepEqual(m, { name: alice.name, x: to.x, y: to.y, tier: 'deckhand' });
  assert.equal(await ghostPing(kv, alice, 'g', NOW + 1500), null);
  assert.notEqual(await ghostPing(kv, alice, 'g', NOW + 2100), null);
});

test('ADV-6.6 no ghost for logged-out players, someone else’s hunt, or a finished hunt', async () => {
  const kv = await ready();
  await startHunt(kv, anon, DAY, `cap-${DAY}-0`, 'a');
  assert.equal(await ghostPing(kv, anon, 'a', NOW), null);
  await startHunt(kv, alice, DAY, `cap-${DAY}-1`, 'b');
  assert.equal(await ghostPing(kv, bob, 'b', NOW), null);
  await giveUp(kv, alice, 'b', NOW);
  assert.equal(await ghostPing(kv, alice, 'b', NOW + 5000), null);
});
