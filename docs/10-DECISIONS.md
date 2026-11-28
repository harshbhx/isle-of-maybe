# 10 — Decisions (don't re-debate these)

| # | Decision | Rejected | Why |
|---|---|---|---|
| D01 | Name **Isle of Maybe** (tagline: *Bury it. Chart it. Trust a stranger's map.*). Repo `isle-of-maybe`, Devvit app `isle-of-maybe`, subreddits r/IsleOfMaybe (public demo) + r/IsleOfMaybe_dev (private). Daily islands get their own names ("Gullrock", "Brinewick"), never "Isle of …". | X Marks (too plain), Ten Paces (used by several duel games), Hearsay Isle, Dig Here, Strangers' Gold, any name with "Reddit", "Snoo" or pirate-franchise words | Says what the game is (every chart is a *maybe*), warm and funny, looks good as a logo, no existing game found with it |
| D02 | Each player buries their own chest | One shared treasure | Spoilers (red team C1) |
| D03 | Limited chart kit: 10 stamps, snapped path, one X | Freehand drawing, text labels | Devvit content rules; phone UX; machine-readable (C2) |
| D04 | Bury only on tiles you uncovered | Bury anywhere | Keeps charts from memory honest (C5) |
| D05 | Chart from memory, island hidden | Chart while looking at the island | Memory errors are the fun |
| D06 | Depth multiplier ×1/×2/×3 | Flat payout | Stops "bury on the landmark" (C6) |
| D07 | Server-authoritative hunts; chest never sent before reveal | Client-side game | Integrity of boards and flair (C7) |
| D08 | 3 hunts/day, 1 chest/day | Unlimited / 1 hunt | Low-traffic subs need more hunts per chart; still daily-shaped |
| D09 | Old Captain charts, labelled | Fake player charts / bots posing as players | Cold start without lying |
| D10 | Instant Ink check + next-day Dispatch | Only next-day result | Judges see the loop in one visit (A1) |
| D11 | Day = UTC; daily post at 00:00 UTC (05:30 IST) | Local days | One island for everyone |
| D12 | React + three.js 3D island (WebGL, lazy-loaded in the game entry only) with the Canvas 2D renderer kept as a fallback + SVG chart editor. *Amended 28 Nov by Harsh: was Canvas 2D only.* | Phaser, Unity, a full game engine; keeping the island flat | A real 3D island next to a flat paper map is the game's idea made visible, and it lifts Delightful UX; three.js is a renderer, not an engine, Devvit Web supports it, and the splash stays tiny |
| D13 | Tap-to-move with route preview, 4-directional. *Superseded in 3D by D26 (28 Nov); kept for the 2D fallback.* | Joystick, free movement | Phones, pathfinding is trivial, server validation is simple |
| D14 | Inline = splash only; game = expanded; `_direct_launch` → game | Playable inline | Scroll-trap rule (C-3) |
| D15 | Share = optional comment **as the user**, reply to the day's sticky comment, after a confirm sheet | Auto-posting results, required sharing | User-action rules (C-2) |
| D16 | 30-day TTL on all user content | Keep forever | Deletion guidance (C-4) |
| D17 | No AI at runtime, no external fetch | LLM-written island lore | Not needed; avoids premium-feature review |
| D18 | Fonts: IM Fell English SC + Atkinson Hyperlegible, bundled (OFL) | Google Fonts CDN | Webview only loads its own domain |
| D19 | No push notifications | Streak reminders | Beta program, out of time |
| D20 | Demo subreddit: public, under 200 members, testers capped at 150 | Private sub | Rules require under 200 members and judge access |
| D21 | Optional 60-second video: make it (P1) | Skip | Not required, but cheap insurance if judges skim |
| D22 | Git: logical commits, verified, issue → PR → squash merge, branch deleted, author Harsh, no AI co-author lines, no Dependabot | One-file commits | Harsh's project rules |
| D23 | Credit the inspiration (small itch.io map games) in the README | Hide it | Honest; strengthens "we made it Reddit-native" story |
| D24 | Tropical day palette: lagoon frame, sun-bleached paper, mango buttons, hibiscus X, palm green, low white cloud instead of dark fog (`docs/03-DESIGN.md` §3). *Chosen by Harsh, 28 Nov.* | Night sea + gold (read as generic), Old sea chart, Dusk harbour | Bright, daytime and unlike the dark-mode default; every text pair still ≥ 4.5:1 |
| D25 | Logo: island from above, dotted path curled into a question mark, the X is its dot | Wordmark only, a compass rose, a skull | *Maybe* drawn as the path itself; reads at 64 px; no pirate clichés |
| D26 | Third-person free movement: an original explorer walks and runs (joystick on touch, WASD/arrows + Shift on desktop), follow camera; the server still checks 4-directional tile steps underneath. *Harsh, 28 Nov.* | Tap-to-move only; first-person | Harsh played it and found tile hops "robotic"; free movement is what makes it feel like an adventure, and tile steps keep D07 intact |
| D27 | Rising tide: every hunt has 150 s; sand floods in three waves; the server enforces it with its own clock and per-step minimum times. *Harsh, 28 Nov.* | No timer; a plain countdown | Urgency and difficulty that come from the island itself, and a map can now send you the long way round |
| D28 | Hazards from the seed: quicksand patches (trap 2.5 s), thicket at the jungle's edge slows (half speed), cliffs and jungle block. Derived from the island, so `island.ts` output and posted days are unchanged. *Harsh, 28 Nov.* | New terrain types in `island.ts` | Rule 9 (never regenerate a posted day) and a smaller, testable change |
| D29 | Sculpted, stylised-realistic world (smooth terrain, wave-shader sea, sun and shadows, swaying flora, birds, mist) with quality tiers, and a cinematic dig and reveal. All built in code, no downloaded assets. *Harsh, 28 Nov: "all of these and more".* | Photo-real textures; a game engine | Must run smoothly in the Reddit app on phones and keep the bundle within budget; procedural art also keeps IP clean |
