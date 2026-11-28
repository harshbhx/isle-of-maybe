# 03 — Design

## 1. Identity in one line
**A sunlit island, and a paper map you drew from memory.** The island you *walk on* is a small, chunky 3D world under a bright tropical sky: turquoise water, warm sand, deep palms, and low cloud that lifts as you explore. Everything you *read* (charts, cards, results) is flat ink on sun-bleached paper. The world is 3D and the map is paper; the gap between the two is the game. Two materials, never mixed up.

**Logo:** an island seen from above, with a dotted path that curls into a question mark; the X is the question mark's dot. *Maybe* is the path. Used for the app icon, the subreddit icon and the splash mark (`src/client/components/Logo.tsx`, `tools/assets`).

What it must not look like (Reddit's "AI slop" warning): purple gradients, glassmorphism, generic emoji-heavy cards, stock fantasy art, centred hero text with a glow. If a screen could belong to any app, redo it.

## 2. Principles
1. **The chart is the hero.** Every screen either shows a chart, uses one, or talks about one.
2. **Learn by doing.** No rules page. Three one-line hints, each shown once, at the moment it matters.
3. **Funny when wrong.** Failure states (missed chest, cursed map) get the best animations and lines.
4. **One primary action per screen.** Mango button. Everything else is quiet ink.
5. **Thumb-first.** Primary actions in the bottom third on phones; 48 px minimum targets.

## 3. Colour tokens: Tropical day (contrast-checked, WCAG ratio in brackets)

```css
:root {
  /* paper & ink (UI cards, charts) */
  --paper: #FFF4DC;      /* card + chart background, sun-bleached */
  --paper-2: #F3E1B8;    /* pressed, borders, chart margins */
  --ink: #2B1D12;        /* text on paper (14.9:1) */
  --ink-soft: #6A513A;   /* secondary text on paper (6.7:1; 5.7:1 on paper-2) */
  --hibiscus: #B8233F;   /* the X, Old Captain seal, cursed, report (5.7:1 on paper) */
  --palm: #1E5B3A;       /* true map, success (7.4:1 on paper) */
  /* lagoon (app frame) */
  --lagoon: #0A6468;     /* frame background */
  --lagoon-2: #08575C;   /* bars and panels on the frame */
  --foam: #FFF7E8;       /* text on lagoon (6.5:1) */
  --seafoam: #C8EEE7;    /* secondary text on lagoon (5.6:1) */
  --sun: #FFCF6B;        /* gold counters and links on lagoon (4.7:1) */
  --mango: #FFB21E;      /* primary button background; button text = --ink (9.0:1) */
  /* island (3D and the 2D fallback only) */
  --sea-deep: #0A6468; --sea: #1E9A9C; --shallows: #4CC3B9; --sand: #F2D99B; --sand-wet: #D9B872;
  --grass: #6DBE5A; --grass-2: #5FAF4E; --jungle: #2E7D3A; --rock: #8A8178; --pond: #6FD3E0;
  --cloud: #F4FBF8;      /* low cloud over unseen tiles (replaces dark fog) */
}
```
Rules: text only uses the pairs above. Island colours never carry meaning alone (landmarks differ by **shape**, red team: colour blindness). No navy, no purple, no glow gradients: the frame is a flat lagoon colour with, at most, a faint wave-line texture.

## 4. Type
- **Display:** *IM Fell English SC* (SIL OFL), for island names, screen titles, the Dispatch heading. Never below 20 px.
- **Body/UI:** *Atkinson Hyperlegible* (SIL OFL), 16 px base, 14 px minimum, numbers tabular.
- Bundle both as WOFF2 in the client; no external font requests (the webview only allows its own domain).
- Scale: 14 / 16 / 20 / 26 / 34.

## 5. Layout
- **Frame:** lagoon background, a paper card stack in the middle; max content width 520 px on desktop, centred; island canvas can go wider (up to 720 px).
- **Phone (360–430 px):** top bar (day + gold + streak), content, bottom action bar (primary button + 1–2 ink buttons).
- **Inline splash:** fixed "regular" height; nothing scrolls; nothing captures gestures.
- Spacing scale 4/8/12/16/24/32. Corner radius 6 px on cards (parchment is cut, not pill-shaped). Torn-edge effect via an SVG mask on card tops (one shared asset).

## 6. The ten landmark glyphs
Drawn once as SVG symbols, used in three places: chart stamps (ink line), island (filled colour version of the same silhouette), legend.

| Glyph | Silhouette idea (must be recognisable at 24 px in pure ink) |
|---|---|
| Palm | single curved trunk, 4 fronds |
| Twin palms | two crossed trunks |
| Boulder | lumpy oval, one crack |
| Skull rock | rounded rock with two eye holes |
| Hut | triangle roof on a square |
| Wreck | broken hull with a mast stub |
| Well | short cylinder with a little roof bar |
| Statue | tall rectangle head on a plinth (original figure, no famous statue) |
| Campfire | 3 crossed logs + flame |
| Cave | dark arch in a mound |

Stroke 2 px at 24 px, round caps, slight hand wobble (draw them by hand or wobble the path with a fixed seed; keep identical everywhere). Test: show all ten at 24 px in black on parchment to 3 people; each must name 8+.

Other ink assets: X mark (two brush strokes), dotted path dash pattern `4 4`, compass rose (top-right of every chart), dock (small pier), the Old Captain wax seal (red circle with an anchor; original), chest (closed/open), shovel, footprint.

## 7. Charts
- Parchment square, coastline in ink 2 px with a 1-tile sand hatch inside it, sea hatched with light horizontal strokes.
- Author line at the bottom: "Charted by u/name · Day 12". Old Captain charts: wax seal bottom-right instead.
- Depth badge top-left: Shallow ● / Buried ●● / Deep ●●●.
- On the island, a chart opens as a 85%-opaque overlay that you can toggle. In the reveal, the chart's X is projected onto the island in `--seal` ink, the true chest in `--gold`, joined by a dashed line with the distance in paces.

## 8. Motion
- Walk: 12 tiles/s, ease-linear; footprints fade over 6 s.
- Dig: shovel 2-frame jab (150 ms), sand puff (6 particles, 300 ms).
- Found: chest lid flips (200 ms), 8 coins arc into the gold counter (600 ms), counter rolls.
- Missed: chart X and chest appear, ink line draws itself (500 ms), sailor shrug.
- Island fade before charting: 600 ms to parchment.
- Ink check overlay: your chart over the true island, 3 s, then the grade stamp thuds in (scale 1.3→1, 180 ms).
- 3D island: water swells slowly; clouds over unseen tiles drift and thin out as the sailor uncovers them; the camera eases after the sailor (250 ms). A dug hole kicks up a sand puff; a found chest rises out of the sand with its lid open.
- Only `transform` and `opacity` in the DOM; the 3D scene animates inside its WebGL canvas. `prefers-reduced-motion`: replace movement with 150 ms fades; walking jumps tile-to-tile; water and clouds hold still; the camera cuts instead of easing.

## 9. Sound (P1, all generated with WebAudio, no files)
Dig thunk, coin chink, quill scratch on placing a stamp. Off until the player taps the speaker icon (remembered in `localStorage`). The game is complete with sound off.

## 10. Accessibility
- All text pairs ≥ 4.5:1 (§3).
- Landmarks by shape, depth by dots, ratings by icon + word ("True map", "Cursed map").
- Everything reachable by keyboard on desktop: arrow keys move the sailor one tile, Space digs, M toggles the chart, Tab through UI. Chart editor: Tab cycles pieces, arrows move the selected piece, Delete removes it.
- Screen-reader labels on all buttons; live region announces "Found the chest! +240 gold" and "Missed. The map was 7 paces off."
- No time limits. No flashing.

## 11. Copy voice
Short, salty, kind. The game teases the *map*, never the player. Full strings in `06-COPY.md`.
