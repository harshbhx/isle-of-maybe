# 03 · Bury and chart — requirements

Scope: burying your chest and drawing a chart from memory. Source: PRD §5.5–5.6, red team C2/C5/C6.

## CHART-1 Burying
- **CHART-1.1** WHILE a player is logged in, has finished at least one hunt today, and hasn't buried today, THE client SHALL offer "Bury your chest" on today's post.
- **CHART-1.2** THE client SHALL show only the tiles in the player's seen-tiles mask for today; all others stay fogged.
- **CHART-1.3** WHEN the player moves the chest preview, THE client SHALL show the live depth class and multiplier (ENG-4.1).
- **CHART-1.4** WHEN the player confirms, THE server SHALL accept the tile only if it is in the seen mask, walkable, not the dock and not a landmark; and only once per player per UTC day.
- **CHART-1.5** IF the post is not today's island, THEN THE server SHALL refuse burying with a reason and THE client SHALL link to today's post.
- **CHART-1.6** WHILE a player is logged out, THE client SHALL show the log-in prompt at the bury step and nothing else gated.
- **CHART-1.7** IF the player hasn't finished a hunt today, THEN THE server SHALL refuse burying (the client gate in CHART-1.1 isn't enough on its own).

## CHART-2 Chart editor (limited expression)
- **CHART-2.1** THE client SHALL hide the island and show a parchment with only the coastline and dock pre-printed.
- **CHART-2.2** THE client SHALL offer exactly these tools: 10 landmark stamps (max 6 placed), a path of grid-snapped waypoints (max 8 segments), and one X (required).
- **CHART-2.3** THE client SHALL NOT offer freehand drawing or any text input.
- **CHART-2.4** THE client SHALL let players select, move and delete pieces, undo up to 20 steps, and clear, with touch, mouse and keyboard.
- **CHART-2.5** THE client SHALL show remaining budget ("4 of 6 stamps · 3 of 8 path steps") and disable Submit until an X exists.
- **CHART-2.6** WHILE in inline mode, THE client SHALL NOT render the editor (expanded mode only).
- **CHART-2.7** (P1) WHERE margin notes are enabled, THE client SHALL let the player add at most one note chosen from the fixed phrase list in `src/shared/notes.ts` (no free text), and THE server SHALL reject any note not in that list.

## CHART-3 Submitting and Ink check
- **CHART-3.1** WHEN a chart is submitted, THE server SHALL validate it (ENG-5.1), store it with author attribution, and add it to today's trust and attempts indexes.
- **CHART-3.2** THE server SHALL accept one chart per player per day, only after that player buried today.
- **CHART-3.3** WHEN a chart is stored, THE server SHALL return its Ink check (ENG-5.2).
- **CHART-3.4** THE client SHALL overlay the chart on the true island for 3 seconds, then show the grade and the line from `06-COPY.md` (`ink.*`).

## CHART-4 Data hygiene
- **CHART-4.1** THE server SHALL store charts with a 30-day expiry and never return chest coordinates for a chart except to its author or in a hunt reveal.
