# 03 · Bury and chart — design

Screens: W6–W8. Keys: `user:{u}:day:{d}`, `user:{u}:seen:{d}`, `chart:{c}` (Architecture §5).

## Bury
- Client renders the island canvas with a mask from `GET /api/seen` (bitfield → 1,600 booleans) so the client never infers more than the server knows.
- Depth preview uses `depthClass` from `src/shared`.
- `POST /api/bury`: transaction on `user:{u}:day:{d}` (watch → check `buried` empty → `hSet buried, chestX, chestY` → exec). 400 on any rule failure.

## Chart editor
- SVG `viewBox="0 0 400 400"`, 10 px per tile. Coastline path built from the island land mask (marching squares on the 40×40 grid, then a seeded ±0.6 px wobble).
- State: `{ pieces: ChartPiece[], selected?: number, history: ChartPiece[][] }` in a reducer; every action pushes history (cap 20).
- Input: pointer events on the `<svg>` with `touch-action: none` set on that element only. Positions snap to the nearest tile centre. Keyboard: Tab cycles pieces, arrows move, Delete removes, `S` / `P` / `X` choose tools.
- Glyphs: `<symbol>` defs shared with the island renderer's silhouettes (`docs/03-DESIGN.md` §6).

## Ink check
- Server computes `inkCheck(island, chest, pieces)` and returns `{ grade, xError, stampErrors }`.
- Client overlay: draw the chart SVG at 85% opacity over the island canvas fitted to the same 400×400 space; after 3 s, stamp the grade.

## Tests
- Engine tests cover validation and grading (ENG-5).
- Server: bury on unseen tile → 400; double bury → 400; chart before bury → 400; chart with 7 stamps → 400.
- Client: Playwright-free manual checklist in `docs/08-TESTING.md` Q7–Q10.
