# 15 — Components

The component kit for the client. It maps the design (`03-DESIGN.md`) and the wireframes (`04-WIREFRAMES.md`) onto files, so an agent can build any screen from parts that already exist. No UI libraries: React + Tailwind tokens + SVG + Canvas 2D (AGENTS.md §2).

## Tokens and type
`src/client/index.css`. Tailwind 4 `@theme` holds every colour token from §3 (`bg-parchment`, `text-ink`, `text-seal`, `bg-night`, `text-gold`…), `font-display` (IM Fell English SC) and `font-body` (Atkinson Hyperlegible). Both fonts are bundled from `@fontsource/*` WOFF2 files; nothing loads from the network. `.parchment` is the card material and `.torn` is the torn top edge (`assets/torn-edge.svg`). The motion classes `anim-rise`, `anim-thud` and `anim-fade` animate only transform and opacity and turn into fades under reduced motion.

## Kit (`src/client/components/ui.tsx`)
| Component | Use | Wireframe |
|---|---|---|
| `Button` | `gold` = the one primary action per screen; `ink` = secondary; `quiet` = text link; `danger` = report. 48 px tall minimum. | all |
| `Card` | Parchment panel, optional torn top. | W2, W3, W9 |
| `Title` | Display face, 26 px. | all |
| `Banner` | Night or parchment strip for modifiers, old-day links and empty states; becomes a button when it has `onClick`. | W1, W12 |
| `DepthDots` | ●/●●/●●● plus the word, never colour alone (UI-6.3). | W3, W6, W9 |
| `TopBar` | Day label, streak, gold. | W4, W9 |
| `Sheet` | Bottom sheet with scrim, Escape to close and focus moved inside. | W10 |
| `Tabs` | Board tabs. | W11 |
| `Loading`, `ErrorState` | `common.loading`; `err.*` with retry (UI-8.1). | W12 |
| Icons | `CoinIcon`, `FlameIcon`, `ShovelIcon`: original glyphs, no emoji in the UI chrome. | W1, W4 |

## Ink (`Glyph.tsx`, `ChartView.tsx`)
- `Glyph`: one landmark, X, dock or compass from `src/shared/glyphs.ts`; with `fill`, the island colour version. The server's share image uses the same strokes.
- `ChartView`: a 400×400 parchment with hatched sea, the shoreline (`coastPath`, marching squares + smoothing from `src/shared/coast.ts`), dock, compass, depth dots, then `Pieces` (dashed path, stamps, the X in seal red). It has props for the Old Captain seal (`captain`), an empty parchment (`bare`, for the editor) and children (editor handles, reveal markers).
- `lib/geom.ts`: tile ↔ chart pixel helpers shared by both.

## Plumbing (`src/client/lib/`)
- `api.ts`: `get`/`post` typed with `src/shared/api.ts`; failures throw `ApiFailure(code, status)`.
- `platform.ts`: soft wrappers over `@devvit/web/client` (expanded mode, toast, navigate, login prompt, share sheet, share data, realtime), so the same build runs in the local preview.
- `copy.ts`: every string (`docs/06-COPY.md`) and `fmt()`.

## Screens (built on the kit)
| Screen | File | Parts |
|---|---|---|
| W1 Splash | `splash.tsx` | Title, Banner, counts, gold Button → `openGame` |
| W2 Dispatch | `screens/Dispatch.tsx` | Card per chart + ChartView thumb, tier bar |
| W3 Pick | `screens/Pick.tsx` | Swipeable cards (ChartView, slot label, DepthDots, stats) |
| W4 Hunt | `screens/Hunt.tsx` + `island/` | Canvas island, chart overlay toggle, Dig, shovels, steps |
| W5 Reveal | `screens/Reveal.tsx` | Island with X vs chest, rating buttons (icon + word) |
| W6 Bury | `screens/Bury.tsx` | Canvas with seen tiles lit, depth preview |
| W7 Chart editor | `screens/ChartEditor.tsx` | ChartView `bare` + stamp tray, path and X tools, undo, budget |
| W8 Ink check | `screens/InkCheck.tsx` | Chart over island, grade stamp (`anim-thud`) |
| W9 Result | `screens/Result.tsx` | Summary rows, action stack |
| W10 Share | `screens/ShareSheet.tsx` | Sheet + server-drawn preview image + exact text |
| W11 Boards | `screens/Boards.tsx` | Tabs, rows, pinned own row, Hall cards |
| W12 States | `components/ui.tsx` + each screen | Banner, ErrorState, empty copy |

## Checking a screen without Reddit
`npm run build && npm run preview:local` serves the built client and the real `/api` router on an in-memory store seeded with four stranger charts (`PREVIEW_ANON=1` for a logged-out viewer). `python3 tools/preview/shoot.py game.html /tmp/shot --click "Follow this chart" --shot pick` saves 390 px and 1440 px screenshots and prints console errors.
