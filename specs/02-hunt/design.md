# 02 · Hunt — design

Endpoints and keys: `docs/05-ARCHITECTURE.md` §4–5. Screens: `docs/04-WIREFRAMES.md` W3–W5.

## Server
- `store/charts.ts`: `pickCharts(day, userId)` reads `charts:{d}:trust` (top N, filter), `charts:{d}:attempts` (lowest N, filter), `charts:{d}:captain`; filters with `user:{u}:day:{d}.usedCharts` and `chart:{c}.hidden`/author.
- `store/hunts.ts`: hunt hash with `x, y, steps, shovels, done, lastIndex`. `applySteps` replays with `path.ts`; reveals via `revealAround` into the seen bitfield (`bitfield SET u1 <index> 1` per newly seen tile, batched in one call where the client supports multiple ops).
- `routes/hunt.ts`: `start`, `steps`, `dig`, `giveup`, `rate`. Each handler: parse → guard → load → rule from `src/shared` → write → respond.
- Gold and stats updates use `hIncrBy`/`zIncrBy`; "end once" uses `hSetNX hunt:{id} done 1` so double taps can't pay twice.
- Rate limiter: `incr rl:{u}:{sec}` + `expire 2`.

## Client
- `screens/Pick.tsx`: 3 cards (carousel on phones), challenged-by banner from `getShareData()`.
- `screens/Hunt.tsx` + `island/*`: optimistic walking (client predicts with the same rules), steps flushed every 250 ms or on dig; if the server rejects, snap back to the server position and toast `err.network`.
- `screens/Reveal.tsx`: found/missed animations, ink line, rating buttons.

## Tests
- Unit: guards and pure step replay.
- Integration (in-memory Redis fake): two users, full hunt, assert HUNT-4.3 by scanning every response body for the chest coordinates.
