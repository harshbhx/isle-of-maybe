# 07 — Tasks

Generated from `specs/*/tasks.md` (the source of truth for task lines and requirement IDs). This table adds owner, priority, estimate and milestone. `tools/create-issues.sh` turns each row into a GitHub issue.

Owner: **H** = Harsh · **A** = coding agent. **P0** = ships or we don't submit · **P1** = makes it win · **P2** = only if time is left. Acceptance = the requirement IDs (see the spec) plus the notes.

## M0 · Setup (by Tue 1 Dec)

| ID | Task | Owner | Pri | Est | Spec | Requirements | Notes |
|---|---|---|---|---|---|---|---|
| T01 | Register on Devpost for the hackathon (Harsh) | H | P0 | 5 m | 07-launch | SHIP-1.2 | Registered |
| T02 | Create r/IsleOfMaybe (public) and r/IsleOfMaybe_dev (private) (Harsh) | H | P0 | 15 m | 07-launch | SHIP-2.1 | Sub exists, public, 1 member |
| T03 | Devvit login and first playtest of the scaffold in the dev sub (Harsh) | H | P0 | 20 m | 07-launch | SHIP-2.1 | `npm run dev` shows the template post in the test sub |
| T04 | Repository, labels, milestones and issues from specs | A | P0 | 30 m | 07-launch | SHIP-1.1 | Issues exist; first verified commit |
| T05 | Specs, docs and agent rules in the repo | A | P0 | 30 m | 07-launch | SHIP-1.1 | In repo |

## M1 · Engine (1–2 Dec)

| ID | Task | Owner | Pri | Est | Spec | Requirements | Notes |
|---|---|---|---|---|---|---|---|
| T10 | RNG, UTC day helpers and island names | A | P0 | 0.5 h | 01-island-engine | ENG-1.1, ENG-1.2, ENG-1.3, ENG-2.9 | Same seed → same numbers; `dayNumber('2026-12-01')` stable |
| T11 | Island generator with validation, re-roll and overrides | A | P0 | 3 h | 01-island-engine | ENG-2.1, ENG-2.2, ENG-2.3, ENG-2.4, ENG-2.5, ENG-2.6, ENG-2.7, ENG-2.8, ENG-2.10 | 200 random seeds: 100% valid; every land tile reachable; landmark spacing holds; deep tiles ≥ 30% |
| T12 | Pathfinding, walkability, reveal radius and dig distance | A | P0 | 1 h | 01-island-engine | ENG-3.1, ENG-3.2, ENG-3.3, ENG-3.4 | Tests for blocked routes, no-diagonal moves |
| T13 | Depth classes and scoring formulas | A | P0 | 1 h | 01-island-engine | ENG-4.1, ENG-4.2, ENG-4.3, ENG-4.4, ENG-4.5 | Table tests for every formula |
| T14 | Chart validation and Ink check | A | P0 | 1 h | 01-island-engine | ENG-5.1, ENG-5.2 | Rejects 7 stamps, 9 segments, 0/2 X, out-of-bounds, unknown types |
| T15 | Old Captain chests and charts | A | P0 | 1.5 h | 01-island-engine | ENG-6.1, ENG-6.2 | 100 seeds: captain X within 2 tiles of chest; ≤ 6 stamps; path ≤ 8 segments |
| T16 | Atlas dev tool for 30 upcoming islands | A | P1 | 1 h | 01-island-engine | ENG-7.1 | Opens locally, shows 30 islands with labels |
| T17 | Review the Atlas and add seed overrides (Harsh) | H | P1 | 20 m | 01-island-engine | ENG-2.8 | Overrides committed |

## M2 · Server (2–3 Dec)

