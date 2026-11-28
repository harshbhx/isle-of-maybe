# 02 · Hunt — requirements

Scope: choosing a chart and hunting a stranger's chest. Source: PRD §5.2–5.4, Architecture §4, §13.

## HUNT-1 Chart picker
- **HUNT-1.1** WHEN a player opens the picker, THE server SHALL return 3 charts: Trusted (highest trust today), Fresh (fewest attempts today), Old Captain.
- **HUNT-1.2** THE server SHALL never offer a player their own chart, a hidden chart, or a chart they already hunted.
- **HUNT-1.3** IF fewer than 2 player charts qualify, THEN THE server SHALL fill the empty slots with Old Captain charts.
- **HUNT-1.4** WHERE the player arrived from a share link with a chart id, THE client SHALL offer that chart first with the challenger's name, after the server validates it under HUNT-1.2.
- **HUNT-1.5** THE server SHALL never include chest coordinates in a picker response.

## HUNT-2 Starting a hunt
- **HUNT-2.1** WHEN a player starts a hunt, THE server SHALL create a hunt at the island's dock with 3 shovels and 0 steps.
- **HUNT-2.2** IF the player already started 3 hunts today, THEN THE server SHALL refuse with a clear reason.
- **HUNT-2.3** WHILE a player is logged out, THE server SHALL allow hunts of Old Captain charts only, not counted toward any board.

## HUNT-3 Moving
- **HUNT-3.1** WHEN the client sends steps, THE server SHALL accept them only if each is 4-directionally adjacent to the previous and walkable, starting from the server's last position.
- **HUNT-3.2** THE server SHALL reveal tiles within the day's radius after every accepted step and record them in the player's seen-tiles mask for that day.
- **HUNT-3.3** THE server SHALL treat a repeated step batch (same step index) as a no-op.
- **HUNT-3.4** IN the 2D fallback, THE client SHALL preview the A* route before walking and SHALL let the player skip the walking animation. (In 3D the explorer moves freely: ADV-3.)

## HUNT-4 Digging and the end of a hunt
- **HUNT-4.1** WHEN a player digs, THE server SHALL dig at the server's position, use one shovel, and report found if Chebyshev distance to the chest ≤ 1.
- **HUNT-4.2** WHEN a dig finds the chest or the last shovel is used or the player gives up or the tide runs out (ADV-1.6), THE server SHALL end the hunt and return the reveal: chest tile, the chart's X, distance in paces, gold earned, and the reason.
- **HUNT-4.3** THE server SHALL never include the chest position in any response before the hunt ends.
- **HUNT-4.4** WHEN a hunt ends with a find, THE server SHALL add finder gold (ENG-4.2) to the player and salvage (ENG-4.3) to the chart's author, and increment the chart's finds.
- **HUNT-4.5** WHEN any hunt ends, THE server SHALL increment the chart's attempts and update its trust score, and mark the player's streak for the day.

## HUNT-5 Rating
- **HUNT-5.1** WHEN a player who finished hunting a chart rates it True or Cursed, THE server SHALL record one vote per player per chart and update trust.
- **HUNT-5.2** THE client SHALL make rating optional and never block continuing.

## HUNT-6 Abuse
- **HUNT-6.1** IF a client sends more than 10 API calls per second, THEN THE server SHALL reject the excess with 429.
- **HUNT-6.2** IF a request body fails validation, THEN THE server SHALL respond 400 without changing state.
