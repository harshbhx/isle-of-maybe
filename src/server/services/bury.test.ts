import assert from 'node:assert/strict';
import { test } from 'node:test';
import { walkable } from '../../shared/path.ts';
import { seenFromHex, hasSeen } from '../../shared/seen.ts';
import { idx, type ChartPiece, type Tile } from '../../shared/types.ts';
import { ApiError } from '../store/errors.ts';
import { asPiece } from '../store/guards.ts';
import { K } from '../store/keys.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import { DAY, NOW, alice, anon, postDay } from '../testing/fixtures.ts';
import { buryChest, seenFor, submitChart } from './bury.ts';
import { pickCharts } from './charts.ts';
import { requireDay } from './island.ts';
import { addSeen } from './seen.ts';

const code = (c: string) => (e: unknown) =>
  e instanceof ApiError && e.code === c;

/** A posted day, plus a buryable tile that alice has seen. */
const setup = async (): Promise<{ kv: FakeKv; spot: Tile; unseen: Tile }> => {
  const kv = new FakeKv();
  await postDay(kv);
  const { island } = await requireDay(kv, DAY);
  const ok = (t: Tile): boolean =>
    walkable(island.terrain, t.x, t.y) &&
    !(t.x === island.dock.x && t.y === island.dock.y) &&
    !island.landmarks.some((l) => l.at.x === t.x && l.at.y === t.y);
  const tiles: Tile[] = [];
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 40; x++) if (ok({ x, y })) tiles.push({ x, y });
  const spot = tiles[0];
  const unseen = tiles[tiles.length - 1];
  assert.ok(spot !== undefined && unseen !== undefined);
  await addSeen(kv, alice.id, DAY, [idx(spot.x, spot.y)]);
  return { kv, spot, unseen };
};

const chartFor = (t: Tile): ChartPiece[] => [
  { k: 'stamp', t: 'palm', x: 5, y: 5 },
  {
    k: 'path',
    pts: [
      { x: 3, y: 3 },
      { x: 3, y: 6 },
    ],
  },
  { k: 'x', x: t.x, y: t.y },
];

test('CHART-1.2 the seen mask comes back as hex for the bury screen', async () => {
  const { kv, spot } = await setup();
  const { mask } = await seenFor(kv, alice, DAY);
  assert.equal(mask.length, 400);
  assert.ok(hasSeen(seenFromHex(mask), idx(spot.x, spot.y)));
  await assert.rejects(seenFor(kv, anon, DAY), code('not_logged_in'));
});

test('CHART-1.4 bury only on a seen, walkable, non-dock, non-landmark tile, once a day', async () => {
  const { kv, spot, unseen } = await setup();
  const { island } = await requireDay(kv, DAY);
  const lm = island.landmarks[0];
  assert.ok(lm !== undefined);
  await addSeen(kv, alice.id, DAY, [
    idx(island.dock.x, island.dock.y),
    idx(lm.at.x, lm.at.y),
    0,
  ]);
  await assert.rejects(
    buryChest(kv, alice, DAY, unseen, NOW),
    code('bad_request')
  );
  await assert.rejects(
    buryChest(kv, alice, DAY, island.dock, NOW),
    code('bad_request')
  );
  await assert.rejects(
    buryChest(kv, alice, DAY, lm.at, NOW),
    code('bad_request')
  );
  await assert.rejects(
    buryChest(kv, alice, DAY, { x: 0, y: 0 }, NOW),
    code('bad_request')
  );
  const r = await buryChest(kv, alice, DAY, spot, NOW);
  assert.deepEqual(r.at, spot);
  assert.equal(await kv.hGet(K.dayCounts(DAY), 'buried'), '1');
  await assert.rejects(buryChest(kv, alice, DAY, spot, NOW), code('conflict'));
  await assert.rejects(
    buryChest(kv, anon, DAY, spot, NOW),
    code('not_logged_in')
  );
});

