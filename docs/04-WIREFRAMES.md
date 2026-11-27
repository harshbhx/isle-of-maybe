# 04 — Wireframes (phone first, 390 px wide)

Low-fi. `[Gold]` = primary button, `(ink)` = secondary. Desktop: same stack, centred, max 520 px, island up to 720 px.

## W1 · Inline splash (in the feed)
```
┌──────────────────────────────────────┐
│  ISLE OF MAYBE               🔥 4  ⛀ 1,240 │
│  Day 12 · GULLROCK              │
│  ~ Sea fog today: you see 2 tiles ~  │
│                                      │
│   ⚑ 38 chests buried · 51 found      │
│   📜 Your chart from Day 11: 9 found │   ← only if you have one
│                                      │
│           [   Set sail   ]           │
└──────────────────────────────────────┘
```
No canvas. No scrolling. Tap anywhere else = nothing.

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
Route preview: dotted line + ghost sailor at destination; second tap walks.

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
│ (Leaderboards)   (Join the crew)     │
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
