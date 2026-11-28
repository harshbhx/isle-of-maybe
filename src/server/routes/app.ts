// The /api router, built from injected dependencies so the same routes run on Devvit (api.ts),
// in route tests, and in the local preview (tools/preview). No Devvit imports here.
import { Hono, type Context } from 'hono';
import type { ApiErrorBody } from '../../shared/api.ts';
import { utcDay } from '../../shared/day.ts';
import type { LiveKind } from '../../shared/live.ts';
import type { Actor } from '../services/actor.ts';
import { board, hall } from '../services/boards.ts';
import { buryChest, seenFor, submitChart } from '../services/bury.ts';
import { pickCharts } from '../services/charts.ts';
import {
  applySteps,
  dig,
  giveUp,
  MAX_STEPS_PER_CALL,
  startHunt,
} from '../services/hunts.ts';
import { initFor, markPracticed } from '../services/init.ts';
import { rateChart } from '../services/rating.ts';
import { reportChart } from '../services/reports.ts';
import { postShare, sharePreview, type SharePort } from '../services/share.ts';
import { toApiError } from '../store/errors.ts';
import {
  asBoardKind,
  reqBody,
  reqInt,
  reqPieces,
  reqString,
  reqTile,
  reqTiles,
  reqVote,
  optNote,
} from '../store/guards.ts';
import type { Kv } from '../store/kv.ts';
import { rateLimit } from './http-limits.ts';

export type ApiDeps = {
  kv: Kv;
  actor: () => Actor;
  postDay: () => Promise<string>;
  now: () => number;
  newId: () => string;
  announce: (day: string, kind: LiveKind) => Promise<void>;
  sharePort: SharePort;
};

/** 6 stamps + 1 path + 1 X fit well inside this; validateChart enforces the real budget. */
const MAX_PIECES = 16;

/** Run a handler and turn thrown errors into JSON error responses. */
export const handle = async <T>(
  c: Context,
  fn: () => Promise<T>
): Promise<Response> => {
  try {
    return c.json(await fn(), 200);
  } catch (e) {
    const err = toApiError(e);
    if (err.status >= 500 || err.code === 'bad_request')
      console.error(`api ${c.req.path}: ${err.message}`);
    return c.json<ApiErrorBody>(
      { error: err.code, message: err.message },
      err.status
    );
  }
};

const body = async (c: Context): Promise<Record<string, unknown>> =>
  reqBody(await c.req.json().catch(() => null));

export const createApi = (d: ApiDeps): Hono => {
  const api = new Hono();
  const { kv } = d;

  // Registered first so every route, reads included, counts toward 10 calls a second (HUNT-6.1).
  api.use('*', async (c, next) => {
    try {
      await rateLimit(kv, d.actor(), d.now());
    } catch (e) {
      return handle(c, () => Promise.reject(e));
    }
    await next();
    return undefined;
  });

  api.get('/init', (c) =>
    handle(c, async () => initFor(kv, d.actor(), await d.postDay(), d.now()))
  );
  api.get('/charts/pick', (c) =>
    handle(c, async () => {
      // A challenge link's chart id is untrusted: shape-checked here, eligibility-checked in pickCharts.
      const ch = c.req.query('challenge');
      const challenge =
        ch !== undefined && /^[\w-]{1,80}$/.test(ch) ? ch : undefined;
      return pickCharts(kv, d.actor(), await d.postDay(), challenge);
    })
  );

  api.post('/hunt/start', (c) =>
    handle(c, async () =>
      startHunt(
        kv,
        d.actor(),
        await d.postDay(),
        reqString(await body(c), 'chartId', 80),
        d.newId(),
        d.now()
      )
    )
  );
  api.post('/hunt/steps', (c) =>
    handle(c, async () => {
      const b = await body(c);
      return applySteps(
        kv,
        d.actor(),
        reqString(b, 'huntId'),
        reqInt(b, 'from', 0, 100_000),
        reqTiles(b, 'steps', MAX_STEPS_PER_CALL),
        d.now()
      );
    })
  );
  api.post('/hunt/dig', (c) =>
    handle(c, async () => {
      const b = await body(c);
      const r = await dig(
        kv,
        d.actor(),
        reqString(b, 'huntId'),
        reqTile(b, 'at'),
        d.now()
      );
      if (r.found) await d.announce(await d.postDay(), 'found');
      return r;
    })
  );
  api.post('/hunt/giveup', (c) =>
    handle(c, async () => ({
      reveal: await giveUp(
        kv,
        d.actor(),
        reqString(await body(c), 'huntId'),
        d.now()
      ),
    }))
  );
  api.post('/hunt/rate', (c) =>
    handle(c, async () => {
      const b = await body(c);
      return rateChart(
        kv,
        d.actor(),
        reqString(b, 'chartId', 80),
        reqVote(b, 'vote')
      );
    })
  );
  api.post('/chart/report', (c) =>
    handle(c, async () =>
      reportChart(
        kv,
        d.actor(),
        reqString(await body(c), 'chartId', 80),
        d.now()
      )
    )
  );

  api.post('/practice/done', (c) =>
    handle(c, async () => {
      await body(c);
      return markPracticed(kv, d.actor());
    })
  );

  api.get('/seen', (c) =>
    handle(c, async () => seenFor(kv, d.actor(), await d.postDay()))
  );
  api.post('/bury', (c) =>
    handle(c, async () => {
      const at = reqTile(await body(c), 'at');
      const day = await d.postDay();
      const r = await buryChest(kv, d.actor(), day, at, d.now());
      await d.announce(day, 'buried');
      return r;
    })
  );
  api.post('/chart', (c) =>
    handle(c, async () => {
      const b = await body(c);
      return submitChart(
        kv,
        d.actor(),
        await d.postDay(),
        reqPieces(b, 'pieces', MAX_PIECES),
        d.newId(),
        d.now(),
        optNote(b, 'note')
      );
    })
  );

  api.get('/boards/:kind', (c) =>
    handle(c, async () =>
      board(kv, asBoardKind(c.req.param('kind')), await d.postDay(), d.actor())
    )
  );
  api.get('/hall', (c) => handle(c, async () => hall(kv, utcDay(d.now()))));

  api.get('/share', (c) =>
    handle(c, async () => sharePreview(kv, d.actor(), await d.postDay()))
  );
  api.post('/share', (c) =>
    handle(c, async () => {
      await body(c);
      return postShare(kv, d.actor(), await d.postDay(), d.sharePort);
    })
  );

  return api;
};
