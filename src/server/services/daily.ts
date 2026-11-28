// The daily job: post today's island once, sticky the share thread, bury the Old Captain's
// chests (DAY-1). Idempotent: running it again only fills in whatever is missing.
import { captainChart, captainChests } from '../../shared/captain.ts';
import {
  addDays,
  clampGoal,
  CREW_GOAL_DEFAULT,
  dayNumber,
  modifierFor,
  nextModifier,
  utcDay,
  type Modifier,
} from '../../shared/day.ts';
import { generateIsland, seedFor } from '../../shared/island.ts';
import { rngFor } from '../../shared/rng.ts';
import { serverCopy } from '../copy.ts';
import { K } from '../store/keys.ts';
import { TTL, hSetOnce, hSetTtl, type Kv } from '../store/kv.ts';
import { pickName, type NameReply } from '../../shared/naming.ts';
import { applyFlairs, type SetFlairs } from './flair.ts';
import { asModifier, islandOf, readDay } from './island.ts';

/** The two Reddit calls the job needs, so tests can fake them. */
export type DailyPort = {
  createPost: (
    title: string,
    postData: { day: string; seed: string; modifier: string }
  ) => Promise<string>;
  stickyComment: (postId: string, text: string) => Promise<string>;
  setFlairs: SetFlairs;
  /** The subreddit's crew goal setting (DAY-8.1). */
  crewGoal: () => Promise<number>;
  /** Direct replies to a comment (DAY-6.2). */
  replies: (commentId: string) => Promise<NameReply[]>;
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

/** The daily job: post today's island, then catch up on tier flair (COM-6.1). */
export const runDaily = async (
  kv: Kv,
  port: DailyPort,
  nowMs: number
): Promise<DailyResult> => {
  const r = await postIsland(kv, port, nowMs);
  await applyFlairs(kv, port.setFlairs);
  return r;
};

const todaysModifier = async (kv: Kv, day: string): Promise<Modifier> => {
  const yesterday = addDays(day, -1);
  const prev = await readDay(kv, yesterday);
  if (prev === null) return modifierFor(day);
  const found =
    Number((await kv.hGet(K.dayCounts(yesterday), 'found')) ?? 0) || 0;
  return nextModifier(day, found, prev.goal);
};

/** Yesterday's top usable reply under the sticky names today's island (DAY-6.2). Best effort. */
const communityName = async (
  kv: Kv,
  port: DailyPort,
  yesterday: string
): Promise<{ name: string; by: string } | null> => {
  const prev = await readDay(kv, yesterday);
  if (prev === null || prev.shareCommentId === '') return null;
  try {
    return pickName(await port.replies(prev.shareCommentId));
  } catch (e) {
    console.error(`naming replies: ${String(e)}`);
    return null;
  }
};

const postIsland = async (
  kv: Kv,
  port: DailyPort,
  nowMs: number
): Promise<DailyResult> => {
  const day = utcDay(nowMs);
  const n = dayNumber(day);

  // Claim the day. Only the first caller creates a post (DAY-1.1, DAY-1.5).
  const claimed = await hSetOnce(kv, K.day(day), 'postId', 'pending', TTL.day);
  if (!claimed) {
    const rec = await readDay(kv, day);
    if (rec !== null) {
      if (rec.shareCommentId === '') {
        const sticky = await port.stickyComment(
          rec.postId,
          serverCopy.shareSticky(n)
        );
        await hSetTtl(kv, K.day(day), { shareCommentId: sticky }, TTL.day);
      }
      await storeCaptainCharts(kv, day, rec.seed, rec.modifier);
      return { day, dayNumber: n, postId: rec.postId, created: false };
    }
    // A previous run claimed the day but died before posting: take over.
  }

  // Freeze the seed and modifier the first time a day is generated (DAY-1.6). Yesterday's crew
  // goal decides whether today is Lantern night (DAY-8.2).
  const frozen = await kv.hMGet(K.day(day), ['seed', 'modifier']);
  const existingSeed = frozen[0] ?? undefined;
  const modifier =
    frozen[1] !== null && frozen[1] !== undefined
      ? asModifier(frozen[1])
      : await todaysModifier(kv, day);
  const goal = clampGoal(await port.crewGoal().catch(() => CREW_GOAL_DEFAULT));
  const island = generateIsland(existingSeed ?? seedFor(day), modifier);
  const named = await communityName(kv, port, addDays(day, -1));
  const name = named?.name ?? island.name;
  await hSetTtl(
    kv,
    K.day(day),
    {
      seed: island.seed,
      modifier,
      name,
      namedBy: named?.by ?? '',
      goal: String(goal),
    },
    TTL.day
  );

  const postId = await port.createPost(serverCopy.postTitle(n, name), {
    day,
    seed: island.seed,
    modifier,
  });
  await hSetTtl(kv, K.day(day), { postId }, TTL.day);
  await kv.set(K.postDay(postId), day);
  await kv.expire(K.postDay(postId), TTL.dayCounts);

  const sticky = await port.stickyComment(postId, serverCopy.shareSticky(n));
  await hSetTtl(kv, K.day(day), { shareCommentId: sticky }, TTL.day);

  await storeCaptainCharts(kv, day, island.seed, modifier);
  return { day, dayNumber: n, postId, created: true };
};
