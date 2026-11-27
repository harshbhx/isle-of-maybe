import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '../store/errors.ts';
import { reqVote } from '../store/guards.ts';
import { K } from '../store/keys.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import {
  DAY,
  addChart,
  alice,
  anon,
  bob,
  carol,
  postDay,
} from '../testing/fixtures.ts';
import { giveUp, startHunt } from './hunts.ts';
import { rateChart } from './rating.ts';

const code = (c: string) => (e: unknown) =>
  e instanceof ApiError && e.code === c;

const setup = async (): Promise<FakeKv> => {
  const kv = new FakeKv();
  await postDay(kv);
  await addChart(kv, { id: 'bobs', author: bob });
  return kv;
};

const huntAndQuit = async (
  kv: FakeKv,
  who: typeof alice,
  chartId: string,
  id: string
): Promise<void> => {
  await startHunt(kv, who, DAY, chartId, id);
  await giveUp(kv, who, id);
};

test('HUNT-5.1 only players who finished a hunt on the chart may rate it', async () => {
  const kv = await setup();
  await assert.rejects(rateChart(kv, alice, 'bobs', 'true'), code('forbidden'));
  await startHunt(kv, alice, DAY, 'bobs', 'h');
  await assert.rejects(rateChart(kv, alice, 'bobs', 'true'), code('forbidden'));
  await giveUp(kv, alice, 'h');
  const r = await rateChart(kv, alice, 'bobs', 'true');
  assert.deepEqual(r, { trueVotes: 1, cursedVotes: 0 });
  await assert.rejects(
    rateChart(kv, anon, 'bobs', 'true'),
    code('not_logged_in')
  );
  await assert.rejects(rateChart(kv, alice, 'nope', 'true'), code('not_found'));
});

test('HUNT-5.1 one vote per player per chart, and votes move trust', async () => {
  const kv = await setup();
  await huntAndQuit(kv, alice, 'bobs', 'h1');
  await huntAndQuit(kv, carol, 'bobs', 'h2');
  const before = await kv.zScore(K.chartsTrust(DAY), 'bobs');
  await rateChart(kv, alice, 'bobs', 'cursed');
  await assert.rejects(rateChart(kv, alice, 'bobs', 'true'), code('conflict'));
  const afterCursed = await kv.zScore(K.chartsTrust(DAY), 'bobs');
  assert.ok(
    before !== undefined && afterCursed !== undefined && afterCursed < before
  );
  const r = await rateChart(kv, carol, 'bobs', 'true');
  assert.deepEqual(r, { trueVotes: 1, cursedVotes: 1 });
  assert.equal(await kv.hGet(K.chartVotes('bobs'), alice.id), 'cursed');
  assert.ok(kv.ttl.has(K.chartVotes('bobs')));
});

test('HUNT-5.1 Old Captain charts take votes but never enter the trust board', async () => {
  const kv = await setup();
  const cap = `cap-${DAY}-0`;
  await huntAndQuit(kv, alice, cap, 'h');
  await rateChart(kv, alice, cap, 'true');
  assert.equal(await kv.zScore(K.chartsTrust(DAY), cap), undefined);
});

test('HUNT-5.1 votes other than true or cursed are refused', () => {
  assert.equal(reqVote({ vote: 'cursed' }, 'vote'), 'cursed');
  assert.throws(() => reqVote({ vote: 'meh' }, 'vote'), code('bad_request'));
  assert.throws(() => reqVote({ vote: true }, 'vote'), code('bad_request'));
});
