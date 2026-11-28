# 05 — Architecture

Devvit Web app: React client + three.js 3D island (Canvas 2D fallback) + SVG chart editor; Hono server on Devvit; Redis for all state; scheduler for the daily post. Start from the official React template (`reddit/devvit-template-react`, @devvit/web 0.15.4 at time of writing). Platform facts and limits: `11-AGENT-KNOWLEDGE.md`.

---

## 1. Repo layout

```
isle-of-maybe/
├── devvit.json
├── package.json            # from template; add vitest only if node:test isn't enough
├── vite.config.ts          # devvit() plugin infers entries from devvit.json
├── README.md               # REQUIRED by the rules: game + how to play (09-SUBMISSION §3)
├── src/
│   ├── shared/             # pure TS, imported by client AND server, no DOM, no Devvit
│   │   ├── rng.ts          # mulberry32 + string hash
│   │   ├── island.ts       # generateIsland(seed, modifier) → Island
│   │   ├── path.ts         # A*, adjacency, BFS reach, Chebyshev
│   │   ├── depth.ts        # depthClass(tile, landmarks)
│   │   ├── chart.ts        # Chart types, validateChart(), inkCheck()
│   │   ├── captain.ts      # oldCaptainChart(island, chest, rng)
│   │   ├── scoring.ts      # finderGold(), salvage(), trustScore(), tier()
│   │   ├── day.ts          # utcDay(), dayNumber(), modifierFor(day)
│   │   ├── names.ts        # island name word lists
│   │   └── api.ts          # request/response types for every endpoint
│   ├── client/
│   │   ├── splash.html / splash.tsx        # inline entry
│   │   ├── game.html / game.tsx            # expanded entry (also _direct_launch)
│   │   ├── screens/  Dispatch, Pick, Hunt, Reveal, Bury, Chart, Result, Boards, Hall
│   │   ├── island/   renderer.ts (Canvas 2D), camera.ts, input.ts, fog.ts
│   │   ├── chart/    ChartEditor.tsx (SVG), Glyph.tsx, ParchmentDefs.tsx, toPng.ts
│   │   ├── ui/       Button, Card, Sheet, Toast, Counter, Badge
│   │   ├── audio.ts  # 3 WebAudio effects, generated, muted until first tap (P1)
│   │   ├── copy.ts   # every UI string (06-COPY.md)
│   │   └── styles.css # tokens from 03-DESIGN.md
│   └── server/
│       ├── index.ts           # Hono app, routes
│       ├── routes/api.ts      # /api/*
│       ├── routes/internal.ts # /internal/* scheduler, menu, forms, triggers
│       ├── store/*.ts         # Redis access, one module per entity
│       └── jobs/daily.ts      # create day post, Old Captain chests, flair
├── tools/atlas.html          # dev-only: renders 30 upcoming islands for review (not shipped)
└── test/                     # node:test for src/shared/*
```

**Rule:** all game rules live in `src/shared/` and run on both sides. The client uses them for previews; the server re-runs them to decide. The server is the only authority.

## 2. devvit.json (target)

```json
{
  "$schema": "https://developers.reddit.com/schema/config-file.v1.json",
  "name": "isle-of-maybe",
  "post": {
    "dir": "dist/client",
    "entrypoints": {
      "default":        { "entry": "splash.html", "inline": true, "height": "regular" },
      "game":           { "entry": "game.html" },
      "_direct_launch": { "entry": "game.html" }
    }
  },
  "server": { "dir": "dist/server", "entry": "index.cjs" },
  "permissions": {
    "media": true,
    "realtime": true,
    "reddit": { "enable": true, "asUser": ["SUBMIT_COMMENT", "SUBSCRIBE_TO_SUBREDDIT"] }
  },
  "scheduler": {
    "tasks": {
      "daily-island": { "endpoint": "/internal/jobs/daily", "cron": "0 0 * * *" }
    }
  },
  "triggers": {
    "onAppInstall": "/internal/triggers/install",
    "onPostDelete": "/internal/triggers/post-delete",
    "onCommentDelete": "/internal/triggers/comment-delete"
  },
  "menu": {
    "items": [
      { "label": "Isle of Maybe: Post today's island", "location": "subreddit", "forUserType": "moderator", "endpoint": "/internal/menu/post-today" },
      { "label": "Isle of Maybe: Review reported charts", "location": "subreddit", "forUserType": "moderator", "endpoint": "/internal/menu/review" },
      { "label": "Isle of Maybe: Re-run daily job", "location": "subreddit", "forUserType": "moderator", "endpoint": "/internal/menu/rerun" }
    ]
  },
  "forms": { "reviewForm": "/internal/forms/review" }
}
```

