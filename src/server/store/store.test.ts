import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FakeKv } from '../testing/fake-kv.ts';
import { ApiError, isQuotaError, toApiError } from './errors.ts';
import { reqBody, reqInt, reqString, reqTile, reqTiles } from './guards.ts';
import { K } from './keys.ts';
import { TTL, hIncrTtl, hSetOnce, hSetTtl, zIncrTtl } from './kv.ts';

test('CHART-4.1 write helpers always set a TTL', async () => {
  const kv = new FakeKv();
  await hSetTtl(kv, K.chart('c1'), { day: '2026-12-05' }, TTL.chart);
  await hIncrTtl(kv, K.chartStats('c1'), 'attempts', 1, TTL.chart);
  await zIncrTtl(kv, K.chartsAttempts('2026-12-05'), 'c1', 1, TTL.chart);
  assert.equal(
    await hSetOnce(
      kv,
      K.userDay('t2_a', '2026-12-05'),
      'buried',
      '1',
      TTL.userDay
    ),
    true
  );
  assert.equal(
    await hSetOnce(
      kv,
      K.userDay('t2_a', '2026-12-05'),
      'buried',
      '1',
      TTL.userDay
    ),
    false
  );
  assert.deepEqual(kv.keysWithoutTtl(), []);
  assert.equal(kv.ttl.get(K.chart('c1')), 30 * 86_400);
});

test('COM-1.5 player data expires within 30 days', () => {
  for (const ttl of [TTL.chart, TTL.user, TTL.userDay, TTL.seen, TTL.hunt])
    assert.ok(ttl <= 30 * 86_400);
});

test('HUNT-6.2 guards reject malformed bodies', () => {
  assert.throws(() => reqBody([]), ApiError);
  assert.throws(() => reqBody(null), ApiError);
  const body = reqBody({
    id: 'abc',
    n: 3,
    at: { x: 1, y: 2 },
    steps: [{ x: 1, y: 1 }],
  });
  assert.equal(reqString(body, 'id'), 'abc');
  assert.equal(reqInt(body, 'n', 0, 5), 3);
  assert.deepEqual(reqTile(body, 'at'), { x: 1, y: 2 });
  assert.equal(reqTiles(body, 'steps', 10).length, 1);
  assert.throws(() => reqString(body, 'missing'), ApiError);
  assert.throws(() => reqInt(body, 'n', 4, 5), ApiError);
  assert.throws(() => reqTile({ at: { x: 40, y: 0 } }, 'at'), ApiError);
  assert.throws(() => reqTile({ at: { x: 1.5, y: 0 } }, 'at'), ApiError);
  assert.throws(
    () => reqTiles({ steps: new Array(11).fill({ x: 1, y: 1 }) }, 'steps', 10),
    ApiError
  );
});

test('UI-8.2 quota errors map to a distinct status', () => {
  assert.equal(
    isQuotaError(new Error('Storage quota exceeded for installation')),
    true
  );
  assert.equal(toApiError(new Error('quota exceeded')).code, 'quota');
  assert.equal(toApiError(new ApiError('conflict', 'x')).status, 409);
  assert.equal(toApiError(new Error('boom')).status, 400);
});

test('HUNT-6.2 fake store mirrors the Redis commands used', async () => {
  const kv = new FakeKv();
  await kv.zAdd(
    'z',
    { member: 'a', score: 2 },
    { member: 'b', score: 1 },
    { member: 'c', score: 3 }
  );
  assert.deepEqual(
    (await kv.zRange('z', 0, -1)).map((m) => m.member),
    ['b', 'a', 'c']
  );
  assert.deepEqual(
    (await kv.zRange('z', 0, 0, { by: 'rank', reverse: true })).map(
      (m) => m.member
    ),
    ['c']
  );
  assert.equal(await kv.zRank('z', 'c'), 2);
  kv.failWrites = new Error('quota');
  await assert.rejects(kv.hSet('h', { a: '1' }));
});
