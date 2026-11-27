// Who is calling: a logged-in redditor, or a logged-out viewer identified by their loid (HUNT-2.3).

export type Actor = { id: string; name: string | null; loggedIn: boolean };

export const actorFrom = (ctx: {
  userId?: string | undefined;
  username?: string | undefined;
  loid?: string | undefined;
}): Actor =>
  ctx.userId !== undefined
    ? { id: ctx.userId, name: ctx.username ?? null, loggedIn: true }
    : { id: `anon:${ctx.loid ?? 'unknown'}`, name: null, loggedIn: false };
