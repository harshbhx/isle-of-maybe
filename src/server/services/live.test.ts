import assert from 'node:assert/strict';
import { test } from 'node:test';
import { liveChannel } from '../../shared/live.ts';
import { K } from '../store/keys.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import { DAY } from '../testing/fixtures.ts';
import { liveMessage } from './live.ts';

test('COM-5.1 live messages go on a per-day channel with no colon', () => {
  assert.equal(liveChannel(DAY), 'day-20261207');
  assert.equal(liveChannel(DAY).includes(':'), false);
});

test('COM-5.1 a live message carries the kind and today’s counts only', async () => {
  const kv = new FakeKv();
  await kv.hSet(K.dayCounts(DAY), { buried: '4', found: '2', hunts: '9' });
  const m = await liveMessage(kv, DAY, 'found');
  assert.deepEqual(m, {
    kind: 'found',
    counts: { buried: 4, found: 2, hunts: 9 },
  });
  assert.deepEqual(await liveMessage(new FakeKv(), DAY, 'buried'), {
    kind: 'buried',
    counts: { buried: 0, found: 0, hunts: 0 },
  });
});
