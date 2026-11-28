# 08 · Adventure — requirements

Scope: the 28 Nov rebuild Harsh asked for after playing the game. "Too simple, robotic; it should be epic, realistic, hard." This feature turns the hunt into a third-person adventure: a sculpted island, an explorer who walks and runs freely, a tide that rises during every hunt, terrain hazards, and a cinematic dig. Decisions D26–D29. The chart, bury and Ink check loop is unchanged, and the server still decides everything (D07).

## ADV-1 Tide (rules: engine; enforcement: server)
- **ADV-1.1** THE engine SHALL give every hunt a time limit of `HUNT_SECONDS` = 150 s.
- **ADV-1.2** THE engine SHALL compute each sand tile's coast distance: 1 for sand next to sea water, then +1 per 4-step through sand. Grass, rock and landmark tiles never flood.
- **ADV-1.3** THE engine SHALL raise the tide at 40 %, 65 % and 85 % of the time limit to levels 1, 2 and 3. A sand tile is flooded when its coast distance ≤ the tide level at that moment.
- **ADV-1.4** IF a step enters a tile flooded at the step's earliest possible time (ADV-2.2), THEN THE server SHALL reject the batch.
- **ADV-1.5** IF a player digs on a tile flooded at the server's current time, THEN THE server SHALL refuse the dig with a clear reason and keep the shovel.
- **ADV-1.6** WHEN the time limit has passed, THE server SHALL end the hunt as not found with reason `tide` on the next steps, dig or give-up call. It SHALL refuse further steps and digs.
- **ADV-1.7** THE server SHALL return the hunt's start and end times (server clock) when a hunt starts, so the client can show the timer and the rising water.

## ADV-2 Hazards and pace (engine + server)
- **ADV-2.1** THE engine SHALL pick quicksand tiles from the day's seed: 3–5 patches of 2–4 sand or grass tiles, never on or next to the dock, never on a landmark. They are deterministic for a seed and never cut the island apart. Quicksand stays walkable.
- **ADV-2.2** THE engine SHALL give every step a minimum time: 0.2 s onto open ground (the run speed), 0.4 s onto thicket, and 0.2 s + 2.5 s onto quicksand. A thicket is a walkable grass tile with 2 or more jungle tiles (relief `jungle`) among its 8 neighbours. Jungle tiles themselves stay impassable.
- **ADV-2.3** IF a batch of steps needs more minimum time since the hunt started than the server clock allows (plus 1.5 s of slack), THEN THE server SHALL reject it as too fast.
- **ADV-2.4** THE engine SHALL keep rock tiles impassable (cliffs), as today.

## ADV-3 Explorer and movement (client)
- **ADV-3.1** WHILE hunting in 3D, THE client SHALL move an original explorer character (hat, satchel, shovel) continuously. On touch: a floating stick that appears wherever the thumb lands in the lower-left movement zone (the left 60 % of the island view, below its top third), follows the thumb, and disappears on release; pushing far runs. A faint ring marks the zone until the player first moves. On desktop: WASD or the arrow keys, with Shift to run. A third-person camera follows him smoothly.
- **ADV-3.2** THE client SHALL stop the explorer at impassable or flooded tiles, sliding along their edges, and SHALL slow him in jungle and trap him briefly in quicksand, matching ADV-2.2.
- **ADV-3.3** THE client SHALL turn continuous movement into 4-directional tile steps. A diagonal crossing goes through a walkable neighbour; if neither neighbour is walkable, the corner is blocked. Steps go to the server in batches, as today (HUNT-3.1, HUNT-3.3).
- **ADV-3.4** THE explorer SHALL have idle, walk, run, dig, stuck (quicksand), celebrate and dejected animations. All are built in code, with no external assets.
- **ADV-3.5** WHERE WebGL is unavailable (the 2D fallback, UI-3.5), THE client SHALL keep tap-to-move tile by tile. The timer, flooded tiles and quicksand are drawn there too.

