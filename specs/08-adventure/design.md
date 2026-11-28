# 08 · Adventure — design

## Shared (pure, deterministic; no Date.now)
- `src/shared/tide.ts`:
  - `HUNT_SECONDS`
  - `coastDistance(island): Uint8Array`: BFS through sand from sand tiles that touch sea water (`0` = not sand)
  - `tideLevel(elapsedS)`: 0–3
  - `flooded(dist, tile, level)`
- `src/shared/hazards.ts`:
  - `quicksand(island): Set<number>`: rng from `seed + ':qs'`; patches grown by a seeded flood on sand or grass; skips dock ±1 and landmarks
  - `stepSeconds(island, qs, tile)`: ADV-2.2
- No change to `island.ts` output (AGENTS rule 9). Hazards and tide are derived from it.

## Server
- `hunts.ts`:
  - `startHunt` stores `start` (ms) and `minT` (0).
  - `HuntStartResponse` gains `startedAt`, `endsAt` and `now`.
  - `applySteps(…, nowMs)`: if expired, end the hunt with reason `tide`, then refuse. For each fresh step, `minT += stepSeconds`, and reject if `flooded(dist, s, tideLevel(minT))`. Reject if `minT > elapsed + 1.5`. Store `minT`.
  - `dig(…, nowMs)`: if expired, end the hunt with `tide`; if the current tile is flooded at `now`, refuse (`conflict`, `tide`).
  - `giveUp`: if expired, use reason `tide`.
  - `Reveal` gains `reason: 'found' | 'shovels' | 'gaveUp' | 'tide'`.

## Client
- `src/client/island/three/world/`, split by job:
  - `terrain.ts`: a height field 4× the tile resolution, smoothed, with seeded noise and vertex colours.
  - `sea.ts`: a ShaderMaterial with Gerstner-style waves, depth tint and foam from a shore-distance texture. Its level follows the tide.
  - `sky.ts`: gradient dome, sun, hemisphere light and fog.
  - `flora.ts`: instanced palms and jungle with a sway shader, plus rocks and grass tufts.
  - `life.ts`: birds and drifting mist.
  - `fx.ts`: sand spray, gold burst, light shaft, water splash.
  - `explorer.ts`: a rig built from primitives and code-driven animation clips.
  - `controls.ts`: joystick, keys, collision against walkable/flooded tiles, and the conversion from movement to tile steps.
  - `camera.ts`: follow camera and cinematic moves.
- `island3d.ts` becomes a thin shell that wires these together and keeps the `update/tileAt/dispose` contract the screens use.
- `Hunt.tsx`:
  - The 3D mode gets the joystick, a Run hint, a Dig button and a tide timer ring.
  - Steps are queued and flushed every 400 ms, and on dig.
  - The server's `now` sets a clock offset.
  - The 2D mode keeps tap-to-move.

## Quality tiers
`high` when the pointer is fine and DPR ≤ 2 with WebGL2; otherwise `low`, which means:
- half the plants
- a 1024 shadow map
- DPR capped at 1.5
- no birds
