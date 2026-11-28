import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays } from '../../shared/day.ts';
import { ApiError } from '../store/errors.ts';
import { asBoardKind } from '../store/guards.ts';
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
import { board, hall } from './boards.ts';
import { weekKey } from './weeks.ts';

const user = (i: number) => ({ id: `t2_u${i}`, name: `u${i}`, loggedIn: true });

/** A player chart with fixed counts in both indexes. */
const chart = async (
  kv: FakeKv,
  id: string,
  author: { id: string; name: string | null },
  attempts: number,
  finds: number,
  o: { hidden?: boolean; day?: string } = {}
): Promise<void> => {
  const day = o.day ?? DAY;
  await addChart(kv, {
    id,
    author,
    day,
    ...(o.hidden === undefined ? {} : { hidden: o.hidden }),
  });
  await kv.hSet(K.chartStats(id), {
    attempts: String(attempts),
    finds: String(finds),
    trueVotes: '0',
    cursedVotes: '0',
    reports: '0',
  });
  await kv.zAdd(K.chartsTrust(day), {
    member: id,
    score: (finds + 1) / (attempts + 2),
  });
  await kv.zAdd(K.chartsAttempts(day), { member: id, score: attempts });
};

test('COM-3.1 / COM-3.3 the trusted board needs 3 attempts and skips captain and hidden charts', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  await chart(kv, 'good', bob, 10, 9);
  await chart(kv, 'few', alice, 2, 2);
  await chart(kv, 'hid', user(1), 10, 10, { hidden: true });
  await kv.zAdd(K.chartsTrust(DAY), { member: `cap-${DAY}-0`, score: 99 });
  await kv.hSet(K.chartStats(`cap-${DAY}-0`), { attempts: '50', finds: '50' });
  const r = await board(kv, 'trusted', DAY, alice);
  assert.deepEqual(r.rows, [
    {
      rank: 1,
      name: 'bob',
      value: 90,
      chart: { id: 'good', attempts: 10, finds: 9 },
    },
  ]);
  assert.equal(r.me, null);
  assert.equal(JSON.stringify(r).includes('chest'), false);
});

test('COM-3.2 boards return the top 10 and your own rank outside it', async () => {
  const kv = new FakeKv();
  for (let i = 0; i < 15; i++) {
    await kv.hSet(K.user(`t2_u${i}`), { name: `u${i}` });
    await kv.zAdd(K.boardGoldDay(DAY), {
      member: `t2_u${i}`,
      score: 1000 - i * 10,
    });
  }
  const r = await board(kv, 'goldDay', DAY, user(13));
  assert.equal(r.rows.length, 10);
  assert.deepEqual(r.rows[0], { rank: 1, name: 'u0', value: 1000 });
  assert.deepEqual(r.me, { rank: 14, name: 'u13', value: 870 });
  assert.equal((await board(kv, 'goldDay', DAY, anon)).me, null);
  assert.equal((await board(kv, 'goldDay', DAY, alice)).me, null);
});

test('COM-3.2 your own chart shows on the trusted board even below the top 10', async () => {
  const kv = new FakeKv();
  for (let i = 0; i < 12; i++) await chart(kv, `c${i}`, user(i), 10, 10 - i);
  const r = await board(kv, 'trusted', DAY, user(11));
  assert.equal(r.rows.length, 10);
  assert.equal(r.me?.rank, 12);
  assert.equal(r.me?.chart?.id, 'c11');
});

test('COM-3.1 week and cartographer boards read their own keys', async () => {
  const kv = new FakeKv();
  await kv.hSet(K.user(bob.id), { name: 'bob' });
  await kv.zAdd(K.boardGoldWeek(weekKey(DAY)), { member: bob.id, score: 500 });
  await kv.zAdd(K.boardCartographers(), { member: bob.id, score: 7 });
  assert.equal((await board(kv, 'goldWeek', DAY, bob)).me?.value, 500);
  assert.equal((await board(kv, 'cartographers', DAY, bob)).rows[0]?.value, 7);
  assert.throws(
    () => asBoardKind('secret'),
    (e: unknown) => e instanceof ApiError && e.code === 'bad_request'
  );
});

test('COM-4.2 / COM-4.3 / COM-4.4 the Hall shows past days, top 3, the cursed map, no chests, no hidden charts', async () => {
  const kv = new FakeKv();
  const y = addDays(DAY, -1);
  await postDay(kv, NOW - 86_400_000);
  await postDay(kv);
  await chart(kv, 'a', bob, 6, 6, { day: y });
  await chart(kv, 'b', alice, 6, 1, { day: y });
  await chart(kv, 'c', user(1), 4, 3, { day: y });
  await chart(kv, 'd', user(2), 9, 9, { day: y, hidden: true });
  await chart(kv, 'e', user(3), 0, 0, { day: y });
  await chart(kv, 'today', user(4), 9, 9);
  const r = await hall(kv, DAY);
  assert.equal(r.days.length, 1);
  const d = r.days[0];
  assert.ok(d !== undefined);
  assert.equal(d.day, y);
  assert.deepEqual(
    d.top.map((c) => c.id),
    ['a', 'c', 'b']
  );
  assert.equal(d.cursed?.id, 'b');
  assert.ok(d.island.length > 0);
  assert.equal(JSON.stringify(r).includes('chest'), false);
  assert.equal(JSON.stringify(r).includes('authorId'), false);
});