| ID | Task | Owner | Pri | Est | Spec | Requirements | Notes |
|---|---|---|---|---|---|---|---|
| T20 | Redis store modules, key helpers, TTLs and quota handling | A | P0 | 1.5 h | 02-hunt | HUNT-6.2, CHART-4.1 | Every write sets TTL; quota errors mapped |
| T21 | Daily job, install trigger and mod menu fallbacks | A | P0 | 1.5 h | 04-daily-cycle | DAY-1.1, DAY-1.2, DAY-1.3, DAY-1.4, DAY-1.5, DAY-1.6 | Running twice creates one post; sticky comment exists; 3 captain chests |
| T22 | Init and chart-picker endpoints | A | P0 | 1.5 h | 02-hunt | HUNT-1.1, HUNT-1.2, HUNT-1.3, HUNT-1.5 | Pick never returns own/used/hidden; fills with captain charts |
| T23 | Server-authoritative hunt endpoints: start, steps, dig, give up | A | P0 | 3 h | 02-hunt | HUNT-2.1, HUNT-2.2, HUNT-2.3, HUNT-3.1, HUNT-3.2, HUNT-3.3, HUNT-4.1, HUNT-4.2, HUNT-4.3, HUNT-4.4, HUNT-4.5, HUNT-6.1 | Fuzz test: random invalid steps rejected; chest absent from all responses before `done` |
| T24 | Bury and chart endpoints with seen-tiles check and Ink check | A | P0 | 2 h | 03-bury-and-chart | CHART-1.4, CHART-1.5, CHART-3.1, CHART-3.2, CHART-3.3, CHART-4.1 | Can't bury on unseen tile; one chest/day; chart validated |
| T25 | Reports, auto-hide and moderator review | A | P0 | 1.5 h | 05-community | COM-1.1, COM-1.2, COM-1.3 | Hidden chart disappears from pick; mod can restore |
| T25b | Chart rating endpoint | A | P0 | 0.5 h | 02-hunt | HUNT-5.1 |  |
| T26 | Leaderboard and Hall of Charts endpoints | A | P1 | 1.5 h | 05-community | COM-3.1, COM-3.2, COM-3.3, COM-4.2, COM-4.3 | Own rank returned outside top 10 |
| T27 | Streak bitfield and Dispatch data | A | P0 | 1 h | 04-daily-cycle | DAY-4.1, DAY-4.2, DAY-5.1 | Streak counts consecutive UTC days |
| T28 | Share endpoint: upload chart image, comment as the user under the sticky | A | P1 | 1.5 h | 05-community | COM-2.2, COM-2.5 | Posts under sticky (from app account while unapproved) |
| T29 | Realtime finds and burials ticker | A | P1 | 1 h | 05-community | COM-5.1, COM-5.2 | Two browsers: find in one shows in the other within 2 s |
| T30 | Tier flair in the daily job | A | P2 | 1 h | 05-community | COM-6.1 | Flair set for test users |
| T31 | Delete triggers, 30-day expiry audit and rate limiter | A | P1 | 1 h | 05-community | COM-1.4, COM-1.5, COM-2.5 | Deleting a day post removes its charts |

## M3 · Client (4–6 Dec)

