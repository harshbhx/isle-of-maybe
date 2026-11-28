import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseReview, reviewFormFor } from '../routes/review-form.ts';
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
  carol,
  postDay,
} from '../testing/fixtures.ts';
import { pickCharts } from './charts.ts';
import {
  applyReview,
  deleteOwnChart,
  reportChart,
  reviewQueue,
} from './reports.ts';
import { requireDay } from './island.ts';

const code = (c: string) => (e: unknown) =>
  e instanceof ApiError && e.code === c;
const dave = { id: 't2_dave', name: 'dave', loggedIn: true };
const erin = { id: 't2_erin', name: 'erin', loggedIn: true };

const setup = async (): Promise<FakeKv> => {
  const kv = new FakeKv();
  await postDay(kv);
  await addChart(kv, { id: 'bobs', author: bob });
  await kv.zAdd(K.chartsTrust(DAY), { member: 'bobs', score: 0.5 });
  await kv.zAdd(K.chartsAttempts(DAY), { member: 'bobs', score: 0 });
  return kv;
};

const reportBy = async (
  kv: FakeKv,
  who: readonly (typeof alice)[]
): Promise<void> => {
  for (const a of who) await reportChart(kv, a, 'bobs', NOW);
};

test('COM-1.2 one report per player per chart', async () => {
  const kv = await setup();
  await reportBy(kv, [alice, alice, alice]);
  assert.equal(await kv.hGet(K.chartStats('bobs'), 'reports'), '1');
  assert.equal(await kv.hGet(K.chart('bobs'), 'hidden'), '0');
  await assert.rejects(
    reportChart(kv, anon, 'bobs', NOW),
    code('not_logged_in')
  );
  await assert.rejects(reportChart(kv, bob, 'bobs', NOW), code('forbidden'));
  await assert.rejects(
    reportChart(kv, alice, `cap-${DAY}-0`, NOW),
    code('forbidden')
  );
  await assert.rejects(reportChart(kv, alice, 'nope', NOW), code('not_found'));
});

test('COM-1.2 the third report hides the chart and queues it', async () => {
  const kv = await setup();
  await reportBy(kv, [alice, carol, dave]);
  assert.equal(await kv.hGet(K.chart('bobs'), 'hidden'), '1');
  assert.equal(await kv.zScore(K.reportsQueue(), 'bobs'), NOW);
  const pick = await pickCharts(kv, erin, DAY);
  assert.equal(JSON.stringify(pick).includes('"bobs"'), false);
  assert.deepEqual(
    kv
      .keysWithoutTtl()
      .filter((k) => k.startsWith('reports') || k.endsWith('reporters')),
    []
  );
});

test('COM-1.3 the review form lists hidden charts with author, day and report count', async () => {
  const kv = await setup();
  assert.deepEqual(reviewFormFor(await reviewQueue(kv)), {
    showToast: 'No reported charts to review.',
  });
  await reportBy(kv, [alice, carol, dave]);
  const queue = await reviewQueue(kv);
  assert.deepEqual(queue, [
    { id: 'bobs', author: 'bob', day: DAY, reports: 3 },
  ]);
  const form = reviewFormFor(queue).showForm;
  assert.ok(form !== undefined);
  assert.equal(form.name, 'reviewForm');
  assert.ok(JSON.stringify(form.form).includes(`u/bob · ${DAY} · 3 reports`));
});

test('COM-1.3 restore shows the chart again and the same reporters cannot re-hide it', async () => {
  const kv = await setup();
  await reportBy(kv, [alice, carol, dave]);
  await applyReview(kv, ['bobs'], 'restore');
  assert.equal(await kv.hGet(K.chart('bobs'), 'hidden'), '0');
  assert.equal(await kv.zScore(K.reportsQueue(), 'bobs'), undefined);
  await reportBy(kv, [alice, carol, dave]);
  assert.equal(await kv.hGet(K.chart('bobs'), 'hidden'), '0');
});

test('COM-1.3 delete removes the chart, its stats and its index entries', async () => {
  const kv = await setup();
  await reportBy(kv, [alice, carol, dave]);
  await applyReview(kv, ['bobs'], 'delete');
  for (const k of [
    K.chart('bobs'),
    K.chartStats('bobs'),
    K.chartReporters('bobs'),
  ]) {
    assert.equal(kv.data.has(k), false, k);
  }
  assert.equal(await kv.zScore(K.chartsTrust(DAY), 'bobs'), undefined);
  assert.equal(await kv.zScore(K.chartsAttempts(DAY), 'bobs'), undefined);
  assert.deepEqual(await reviewQueue(kv), []);
});

test('COM-1.3 the form submission is parsed defensively', () => {
  assert.deepEqual(parseReview({ charts: ['a', 'b'], action: ['delete'] }), {
    chartIds: ['a', 'b'],
    action: 'delete',
  });
  assert.equal(parseReview({ charts: [], action: ['delete'] }), null);
  assert.equal(parseReview({ charts: ['a'], action: ['nuke'] }), null);
  assert.equal(parseReview('nope'), null);
});

test('COM-1.6 the author can delete their own chart; nobody else can, and the chest stays buried', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  const { island } = await requireDay(kv, DAY);
  const at =
    island.landmarks.length > 0
      ? { x: island.dock.x, y: island.dock.y - 1 }
      : island.dock;
  await addChart(kv, {
    id: 'mine',
    author: alice,
    chest: at,
    depth: 'shallow',
    pieces: [{ k: 'x', x: at.x, y: at.y }],
  });
  await kv.hSet(K.userDay(alice.id, DAY), { chartId: 'mine', buried: '1' });
  await assert.rejects(deleteOwnChart(kv, bob, 'mine'), ApiError);
  await assert.rejects(deleteOwnChart(kv, anon, 'mine'), ApiError);
  assert.deepEqual(await deleteOwnChart(kv, alice, 'mine'), { deleted: true });
  assert.equal(await kv.hGet(K.chart('mine'), 'day'), undefined);
  assert.equal(await kv.hGet(K.userDay(alice.id, DAY), 'chartId'), undefined);
  assert.equal(await kv.hGet(K.userDay(alice.id, DAY), 'buried'), '1');
  await assert.rejects(deleteOwnChart(kv, alice, `cap-${DAY}-0`), ApiError);
});