test('CHART-1.5 burying or charting on an old post is refused', async () => {
  const { kv, spot } = await setup();
  const tomorrow = NOW + 86_400_000;
  await assert.rejects(
    buryChest(kv, alice, DAY, spot, tomorrow),
    (e: unknown) => code('conflict')(e) && String(e).includes('not_today')
  );
  await assert.rejects(
    submitChart(kv, alice, DAY, chartFor(spot), 'c1', tomorrow),
    code('conflict')
  );
});

test('CHART-3.2 one chart per day, and only after burying', async () => {
  const { kv, spot } = await setup();
  await assert.rejects(
    submitChart(kv, alice, DAY, chartFor(spot), 'c1', NOW),
    code('conflict')
  );
  await buryChest(kv, alice, DAY, spot, NOW);
  await submitChart(kv, alice, DAY, chartFor(spot), 'c1', NOW);
  await assert.rejects(
    submitChart(kv, alice, DAY, chartFor(spot), 'c2', NOW),
    code('conflict')
  );
  assert.equal(await kv.hGet(K.chart('c2'), 'day'), undefined);
});

test('CHART-3.1 / ENG-5.1 invalid charts are refused before anything is stored', async () => {
  const { kv, spot } = await setup();
  await buryChest(kv, alice, DAY, spot, NOW);
  const seven: ChartPiece[] = [
    ...Array.from({ length: 7 }, (_, i): ChartPiece => ({
      k: 'stamp',
      t: 'palm',
      x: i,
      y: 0,
    })),
    { k: 'x', x: 1, y: 1 },
  ];
  await assert.rejects(
    submitChart(kv, alice, DAY, seven, 'c1', NOW),
    code('bad_request')
  );
  await assert.rejects(
    submitChart(
      kv,
      alice,
      DAY,
      [{ k: 'stamp', t: 'palm', x: 1, y: 1 }],
      'c1',
      NOW
    ),
    code('bad_request')
  );
  assert.equal(await kv.hGet(K.userDay(alice.id, DAY), 'chartId'), undefined);
  assert.throws(() => asPiece({ k: 'text', s: 'hello' }), code('bad_request'));
  assert.throws(
    () => asPiece({ k: 'stamp', t: 'snoo', x: 1, y: 1 }),
    code('bad_request')
  );
  assert.deepEqual(asPiece({ k: 'x', x: 2, y: 3, extra: 'dropped' }), {
    k: 'x',
    x: 2,
    y: 3,
  });
});

test('CHART-3.1 / CHART-3.3 a stored chart is attributed, indexed and graded', async () => {
  const { kv, spot } = await setup();
  await buryChest(kv, alice, DAY, spot, NOW);
  const r = await submitChart(kv, alice, DAY, chartFor(spot), 'c1', NOW);
  assert.equal(r.chartId, 'c1');
  assert.equal(r.ink.xError, 0);
  assert.equal(await kv.hGet(K.chart('c1'), 'authorName'), 'alice');
  assert.equal(await kv.hGet(K.chart('c1'), 'chestX'), String(spot.x));
  assert.equal(await kv.zScore(K.chartsTrust(DAY), 'c1'), 0.5);
  assert.equal(await kv.zScore(K.chartsAttempts(DAY), 'c1'), 0);
  assert.equal(await kv.hGet(K.userDay(alice.id, DAY), 'chartId'), 'c1');
});

test('CHART-4.1 charts expire in 30 days and pickers never see the chest', async () => {
  const { kv, spot } = await setup();
  await buryChest(kv, alice, DAY, spot, NOW);
  await submitChart(kv, alice, DAY, chartFor(spot), 'c1', NOW);
  assert.deepEqual(
    kv.keysWithoutTtl().filter((k) => k.includes('c1') || k.includes(alice.id)),
    []
  );
  assert.equal(kv.ttl.get(K.chart('c1')), 30 * 86_400);
  const pick = await pickCharts(
    kv,
    { id: 't2_bob', name: 'bob', loggedIn: true },
    DAY
  );
  const json = JSON.stringify(pick);
  assert.ok(json.includes('"c1"'));
  assert.equal(json.includes('chest'), false);
});
