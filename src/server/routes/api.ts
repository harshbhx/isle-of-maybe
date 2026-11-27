// Public API for the game client. Every route lives under /api (Devvit Web requirement).
import { Hono } from 'hono';
import { buryChest, seenFor, submitChart } from '../services/bury.ts';
import { pickCharts } from '../services/charts.ts';
import { rateChart } from '../services/rating.ts';
import {
  applySteps,
  dig,
  giveUp,
  MAX_STEPS_PER_CALL,
  startHunt,
} from '../services/hunts.ts';
import { initFor } from '../services/init.ts';
import {
  reqBody,
  reqInt,
  reqString,
  reqTile,
  reqTiles,
  reqPieces,
  reqVote,
} from '../store/guards.ts';
import { currentActor, handle, kv, postDay, rateLimit } from './http.ts';

/** 6 stamps + 1 path + 1 X fit well inside this; validateChart enforces the real budget. */
const MAX_PIECES = 16;

export const api = new Hono();

api.get('/init', (c) =>
  handle(c, async () =>
    initFor(kv, currentActor(), await postDay(), Date.now())
  )
);

api.get('/charts/pick', (c) =>
  handle(c, async () => pickCharts(kv, currentActor(), await postDay()))
);

/** Rate-limit, then parse the JSON body of a POST. */
const guarded = async (
  body: Promise<unknown>
): Promise<Record<string, unknown>> => {
  await rateLimit(kv, currentActor(), Date.now());
  return reqBody(await body.catch(() => null));
};

api.post('/hunt/start', (c) =>
  handle(c, async () => {
    const b = await guarded(c.req.json());
    return startHunt(
      kv,
      currentActor(),
      await postDay(),
      reqString(b, 'chartId'),
      crypto.randomUUID()
    );
  })
);

api.post('/hunt/steps', (c) =>
  handle(c, async () => {
    const b = await guarded(c.req.json());
    return applySteps(
      kv,
      currentActor(),
      reqString(b, 'huntId'),
      reqInt(b, 'from', 0, 100_000),
      reqTiles(b, 'steps', MAX_STEPS_PER_CALL)
    );
  })
);

api.post('/hunt/dig', (c) =>
  handle(c, async () => {
    const b = await guarded(c.req.json());
    return dig(kv, currentActor(), reqString(b, 'huntId'), reqTile(b, 'at'));
  })
);

api.post('/hunt/giveup', (c) =>
  handle(c, async () => {
    const b = await guarded(c.req.json());
    return { reveal: await giveUp(kv, currentActor(), reqString(b, 'huntId')) };
  })
);

api.post('/hunt/rate', (c) =>
  handle(c, async () => {
    const b = await guarded(c.req.json());
    return rateChart(
      kv,
      currentActor(),
      reqString(b, 'chartId', 80),
      reqVote(b, 'vote')
    );
  })
);

api.get('/seen', (c) =>
  handle(c, async () => seenFor(kv, currentActor(), await postDay()))
);

api.post('/bury', (c) =>
  handle(c, async () => {
    const b = await guarded(c.req.json());
    return buryChest(
      kv,
      currentActor(),
      await postDay(),
      reqTile(b, 'at'),
      Date.now()
    );
  })
);

api.post('/chart', (c) =>
  handle(c, async () => {
    const b = await guarded(c.req.json());
    return submitChart(
      kv,
      currentActor(),
      await postDay(),
      reqPieces(b, 'pieces', MAX_PIECES),
      crypto.randomUUID(),
      Date.now()
    );
  })
);
