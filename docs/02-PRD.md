# 02 — Product requirements: Isle of Maybe

> **Bury it. Chart it. Trust a stranger's map.**
> Every day there's a new island. You hunt for a chest using a map a stranger drew from memory. Then you bury your own chest and draw a map for the next stranger. Tomorrow you find out how many sailors your map led to gold.

Name: **Isle of Maybe** — every chart is a maybe. Naming decision in `10-DECISIONS.md` (D01).

---

## 1. Goals

1. Win **Best Daily Game** ($15k) or one of 10 **Honorable Mentions** ($1k) in Reddit's Game of the Day Hackathon.
2. Score high on all four equally weighted criteria: **Delightful UX, Polish, Reddit-y, Daily Content**.
3. Be playable and understood from the demo post alone, on phone and desktop, in one 3–4 minute sitting.

**Non-goals:** monetisation, publishing to the App Directory before judging, multiple subreddits, an AI anything.

## 2. Deadlines (IST)

| When | What |
|---|---|
| **Tue 8 Dec, 22:00** | Code freeze (our rule) |
| **Wed 9 Dec, 07:30** | Devpost deadline (8 Dec 18:00 PT) |
| Wed 9 Dec 13:30 → Thu 17 Dec 07:30 | Judging (9 Dec 00:00 PT → 16 Dec 18:00 PT). Game must stay free, live and playable until it ends. Keep the community playing daily. |
| ~Fri 18 Dec, 04:30 | Winners announced (on or around Thu 17 Dec 15:00 PT) |

## 3. How it maps to judging

| Criterion | What judges must feel | How Isle of Maybe delivers |
|---|---|---|
| Delightful UX | "That was fun and I got it instantly" | One button to start. You learn charts by *using* one before you make one. The failure reveal ("the map said here, the chest was there") is funny. Ink-on-parchment identity. |
| Polish | "This could ship today" | Small scope, every state designed (`04-WIREFRAMES.md`), zero dead ends, works at 360 px and desktop, no console errors. |
| Reddit-y | "This brings a community together" | Your play helps strangers; good charts spread (meritocracy); charts are creative; optional chart shares as comments; Cartographer flair. Not about Reddit itself. |
| Daily Content | "There's a reason to come back" | New island daily; a 7-day modifier cycle; your result arrives tomorrow; streaks; weekly board. |

## 4. Players

- **The judge**: one visit, maybe two, on desktop or phone. Must get the whole loop in one sitting (red team A1).
- **The daily player**: 3–4 minutes a day, comes back for the Dispatch and streak.
- **The cartographer**: competes to have the most trusted charts and the Legend flair.
- **The logged-out viewer**: can hunt an Old Captain chart; needs to log in to bury.
- **The moderator**: needs a way to post the day's island manually and review reported charts.

---

## 5. The daily loop

```
Splash (inline) → Set sail (expanded)
  → 1. Pick a chart (3 choices)
  → 2. Hunt (walk in fog, 3 shovels)
  → 3. Reveal + rate the chart
  → 4. Bury your chest (on tiles you saw)
  → 5. Chart it from memory (limited kit)
  → 6. Ink check + result card
  → (optional) share chart / hunt more (max 3 hunts a day)
Next day → Dispatch: how your chart did
```

### 5.1 Splash (inline, in the feed)
- Shows: island name and day number ("Day 12 · Gullrock"), today's modifier, live counts (chests buried today, chests found today), your streak, and one primary button **Set sail**.
- Returning players with results see a small badge: "Your chart from yesterday: 9 found".
- Buttons only. No canvas, no drag, no scroll capture (red team C-3).
- **Acceptance:** loads in under 1.5 s on a mid phone; scrolling the feed over it never stops; tapping Set sail opens expanded mode.

### 5.2 Pick a chart
- Three cards, each a small parchment thumbnail with: author ("Charted by u/name"), rating (🧭 n · 💀 n), depth badge (Shallow/Buried/Deep), attempts.
  1. **Trusted**: highest trust score today, not yours, not already used by you.
  2. **Fresh**: the chart with the fewest attempts today (so every chart gets tried).
  3. **Old Captain**: a game-made chart (see §6.3), labelled honestly with a captain's seal.
- If fewer than 2 player charts exist, the missing slots are filled by Old Captain charts.
- Deep link: if the player opened a shared link with a chart id, that chart is offered first with "u/name challenged you".
- **Acceptance:** never shows the player's own chart or a hidden chart; never shows a chart the player already hunted.

### 5.3 Hunt
- Island top-down, 40×40 tile grid, fogged except a **reveal radius of 3 tiles** around the sailor (modifiers can change it). Revealed tiles stay revealed for this hunt.
- The chosen chart sits in a corner thumbnail; tap to open it full size over the island (translucent), tap again to close. Moving closes it.
- **Move:** tap a land tile → dotted route preview (A*) → tap again or press Go → sailor walks at 12 tiles/s. Tap during the walk to skip to the destination. Steps are counted.
- **Dig:** the Dig button digs the tile you stand on. **3 shovels.** A dig finds the chest if you're within 1 tile of it (Chebyshev distance ≤ 1). A miss leaves a hole mark.
- Start position: the island's **dock**, the same for everyone (charts have a common reference point).
- No timer. Steps and shovels left are the score.
- **Acceptance:** route preview never crosses water or blocked tiles; the server rejects any non-adjacent or blocked step; the chest position is not in any response until the hunt ends.

