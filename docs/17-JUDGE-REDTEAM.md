# 17 — Judge red team (28 Nov 2026)

We played the built game cold, the way a judge would, at 390 × 844 (phone) and 1440 × 900 (desktop), plus the inline splash at feed sizes (390 × 320, 390 × 512, 640 × 512, 740 × 320). Then we scored it against the published criteria and the organisers' own advice. This doc lists what a judge would mark down and what we changed.

## 1. Who judges and what they asked for

- **Judges:** a "Reddit Panel". No names are published, the same as in the earlier Devvit hackathons. In practice that means the Devvit / Developer Platform team. They know the platform rules well, open the demo post themselves, and have played many entries. Earlier contests were reviewed on desktop web, so desktop has to be as good as phone.
- **Stage one:** pass/fail. Does it fit the theme, and does it use Devvit?
- **Stage two:** four criteria, weighted equally:
  - **Delightful UX:** exciting layout and theme, easy and fun to explore.
  - **Polish:** close to publishable quality, compliant with Devvit Rules.
  - **Reddity:** community-minded, with its own identity, brings something fresh to Reddit.
  - **Daily Content:** recurring content, challenges and fresh material.
- **Their advice for daily games** (hackathon page), used below as a checklist:

| Advice | Isle of Maybe before this pass |
|---|---|
| Intuitive onboarding: into play fast, contextual hints, no long instructions | ✅ Practice Cove (45 s) + one-line hints. ⚠️ On the hunt, two hints stack and cover a third of the island on a phone |
| Visual craft: contrast, legible text, uncluttered controls, responsive feedback; no generic components | ✅ Ink-on-parchment kit, axe 0 violations. ⚠️ The first hunt view is about 75% fog because the camera stops at the island's edge, so the sailor sits at the bottom of the screen |
| Calibrated daily content: fresh, bite-sized, varied, fair | ✅ New seeded island daily, six weekday twists, 3 hunts, Dispatch next day |
| Focused start screen: name, description, date, attribution, stats | ❌ The splash has a name, day number and stats, but **no description** (the tagline only shows while loading), no calendar date, and a large empty area with a tiny blank coastline |
| Clear end state: one result card with a next step (stats, streak, comments, subscribe) | ✅ Result card with streak, gold, crew goal, tomorrow's teaser, share as a comment. ❌ **No subscribe prompt**, although the PRD (W9) has "Join the crew" and the copy key already exists |
| Avoid AI-looking output; fit the viewport; own identity | ✅ Original glyphs, fonts, copy. ⚠️ On desktop the chart is a 128 px thumbnail beside a 720 px island, so comparing them means opening an overlay that hides the island |
| Avoid surface-level Reddit theming | ✅ No Snoo, karma or "Reddit" theming. The Reddit part is strangers' maps, comments, flair, community naming |
| Avoid common concepts | ✅ Not a shooter, clone, trivia or story game. The closest example, hot-and-cold maps, is a guessing game; ours is memory → map → trust |
| Use flair, comments, streaks | ✅ All three |
| Self-explanatory demo post | ⚠️ Depends on the splash (above) and on the demo sub having real charts during judging (§4) |

## 2. Scorecard (judge's view)

Scores out of 10, before → after this pass.

| Criterion | Before | After | Why |
|---|---|---|---|
| Delightful UX | 7 | 8.5 | Tap-to-walk with route preview, charting from memory, the CURSED stamp and the X-vs-chest reveal are fun. Lost points: the splash doesn't sell the game, the first hunt view is mostly black, and the chart is too small to read on desktop. |
| Polish | 8 | 8.5 | Zero console errors, axe clean, reduced motion, 137 tests, server-checked hunts. Risk: nothing has run on real Reddit yet (Gate 0). The pixel island is plainer than the ink charts; that contrast is on purpose (the real island vs a drawn map), so we keep it. |
| Reddity | 7 | 8 | Strangers' maps, share as a comment from your account, flair tiers, community-named islands, crew goal, moderator review and stats. Lost points: no subscribe prompt; a demo sub with no real players would show only Old Captain charts. |
| Daily Content | 8 | 8 | One island for everyone, named by yesterday's players, a weekday twist, Lantern night when the crew goal is met, next-day Dispatch, streaks. |

**Honest read:** a solid honorable-mention entry today. To compete for the grand prize, the first 30 seconds must sell the game by themselves, and the demo sub must have real people's charts every day of judging.

## 3. Findings and fixes

| # | Finding | Severity | Fix | Requirement |
|---|---|---|---|---|
| J1 | Splash doesn't say what the game is: no description, no date, tiny blank coastline, empty space | P0 (first thing a judge sees) | Always show a one-line pitch and today's date; make today's coastline the hero; add a three-step "how it works" strip when the post is tall enough | DAY-3.4, DAY-3.5 |
| J2 | Two hints stack on the hunt and cover the island on a phone | P1 | One hint at a time: the walk hint retires when you first walk, then the shovel hint shows | UI-4.4 |
| J3 | Camera stops at the island's edge, so at the dock the sailor is at the bottom and ~75% of the screen is fog | P1 | While zoomed in, the camera may pan up to a quarter of the view past the edge (open sea), so the sailor sits nearer the middle | UI-3.3 |
| J4 | On wide screens the chart is a thumbnail and comparing means covering the island | P1 | From 1024 px wide, the hunt shows the chart full size beside the island, always open | UI-3.4 |
| J5 | No subscribe prompt on the result card | P1 | "Join the crew" line under the result card that opens the subreddit, where the player taps Join themselves. We don't call a subscribe API: until the app is approved, `runAs: 'USER'` acts as the app account, so the button would silently subscribe the app instead of the judge | COM-2.8 |
| J6 | During judging (9–16 Dec) the demo sub may have only Old Captain charts | P0 for Reddity | Not code. Testers bury and chart every day of judging, at least 5 player charts per day (T71); the judge simulations on 7 and 8 Dec check that Pick shows Trusted and Fresh charts | SHIP-2.2 |
| J7 | Tapping water or fog in Practice gives no feedback | P2 | Left as is: the route preview only draws on walkable tiles, which already teaches it | — |
| J8 | Snoovatars on chart cards would feel native | Rejected | Avatar images load from Reddit's media servers, which breaks hard rule 4 (no external requests from the client). Names stay as text |
| J9 | Subscribing with one tap inside the game | Rejected | See J5: before approval it subscribes the wrong account |

## 4. Judge-day checklist (for Harsh and the laptop agent)

1. The Devpost "demo post" link points at **today's** daily post. Older posts show a banner to today, but the first impression should be today.
2. Every day from 7 to 16 Dec, by 12:00 IST: at least 5 tester charts on today's island (Trusted + Fresh slots filled). Check Pick from a fresh account.
3. Open the post on desktop web **and** in the phone app. Splash: pitch, date and coastline visible; Set sail opens the game.
4. Do the whole loop once from a brand-new account (practice → hunt → bury → chart → Ink check → result) in under 4 minutes, with zero console errors.
5. Members under 200; the game is free and needs no join or subscribe to play.

## 5. What we changed

| PR | Change |
|---|---|
| Spec change (this doc) | Requirements DAY-3.4, DAY-3.5, UI-3.3, UI-3.4, UI-4.4, COM-2.8; tasks T80–T83; wireframes W1, W4, W9; copy |
| T80 | Splash: pitch, date, coastline hero, how-it-works strip |
| T81 | Hunt: one hint at a time, camera pans past the edge |
| T82 | Hunt on wide screens: chart beside the island |
| T83 | Result: Join the crew |
