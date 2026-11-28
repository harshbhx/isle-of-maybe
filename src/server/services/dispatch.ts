// The Dispatch: how your charts from the last 3 days did (DAY-5.1). Built from live counters.
import type { Dispatch, DispatchChart } from '../../shared/api.ts';
import { addDays, dayNumber } from '../../shared/day.ts';
import { salvage, tierProgress } from '../../shared/scoring.ts';
import { K } from '../store/keys.ts';
import type { Kv } from '../store/kv.ts';
import type { Actor } from './actor.ts';
import { readChart, readStats } from './charts.ts';
import { islandOf, readDay } from './island.ts';

export const DISPATCH_DAYS = 3;

export const dispatchFor = async (
  kv: Kv,
  actor: Actor,
  today: string,
  allTimeFinds: number
): Promise<Dispatch> => {
  const charts: DispatchChart[] = [];
  if (actor.loggedIn) {
    for (let i = 1; i <= DISPATCH_DAYS; i++) {
      const day = addDays(today, -i);
      const chartId = await kv.hGet(K.userDay(actor.id, day), 'chartId');
      if (chartId === undefined) continue;
      const chart = await readChart(kv, chartId);
      if (chart === null) continue;
      const s = await readStats(kv, chartId);
      const rec = await readDay(kv, day);
      if (rec === null) continue;
      charts.push({
        island: {
          seed: rec.seed,
          modifier: rec.modifier,
          name: rec.name !== '' ? rec.name : islandOf(rec).name,
        },
        pieces: chart.pieces,
        day,
        dayNumber: dayNumber(day),
        chartId,
        depth: chart.depth,
        attempts: s.attempts,
        finds: s.finds,
        trueVotes: s.trueVotes,
        cursedVotes: s.cursedVotes,
        salvage: s.finds * salvage(chart.depth),
      });
    }
  }
  return { charts, tier: tierProgress(allTimeFinds) };
};
