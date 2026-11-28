# 04 — Wireframes (phone first, 390 px wide)

Low-fi. `[Gold]` = primary button, `(ink)` = secondary. Desktop: same stack, centred, max 520 px, island up to 720 px.

## W1 · Inline splash (in the feed)
```
┌──────────────────────────────────────┐
│  ISLE OF MAYBE               🔥 4  ⛀ 1,240 │
│  Day 12 · GULLROCK · Wed 9 Dec       │
│  Follow a stranger's map to buried   │
│  gold. Then bury yours.              │   ← splash.pitch, always
│  ┌──────────────┐ ~ Sea fog today ~  │
│  │  today's     │ ⚑ 38 buried · 51   │
│  │  coastline   │ ▓▓▓▓░ crew goal    │
│  │  (hero)      │ 📜 Day 11: 9 found │   ← only if you have one
│  └──────────────┘                    │
│  🌴 Follow a map › ⛏ Dig › ✕ Bury yours │ ← only when ≥ 440 px tall
│           [   Set sail   ]           │
└──────────────────────────────────────┘
```
No canvas. No scrolling. Tap anywhere else = nothing. The coastline is shape only (no landmarks), so the splash never helps anyone chart from memory. (DAY-3.4, DAY-3.5)

## W2 · Dispatch (first screen of a new day, if you have results)
```
┌ DISPATCH ────────────────────────────┐
│  Day 11 · Brinewick                  │
│  [chart thumbnail]  14 tried         │
│                      9 found ✓       │
│                     🧭 12  💀 2       │
│                     +270 salvage ⛀   │
│  Day 10 · The Crooked Key  …         │
│  ▓▓▓▓▓▓░░░  Navigator 31 / 75 finds  │
│            [ Today's island → ]      │
└──────────────────────────────────────┘
```
First-ever visit: a sample card with "Tomorrow, this is where you'll learn how your chart did."

## W3 · Pick a chart
```
  Pick a chart to follow
┌────────────┐┌────────────┐┌────────────┐
│ [parchment]││ [parchment]││ [parchment]│
│  TRUSTED   ││   FRESH    ││ OLD CAPTAIN│
│ u/marlin   ││ u/kelpie   ││   (seal)   │
│ 🧭9 💀1 ●●● ││ new · ●     ││  ●●        │
└────────────┘└────────────┘└────────────┘
  hint (first time): "Strangers drew these from memory. Pick one."
```
Phone: horizontal swipe carousel with dots, big card, [Follow this chart].

## W4 · Hunt
```
┌──────────────────────────────────────┐
│ Day 12   ⛏ ⛏ ⛏   👣 23        ⚑ (?)  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░ fog ░░░░░░░░░░┌────────┐ │
│ ░░░░░░  🌴 . . .          │ chart  │ │ ← tap to open over island
│ ░░░░░░    . . @ sailor    │ thumb  │ │
│ ░░░░░░░░░░  sand  ░░░░░░░ └────────┘ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                      │
│  (Give up)    (− +)      [  Dig  ]   │
└──────────────────────────────────────┘
  hint: "Tap the island to walk. Open the chart any time."
```
Route preview: dotted line + ghost sailor at destination; second tap walks. One hint at a time: after the first walk the shovel hint replaces the walk hint (UI-4.4). Zoomed in, the camera can pan a quarter-screen past the coast so the sailor isn't pinned to the edge (UI-3.3).

Wide (≥ 1024 px): island on the left, the chart full size on the right, always open, hints and Report under it (UI-3.4).
```
┌─────────────────────────────┬───────────────┐
│  island (canvas)            │  chart (full) │
│                             │  by u/marlin  │
│                             │  hint · Report│
│ (Give up)  (− +)  [ Dig ]   │               │
└─────────────────────────────┴───────────────┘
```

