import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aStar, revealAround, walkable } from '../../shared/path.ts';
import { idx, type Tile } from '../../shared/types.ts';
import { rateLimit } from '../routes/http-limits.ts';
import { ApiError } from '../store/errors.ts';
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
import { requireDay } from './island.ts';
import { applySteps, dig, giveUp, startHunt } from './hunts.ts';
import { hasSeen, readSeen } from './seen.ts';
import { readStreak } from './streak.ts';

/** A walkable chest tile a few steps from the dock, and the route there. */
const setup = async (): Promise<{ kv: FakeKv; chest: Tile; route: Tile[] }> => {
  const kv = new FakeKv();
  await postDay(kv);
  const { island } = await requireDay(kv, DAY);
  let chest: Tile | null = null;
  let route: Tile[] | null = null;
  for (let y = island.dock.y - 8; y < island.dock.y && chest === null; y++) {
    for (let x = island.dock.x - 6; x <= island.dock.x + 6; x++) {
      if (!walkable(island.terrain, x, y)) continue;
      const r = aStar(island.terrain, island.dock, { x, y });
      if (r !== null && r.length > 4) {
        chest = { x, y };
        route = r;
        break;
      }
    }
  }
  assert.ok(chest !== null && route !== null);
  await addChart(kv, {
    id: 'bobs',
    author: bob,
    chest,
    depth: 'deep',
    pieces: [{ k: 'x', x: chest.x + 1, y: chest.y }],
  });
  return { kv, chest, route };
};

const has = (o: unknown, chest: Tile): boolean =>
  JSON.stringify(o).includes(`"chest":{"x":${chest.x},"y":${chest.y}}`);

test('HUNT-2.1 a hunt starts at the dock with 3 shovels', async () => {
  const { kv } = await setup();
  const { island } = await requireDay(kv, DAY);
  const r = await startHunt(kv, alice, DAY, 'bobs', 'h1');
  assert.deepEqual(r, { huntId: 'h1', at: island.dock, shovels: 3 });
});

test('HUNT-2.2 a fourth hunt in a day is refused', async () => {
  const { kv } = await setup();
  for (const id of ['bobs', `cap-${DAY}-0`, `cap-${DAY}-1`])
    await startHunt(kv, alice, DAY, id, `h-${id}`);
  await assert.rejects(
    startHunt(kv, alice, DAY, `cap-${DAY}-2`, 'h4'),
    (e: unknown) => e instanceof ApiError && e.code === 'conflict'
  );
});

test('HUNT-1.2 / HUNT-2.3 own, repeated and (logged out) player charts are refused', async () => {
  const { kv } = await setup();
  await assert.rejects(startHunt(kv, bob, DAY, 'bobs', 'x1'), ApiError);
  await startHunt(kv, alice, DAY, 'bobs', 'x2');
  await assert.rejects(startHunt(kv, alice, DAY, 'bobs', 'x3'), ApiError);
  await assert.rejects(startHunt(kv, anon, DAY, 'bobs', 'x4'), ApiError);
  const r = await startHunt(kv, anon, DAY, `cap-${DAY}-0`, 'x5');
  assert.equal(r.shovels, 3);
});

test('HUNT-3.1 illegal steps are rejected and change nothing', async () => {
  const { kv, route } = await setup();
  const { island } = await requireDay(kv, DAY);
  await startHunt(kv, alice, DAY, 'bobs', 'h');
  const jump = { x: island.dock.x, y: island.dock.y - 2 };
  await assert.rejects(applySteps(kv, alice, 'h', 0, [jump]), ApiError);
  const water = { x: island.dock.x, y: island.dock.y + 1 };
  await assert.rejects(applySteps(kv, alice, 'h', 0, [water]), ApiError);
  const ok = route.slice(1, 3);
  await assert.rejects(applySteps(kv, alice, 'h', 0, [...ok, jump]), ApiError);
  assert.equal(await kv.hGet(K.hunt('h'), 'index'), '0');
  await assert.rejects(applySteps(kv, bob, 'h', 0, ok), ApiError);
});

test('HUNT-3.2 / HUNT-3.3 steps reveal tiles and resent batches are no-ops', async () => {
  const { kv, route } = await setup();
  await startHunt(kv, alice, DAY, 'bobs', 'h');
  const batch = route.slice(1, 4);
  const a = await applySteps(kv, alice, 'h', 0, batch);
  const b = await applySteps(kv, alice, 'h', 0, batch);
  assert.deepEqual(a, b);
  assert.equal(a.index, 3);
  const mask = await readSeen(kv, alice.id, DAY);
  for (const t of batch)
    for (const i of revealAround(t, 3)) assert.ok(hasSeen(mask, i));
  await assert.rejects(
    applySteps(kv, alice, 'h', 5, route.slice(4, 5)),
    ApiError
  );
});

test('HUNT-4.1 you can only dig where you stand, and a near dig finds the chest', async () => {
  const { kv, chest, route } = await setup();
  await startHunt(kv, alice, DAY, 'bobs', 'h');
  await assert.rejects(dig(kv, alice, 'h', chest, NOW), ApiError);
  await applySteps(kv, alice, 'h', 0, route.slice(1));
  const r = await dig(kv, alice, 'h', chest, NOW);
  assert.equal(r.found, true);
  assert.equal(r.done, true);
});

