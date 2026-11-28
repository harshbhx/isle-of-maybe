import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { InitResponse, PickResponse } from '../../shared/api.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import { DAY, NOW, alice, postDay } from '../testing/fixtures.ts';
import { createApi } from './app.ts';

const app = async () => {
  const kv = new FakeKv();
  await postDay(kv);
  let id = 0;
  const api = createApi({
    kv,
    actor: () => alice,
    postDay: async () => DAY,
    now: () => NOW,
    newId: () => `id${++id}`,
    announce: async () => {},
    sharePort: { upload: async () => 'u', comment: async () => 't1_c' },
  });
  return { kv, api };
};

test('HUNT-6.1 every route, reads included, counts toward the rate limit', async () => {
  const { api } = await app();
  for (let i = 0; i < 10; i++)
    assert.equal((await api.request('/init')).status, 200);
  const r = await api.request('/charts/pick');
  assert.equal(r.status, 429);
  assert.deepEqual(await r.json(), {
    error: 'rate_limited',
    message: 'slow down',
  });
});

test('HUNT-1.1 / HUNT-2.1 a client can open the day, pick and start a hunt over HTTP', async () => {
  const { api } = await app();
  const init: InitResponse = await (await api.request('/init')).json();
  assert.equal(init.day, DAY);
  const pick: PickResponse = await (await api.request('/charts/pick')).json();
  const first = pick.charts[0];
  assert.ok(first !== undefined);
  const r = await api.request('/hunt/start', {
    method: 'POST',
    body: JSON.stringify({ chartId: first.chart.id }),
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await api.request('/hunt/start', { method: 'POST', body: 'not json' }))
      .status,
    400
  );
  assert.equal((await api.request('/boards/nope')).status, 400);
});

test('UI-9.2 Practice Cove completion is remembered on the server', async () => {
  const { api } = await app();
  const before: InitResponse = await (await api.request('/init')).json();
  assert.equal(before.user.practiced, false);
  assert.equal(
    (await api.request('/practice/done', { method: 'POST', body: '{}' }))
      .status,
    200
  );
  const after: InitResponse = await (await api.request('/init')).json();
  assert.equal(after.user.practiced, true);
});
