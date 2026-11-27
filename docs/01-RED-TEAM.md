# 01 — Red team: Isle of Maybe

**Verdict: keep Isle of Maybe, with seven changes.** I attacked the idea from the point of view of a judge, a griefer, a Reddit app reviewer, a phone user, a tired player who gets a bad map, and Harsh's calendar. It survives. The original version would have lost, though. The changes below are what make it a contender, and they are already built into every other doc in this pack.

Sources for platform facts: `docs/11-AGENT-KNOWLEDGE.md`. Rules facts: the Devpost rules page (https://redditgameofday2026.devpost.com/rules).

---

## The seven changes (summary)

| # | Was | Now | Why |
|---|---|---|---|
| C1 | One shared treasure per day | **Every player buries their own chest**, and seekers hunt a stranger's chest | One shared spot is spoiled by the first comment that says "it's by the south rock". Thousands of different chests can't be spoiled. |
| C2 | Freehand ink drawing | **A limited chart kit**: 10 landmark stamps, a dotted path snapped to the grid, one X. No freehand, no text. | Devvit's content rules ask apps to "limit the available forms of expression" for in-app user content. It also fixes drawing on phones and makes charts machine-readable. |
| C3 | Payoff only "tomorrow" | **Instant "Ink check"** after charting + **live counters** + a **Dispatch** of results from earlier days | A judge plays once. They must see the whole loop in one sitting. |
| C4 | Hope players show up | **Old Captain charts** (3 game-made chests per day, honestly labelled) + **choice of 3 charts** + a **seeded test community** before judging | The demo subreddit must have fewer than 200 members. Without seeding, a judge could arrive to an empty island. |
| C5 | Bury anywhere | **Bury only on tiles you saw during your hunt**, then **chart from memory** with the island hidden | Stops mapmakers from being all-knowing and keeps the funny memory errors. |
| C6 | Any chest is equal | **Depth multiplier**: chests far from landmarks pay more to both the finder and the mapmaker | Otherwise the best play is "bury it on the skull rock", and every chart becomes trivial. |
| C7 | Client game | **Server-authoritative hunts**: the chest location never reaches the seeker's device before the reveal; steps and digs are validated on the server | Leaderboards and Cartographer flair mean nothing if a DevTools user can read the answer. |

---

## Full attack list

Severity: **S1** = would lose the hackathon or get the app rejected · **S2** = hurts a judging criterion · **S3** = polish/risk.

### A. Judging

| # | Attack | Sev | Fix | Where |
|---|---|---|---|---|
| A1 | Judges play once during 9–16 Dec. "Come back tomorrow to see how your map did" never happens for them. | S1 | C3: Ink check at the end of charting gives an instant accuracy score. Live counters on the result card ("2 sailors are using your chart right now"). The Dispatch screen shows results of the player's earlier charts; for a judge's first visit it shows a sample Dispatch explaining what they'll get tomorrow. The leaderboard and Hall of Charts show real results from the seeded community. | PRD §5.6, §5.8 |
| A2 | The demo subreddit is tiny, so a judge may be the only player that day. | S1 | C4: Old Captain charts are always available. Seed a real test community (15–40 players, under the 200-member cap) from about 5 Dec, and keep them playing daily through 16 Dec. | PRD §6.3, `13-PLAYTEST.md` |
| A3 | "Easy to learn": two phases (hunt, then bury and chart) sounds complex. | S2 | The order teaches itself: you first *use* a stranger's chart, so you understand charts before you make one. Three one-line contextual hints, no rules screen. Target session 3–4 minutes. | PRD §5, `06-COPY.md` |
| A4 | Judges score on the demo post alone. If the post needs explaining, it loses Polish. | S2 | Inline splash shows the day, island name, live counts and one button. First hunt has hints. README and Devpost text are backup, not the experience. | `04-WIREFRAMES.md` |
| A5 | "Reddit-y" must not be about Reddit. | S2 | No karma, no subreddits, no Snoo. The Reddit-ness is structural: strangers helping strangers, meritocracy (good charts spread, Cartographer flair), creativity (charts), and comments (optional chart shares under a sticky comment). | PRD §3 |
| A6 | Daily content must be fresh and calibrated. | S2 | New island every UTC day from a seeded generator, a 7-day modifier cycle, and a dev-only Atlas page to eyeball 30 days of islands and override bad seeds. | Architecture §6 |
| A7 | Judges will open it on desktop *and* phone. | S2 | Expanded mode is the game on both; inline is a splash. Test at 360 px and 1440 px. | Testing §3 |

### B. Fun

| # | Attack | Sev | Fix |
|---|---|---|---|
| B1 | Following a garbage map is random digging = frustration. | S1 | Choice of 3 charts (top-trusted, fresh, Old Captain), each with its 🧭/💀 rating. Failure ends with a **reveal overlay** that shows where the chart said vs where the chest was. That moment is funny, not punishing. Cursed charts sink in the ranking. |
| B2 | A perfect chart makes hunting trivial. | S2 | Charts are drawn from memory, the island is fogged (radius 3), and some islands have lookalike landmarks (two boulders). You still have to navigate. Scoring rewards steps and spare shovels. |
| B3 | "Bury next to the skull rock" is the dominant strategy. | S2 | C6 depth multiplier (Shallow ×1, Buried ×2, Deep ×3). Deep chests are worth the risk only if you chart well. That tension is the skill. |
| B4 | Mapmakers with total knowledge of the island. | S2 | C5: you can only bury on tiles you uncovered during your hunt; the island disappears while you chart. |
| B5 | The delayed result is the hook, but what if nobody hunts my chart? | S2 | The map picker always reserves one slot for a **fresh** chart (fewest attempts), so every chart gets exposure. With low traffic, players can hunt up to 3 charts a day. |
| B6 | One loop a day gets stale by day 4. | S3 | Weekday modifiers (fog, twins, storm), Cartographer tiers, weekly leaderboard, Hall of Charts. Enough for a hackathon; not a live-ops plan. |

### C. Reddit platform and rules

| # | Attack | Sev | Fix |
|---|---|---|---|
| C-1 | **Content rules:** apps that let users create in-app content should "limit the available forms of expression"; free-form input is discouraged. A freehand drawing tool shown to strangers invites obscene drawings. | S1 | C2 limited kit. Plus: "Charted by u/name" attribution on every chart, a one-tap report button, auto-hide after 3 reports, a moderator menu to review reported charts, and a 30-day expiry on chart data. |
| C-2 | User-entered imagery must have reportable attribution, and score sharing must be posted **as the user**. | S2 | "Share my chart" is an optional, separate button that posts a comment as the user, as a reply to the day's sticky comment, after a clear confirmation. Never required, never merged with gameplay. Note: until the app is approved, `runAs: 'USER'` posts from the app account (except for the app owner). That's expected during the hackathon. |
| C-3 | Inline scroll traps get apps rejected (canvas, maps and drawing surfaces must not capture feed scrolling). | S1 | Inline entry = splash with buttons only. Island canvas and chart editor live only in expanded mode. `_direct_launch` entry for Daily Games / Featured surfaces. |
| C-4 | Deleted content and deleted accounts must be purged. There is no account-deletion trigger. | S2 | Chart and hunt data expire after 30 days (Redis TTL), as Devvit's rules recommend. `onPostDelete` removes a deleted day's data; `onCommentDelete` drops the stored link to a deleted chart share. |
| C-5 | Unpublished apps get only **100 MB** of Redis. | S3 | A chart is about 600 bytes; hunt state expires after 2 days. 500 players a day for 30 days is about 24 MB. Above ~1,500 a day, shorten chart TTLs (Architecture §8). |
| C-6 | Scheduler misses the daily post. | S2 | Cron at 00:00 UTC is idempotent (per-day key); a moderator menu item "Post today's island" is the manual fallback; `onAppInstall` creates Day 1. |
| C-7 | Don't use Reddit IP or third-party IP. | S2 | Original name, original glyphs, no Snoo, no film/pirate franchise references, OFL fonts bundled locally. |
| C-8 | `localStorage` is wiped on every app update. | S3 | Only cosmetic prefs (hint dismissals) go in `localStorage`; everything else in Redis. |

### D. Cheating and abuse

| # | Attack | Sev | Fix |
|---|---|---|---|
| D1 | Read the chest location from network traffic. | S1 | C7: chest coordinates never sent to a seeker until the hunt ends. |
| D2 | Fake a short path for a high score. | S2 | Server replays every step: adjacent tiles only, walkable only, from the dock. |
| D3 | Hunt your own chart, or use an alt to farm your chest. | S2 | Own charts are excluded. One chest per account per day. Burying needs login. Alt farming is possible but low-value; accepted risk for a hackathon. |
| D4 | Spoil a chest in the comments. | S3 | Each chest is one player's, so a spoiler only spoils that one chart. Share text never contains coordinates. |
| D5 | Spam reports to hide good charts. | S3 | Reports are per-user unique; hidden charts go to the mod queue and can be restored. |
| D6 | Arrange stamps into a rude shape. | S3 | Max 6 stamps and 8 path segments make this hard; report + mod queue covers the rest. |

### E. Engineering and schedule

| # | Attack | Sev | Fix |
|---|---|---|---|
| E1 | Harsh has the 404 Hackathon (29–30 Nov), Kavach (2 Dec), Purna (live review 3 Dec, due 8 Dec 03:30 IST) and exams. | S1 | P0 scope fits about 3 build days with agents. Hard cut line in `07-TASKS.md`. Everything marked P1/P2 is optional. Code freeze 8 Dec 22:00 IST; deadline is 9 Dec 07:30 IST. |
| E2 | The island generator makes unfair islands. | S2 | Connectivity check (every land tile reachable from the dock), minimum landmark spacing, guaranteed lookalike rules, the Atlas review page and a seed override list. |
| E3 | Tap-to-move pathfinding feels bad on phones. | S2 | A* on a 40×40 grid is instant. Show a dotted route preview before walking. Animate at 12 tiles/second; tap again to skip the animation. |
| E4 | New stack (Devvit) eats time. | S2 | Start from the official React template; Phase 0 gets a hello-world playtest running before any game code. |
| E5 | Art takes forever. | S2 | One ink style, 10 glyphs, flat colours, CSS paper texture. No sprites, no animation libraries. |

### F. Originality

| # | Attack | Sev | Answer |
|---|---|---|---|
| F1 | "Bury treasure, draw a map, play other players' maps" exists in a small itch.io game (Captain Peggles: That Man's Chest) and a 1v1 jam game (The Mapmakers). | S3 | True, and it's good news: the loop is proven fun, and no popular game owns it, so it isn't a "clone of a popular game". Nothing like it exists on Reddit. Our version adds what only Reddit can: a shared daily island, thousands of strangers, delayed results, ratings that spread good charts, and Cartographer flair. Mention the inspiration honestly in the README. |

---

## Alternatives re-checked against the same attacks

| Idea | Fails |
|---|---|
| Patang (kite fights vs replays) | B: fighting a recording isn't interactive; feel is everything and it's the riskiest to build. A5: less community, more solo skill. |
| Murmuration (one bird in a crowd flock) | B: thin gameplay; A1: the beauty needs many players, which the demo sub won't have. |
| Constellations, folding, split-the-room, shared-clue detective, memory painting | Already on Reddit (TaaraNight, Origami Master, Hostage Hot Take / Predictably Wrong, REDACTED, PAINT-IT). |

**Isle of Maybe is still the pick.**
