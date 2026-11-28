// The /api router on Devvit: real Redis, the request's user, realtime and Reddit media/comments.
import { createApi } from './app.ts';
import { currentActor, kv, postDay } from './http.ts';
import { announce, ghost } from './live.ts';
import { sharePort } from './share-port.ts';

export const api = createApi({
  kv,
  actor: currentActor,
  postDay,
  now: () => Date.now(),
  newId: () => crypto.randomUUID(),
  announce,
  ghost,
  sharePort,
});