## W5 · Reveal
Found:
```
        ✦ chest opens ✦
   You found u/marlin's chest!
   ⛀ +240   (Deep ×3, 1 shovel left)
   Rate this chart:  (🧭 True map) (💀 Cursed map)  (skip)
              [ Bury your chest ]
```
Missed:
```
   [island: chart X in red ink —— 7 paces —— gold chest]
   "The map was 7 paces off."
   Rate this chart: (🧭) (💀) (skip)
              [ Bury your chest ]
```
If already buried today: primary becomes [Hunt another chart] or [See results].

## W6 · Bury
```
┌──────────────────────────────────────┐
│ Bury your chest                      │
│ You can only bury where you've been. │
│ [island, only your seen tiles lit]   │
│        📦 ← drag/tap to place        │
│  Depth: ●●● DEEP  ×3 for you         │
│         and for whoever finds it     │
│            [ Bury it here ]          │
└──────────────────────────────────────┘
```
Then: 600 ms fade to blank parchment. Copy: "Now draw the way. From memory."

## W7 · Chart editor
```
┌──────────────────────────────────────┐
│ Chart it        ink ▓▓▓▓▓░░  (↶) (🗑) │
│ ┌──────────────────────────────────┐ │
│ │  parchment: coastline + dock     │ │
│ │       🌴      ✕                  │ │
│ │    . . . . . .                   │ │
│ │   ⚓ dock                    ✣ N │ │
│ └──────────────────────────────────┘ │
│ [🌴][🌴🌴][🪨][💀][🛖][⛵][⛲][🗿][🔥][🕳]│  ← stamp tray (ink glyphs, not emoji)
│ (Path ⋯)  (X)          [ Submit chart ]│
└──────────────────────────────────────┘
```
Submit disabled until X placed. Counter text: "4 of 6 stamps · 3 of 8 path steps".

## W8 · Ink check
```
 [your chart overlaid on the true island, 3 s]
            ╔═══════════╗
            ║  STEADY   ║   ← stamp thud
            ╚═══════════╝
 "Your X is 2 paces off. Tomorrow you'll see how real sailors did."
                [ Continue ]
```

## W9 · Result card
```
┌ DAY 12 · GULLROCK ──────────────┐
│ Hunt: found u/marlin's chest ✓ 41 👣  │
│ Your chest: DEEP ●●● · Ink: Steady    │
│ 🔥 Streak 5   ⛀ 1,480 total           │
│ ⚡ 2 sailors picked up your chart      │
│                                      │
│ [ Hunt another chart (2 left) ]      │
│ (Share my chart) (Challenge a friend)│
│ (Leaderboards)                       │
│ New island daily · Join the crew →   │   ← opens the subreddit (COM-2.8)
└──────────────────────────────────────┘
```

## W10 · Share confirm (bottom sheet)
```
 Share your chart?
 This posts a comment from YOUR account (u/name) under today's
 chart thread, with this image:  [chart preview]
 "Buried a Deep chest on Gullrock. Can you read my map?"
        (Cancel)          [ Post comment ]
```

## W11 · Leaderboards
Tabs: Today · This week · Cartographers · Hall of Charts. Rows: rank, u/name, value, tier glyph. Your row pinned at the bottom if not in top 10.

## W12 · Empty and error states
- No player charts yet: Pick screen shows 3 Old Captain charts + banner "Be the first to bury a chest today."
- Logged out at Bury: "Log in to bury a chest and see who finds it tomorrow." [Log in] (Just browse)
- Old day post: banner "This is Day 11. Today's island is Day 12 →"
- Network: "Lost at sea. [Try again]"
- Quota: "The ship's log is full. Your hunt still counts."

## Paper-sketch checklist (before building)
- [ ] W4 and W7 sketched at real phone size; thumb reaches Dig and Submit
- [ ] 10 glyphs readable at 24 px
- [ ] The judge path W1 → W3 → W4 → W5 → W6 → W7 → W8 → W9 fits in 4 minutes