| ID | Task | Owner | Pri | Est | Spec | Requirements | Notes |
|---|---|---|---|---|---|---|---|
| T40 | Design tokens, bundled fonts and UI kit; remove template branding | A | P0 | 2 h | 06-client-shell | UI-2.1, UI-2.2, UI-2.4 | Contrast pairs as in 03-DESIGN §3 |
| T41 | Ten landmark glyphs and ink assets (Harsh approves) | A+H | P0 | 3 h | 06-client-shell | UI-2.3, UI-6.3 | 3 people name 8/10 at 24 px |
| T42 | Inline splash without scroll capture | A | P0 | 1 h | 04-daily-cycle | DAY-3.1, DAY-3.2, DAY-3.3 | Scroll-trap checks pass (08-TESTING §2) |
| T43 | Island renderer: Canvas 2D, camera, fog, sailor, footprints | A | P0 | 4 h | 06-client-shell | UI-3.1, UI-7.1 | 60 fps walking on a mid phone |
| T44 | Tap-to-move input with route preview and keyboard controls | A | P0 | 2 h | 06-client-shell | UI-3.2, UI-6.1 | Never routes through water/blocked |
| T45 | Pick screen with share-link challenge | A | P0 | 1.5 h | 02-hunt | HUNT-1.4 | 3 cards, swipe on phone |
| T46 | Hunt screen: chart overlay, route preview, dig, give up | A | P0 | 2 h | 02-hunt | HUNT-3.4, HUNT-4.1 | Full hunt against the real server |
| T47 | Reveal screen: found and missed animations, rating | A | P0 | 2 h | 02-hunt | HUNT-4.2, HUNT-5.2 | Missed shows X→chest ink line with distance |
| T48 | Bury screen with seen tiles and live depth preview | A | P0 | 1.5 h | 03-bury-and-chart | CHART-1.1, CHART-1.2, CHART-1.3, CHART-1.6 | Only seen tiles selectable |
| T49 | Chart editor: stamps, path, X, select, move, delete, undo, budget | A | P0 | 4 h | 03-bury-and-chart | CHART-2.1, CHART-2.2, CHART-2.3, CHART-2.4, CHART-2.5, CHART-2.6 | Touch + mouse + keyboard; can't exceed budget |
| T50 | Ink check overlay and grade | A | P0 | 1.5 h | 03-bury-and-chart | CHART-3.4 | Grade matches `inkCheck` |
| T51 | Result card and Dispatch screens, including the sample Dispatch | A | P0 | 2 h | 04-daily-cycle | DAY-5.1, DAY-5.2 | All buttons optional; nothing gates |
| T52 | Share confirm sheet, chart image and challenge link | A | P1 | 1.5 h | 05-community | COM-2.1, COM-2.3, COM-2.4 | PNG < 1 MB, legible |
| T53 | Leaderboards and Hall of Charts screens | A | P1 | 2 h | 05-community | COM-3.2, COM-4.1, COM-4.4 | Tabs work; own row pinned |
| T54 | Empty, error, logged-out and old-day states | A | P0 | 1.5 h | 06-client-shell | UI-4.1, UI-8.1, UI-8.2 | Every state reachable in a test |
| T55 | Hints and copy pass | A | P0 | 1 h | 06-client-shell | UI-4.2, UI-4.3 | No hard-coded strings |
| T56 | Motion pass with reduced motion | A | P1 | 2 h | 06-client-shell | UI-5.1 | Reduced motion verified |
| T57 | Generated sound effects, off by default | A | P2 | 1 h | 06-client-shell | UI-5.2 | No audio before a tap |
| T58 | Weekday modifiers: Clear skies, Twins, Sea fog | A | P0 | 1 h | 04-daily-cycle | DAY-2.1, DAY-2.2 | Mon/Tue/Fri behave per PRD §6.2 |
| T59 | Remaining modifiers: Low tide, Thick jungle, Lantern night, Storm | A | P2 | 2 h | 04-daily-cycle | DAY-2.1 | Per PRD |
| T60 | Community names tomorrow's island from the top reply | A | P1 | 1.5 h | 04-daily-cycle | DAY-6.1, DAY-6.2 |  |
| T61 | Tomorrow's coastline teaser with countdown | A | P1 | 1 h | 04-daily-cycle | DAY-7.1 |  |
| T62 | Crew goal progress and Lantern night reward | A | P2 | 1.5 h | 04-daily-cycle | DAY-8.1, DAY-8.2 |  |
| T63 | Practice Cove first-time tutorial | A | P0 | 2 h | 06-client-shell | UI-9.1, UI-9.2 |  |
| T64 | Entry points, expanded mode and direct launch | A | P0 | 1 h | 06-client-shell | UI-1.1, UI-1.2, UI-1.3 |  |
| T65 | Accessibility and console-clean audit | A | P0 | 1.5 h | 06-client-shell | UI-6.1, UI-6.2, UI-8.3 |  |
| T68 | Margin note: one optional phrase from a fixed list | A | P1 | 1 h | 03-bury-and-chart | CHART-2.7 |  |
| T69 | Spoiler-free result line for shares | A | P1 | 0.5 h | 05-community | COM-2.6 |  |

