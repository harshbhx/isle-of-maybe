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
} as const;