Verify key names against the current schema (`https://developers.reddit.com/schema/config-file.v1.json`) and the template when scaffolding; the docs are the source of truth, not this sketch. The app `name` must be unique on developers.reddit.com; pick at scaffold time.

## 3. Data model (shared/api.ts)

```ts
type Tile = { x: number; y: number };                 // 0..39
type LandmarkType = 'palm'|'twinPalms'|'boulder'|'skullRock'|'hut'|'wreck'|'well'|'statue'|'campfire'|'cave';
type Island = {
  day: string; seed: string; name: string; modifier: Modifier;
  w: 40; h: 40;
  terrain: Uint8Array;          // 0 water, 1 sand, 2 grass, 3 blocked
  landmarks: { id: number; type: LandmarkType; at: Tile }[];
  dock: Tile;
};
type ChartPiece =
  | { k: 'stamp'; t: LandmarkType; x: number; y: number }
  | { k: 'path'; pts: Tile[] }      // ≤ 9 points = ≤ 8 segments
  | { k: 'x'; x: number; y: number };
type ChartPublic = {
  id: string; day: string; author: string | 'oldCaptain';
  pieces: ChartPiece[]; depth: 'shallow'|'buried'|'deep';
  attempts: number; finds: number; trueVotes: number; cursedVotes: number;
};
// Chest position is NEVER part of ChartPublic.
```

Chart wire size: about 300–600 bytes JSON.

## 4. API

All `/api/*` routes get the user from Devvit's request context (`context.userId`, `context.username`, `context.postId`). The post's `postData` holds `{ day, seed }`, so every request knows which island it's on.

| Method & path | Body | Returns | Server checks |
|---|---|---|---|
| `GET /api/init` | – | island seed+modifier (client regenerates island), today/this-post day, user state (hunts today, buried?, streak, gold, tier), dispatch (last 3 days), counters | – |
| `GET /api/charts/pick` | – | 3 `ChartPublic` (trusted, fresh, captain) | excludes own, used, hidden |
| `POST /api/hunt/start` | `{ chartId }` | `{ huntId }` | hunts today < 3; chart valid; logged-out → session-only hunt id |
| `POST /api/hunt/steps` | `{ huntId, from, steps: Tile[] }` (≤ 200 per call) | `{ ok, at, stepCount }` | each step adjacent (4-dir) + walkable; `from` = last server position; idempotent by step index |
| `POST /api/hunt/dig` | `{ huntId, at }` | `{ found, shovelsLeft, done, reveal? }` | `at` = server position; shovels > 0. When `done`: reveal = `{ chest, gold, chartX }` |
| `POST /api/hunt/giveup` | `{ huntId }` | `{ reveal }` | – |
| `POST /api/chart/rate` | `{ chartId, vote: 'true'|'cursed' }` | `{ ok }` | hunted it; one vote |
| `POST /api/chart/report` | `{ chartId }` | `{ ok }` | one per user; hide at 3 |
| `POST /api/bury` | `{ at }` | `{ depth }` | logged in; today's post; not yet buried; `at` ∈ union of revealed tiles of today's hunts; land, not blocked, not a landmark tile |
| `POST /api/chart` | `{ pieces }` | `{ chartId, inkCheck }` | buried today, no chart yet; `validateChart` (≤ 6 stamps, ≤ 8 segments, exactly 1 X, in bounds, known types) |
| `POST /api/chart/share` | `{ chartId, png }` (data URL) | `{ commentUrl }` | own chart; called only from the confirm sheet; `media.upload` → `submitComment({ runAs: 'USER' })` as reply to the day's sticky comment |
| `GET /api/boards?kind=` | – | top 10 + own rank | – |
| `GET /api/hall?day=` | – | top 3 charts of a day | – |

**Reveal set (for burying):** the server computes revealed tiles itself from validated steps (radius from the modifier) and stores them as a 1,600-bit bitfield per user per day. The client never sends "tiles I've seen".

## 5. Redis keys

`d` = day `YYYY-MM-DD`, `u` = user id (t2_…), `c` = chart id. TTL in brackets.