## ADV-4 World (client)
- **ADV-4.1** THE 3D client SHALL draw the island as a smooth sculpted surface: no visible grid; beaches, grass, jungle and cliffs blended; heights from the relief (UI-3.1). It SHALL also draw an animated sea with waves, depth colour and shoreline foam; sky, sun, soft shadows and distance haze; swaying palms and jungle; birds; and low mist over unseen land (UI-3.6).
- **ADV-4.2** THE sea level SHALL rise visibly with the tide (ADV-1.3), and the HUD SHALL show the time left.
- **ADV-4.3** THE client SHALL choose a quality tier: high on desktop, lighter on phones (fewer plants, smaller shadow map, capped pixel ratio). It SHALL hold about 50 fps or more on a mid-range phone in the Reddit app (manual check J8).
- **ADV-4.4** THE world SHALL be deterministic from the seed. The same day looks the same for everyone.

## ADV-5 The dig and the reveal (client)
- **ADV-5.1** WHEN the player digs, THE client SHALL play a dig animation with sand flying and leave a hole.
- **ADV-5.2** WHEN a dig finds the chest, THE client SHALL raise the chest and burst its lid open with gold and light, swing the camera round it, and then show the result.
- **ADV-5.3** WHEN a hunt ends without a find (shovels, give up or tide), THE client SHALL show the chest's true spot, the empty hole and, for the tide, the water rolling over the beach, before the result.
- **ADV-5.4** WHILE reduced motion is on, THE client SHALL replace camera moves and bursts with short fades (UI-5.1).

## ADV-6 Only on Reddit (Harsh, 28 Nov)
- **ADV-6.1** THE explorer's hat SHALL show the player's flair tier: Deckhand straw, Mapmaker leather, Navigator with a feather, Cartographer blue felt with a compass pin, Legend with a gold band. The tier comes from the server's user state; logged-out players are Deckhands.
- **ADV-6.2** WHEN a hunt reveals the chest, THE 3D client SHALL show an engraved plaque on its lid: "Buried by u/name" (or "The Old Captain"), with the chart's True or Cursed stamp once it has 3 or more votes.
- **ADV-6.3** WHERE a redditor named the island (DAY-6.2), THE 3D dock SHALL carry a carved sign: "Named by u/name".
- **ADV-6.4** WHEN a hunt ends, THE server SHALL add 1 to that day's wear count for each distinct tile the hunt stepped on (TTL like the day's counts). It SHALL serve the day's wear as levels 0–3, rebuilt at most once a minute. A tile shows wear only after 3 or more hunts crossed it, and the server never sends who walked where.
- **ADV-6.5** THE 3D client SHALL blend worn tiles from grass or sand towards a trodden dirt path by wear level, so the day's crowd shows on the island.
- **ADV-6.6** WHILE a logged-in player is hunting, THE client MAY send its tile at most once every 2 s while moving. THE server SHALL rate-limit this, attach the player's name and broadcast it on the day's realtime channel. The server never stores these positions.
- **ADV-6.8** THE ghost toggle SHALL work both ways: while it is off, the client neither shows ghosts nor sends pings. The first 3D hunt SHALL say once, in one line, that other hunters can see you as a ghost and how to turn it off.
- **ADV-6.7** THE 3D client SHALL draw up to 8 other hunters as faint lantern-lit ghosts with their u/name, gliding between updates and fading out after 10 s without one. Under reduced motion they appear without gliding. The player SHALL be able to hide them.

## ADV-7 Performance (Harsh: "make sure performance stays")
- **ADV-7.1** THE 3D client SHALL measure its frame time. IF the average over 3 s drops below 40 fps, THEN it SHALL step down one level: first shadows off, then half the plants and no birds, then pixel ratio 1. It never steps back up within a session.
- **ADV-7.2** THE game entry's JavaScript SHALL stay within 450 KB gzip in total, with three.js and the world in the lazy chunk (UI-7.1). Fonts SHALL be subset to Latin woff2.

