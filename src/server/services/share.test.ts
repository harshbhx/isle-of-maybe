import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '../store/errors.ts';
import { K } from '../store/keys.ts';
import { FakeKv } from '../testing/fake-kv.ts';
import {
  DAY,
  addChart,
  alice,
  anon,
  bob,
  postDay,
} from '../testing/fixtures.ts';
import { postShare, sharePreview, type SharePort } from './share.ts';

const code = (c: string) => (e: unknown) =>
  e instanceof ApiError && e.code === c;

const setup = async (): Promise<FakeKv> => {
  const kv = new FakeKv();
  await postDay(kv);
  await addChart(kv, {
    id: 'alices',
    author: alice,
    depth: 'deep',
    pieces: [{ k: 'x', x: 20, y: 20 }],
  });
  await kv.hSet(K.userDay(alice.id, DAY), { chartId: 'alices' });
  return kv;
};

const recorder = () => {
  const posts: { parent: string; text: string; media: string }[] = [];
  const uploads: string[] = [];
  const port: SharePort = {
    upload: async (u) => {
      uploads.push(u);
      return 'https://i.redd.it/fake.png';
    },
    comment: async (parent, text, media) => {
      posts.push({ parent, text, media });
      return `t1_share${posts.length}`;
    },
  };
  return { port, posts, uploads };
};

test('COM-2.7 the preview gives the exact image and server-written text', async () => {
  const kv = await setup();
  const p = await sharePreview(kv, alice, DAY);
  assert.ok(p.image.startsWith('data:image/png;base64,'));
  assert.match(p.text, /^Buried a deep chest on .+\. Can you read my map\?$/);
  assert.equal(p.shared, false);
  await assert.rejects(sharePreview(kv, anon, DAY), code('not_logged_in'));
  await assert.rejects(sharePreview(kv, bob, DAY), code('conflict'));
});

test('COM-2.2 sharing uploads the server image and comments under the sticky, once', async () => {
  const kv = await setup();
  const { port, posts, uploads } = recorder();
  const preview = await sharePreview(kv, alice, DAY);
  const r = await postShare(kv, alice, DAY, port);
  assert.equal(r.commentId, 't1_share1');
  assert.deepEqual(uploads, [preview.image]);
  assert.deepEqual(posts, [
    {
      parent: 't1_sticky',
      text: preview.text,
      media: 'https://i.redd.it/fake.png',
    },
  ]);
  assert.equal(await kv.get(K.shareComment('t1_share1')), 'alices');
  assert.equal((await sharePreview(kv, alice, DAY)).shared, true);
  await assert.rejects(postShare(kv, alice, DAY, port), code('conflict'));
  assert.equal(posts.length, 1);
});

test('COM-2.2 a failed upload or comment releases the lock so the player can retry', async () => {
  const kv = await setup();
  const broken: SharePort = {
    upload: async () => {
      throw new Error('media down');
    },
    comment: async () => 't1_x',
  };
  await assert.rejects(postShare(kv, alice, DAY, broken));
  assert.equal(await kv.hGet(K.chart('alices'), 'shareCommentId'), undefined);
  const { port } = recorder();
  assert.equal((await postShare(kv, alice, DAY, port)).commentId, 't1_share1');
});

test('COM-2.2 hidden charts cannot be shared', async () => {
  const kv = await setup();
  await kv.hSet(K.chart('alices'), { hidden: '1' });
  await assert.rejects(
    postShare(kv, alice, DAY, recorder().port),
    code('not_found')
  );
});