test('HUNT-4.3 the chest is in no response before the hunt ends', async () => {
  const { kv, chest, route } = await setup();
  const responses: unknown[] = [];
  responses.push(await startHunt(kv, alice, DAY, 'bobs', 'h'));
  responses.push(await applySteps(kv, alice, 'h', 0, route.slice(1, -1)));
  const far = route[route.length - 2];
  assert.ok(far !== undefined);
  const miss = await dig(kv, alice, 'h', far, NOW);
  if (!miss.done) {
    responses.push(miss);
    for (const r of responses) assert.equal(has(r, chest), false);
    const last = route[route.length - 1];
    assert.ok(last !== undefined);
    responses.push(await applySteps(kv, alice, 'h', route.length - 2, [last]));
    assert.equal(has(responses[responses.length - 1], chest), false);
    const end = await dig(kv, alice, 'h', last, NOW);
    assert.equal(has(end, chest), true);
  }
});

test('HUNT-4.2 three misses end the hunt with a reveal of the chart error', async () => {
  const { kv, chest } = await setup();
  const { island } = await requireDay(kv, DAY);
  await startHunt(kv, alice, DAY, 'bobs', 'h');
  await dig(kv, alice, 'h', island.dock, NOW);
  await dig(kv, alice, 'h', island.dock, NOW);
  const last = await dig(kv, alice, 'h', island.dock, NOW);
  assert.equal(last.done, true);
  assert.equal(last.reveal?.found, false);
  assert.deepEqual(last.reveal?.chest, chest);
  assert.deepEqual(last.reveal?.chartX, { x: chest.x + 1, y: chest.y });
  assert.equal(last.reveal?.distance, 1);
  assert.equal(last.reveal?.gold, 0);
  await assert.rejects(dig(kv, alice, 'h', island.dock, NOW), ApiError);
});

test('HUNT-4.4 / HUNT-4.5 a find pays the finder and the author once, and updates stats', async () => {
  const { kv, chest, route } = await setup();
  await startHunt(kv, alice, DAY, 'bobs', 'h');
  await applySteps(kv, alice, 'h', 0, route.slice(1));
  const r = await dig(kv, alice, 'h', chest, NOW);
  assert.ok(r.reveal !== undefined && r.reveal.gold > 0);
  assert.equal(r.reveal.gold, 3 * (40 + 20 * 2) + 20);
  assert.equal(await kv.hGet(K.user(alice.id), 'gold'), String(r.reveal.gold));
  assert.equal(await kv.hGet(K.user(bob.id), 'finds'), '1');
  assert.equal(await kv.hGet(K.user(bob.id), 'gold'), '30');
  assert.equal(await kv.hGet(K.chartStats('bobs'), 'attempts'), '1');
  assert.equal(await kv.hGet(K.chartStats('bobs'), 'finds'), '1');
  assert.equal(await kv.zScore(K.chartsTrust(DAY), 'bobs'), 2 / 3);
  assert.equal(await readStreak(kv, alice.id, NOW), 1);
  assert.equal(await kv.hGet(K.dayCounts(DAY), 'found'), '1');
  // A second end (double tap / give up after) pays nothing more.
  const again = await giveUp(kv, alice, 'h', NOW);
  assert.deepEqual(again, r.reveal);
  assert.equal(await kv.hGet(K.user(alice.id), 'gold'), String(r.reveal.gold));
});

test('HUNT-2.3 logged-out hunts touch no boards and write no seen tiles', async () => {
  const { kv } = await setup();
  await startHunt(kv, anon, DAY, `cap-${DAY}-0`, 'h');
  await giveUp(kv, anon, 'h', NOW);
  assert.equal(await kv.get(K.seen(anon.id, DAY)), undefined);
  assert.equal(await kv.zCard(K.boardGoldDay(DAY)), 0);
  assert.equal(await readStreak(kv, anon.id, NOW), 0);
});

test('HUNT-6.1 more than 10 calls a second are rate limited', async () => {
  const kv = new FakeKv();
  for (let i = 0; i < 10; i++) await rateLimit(kv, alice, 5_000);
  await assert.rejects(
    rateLimit(kv, alice, 5_999),
    (e: unknown) => e instanceof ApiError && e.status === 429
  );
  await rateLimit(kv, alice, 6_000);
});

test('CHART-4.1 hunts leave no key without a TTL', async () => {
  const { kv, chest, route } = await setup();
  kv.ttl.clear();
  for (const k of kv.data.keys()) kv.ttl.set(k, 1); // ignore fixture writes
  await startHunt(kv, alice, DAY, 'bobs', 'h');
  await applySteps(kv, alice, 'h', 0, route.slice(1));
  await dig(kv, alice, 'h', chest, NOW);
  assert.deepEqual(kv.keysWithoutTtl(), []);
  assert.ok(idx(chest.x, chest.y) >= 0);
});
