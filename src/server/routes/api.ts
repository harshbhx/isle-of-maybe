// Public API for the game client. Every route lives under /api (Devvit Web requirement).
import { Hono } from 'hono';
import { utcDay } from '../../shared/day.ts';
import { board, hall } from '../services/boards.ts';
import { buryChest, seenFor, submitChart } from '../services/bury.ts';
import { pickCharts } from '../services/charts.ts';
import { rateChart } from '../services/rating.ts';
import { reportChart } from '../services/reports.ts';
import { postShare, sharePreview } from '../services/share.ts';
import {
  applySteps,
  dig,
  giveUp,
  MAX_STEPS_PER_CALL,
  startHunt,
} from '../services/hunts.ts';
import { initFor } from '../services/init.ts';
import {
  asBoardKind,
  reqBody,
  reqInt,
  reqString,
  reqTile,
  reqTiles,
  reqPieces,
  reqVote,
} from '../store/guards.ts';
import { currentActor, handle, kv, postDay, rateLimit } from './http.ts';
import { announce } from './live.ts';
import { sharePort } from './share-port.ts';

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

/** Every /api call counts toward the caller's 10-per-second limit, reads included (HUNT-6.1). */
api.use('*', async (c, next) => {
  try {
    await rateLimit(kv, currentActor(), Date.now());
  } catch (e) {
    return handle(c, () => Promise.reject(e));
  }
  await next();
  return undefined;
});

/** Parse the JSON body of a POST. */
const guarded = async (
  body: Promise<unknown>
): Promise<Record<string, unknown>> => reqBody(await body.catch(() => null));

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
    const r = await dig(
      kv,
      currentActor(),
      reqString(b, 'huntId'),
      reqTile(b, 'at'),
      Date.now()
    );
    if (r.found) await announce(await postDay(), 'found');
    return r;
  })
);

api.post('/hunt/giveup', (c) =>
  handle(c, async () => {
    const b = await guarded(c.req.json());
    return {
      reveal: await giveUp(
        kv,
        currentActor(),
        reqString(b, 'huntId'),
        Date.now()
      ),
    };
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

api.post('/chart/report', (c) =>
  handle(c, async () => {
    const b = await guarded(c.req.json());
    return reportChart(
      kv,
      currentActor(),
      reqString(b, 'chartId', 80),
      Date.now()
    );
  })
);

api.get('/seen', (c) =>
  handle(c, async () => seenFor(kv, currentActor(), await postDay()))
);

api.post('/bury', (c) =>
  handle(c, async () => {
    const b = await guarded(c.req.json());
    const day = await postDay();
    const r = await buryChest(
      kv,
      currentActor(),
      day,
      reqTile(b, 'at'),
      Date.now()
    );
    await announce(day, 'buried');
    return r;
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

api.get('/boards/:kind', (c) =>
  handle(c, async () =>
    board(kv, asBoardKind(c.req.param('kind')), await postDay(), currentActor())
  )
);

api.get('/hall', (c) => handle(c, async () => hall(kv, utcDay(Date.now()))));

api.get('/share', (c) =>
  handle(c, async () => sharePreview(kv, currentActor(), await postDay()))
);

api.post('/share', (c) =>
  handle(c, async () => {
    await guarded(c.req.json());
    return postShare(kv, currentActor(), await postDay(), sharePort);
  })
);