| Key | Type | Content | TTL |
|---|---|---|---|
| `day:{d}` | hash | `postId, seed, modifier, name, shareCommentId` | 400 d (no player content; old posts and the Hall need it) |
| `day:{d}:counts` | hash | `buried, found, hunts` | 40 d |
| `chart:{c}` | hash | `day, authorId, authorName, pieces(json), chestX, chestY, depth, createdAt, hidden, shareCommentId` | 30 d |
| `chart:{c}:stats` | hash | `attempts, finds, trueVotes, cursedVotes, reports` | 30 d |
| `charts:{d}:trust` | zset | chartId → trust score | 30 d |
| `charts:{d}:attempts` | zset | chartId → attempts (for "fresh") | 30 d |
| `charts:{d}:captain` | zset | captain chart ids | 30 d |
| `user:{u}` | hash | `name, gold, finds, tier, lastDay` | 30 d, refreshed on activity |
| `user:{u}:day:{d}` | hash | `hunts, buried, chartId, chestX, chestY, usedCharts(json)` | 8 d |
| `user:{u}:seen:{d}` | string (hex bit set) | 1,600 bits revealed-tile mask | 2 d |
| `user:{u}:hunted` | hash | chartId → `found`/`missed` (rating gate) | 30 d |
| `user:{u}:streak:{yyyy}` | string (bitfield) | one bit per day of year | 400 d* |
| `chart:{c}:votes` | hash | userId → `true`/`cursed` | 30 d |
| `chart:{c}:reporters` | hash | userId → 1 | 30 d |
| `hunt:{id}` | hash | `userId, chartId, day, x, y, steps, shovels, done` | 2 d |
| `board:gold:{d}` / `board:gold:w{isoWeek}` | zset | userId → gold | 30 d |
| `board:cartographers` | zset | userId → all-time finds | 30 d, refreshed on every find |
| `reports:queue` | zset | chartId → time | 30 d |
| `postday:{postId}` | string | day | 40 d |
| `sharecomment:{commentId}` | string | chartId | 30 d |
| `flair:pending` | zset | userId → time | 8 d |
| `players:{d}` | zset | userId → time a hunt finished that UTC day (stats, SHIP-3.1) | 30 d |
| `rl:{u}:{sec}` | counter | calls this second | 2 s |

Every write sets a TTL; `cleanup.test.ts` plays a full day and fails if any key has none, or if anything but `day:*`, `day:*:counts`, `postday:*` and streak bits outlives 30 days (COM-1.5).

\* The streak bitfield only holds day bits, no content; still expire it, per the 30-day guidance, if a reviewer asks. Hackathon: keep 400 d.

**Atomicity:** counters use `hIncrBy`/`zIncrBy`. "One chest per day" and "one vote per chart" use `hSetNX`. Burying + chart creation for the same user use a `watch` transaction on `user:{u}:day:{d}` (transactions are limited and time out after 5 s, so keep them tiny).

## 6. Island generator (`shared/island.ts`)

Deterministic: same seed → same island on client and server.

