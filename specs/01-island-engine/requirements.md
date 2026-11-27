# 01 · Island engine — requirements

Scope: pure, deterministic game logic in `src/shared/`, used by both client and server. Source: PRD §5–7, Architecture §6–7.

## ENG-1 Determinism
- **ENG-1.1** THE engine SHALL produce identical output for identical inputs on client and server (no `Math.random`, no `Date.now`, no DOM, no Devvit imports in `src/shared`).
- **ENG-1.2** THE engine SHALL derive all randomness from `mulberry32(hash32(seed))`.
- **ENG-1.3** THE engine SHALL compute the UTC day string `YYYY-MM-DD` and the day number from a supplied timestamp, with day 1 = the launch day constant.

## ENG-2 Island generation
- **ENG-2.1** WHEN given a seed and a modifier, THE engine SHALL generate a 40×40 island with land share 60% ±5% (70% ±5% on Low tide).
- **ENG-2.2** THE engine SHALL place exactly one dock on a coastal sand tile on the southern coast.
- **ENG-2.3** THE engine SHALL make every non-blocked land tile reachable from the dock by 4-directional moves.
- **ENG-2.4** THE engine SHALL place 8–12 landmarks (8–10 distinct types; Twins adds 2 copies) with at least 4 tiles (Chebyshev) between any two of different types, at least 3 tiles from the dock, and treat landmark tiles as blocked.
- **ENG-2.5** WHILE the modifier is Twins, THE engine SHALL place 2 landmark types twice, each pair 6–10 tiles apart.
- **ENG-2.6** THE engine SHALL ensure at least 30% of walkable land is ≥ 5 tiles (Chebyshev) from every landmark, so Deep chests are always possible.
- **ENG-2.7** IF validation fails, THEN THE engine SHALL re-roll with `seed + '#n'` (n = 1…20) and return the first valid island; IF none is valid, THEN it SHALL throw.
- **ENG-2.8** WHERE an override exists for a day in `overrides.ts`, THE engine SHALL use the override seed.
- **ENG-2.9** THE engine SHALL give each island a name from the original word lists using the same RNG, never starting with "Isle of".
- **ENG-2.10** THE engine SHALL generate an island in under 50 ms on a mid phone.

## ENG-3 Movement and fog
- **ENG-3.1** THE engine SHALL find a shortest 4-directional path between two walkable tiles (A*), or return `null` if none exists.
- **ENG-3.2** THE engine SHALL treat water, blocked tiles and landmarks as not walkable.
- **ENG-3.3** THE engine SHALL reveal all tiles within Euclidean radius `r` of a position, with `r` from the day's modifier (default 3, Clear skies 4, Sea fog 2).
- **ENG-3.4** THE engine SHALL decide a dig finds the chest when Chebyshev distance ≤ 1.

## ENG-4 Depth and scoring
- **ENG-4.1** THE engine SHALL classify a chest as Shallow (≤ 2), Buried (3–4) or Deep (≥ 5) by min Chebyshev distance to any landmark, with multipliers 1/2/3.
- **ENG-4.2** THE engine SHALL compute finder gold as `mult × (40 + 20 × shovelsLeft) + (steps ≤ 1.5 × shortest ? 20 : 0)`.
- **ENG-4.3** THE engine SHALL compute mapmaker salvage per find as `10 × mult`.
- **ENG-4.4** THE engine SHALL compute trust as `(finds + 1) / (attempts + 2) + 0.05 × (trueVotes − cursedVotes) / max(1, votes)`.
- **ENG-4.5** THE engine SHALL map all-time finds to tiers at 0/5/25/75/200 (Deckhand, Mapmaker, Navigator, Cartographer, Legend).

## ENG-5 Charts
- **ENG-5.1** THE engine SHALL accept a chart only if it has 0–6 stamps of known types, at most one path of 2–9 integer grid points (≤ 8 segments, no zero-length segment), and exactly one X, all within 0–39.
- **ENG-5.2** THE engine SHALL compute an Ink check: per-stamp error to the nearest real landmark of the same type (10 if none), X error = Euclidean distance to the chest, and a grade: Sharp (X ≤ 1 and mean stamp error ≤ 1.5), Steady (X ≤ 3), Wobbly (X ≤ 6), else Cursed.

## ENG-6 Old Captain charts
- **ENG-6.1** WHEN given an island, a chest and an RNG, THE engine SHALL produce a valid chart (ENG-5.1) with 3–5 stamps of real nearby landmarks jittered ≤ 1 tile, a path from the dock simplified to ≤ 8 segments with one waypoint nudged 1–2 tiles, and an X within 1–2 tiles of the chest.
- **ENG-6.2** THE engine SHALL choose 3 Old Captain chest tiles per day, one per depth class, on walkable tiles.

## ENG-7 Atlas (dev tool)
- **ENG-7.1** WHERE the Atlas tool is run, IT SHALL render the next 30 days of islands with dock, landmark labels, deep-zone shading and modifier, and SHALL NOT be included in the shipped client bundle.
