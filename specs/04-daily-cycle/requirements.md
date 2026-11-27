# 04 · Daily cycle — requirements

Scope: one island a day, posting, modifiers, streaks, Dispatch, and the community-shaped next day. Source: PRD §5.1, §5.8, §6, §7.4; Architecture §9; `docs/14-INSPIRATION.md`.

## DAY-1 Daily post
- **DAY-1.1** WHEN the scheduler fires at 00:00 UTC, THE daily job SHALL create today's island post titled `Isle of Maybe · Day {n} — {island}` with postData `{ day, seed }`, unless one already exists for that day.
- **DAY-1.2** THE daily job SHALL post and sticky an app comment for chart shares, and store its id.
- **DAY-1.3** THE daily job SHALL bury today's 3 Old Captain chests and store their charts (ENG-6).
- **DAY-1.4** WHEN the app is installed, THE server SHALL run the daily job for the current day.
- **DAY-1.5** WHERE a moderator uses "Post today's island" or "Re-run daily job", THE server SHALL run the same idempotent job.
- **DAY-1.6** THE server SHALL freeze a day's seed once its post exists and never regenerate it.

## DAY-2 Modifiers
- **DAY-2.1** THE engine SHALL map UTC weekdays to modifiers: Mon Clear skies, Tue Twins, Wed Low tide, Thu Thick jungle, Fri Sea fog, Sat Lantern night, Sun Storm.
- **DAY-2.2** WHERE a modifier isn't implemented yet, THE engine SHALL treat it as Clear skies and THE client SHALL show no label for it.

## DAY-3 Splash
- **DAY-3.1** THE client SHALL show on the inline splash: day number, island name, modifier line, today's buried/found counts, the player's streak, and one "Set sail" button.
- **DAY-3.2** WHERE the player has a chart from an earlier day, THE splash SHALL show its finds so far.
- **DAY-3.3** WHEN the post isn't today's island, THE splash SHALL show a link to today's post.

## DAY-4 Streaks
- **DAY-4.1** WHEN a player finishes a hunt, THE server SHALL set that UTC day's bit in the player's yearly streak bitfield.
- **DAY-4.2** THE server SHALL compute the current streak as consecutive set days ending today or yesterday, across year boundaries.

## DAY-5 Dispatch
- **DAY-5.1** WHEN a player opens a new day with charts from the last 3 days, THE client SHALL show the Dispatch first: per chart attempts, finds, votes and salvage gold, plus tier progress.
- **DAY-5.2** WHERE a player has no earlier chart, THE client SHALL show a sample Dispatch card once, explaining what tomorrow shows.

## DAY-6 Community names tomorrow (P1)
- **DAY-6.1** THE daily job SHALL post a second app comment "Name tomorrow's island" and sticky it (or include it in the share sticky if only one sticky is allowed).
- **DAY-6.2** WHEN the next daily job runs, THE daily job SHALL take the highest-scoring direct reply to that comment whose text is 3–24 letters/spaces, passes the banned-word list, and isn't removed; use it as the island name with credit "named by u/{author}"; otherwise use the generated name.

## DAY-7 Tomorrow teaser (P1)
- **DAY-7.1** THE client SHALL show tomorrow's coastline silhouette (shape only, no landmarks) on the result card with a countdown to 00:00 UTC in the player's local time.

## DAY-8 Crew goal (P2)
- **DAY-8.1** THE server SHALL show a daily community target of finds (default 50, configurable), with a progress bar on splash and result card.
- **DAY-8.2** WHEN the target is met, THE daily job SHALL give tomorrow the Lantern night modifier regardless of weekday.