## M4 · Ship (7–9 Dec, judging to 17 Dec)

| ID | Task | Owner | Pri | Est | Spec | Requirements | Notes |
|---|---|---|---|---|---|---|---|
| T66 | Stats menu for daily players, find rate and return rate | A | P1 | 1 h | 07-launch | SHIP-3.1 |  |
| T67 | In-app catalog assets and presentation exports | H+A | P1 | 2 h | 07-launch | SHIP-5.1, SHIP-5.2 |  |
| T70 | App README final pass | A+H | P0 | 1 h | 07-launch | SHIP-1.1 | Plain language, ≤ 1000-word overview, how to play, how mods set it up |
| T71 | Recruit testers and run the daily reminder | H | P0 | ongoing | 07-launch | SHIP-2.2, SHIP-2.3 | ≥ 15 players by 6 Dec; ≤ 150 members |
| T72 | QA matrix, break tests and two judge simulations | A+H | P0 | 2 h | 07-launch | SHIP-4.1, SHIP-4.2 | All P0 rows pass |
| T73 | Final upload, demo post live, member count under 200 | H | P0 | 20 m | 07-launch | SHIP-1.3 | Link opens logged-out in a private window |
| T74 | Devpost submission | H | P0 | 45 m | 07-launch | SHIP-1.2 | Submitted before 9 Dec 05:30 IST (2 h buffer) |
| T75 | Phone video under 60 seconds | H | P1 | 1 h | 07-launch | SHIP-6.1 | Public on YouTube, < 60 s |
| T76 | Developer satisfaction survey | H | P1 | 15 m | 07-launch | SHIP-6.2 | Done |
| T77 | Daily checks through judging | H | P0 | 5 m/day | 07-launch | SHIP-1.4 | Every day posted |
| T80 | Splash that sells the game: pitch, date, coastline hero, how-it-works strip | A | P0 | 1.5 h | 04-daily-cycle | DAY-3.4, DAY-3.5 | Judge red team J1 |
| T81 | Hunt: one hint at a time, camera pans past the island's edge | A | P1 | 1 h | 06-client-shell | UI-3.3, UI-4.4 | J2, J3 |
| T82 | Hunt on wide screens: chart beside the island | A | P1 | 1.5 h | 06-client-shell | UI-3.4 | J4 |
| T83 | Join the crew link on the result card | A | P1 | 0.5 h | 05-community | COM-2.8, COM-2.3 | J5 |
| T84 | Devpost gallery from a real playthrough and the subreddit kit | A | P1 | 2 h | 07-launch | SHIP-1.3, SHIP-5.2 | docs/18 |
| T85 | Tropical day palette and the logo across the client, share image and catalog art | A | P0 | 2 h | 06-client-shell | UI-2.1, UI-2.5 | D24, D25 |
| T86 | 3D island renderer with three.js and the 2D fallback | A | P0 | 1.5 d | 06-client-shell | UI-3.1, UI-3.5, UI-3.6, UI-5.1, UI-7.1 | D12 amended |
| T87 | New-identity banners, Devpost GIFs and gallery, judge re-score, hand-off | A | P0 | 0.5 d | 07-launch | SHIP-1.3, SHIP-4.2, SHIP-5.1, SHIP-5.2 | |

**Cut line:** if behind on Sun 6 Dec 21:00 IST, drop T26/T53 to the "Today" board only, and drop T28, T29, T52, T60, T61 and all P2. Never cut: T23 (server authority), T42/T64 (scroll safety), T49 (chart editor), T54 (states), T63 (Practice Cove), T70 (README), T71 (testers).
