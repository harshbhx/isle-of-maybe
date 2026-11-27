# 01 · Island engine — design

Full detail: `docs/05-ARCHITECTURE.md` §3, §6, §7.

## Modules (`src/shared/`)
| Module | Exports | Requirements |
|---|---|---|
| `rng.ts` | `hash32(s)`, `mulberry32(seed)`, `pick`, `int(lo, hi)`, `shuffle` | ENG-1.2 |
| `day.ts` | `utcDay(ms)`, `dayNumber(day)`, `modifierFor(day)`, `LAUNCH_DAY` | ENG-1.3 |
| `names.ts` | `islandName(rng)` (two word lists: prefixes like Gull, Brine, Crooked; suffixes like rock, wick, Key, Reach) | ENG-2.9 |
| `island.ts` | `generateIsland(seed, modifier): Island`, `seedFor(day)` | ENG-2.* |
| `overrides.ts` | `OVERRIDES: Record<string, string>` | ENG-2.8 |
| `path.ts` | `walkable`, `aStar`, `bfsReach`, `chebyshev`, `revealAround` | ENG-3.* |
| `depth.ts` | `depthClass(tile, landmarks)`, `depthMult` | ENG-4.1 |
| `scoring.ts` | `finderGold`, `salvage`, `trustScore`, `tierFor` | ENG-4.2–4.5 |
| `chart.ts` | `validateChart`, `inkCheck` | ENG-5.* |
| `captain.ts` | `captainChests(island, rng)`, `captainChart(island, chest, rng)` | ENG-6.* |
| `types.ts` | `Tile`, `Island`, `LandmarkType`, `Modifier`, `ChartPiece`, … | — |

## Key choices
- **Terrain** is a `Uint8Array(1600)`: 0 water, 1 sand, 2 grass, 3 blocked. Index = `y * 40 + x`.
- **Land mask:** `v = falloff(dx, dy) + 0.35 × noise(x, y)` where falloff is radial from (19.5, 19.5) and noise is 2-octave value noise from the RNG. Pick the threshold by sorting values so the target share is land. Keep the largest 4-connected land component.
- **Dock:** among sand tiles with water directly south, the one with the largest y; ties → smallest |x − 19.5|.
- **Blocked clusters:** 1–4 tile blobs grown from random grass/sand tiles; after each blob, BFS from the dock; undo the blob if any walkable tile became unreachable.
- **Landmarks:** shuffled candidate tiles, greedy placement with spacing checks; types from a shuffled list of the 10.
- **Ink check** uses the true island, so it runs on the server (the client only ever sees its own author result).
- **Simplification** for captain paths: Ramer–Douglas–Peucker with epsilon raised until ≤ 9 points, then snap to integer tiles.

## Testing
- `src/shared/*.test.ts` run with the template's `test:unit` (`node --test`, type stripping); type-checked by `tools/tsconfig.test.json`.
- Property tests: loop over 200 seeds (`'t' + i`) and assert ENG-2.1–2.6.
- Golden test: `generateIsland('maybe-2026-12-05', 'clear')` snapshot of dock + landmark list (catches accidental changes, which would break posted days).
