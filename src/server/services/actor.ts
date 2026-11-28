// Who is calling: a logged-in redditor, or a logged-out viewer identified by their loid (HUNT-2.3).
// A viewer with neither has no stable identity, so each request gets a throwaway one (#97).

export type Actor = {
  id: string;
  name: string | null;
  loggedIn: boolean;
  /** No user id and no loid: limits can't follow this viewer between requests. */
  ephemeral?: true;
};

export const EPHEMERAL_PREFIX = 'anon:none-';

export const actorFrom = (
  ctx: {
    userId?: string | undefined;
    username?: string | undefined;
    loid?: string | undefined;
  },
  throwawayId = '0'
): Actor => {
  if (ctx.userId !== undefined)
    return { id: ctx.userId, name: ctx.username ?? null, loggedIn: true };
  if (ctx.loid !== undefined && ctx.loid !== '')
    return { id: `anon:${ctx.loid}`, name: null, loggedIn: false };
  return {
    id: `${EPHEMERAL_PREFIX}${throwawayId}`,
    name: null,
    loggedIn: false,
    ephemeral: true,
  };
};

/** May this actor act on a hunt started by `ownerId`? Throwaway viewers prove it by the secret hunt id. */
export const ownsHunt = (actor: Actor, ownerId: string): boolean =>
  ownerId === actor.id ||
  (actor.ephemeral === true && ownerId.startsWith(EPHEMERAL_PREFIX));
