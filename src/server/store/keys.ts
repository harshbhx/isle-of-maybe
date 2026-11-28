// Redis key builders, one place for every key name (docs/05-ARCHITECTURE.md §5).
// d = day 'YYYY-MM-DD', u = user id (t2_…), c = chart id, h = hunt id.

export const K = {
  day: (d: string) => `day:${d}`,
  dayCounts: (d: string) => `day:${d}:counts`,
  /** Who finished a hunt that day, for return rates (SHIP-3.1). */
  dayPlayers: (d: string) => `players:${d}`,
  postDay: (postId: string) => `postday:${postId}`,
  chart: (c: string) => `chart:${c}`,
  chartStats: (c: string) => `chart:${c}:stats`,
  chartVotes: (c: string) => `chart:${c}:votes`,
  chartReporters: (c: string) => `chart:${c}:reporters`,
  chartsTrust: (d: string) => `charts:${d}:trust`,
  chartsAttempts: (d: string) => `charts:${d}:attempts`,
  chartsCaptain: (d: string) => `charts:${d}:captain`,
  user: (u: string) => `user:${u}`,
  userDay: (u: string, d: string) => `user:${u}:day:${d}`,
  userHunted: (u: string) => `user:${u}:hunted`,
  seen: (u: string, d: string) => `user:${u}:seen:${d}`,
  streak: (u: string, yyyy: number) => `user:${u}:streak:${yyyy}`,
  hunt: (h: string) => `hunt:${h}`,
  boardGoldDay: (d: string) => `board:gold:${d}`,
  boardGoldWeek: (w: string) => `board:gold:${w}`,
  boardCartographers: () => 'board:cartographers',
  reportsQueue: () => 'reports:queue',
  flairPending: () => 'flair:pending',
  hallCache: (d: string) => `cache:hall:${d}`,
  trustedCache: (d: string) => `cache:trusted:${d}`,
  shareComment: (commentId: string) => `sharecomment:${commentId}`,
  rate: (u: string, sec: number) => `rl:${u}:${sec}`,
} as const;
