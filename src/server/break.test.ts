// Break tests: a hostile client trying to cheat, scrape or overload the server (docs/01-RED-TEAM.md §D).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from './store/errors.ts';
import { K } from './store/keys.ts';
import { addDays } from '../shared/day.ts';
import { neighbors4, walkable } from '../shared/path.ts';
import { idx } from '../shared/types.ts';
import { FakeKv } from './testing/fake-kv.ts';
import { DAY, NOW, addChart, alice, bob, postDay } from './testing/fixtures.ts';
import { actorFrom } from './services/actor.ts';
import { board, hall } from './services/boards.ts';
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

/** Counts Redis calls made through a FakeKv. */
const counting = (kv: FakeKv): { kv: FakeKv; calls: () => number } => {
  let n = 0;
  const proxy = new Proxy(kv, {
    get(target, prop, receiver) {
      const v: unknown = Reflect.get(target, prop, receiver);
      if (typeof v !== 'function') return v;
      return (...args: unknown[]) => {
        n++;
        return Reflect.apply(v, target, args);
      };
    },
  });
  return { kv: proxy, calls: () => n };
};

test('COM-4.1 the Hall stays cheap: a busy fortnight is served from cache on repeat', async () => {
  const kv = new FakeKv();
  for (let d = 1; d <= 14; d++) {
    const day = addDays(DAY, -d);
    await postDay(kv, NOW - d * 86_400_000);
    for (let i = 0; i < 40; i++) {
      await addChart(kv, {
        id: `${day}-${i}`,
        author: { id: `t2_x${i}`, name: `x${i}` },
        day,
      });
      await kv.zAdd(K.chartsTrust(day), { member: `${day}-${i}`, score: i });
      await kv.zAdd(K.chartsAttempts(day), { member: `${day}-${i}`, score: 0 });
    }
  }
  const c = counting(kv);
  await hall(c.kv, DAY);
  const first = c.calls();
  await hall(c.kv, DAY);
  assert.ok(
    c.calls() - first <= 2,
    `repeat Hall used ${c.calls() - first} Redis calls`
  );
  assert.ok(first <= 1200, `first Hall used ${first} Redis calls`);
});

test('COM-3.2 repeat opens of the trusted board are served from a short cache', async () => {
  const kv = new FakeKv();
  for (let i = 0; i < 60; i++) {
    await addChart(kv, {
      id: `t${i}`,
      author: { id: `t2_y${i}`, name: `y${i}` },
    });
    await kv.hSet(K.chartStats(`t${i}`), { attempts: '5', finds: '3' });
    await kv.zAdd(K.chartsTrust(DAY), { member: `t${i}`, score: i });
  }
  const c = counting(kv);
  const first = await board(c.kv, 'trusted', DAY, {
    id: 't2_y3',
    name: 'y3',
    loggedIn: true,
  });
  const used = c.calls();
  const again = await board(c.kv, 'trusted', DAY, alice);
  assert.ok(c.calls() - used <= 2);
  assert.equal(first.me?.chart?.id, 't3');
  assert.deepEqual(first.rows, again.rows);
  assert.equal(again.me, null);
});

test('HUNT-2.3 / HUNT-6.1 logged-out viewers without a loid do not share one allowance', async () => {
  const kv = new FakeKv();
  await postDay(kv);
  const first = actorFrom({}, 'a');
  for (let i = 0; i < 3; i++)
    await startHunt(kv, first, DAY, `cap-${DAY}-${i}`, `n${i}`);
  // A different loid-less viewer can still play.
  const r = await startHunt(kv, actorFrom({}, 'b'), DAY, `cap-${DAY}-0`, 'n9');
  assert.equal(r.shovels, 3);
  // The same viewer's next request (new throwaway id) can still finish their hunt by its id...
  assert.equal((await giveUp(kv, actorFrom({}, 'c'), 'n0', NOW)).found, false);
  // ...but nobody with a real identity can touch it.
  await assert.rejects(
    giveUp(kv, alice, 'n1', NOW),
    (e: unknown) => e instanceof ApiError && e.code === 'forbidden'
  );
  await assert.rejects(
    giveUp(kv, actorFrom({ loid: 'x' }), 'n1', NOW),
    ApiError
  );
  assert.equal(actorFrom({ loid: '' }, 'd').ephemeral, true);
});
