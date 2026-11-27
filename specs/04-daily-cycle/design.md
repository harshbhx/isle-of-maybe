# 04 · Daily cycle — design

See `docs/05-ARCHITECTURE.md` §9 for the job steps.

- `jobs/daily.ts` exports `runDaily(dayString, subredditName)`; cron handler, install trigger and both mod menu items call it.
- Idempotency: `hSetNX day:{d} postId "pending"` before creating; if it returns false, read the existing post id and only fill missing steps (sticky, captain charts).
- Island name for day d: `day:{d-1}.nameCommentId` → `reddit.getComments({ postId, … })` filtered to direct replies, sorted by score; validate with `/^[A-Za-z][A-Za-z ]{2,23}$/` and `banned.ts`; else `islandName(rng)`.
- Tomorrow teaser: client calls `generateIsland(seedFor(tomorrow))` locally and draws only the coastline (seeds are public by design; landmarks are hidden in the UI, and charts for tomorrow can't exist yet, so nothing leaks that matters).
- Streak: `bitfield user:{u}:streak:{yyyy} SET u1 {dayOfYear} 1`; read with `getBuffer`-style access (Syllo pattern, `docs/11-AGENT-KNOWLEDGE.md` #43).
- Dispatch: `user:{u}:day:{d}.chartId` for the last 3 days → `chart:{c}:stats`.
- Crew goal: `day:{d}:counts.found` vs `day:{d}.goal`.
