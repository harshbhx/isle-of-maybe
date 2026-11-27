// The daily job: post today's island once, sticky the share thread, bury the Old Captain's
// chests (DAY-1). Idempotent: running it again only fills in whatever is missing.
import { captainChart, captainChests } from '../../shared/captain.ts';
import {
  dayNumber,
  modifierFor,
  utcDay,
  type Modifier,
} from '../../shared/day.ts';
import { generateIsland, seedFor } from '../../shared/island.ts';
import { rngFor } from '../../shared/rng.ts';
import { serverCopy } from '../copy.ts';
import { K } from '../store/keys.ts';
import { TTL, hSetTtl, type Kv } from '../store/kv.ts';
import { islandOf, readDay } from './island.ts';

/** The two Reddit calls the job needs, so tests can fake them. */
export type DailyPort = {
  createPost: (
    title: string,
    postData: { day: string; seed: string; modifier: string }
  ) => Promise<string>;
  stickyComment: (postId: string, text: string) => Promise<string>;
};

export type DailyResult = {
  day: string;
  dayNumber: number;
  postId: string;
  created: boolean;
};

export const captainChartId = (day: string, i: number): string =>
  `cap-${day}-${i}`;

/** Store today's three Old Captain chests and charts (ENG-6, DAY-1.3). Skips any that exist. */
export const storeCaptainCharts = async (
  kv: Kv,
  day: string,
  seed: string,
  modifier: Modifier
): Promise<void> => {
  const island = islandOf({ seed, modifier });
  const chests = captainChests(island, rngFor(`${seed}|captain`));
  for (const [i, chest] of chests.entries()) {
    const id = captainChartId(day, i);
    if ((await kv.hGet(K.chart(id), 'day')) !== undefined) continue;
    const pieces = captainChart(
      island,
      chest.at,
      rngFor(`${seed}|captain|${i}`)
    );
    await hSetTtl(
      kv,
      K.chart(id),
      {
        day,
        authorId: 'captain',
        authorName: serverCopy.captainName,
        pieces: JSON.stringify(pieces),
        chestX: String(chest.at.x),
        chestY: String(chest.at.y),
        depth: chest.depth,
        createdAt: day,
        hidden: '0',
        captain: '1',
      },
      TTL.chart
    );
    await hSetTtl(
      kv,
      K.chartStats(id),
      {
        attempts: '0',
        finds: '0',
        trueVotes: '0',
        cursedVotes: '0',
        reports: '0',
      },
      TTL.chart
    );
    await kv.zAdd(K.chartsCaptain(day), { member: id, score: i });
    await kv.expire(K.chartsCaptain(day), TTL.chart);
  }
};

export const runDaily = async (
  kv: Kv,
  port: DailyPort,
  nowMs: number
): Promise<DailyResult> => {
  const day = utcDay(nowMs);
  const n = dayNumber(day);

  // Claim the day. Only the first caller creates a post (DAY-1.1, DAY-1.5).
  const claimed = (await kv.hSetNX(K.day(day), 'postId', 'pending')) === 1;
  if (!claimed) {
    const rec = await readDay(kv, day);
    if (rec !== null) {
      if (rec.shareCommentId === '') {
        const sticky = await port.stickyComment(
          rec.postId,
          serverCopy.shareSticky(n)
        );
        await kv.hSet(K.day(day), { shareCommentId: sticky });
      }
      await storeCaptainCharts(kv, day, rec.seed, rec.modifier);
      return { day, dayNumber: n, postId: rec.postId, created: false };
    }
    // A previous run claimed the day but died before posting: take over.
  }

  // Freeze the seed the first time a day is generated (DAY-1.6).
  const modifier = modifierFor(day);
  const existingSeed = await kv.hGet(K.day(day), 'seed');
  const island = generateIsland(existingSeed ?? seedFor(day), modifier);
  await kv.hSet(K.day(day), { seed: island.seed, modifier, name: island.name });

  const postId = await port.createPost(serverCopy.postTitle(n, island.name), {
    day,
    seed: island.seed,
    modifier,
  });
  await kv.hSet(K.day(day), { postId });
  await kv.set(K.postDay(postId), day);
  await kv.expire(K.postDay(postId), TTL.dayCounts);

  const sticky = await port.stickyComment(postId, serverCopy.shareSticky(n));
  await kv.hSet(K.day(day), { shareCommentId: sticky });

  await storeCaptainCharts(kv, day, island.seed, modifier);
  return { day, dayNumber: n, postId, created: true };
};
