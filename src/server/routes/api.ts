// Public API for the game client. Every route lives under /api (Devvit Web requirement).
import { Hono } from 'hono';
import { pickCharts } from '../services/charts.ts';
import { initFor } from '../services/init.ts';
import { currentActor, handle, kv, postDay } from './http.ts';

export const api = new Hono();

api.get('/init', (c) =>
  handle(c, async () =>
    initFor(kv, currentActor(), await postDay(), Date.now())
  )
);

api.get('/charts/pick', (c) =>
  handle(c, async () => pickCharts(kv, currentActor(), await postDay()))
);