### 5.4 Reveal and rate
- **Found:** chest-open animation, gold counted up (§7.1), "You found u/name's chest!"
- **Not found (3 shovels used, or "Give up"):** the true chest appears; the chart's X is drawn on the island; a dashed ink line connects them with the distance ("The map was 7 paces off").
- Then: **Rate this chart:** 🧭 *True map* / 💀 *Cursed map* / Skip. One vote per chart per player.
- **Acceptance:** rating is optional; the found/missed state is server-decided.

### 5.5 Bury your chest
- Available once per day, after your first hunt that day. (A logged-out player is asked to log in here; see §10.)
- The island is shown with **only the tiles you uncovered during today's hunts**. Everything else is fog.
- Tap a revealed land tile to place the chest. The depth badge updates live as you move it: **Shallow** (≤ 2 tiles from the nearest landmark), **Buried** (3–4), **Deep** (≥ 5). The payout multiplier (×1/×2/×3) is shown.
- Confirm → shovel animation → the island **fades out**.
- **Acceptance:** the server rejects any tile the player didn't uncover; one chest per account per day.

### 5.6 Chart it (from memory)
- A blank parchment the same shape as the island, with the **coastline and the dock pre-printed** in ink. No interior features.
- Tools (tap-based, no freehand, no text — red team C-1):
  - **Stamps:** 10 landmark glyphs (palm, twin palms, boulder, skull rock, hut, wreck, well, statue, campfire, cave). Tap a stamp, tap the parchment to place. **Max 6 stamps.**
  - **Path:** tap waypoints; segments snap to the tile grid and draw as a dotted ink trail. **Max 8 segments.**
  - **X:** exactly one, required to submit.
  - Move/delete any piece (tap to select, drag or tap a new spot; trash icon). Undo (20 steps), Clear.
- An ink pot shows the budget left (stamps + segments).
- **Submit chart** → stored, enters tomorrow's and today's pools immediately.
- **Ink check (instant feedback, red team A1):** for each stamp, distance to the nearest real landmark of the same type; for the X, distance to your real chest. Shown as an overlay of your chart on the true island for 3 seconds, then a grade:
  - **Sharp** (X within 1 tile and average stamp error ≤ 1.5), **Steady** (X within 3), **Wobbly** (X within 6), **Cursed** (otherwise).
  - Copy: "Ink check: Steady. Your X is 2 paces off. Tomorrow you'll see how real sailors did."
- **Acceptance:** submit disabled until an X exists; server validates counts, types and bounds; editor works with touch and mouse; no keyboard text input anywhere.

### 5.7 Result card (end of session)
- Today: chart you hunted (found / missed, steps, gold), your chest (depth, Ink check grade), streak, total gold.
- Live line: "3 sailors have picked up your chart so far" (updates via realtime if available, else on open).
- Buttons (each a separate, clear choice — red team C-2):
  - **Hunt another chart** (if under 3 hunts today)
  - **Share my chart** → confirm sheet ("This posts a comment from your account with an image of your chart, under today's chart thread") → posts as the user
  - **Challenge a friend** → Reddit share sheet with a deep link to your chart
  - **Leaderboards**
  - **Join the crew** (subscribe; explicit, never required)
- **Acceptance:** none of the buttons is required to continue; share posts only after confirm.

### 5.8 Dispatch (next visit)
- First screen on a new day if the player has charts from earlier days:
  "📜 Dispatch — Day 11 chart: 14 sailors tried, 9 found your chest. Trust 🧭 12 · 💀 2. +270 salvage gold."
- Shows the last 3 days. Tier progress bar (§7.3).
- First-time players (including judges) see a **sample Dispatch** card explaining it: "Tomorrow, this is where you'll learn how your chart did."
- **Acceptance:** numbers come from live counters; dispatch dismisses into the normal flow.

### 5.9 Leaderboards and Hall of Charts
- **Today:** Most trusted charts (trust score, min 3 attempts) · Richest sailors (gold today).
- **This week:** gold (Mon–Sun UTC).
- **Cartographers:** all-time finds of your chests, with tier.
- **Hall of Charts:** the top 3 charts of each past day, viewable as parchment (read-only).
- **Acceptance:** each board loads in under 500 ms, shows the player's own rank even if outside the top 10.

---

## 6. Content

### 6.1 Islands
- One island per UTC day. Seed = `maybe-<YYYY-MM-DD>` hashed, unless overridden by the curated list (Architecture §6.4).
- 40×40 tiles; island fills roughly 60% of the grid; 8–12 landmarks; one dock on the coast; blocked tiles (rocks, ponds, dense jungle) at 10–15% of land.
- Every land tile is reachable from the dock. Landmarks are at least 4 tiles apart, except deliberate **twins**.
- Island name from a word list (e.g. "Gullrock", "Brinewick", "The Crooked Key"). Original names only.

