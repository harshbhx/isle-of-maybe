// Server-side strings (post titles, sticky comments, mod toasts). UI strings live in src/client/copy.ts.

export const serverCopy = {
  postTitle: (n: number, island: string) =>
    `Isle of Maybe · Day ${n} — ${island}`,
  shareSticky: (n: number) =>
    `🗺️ Chart shares for Day ${n} go here. Share yours from inside the game: it replies to this comment from your account.`,
  captainName: 'Old Captain',
  toastPosted: (n: number) => `Day ${n} is posted.`,
  toastAlready: (n: number) =>
    `Day ${n} already exists. Filled in anything missing.`,
  toastFailed: 'Could not post today’s island. Check the app logs.',
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