1. **RNG:** `mulberry32(hash32(seed))`.
2. **Land mask:** radial falloff from the centre + 2 octaves of value noise; threshold to hit the target land share (60%, 70% on Low tide). Keep the largest connected land blob; drop specks.
3. **Coast:** land tiles next to water = sand; others grass.
4. **Dock:** pick the southern-most coastal sand tile (ties → closest to centre x). Mark it.
5. **Blocked tiles:** scatter rock/pond/jungle clusters to reach 10–15% of land (20% on Thick jungle), rejecting any placement that breaks connectivity (BFS from dock must reach every non-blocked land tile).
6. **Landmarks:** choose 8–12 types (no repeats, except Twins: 2 types placed twice). Place on grass/sand with min spacing 4 tiles (twins: 6–10 tiles apart so they're confusable but distinct), not on the dock, at least 3 tiles from the dock. Landmarks are blocked tiles (you walk around them).
7. **Validation:** reachable, landmark count in range, at least 30% of land is ≥ 5 tiles from any landmark (so Deep chests are possible). If validation fails, re-roll with `seed + '#n'` up to 20 times.
8. **Name:** from `names.ts` with the same RNG.

### 6.4 Curation
- `tools/atlas.html` renders the next 30 days side by side with landmark labels. Harsh (or an agent with screenshots) reviews them.
- Bad days go into `src/shared/overrides.ts`: `{ '2026-12-10': 'maybe-2026-12-10#alt3' }`.
- Once a day's post exists, its seed is frozen in `day:{d}` and postData. Never regenerate a posted day.

## 7. Game logic (shared)

- **Movement:** 4-directional. A* with Manhattan heuristic on 40×40; under 2 ms.
- **Fog:** tiles within Euclidean radius `r` of the sailor after each step are revealed.
- **Find:** `chebyshev(dig, chest) ≤ 1`.
- **Depth:** min Chebyshev distance from chest to any landmark: ≤ 2 shallow, 3–4 buried, ≥ 5 deep.
- **Ink check:** for each stamp, distance to nearest real landmark of the same type (or 10 if none); X error = Euclidean distance X→chest. Grades in PRD §5.6.
- **Old Captain chart:** pick 3–5 landmarks nearest the chest + the dock; jitter each by up to 1 tile; path = A* dock → chest, simplified to ≤ 8 segments (Ramer–Douglas–Peucker), with one waypoint nudged by 1–2 tiles; X = chest + random offset of 1–2 tiles.
- **Scoring:** PRD §7, all in `scoring.ts` with unit tests.

## 8. Storage budget (unpublished app: 100 MB)

| Item | Size | Per day at 500 players |
|---|---|---|
| chart + stats | ~1 KB | 0.5 MB |
| user day record + seen bitfield | ~0.5 KB | 0.25 MB |
| hunt state (≤ 3 per user, 2-day TTL) | ~0.3 KB | 0.45 MB (rolling) |
| boards, counters | small | <0.05 MB |

30 days × ~0.8 MB ≈ 24 MB at 500 players/day. Fine. Treat every write as able to fail with a quota error (show the "ship's log is full" state, PRD §11).

## 9. Daily job (`/internal/jobs/daily`, cron `0 0 * * *` UTC)

Idempotent: `hSetNX day:{d} postId` guards creation.
1. Compute today's seed (with overrides), modifier, name.
2. `reddit.submitCustomPost({ subredditName, title: 'Isle of Maybe · Day N — <Island name>', entry: 'default', postData: { day, seed } })`.
3. Submit and sticky a comment from the app: "🗺️ Chart shares for Day N go here. Reply to this comment to share your chart (from inside the game)." Store `stickyCommentId`.
4. Bury today's 3 Old Captain chests and create their charts.
5. (P1) Recompute tiers for users active yesterday; `setUserFlairBatch` in chunks of 100.
6. Log a one-line summary.

Fallbacks: `onAppInstall` runs steps 1–4 for today. Mod menu "Post today's island" and "Re-run daily job" call the same function.

Deletion triggers: `onPostDelete` for a day post deletes that day's charts, stats and indexes; `onCommentDelete` clears `shareCommentId` on the chart that pointed to it.

## 10. Realtime (P1)
- Channel `day-{YYYYMMDD}` (no `:` allowed in channel names).
- Server sends `{ t: 'found', finder, author, depth }` on each find and `{ t: 'buried' }` on each bury.
- Client shows a ticker on splash and result card ("u/a found u/b's Deep chest!") and bumps counters. Without realtime, counters refresh on open.

## 11. Chart image for sharing
- Client renders the chart SVG to a canvas at 800×800 (parchment, ink, "Charted by u/name · Day N · {island}"), `toDataURL('image/png')`, sends to `/api/chart/share`.
- Server: `media.upload({ url: dataUrl, type: 'image' })` → `reddit.submitComment({ id: stickyCommentId, richtext with the image + 1 line of text, runAs: 'USER' })`.
- Keep PNG under 1 MB (simple vector art compresses well).

## 12. Client rendering
- **Island (3D, three.js):** `src/client/island/three/island3d.ts`, lazy-loaded by `IslandCanvas` in the game entry only. Terrain columns per tile (heights and kinds from `src/shared/relief.ts`), jungle trees and boulders on blocked tiles (instanced), a faceted sea over a lagoon floor that shallows near land, landmark models, the sailor, footprints, holes, route dots, reveal markers, and low cloud (instanced) over unseen land that clears as you walk. Camera: perspective, 50° tilt (62° for the whole-island view), eases after the sailor; taps ray-cast to the terrain (UI-3.6). Unseen landmarks are never drawn except within lantern range on Lantern night.
- **Island (2D fallback):** `draw.ts` on Canvas 2D, used when WebGL is missing or the 3D renderer fails (UI-3.5), and for the Ink check, whose paper-chart overlay must line up tile for tile.
- **Chart editor (SVG):** viewBox 0 0 400 400 (10 px per tile). Coastline path generated from the island mask with a small ink wobble. All pieces are SVG `<use>` of glyph symbols. Pointer events with `touch-action: none` **only in expanded mode**, on the editor element, never on `html`/`body`.
- **Performance budgets:** client JS ≤ 250 KB gzip; first paint of splash ≤ 1.5 s on a mid phone; 60 fps while walking.

## 13. Security checklist
- Chest coordinates only in `chart:{c}` hash and `user:{u}:day:{d}`; only sent in a `reveal` payload after a hunt ends, or to the chart's own author.
- Never trust `getShareData()`; it only pre-selects a chart id, which goes through normal checks.
- Validate every body with a small hand-written guard (no `any`).
- Rate limits: ≤ 20 step batches per hunt; ≤ 10 API calls/s per user (simple Redis counter with 1 s TTL).