## ADV-8 Type (Harsh, 28 Nov)
- **ADV-8.1** THE client SHALL use Fraunces (bold display) for titles, island names and big moments, Bricolage Grotesque for the HUD, buttons and body text, and IM Fell English SC only on the paper chart and the share image. All are bundled (OFL), with no outside requests (rule 4).

## ADV-9 First-time experience and polish (Harsh, 28 Nov: "UX should be the greatest")
- **ADV-9.1** WHEN a player opens the game for the first time, THE client SHALL offer Practice Cove in 3D (2D where there is no WebGL). It is a guided run of 5 coached steps, each shown as one short line and waiting for the player to do it: move, run, read the chart, beat the tide (a gentle 60 s practice tide with no fail), dig on the X. It ends in the found-chest cinematic. It is skippable at any step, takes under 60 seconds, and is remembered (UI-9.2).
- **ADV-9.2** THE coach SHALL show its step number and progress dots, point at the control it means (stick zone, chart thumbnail, timer, Dig button), and adapt its words to touch or keyboard.
- **ADV-9.3** THE first time a player opens the chart editor, THE client SHALL show a 4-step coach strip: stamp what you remember, draw the path from the dock, mark the X, check and submit. It highlights the matching tool, moves on when each step is done, and can be dismissed.
- **ADV-9.4** ON touch screens, THE chart editor SHALL label every stamp under its glyph, keep every control at least 48 px tall, show a magnifier loupe above the finger while placing or dragging, and give a light vibration on snap where the device supports it.
- **ADV-9.5** THE client SHALL use small, dependency-free motion components where they help reading: gold that counts up, a shimmer on the found line, a soft spotlight on the chart you're about to pick, and a spark burst on key taps. All animate only `transform` and `opacity` and stay still under reduced motion (UI-5.1).
- **ADV-9.6** THE splash SHALL show key art rendered from the game itself (the explorer finding a chest) behind a lagoon wash that keeps every text pair at 4.5:1 or better. It is one bundled WebP under 40 KB, and the splash entry still has no canvas (UI-1.2).

## ADV-10 Every island looks different (Harsh, 29 Nov: "full uniqueness"; Hearthvale: "each village looks different")
- **ADV-10.1** THE engine SHALL give each day a biome from its seed: Tropical, Volcanic, Autumn, Mangrove, Frost or Coral. It is pure and deterministic, and doesn't change `island.ts` output or any rule (rule 9).
- **ADV-10.2** THE 3D client SHALL dress the island for its biome: ground and sand colours, plant colours and kinds (palms, broadleaf, pines), sea and sky colours, and one ambient touch each (volcanic smoke, autumn leaves, frost snowfall, mangrove mist, coral birds, tropical clouds). The ambient touch is still under reduced motion, or absent.
- **ADV-10.3** THE splash and the hunt header SHALL name the biome in one short line (for example "A volcanic isle"), so each day's post reads as new from the feed.

## ADV-11 Feel: weight, turning and footfalls (red team, 29 Nov: "more smoothness and realistic experience")
- **ADV-11.1** THE explorer SHALL ease into and out of motion, reaching full speed within about 0.12 s and stopping as quickly. It SHALL turn toward its heading along the shortest arc instead of snapping. Neither change makes it faster than the server's pace check allows.
- **ADV-11.2** THE camera's follow and zoom SHALL be smoothed by elapsed time, not per frame, so they feel the same at 30, 60 and 120 Hz.
- **ADV-11.3** WHILE the explorer moves, THE 3D client SHALL kick up small puffs from its feet: sand on beaches, dust on grass and earth, and splash rings in shallow water. Running makes more of them. The puffs come from a fixed pool, are absent under reduced motion, and hide at the adaptive quality step that hides the birds.

