# 06 · Client shell — requirements

Scope: look, feel, structure and quality of every screen. Source: `docs/03-DESIGN.md`, `docs/04-WIREFRAMES.md`, `docs/06-COPY.md`, Featuring guide.

## UI-1 Entry points
- **UI-1.1** THE app SHALL have three entrypoints: `default` (inline splash), `game` (expanded), `_direct_launch` (→ game).
- **UI-1.2** WHILE inline, THE client SHALL NOT capture wheel, touch or pointer scrolling, SHALL NOT set `touch-action: none` or `overscroll-behavior: none` on html/body/root, and SHALL fit without internal scrolling at 320 px wide.
- **UI-1.3** WHEN the player taps Set sail, THE client SHALL call `requestExpandedMode` to open the game.

## UI-2 Design system
- **UI-2.1** THE client SHALL use only the colour tokens, fonts and spacing in `docs/03-DESIGN.md` §3–5, with every text pair at ≥ 4.5:1 contrast.
- **UI-2.2** THE client SHALL bundle IM Fell English SC and Atkinson Hyperlegible locally and make no external requests.
- **UI-2.3** THE client SHALL use one set of 10 landmark glyphs for stamps, island and legend; each glyph SHALL be recognisable at 24 px (8 of 10 named correctly by 3 people).
- **UI-2.4** THE client SHALL contain no Reddit or third-party IP (no Snoo; remove the template's `snoo.png`).

## UI-3 Island view
- **UI-3.1** THE client SHALL render the island on Canvas 2D with fog, sailor, footprints and holes at 60 fps while walking on a mid phone.
- **UI-3.2** THE client SHALL support tap-to-move with route preview, keyboard arrows, Space to dig, M to toggle the chart, and zoom buttons (1×–2×).

## UI-4 Screens and states
- **UI-4.1** THE client SHALL implement W1–W12 from `docs/04-WIREFRAMES.md`, including empty, error, logged-out and old-day states.
- **UI-4.2** THE client SHALL take every user-facing string from `copy.ts`.
- **UI-4.3** THE client SHALL show each hint from `06-COPY.md` once, at the moment it applies.

## UI-5 Motion and sound
- **UI-5.1** THE client SHALL animate only `transform` and `opacity` and SHALL replace movement with fades when `prefers-reduced-motion` is set.
- **UI-5.2** (P2) WHERE sound is enabled by the player, THE client SHALL play generated dig, coin and quill sounds; sound SHALL be off by default.

## UI-6 Accessibility
- **UI-6.1** THE client SHALL make the whole loop playable by keyboard on desktop with visible focus.
- **UI-6.2** THE client SHALL announce finds and misses in a live region and label every button.
- **UI-6.3** THE client SHALL never rely on colour alone (landmarks by shape, depth by dots, ratings by icon + word).

## UI-7 Performance
- **UI-7.1** THE client bundle SHALL be ≤ 250 KB gzip; the splash SHALL first-paint in ≤ 1.5 s on a throttled mid phone.

## UI-8 Errors
- **UI-8.1** IF a request fails, THEN THE client SHALL show `err.network` with retry and resume from the server's state.
- **UI-8.2** IF a write hits the storage quota, THEN THE client SHALL show `err.quota` and let the hunt continue.
- **UI-8.3** THE client SHALL produce zero console errors or warnings.

## UI-9 First-time experience (from `docs/14-INSPIRATION.md` I3)
- **UI-9.1** WHEN a player opens the game for the first time, THE client SHALL offer Practice Cove: a fixed tiny island with a perfect Old Captain chart and the three hunt hints, skippable, taking under 45 seconds.
- **UI-9.2** THE client SHALL remember completion server-side so it isn't shown again.