### 6.2 Weekday modifiers (UTC)

| Day | Modifier | Effect | Priority |
|---|---|---|---|
| Mon | Clear skies | Reveal radius 4 | P0 |
| Tue | Twins | Two pairs of identical landmarks | P0 |
| Wed | Low tide | Bigger island (70% of grid) | P1 |
| Thu | Thick jungle | Blocked tiles 20% | P1 |
| Fri | Sea fog | Reveal radius 2 | P0 |
| Sat | Lantern night | Landmarks glow through fog within 6 tiles | P2 |
| Sun | Storm | One landmark is "knocked over" (moved) after noon UTC. Charts made before noon may be wrong. | P2 |

Modifiers not built yet fall back to "Clear skies" with no label.

### 6.3 Old Captain charts
- Each day the server buries **3 Old Captain chests** (one per depth class) and draws charts for them in the same kit: 3–5 real landmarks with ±1 tile jitter, a path from the dock with one deliberate wobble, the X within 1–2 tiles of the chest.
- Labelled with a wax seal and "Old Captain (the island's own chart)". Never presented as a player.
- Ratings and attempts are tracked like player charts but they never appear on the trusted leaderboards.

---

## 7. Scoring

### 7.1 Finder gold
`gold = depthMult × (40 + 20 × shovelsLeft) + routeBonus`
- `depthMult`: Shallow 1, Buried 2, Deep 3.
- `shovelsLeft`: 0–2 after the finding dig.
- `routeBonus`: +20 if `steps ≤ 1.5 × shortestPath(dock → chest)`.
- Not found: 0 gold, but the hunt counts for the streak.

### 7.2 Mapmaker salvage
- For every seeker who finds your chest: `+10 × depthMult` salvage gold (any day, while the chart is live).
- **Trust score** (for ranking charts): `(finds + 1) / (attempts + 2)` + `0.05 × (trueVotes − cursedVotes) / max(1, votes)`, ranking only charts with ≥ 3 attempts on leaderboards. The Bayesian prior keeps new charts from topping the board after one lucky find.

### 7.3 Cartographer tiers (all-time finds of your chests)

| Tier | Finds | Flair text |
|---|---|---|
| Deckhand | 0 | — |
| Mapmaker | 5 | 🗺️ Mapmaker |
| Navigator | 25 | 🧭 Navigator |
| Cartographer | 75 | 📜 Cartographer |
| Legend | 200 | 👑 Legend of the Isles |

User flair is set by the daily job (P1). If flair setting fails, tiers still show in-game.

### 7.4 Streak
- A day counts if the player completes at least one hunt. Stored as one bit per UTC day (the Syllo pattern in Devvit docs). Shown on splash and result card.

---

## 8. Rules and limits
- Hunts per day: 3 (the first unlocks burying).
- Chests per day: 1.
- A chart can be hunted for 7 days (it stays in the pool of its own day's post only).
- Reports: 1 per user per chart; hidden at 3.
- Old posts stay playable for their own day (charts and island of that day).

## 9. Moderation (red team C-1, C-4)
- "Charted by u/name" on every chart.
- ⚑ Report on every chart (hunt screen and Hall of Charts).
- Mod menu: **Review reported charts** (form listing hidden charts → restore or delete), **Post today's island**, **Re-run daily job**.
- Chart, hunt and per-user records expire after 30 days.
- Deleted day post → remove that day's charts.

## 10. Logged-out players
- Can open the splash and hunt an Old Captain chart (progress kept in memory for that session).
- At "Bury your chest", see: "Log in to bury a chest and see who finds it tomorrow." with Reddit's login prompt. No other gating.

## 11. Edge cases

| Case | Behaviour |
|---|---|
| No player charts yet today | 3 Old Captain charts. Splash says "Be the first to bury a chest today." |
| Player opens yesterday's post | Plays yesterday's island; can hunt but can't bury (burying is today-only). Banner: "This is Day 11. Today's island is Day 12 →" with link. |
| Day rolls over mid-hunt | Hunt finishes on the day it started. |
| Chest tile becomes invalid after a generator change | Islands are pinned per day once posted (seed stored in postData). Never regenerate a posted day. |
| Network error on move/dig | Retry once; then a "Lost at sea, tap to retry" state. Moves are idempotent per step index. |
| Redis quota error | "The ship's log is full. Your hunt still counts." Hunt continues; chart save shows retry. |
| Chart author deleted their account | Chart expires within 30 days (TTL). |
| Player reported a chart they're hunting | The hunt continues; the chart is hidden for them afterwards. |
| Screen rotation / resize | Island re-fits; no state lost. |

## 12. Success metrics (for the Devpost write-up)
- Players per day in the demo sub, finds per chart, share of hunts that found the chest (target 40–60%: hard enough to matter, easy enough to feel good), return rate day-over-day among testers.

## 13. Out of scope (do not build)
Payments, push notifications (beta program), AI, text chat, custom avatars, more than one island per day, user-designed islands, sound beyond 3 effects.
