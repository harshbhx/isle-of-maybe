import assert from 'node:assert/strict';
import { test } from 'node:test';
import { walkable } from '../../shared/path.ts';
import { idx, type Tile } from '../../shared/types.ts';
import { K } from '../store/keys.ts';
import { TTL } from '../store/kv.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import {
  DAY,
  NOW,
  alice,
  bob,
  carol,
  nullPort,
  postDay,
} from '../testing/fixtures.ts';
import { board, hall } from './boards.ts';
import { buryChest, submitChart } from './bury.ts';
import { onCommentDeleted, onPostDeleted } from './cleanup.ts';
import { runDaily } from './daily.ts';
import { applySteps, dig, giveUp, startHunt } from './hunts.ts';
import { requireDay } from './island.ts';
import { rateChart } from './rating.ts';
import { reportChart } from './reports.ts';
import { addSeen } from './seen.ts';
import { postShare } from './share.ts';

const DAY_S = 86_400;

/** Plays a whole day: hunts, a bury and chart, a rating, a report, a share. */
const playDay = async (kv: FakeKv): Promise<void> => {
  await postDay(kv);
  const { island } = await requireDay(kv, DAY);
  let spot: Tile = island.dock;
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 40; x++)
      if (
        walkable(island.terrain, x, y) &&
        (x !== island.dock.x || y !== island.dock.y) &&
        !island.landmarks.some((l) => l.at.x === x && l.at.y === y)
      )
        spot = { x, y };
  await startHunt(kv, bob, DAY, `cap-${DAY}-0`, 'h1');
  await giveUp(kv, bob, 'h1', NOW);
  await addSeen(kv, bob.id, DAY, [idx(spot.x, spot.y)]);
  await buryChest(kv, bob, DAY, spot, NOW);
  const { chartId } = await submitChart(
    kv,
    bob,
    DAY,
    [{ k: 'x', ...spot }],
    'bobs',
    NOW
  );
  await startHunt(kv, alice, DAY, chartId, 'h2');
  await applySteps(kv, alice, 'h2', 0, []);
  await dig(kv, alice, 'h2', island.dock, NOW);
  await giveUp(kv, alice, 'h2', NOW);
  await rateChart(kv, alice, chartId, 'cursed');
  await reportChart(kv, carol, chartId, NOW);
  await postShare(kv, bob, DAY, {
    upload: async () => 'https://i.redd.it/x.png',
    comment: async () => 't1_share',
  });
  await runDaily(kv, nullPort, NOW);
};

test('COM-1.5 every key a day of play writes expires, player data within 30 days', async () => {
  const kv = new FakeKv();
  await playDay(kv);
  assert.deepEqual(kv.keysWithoutTtl(), []);
  // Long-lived keys hold no player-created content (Architecture §5).
  const longLived = [
    /^day:[\d-]+$/,
    /^day:[\d-]+:counts$/,
    /^postday:/,
    /^user:[^:]+:streak:\d{4}$/,
  ];
  for (const [key, ttl] of kv.ttl) {
    if (longLived.some((r) => r.test(key))) continue;
    assert.ok(ttl <= 30 * DAY_S, `${key} expires in ${ttl / DAY_S} days`);
  }
  assert.equal(TTL.day, 400 * DAY_S);
});

test('COM-1.4 deleting the island post removes its charts, stats and indexes', async () => {
  const kv = new FakeKv();
  await playDay(kv);
  const postId = await kv.hGet(K.day(DAY), 'postId');
  assert.ok(postId !== undefined);
  assert.equal(await onPostDeleted(kv, 't3_unknown'), 0);
  const n = await onPostDeleted(kv, postId);
  assert.equal(n, 4); // three Old Captain charts and bob's
  for (const k of kv.data.keys()) {
    assert.equal(
      /^chart:|^charts:|^day:|^postday:|^sharecomment:/.test(k) &&
        k !== K.shareComment('t1_share'),
      false,
      k
    );
  }
  assert.equal(await kv.zCard(K.reportsQueue()), 0);
  assert.deepEqual((await board(kv, 'trusted', DAY, alice)).rows, []);
  assert.deepEqual((await hall(kv, '2026-12-08')).days, []);
});

test('COM-2.5 deleting a share comment clears the chart link so it can be shared again', async () => {
  const kv = new FakeKv();
  await playDay(kv);
  assert.equal(await kv.hGet(K.chart('bobs'), 'shareCommentId'), 't1_share');
  assert.equal(await onCommentDeleted(kv, 't1_other'), false);
  assert.equal(await onCommentDeleted(kv, 't1_share'), true);
  assert.equal(await kv.hGet(K.chart('bobs'), 'shareCommentId'), undefined);
  assert.equal(await kv.get(K.shareComment('t1_share')), undefined);
});
