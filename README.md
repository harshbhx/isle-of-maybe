# Isle of Maybe

**Bury it. Chart it. Trust a stranger's map.**

A daily treasure-map game that runs inside Reddit posts. Every day there's a new 3D island, the same for everyone. You follow a map another player drew from memory to find their buried chest. Then you bury your own and draw a map for the next sailor. Tomorrow, you find out how many sailors your map led to gold.

<p>
  <img src="docs/img/screens/04-pick.png" width="190" alt="Pick a chart drawn by a stranger">
  <img src="docs/img/screens/05-hunt.png" width="190" alt="Walk the 3D island as the explorer, before the tide comes in, and dig">
  <img src="docs/img/screens/06-reveal.png" width="190" alt="See the chart's X against the real chest">
  <img src="docs/img/screens/08-chart.png" width="190" alt="Draw your own chart from memory">
</p>

> Built for Reddit's Game of the Day Hackathon (Nov–Dec 2026) on Reddit's Developer Platform (Devvit Web).

## How to play
1. Tap **Set sail** on today's island post. First time? **Practice Cove** coaches you in five quick steps (you can skip it).
2. Pick a chart: **Trusted** (rated well by other sailors), **Fresh** (nobody has tried it yet), or the **Old Captain's**.
3. You're the explorer. **Walk and run**: on a phone, put your thumb anywhere on the left and drag (push far to run); on a computer, WASD or the arrows, Shift to run, or click where you want to go. The mist lifts where you walk. Open the chart any time (M).
4. **Beat the tide**: you have 150 seconds before the sea floods the low beach in three waves. Watch for quicksand (it traps you for a moment) and thicket (it slows you down); cliffs and jungle block the way. You have **3 shovels**: dig (Space) where you think the X means.
5. See the chest burst open (or where it really was), engraved with who buried it, against the map's X, then rate the chart **True map** or **Cursed map**.
6. **Bury your chest** on a spot you've walked near. Far from landmarks is **Deep**, which pays three times as much to you and to whoever finds it.
7. **Draw your chart from memory**: up to 6 landmark stamps, a dotted path of up to 8 steps, one X, and if you like, one margin note from a fixed list ("Count your steps.").
8. Get your **Ink check** right away. Tomorrow your **Dispatch** tells you how many sailors tried your chart, how many found your chest, and the salvage gold you earned.

**On Reddit, together:** your hat shows your flair rank, the dock sign names whoever named the island, today's footsteps wear paths into the grass (shown once three or more hunts cross a spot), and other redditors hunting right now walk past as lantern-lit ghosts (you can hide them).

You can hunt up to 3 charts a day and bury one chest. Streaks, gold boards, the **Hall of Charts** and Cartographer tiers (Deckhand to Legend of the Isles) reward coming back and drawing honest maps.

**Every day is a little different.** Monday Clear skies, Tuesday Twins (some landmarks have a double), Wednesday Low tide (a bigger island), Thursday Thick jungle, Friday Sea fog (you see less), Saturday Lantern night (landmarks near you glow through the fog). When the community finds enough chests in a day (the **crew goal**), tomorrow becomes Lantern night as a reward. The top reply under each day's sticky comment **names tomorrow's island**.

## For moderators
- Install the app in your subreddit. A new island post appears every day at 00:00 UTC with a sticky comment for chart shares and island names.
- Mod menu: **Post today's island** (if a post is missing), **Review reported charts** (restore or delete), **Stats** (players, charts, find rate and return rates for the last 7 days), **Re-run daily job**.
- App setting: **Crew goal** (finds per day that earn the next day a Lantern night; default 50).
- Players can report charts. A chart with 3 reports is hidden until a moderator reviews it; restoring it stops the same people hiding it again.
- Island names from replies must be 3 to 24 letters, pass a banned-word list and must not have been removed. Remove a reply to stop it from winning.

## Safety and privacy
- Charts are made only of fixed stamps, a snapped path, one X and an optional phrase from a fixed list. There is no free text or drawing anywhere in the game, and every chart shows its author.
- The server decides everything: it replays every step and dig, and the chest's position never reaches a player's device before their hunt ends.
- Sharing a chart as a comment or challenging a friend is optional and always asks first. The share image is drawn by the server from the stored chart.
- All player content expires after 30 days. Deleting an island post removes its charts; deleting a shared comment unlinks it.
- You can delete your own chart at any time ("Delete my chart" on the result card or in your Dispatch).
- Ghosts show your username and tile to others on the same island while you hunt; "Ghosts: off" stops both seeing and being seen. Worn paths are counts only, shown after 3+ hunts.
- No analytics, ads, trackers or outside requests. Full details: **[Privacy Policy](PRIVACY.md)** · **[Terms of Use](TERMS.md)**.

## Support
Questions, bugs or a data request: send modmail to **r/IsleOfMaybe**, or open an issue at https://github.com/harshbhx/isle-of-maybe/issues.

## Development
```bash
nvm use            # Node 24 (see .nvmrc)
npm install
npm run login      # Devvit login (once)
npm run dev        # playtest in r/IsleOfMaybe_dev
npm run test:unit  # tests
npm run build && npm run preview:local   # the real API on an in-memory store at localhost:5180
npm run qa         # automated QA matrix and break tests against the preview
npm run atlas      # the next 30 islands, for reviewing seeds
npm run deploy     # type check + lint + upload
```
- How we work: [`AGENTS.md`](AGENTS.md) and [`specs/README.md`](specs/README.md) (spec → issue → PR → merge).
- Product, design, architecture, QA: [`docs/`](docs/README.md).

## Credits
Fonts: IM Fell English SC and Atkinson Hyperlegible (SIL Open Font License), bundled with the app. Inspired by small map-drawing games such as *Captain Peggles: That Man's Chest*. Built from Reddit's Devvit React template (BSD-3-Clause). Game code, art and writing made for this hackathon by Harsh Bhanushali.
