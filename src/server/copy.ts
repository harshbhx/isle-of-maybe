// Server-side strings (post titles, sticky comments, mod toasts). UI strings live in src/client/copy.ts.

export const serverCopy = {
  postTitle: (n: number, island: string) =>
    `Isle of Maybe · Day ${n} — ${island}`,
  shareSticky: (n: number) =>
    `🗺️ Chart shares for Day ${n} go here. Share yours from inside the game: it replies to this comment from your account.\n\n🏝️ Name tomorrow's island: reply here with a name (3 to 24 letters). The top-voted reply at 00:00 UTC wins.`,
  captainName: 'Old Captain',
  /** share.comment in docs/06-COPY.md */
  shareComment: (depth: 'shallow' | 'buried' | 'deep', island: string) =>
    `Buried a ${depth === 'buried' ? 'well-buried' : depth} chest on ${island}. Can you read my map?`,
  /** Tier names, also used as user flair (COM-6.1). Same text as tier.* in docs/06-COPY.md. */
  tierName: {
    deckhand: 'Deckhand',
    mapmaker: 'Mapmaker',
    navigator: 'Navigator',
    cartographer: 'Cartographer',
    legend: 'Legend of the Isles',
  },
  toastPosted: (n: number) => `Day ${n} is posted.`,
  toastAlready: (n: number) =>
    `Day ${n} already exists. Filled in anything missing.`,
  toastFailed: 'Could not post today’s island. Check the app logs.',
  statsTitle: 'Isle of Maybe · last 7 days',
  statsClose: 'Close',
  reviewEmpty: 'No reported charts to review.',
  reviewTitle: 'Review reported charts',
  reviewDescription:
    'These charts were hidden after 3 player reports. Restore puts a chart back; Delete removes it for good.',
  reviewCharts: 'Charts',
  reviewAction: 'Action',
  reviewRestore: 'Restore',
  reviewDelete: 'Delete',
  reviewOption: (author: string, day: string, reports: number) =>
    `u/${author} · ${day} · ${reports} reports`,
  reviewRestored: (n: number) =>
    `Restored ${n} ${n === 1 ? 'chart' : 'charts'}.`,
  reviewDeleted: (n: number) => `Deleted ${n} ${n === 1 ? 'chart' : 'charts'}.`,
  reviewNone: 'Pick at least one chart.',
} as const;
