# 14 — What past winners teach us (and what we took)

Reviewed 28 Nov 2026: the hackathon Resources page and every gallery it links to, the Featuring guide and in-app catalog docs in Reddit's docs repo, and three games outside Reddit whose async, stranger-to-stranger and sharing designs are closest to ours (Dark Souls/Elden Ring messages, Death Stranding, Wordle).

## What we looked at
| Source | Winners / examples | Pattern |
|---|---|---|
| Games and Puzzles 2024 (redditgamesandpuzzles.devpost.com) | Emoji Charades, Pixel Together, Laddergram, **Daily Dungeon** (top comment picks the character's next action), Suspicious Skyscraper, Story Stitch, 575 (daily haiku from the day's words) | Comments and votes *are* the game; tiny daily ritual |
| Community Games 2025 (communitygames2025.devpost.com) | Tower Race (steal a tower's core), PixelSandbox, HexIsles, Don't Kill The Fish | Massively shared state, ownership, stealing |
| Daily Games Feb 2026 (redditdailygames2026.devpost.com) | BridgeDit (3D bridges + shared levels), Sneakle, SerpenTiles, Fully Packed, Quipit, Spectrum 6, Just Golf It | One clean original mechanic, polished, daily |
| Games with a Hook Jul 2026 (redditgameswithahook.devpost.com) | **Reddictionary** ("Reddit writes the dictionary": comment submissions + upvotes → permanent entries; won Best Use of Retention Mechanics), **Delta-V Racing** (race other players' ghosts on player-made tracks; tracks for future days are visible but locked), Sketchy Solutions, Guess By, Gradient Descent, Hearthvale, Cattack! | Players make the content; a visible reason to return tomorrow |
| Dark Souls / Elden Ring messages (outside Reddit) | Strangers leave notes built only from fixed templates and a word list; readers rate them and good notes reward their author. Trolling ("amazing chest ahead") became part of the fun | Limited vocabulary is safe *and* expressive; rating the helper rewards them |
| Death Stranding "Likes" (outside Reddit) | You never meet other players, but you use what they built, and you log in to a pile of Likes your structures earned while you were away | The next-day payoff is the emotional hook |
| Wordle (outside Reddit) | The spoiler-free emoji grid turned every player into a sharer; the share showed the *story* of a game without the answer | Share the journey, never the solution |
| Featuring guide (`guides/launch/feature-guide.mdx`) | Requirements: custom first screen, clean on mobile + desktop, self-explanatory, no inline scrolling, in-app catalog assets. Reddit watches CTR, **day-1 and day-3 retention**, dwell time | Judges are the same team that features games |
| In-app catalog (`guides/launch/in-app-assets.md`) | App icon, featuring asset, tile image, short description, tile tagline, category | We need these for featuring later and they double as presentation art |

## What we took (now in the specs)
| # | Idea | From | Where | Priority |
|---|---|---|---|---|
| I1 | **Comments shape tomorrow:** the top-voted reply under the day's "Name tomorrow's island" sticky becomes tomorrow's island name, credited "named by u/…" (filtered and length-limited; falls back to the generated name) | Daily Dungeon, Reddictionary | `specs/04-daily-cycle` DAY-6 | P1 |
| I2 | **Tomorrow's coastline teaser** on the result card (shape only, locked) | Delta-V daily unlocks | DAY-7 | P1 |
| I3 | **Practice Cove** tutorial island on first visit: a short scripted hunt with a perfect Old Captain chart, so the first real hunt isn't the tutorial | Delta-V tutorial tracks; Featuring "self-explanatory" | `specs/06-client-shell` UI-9 | P0 |
| I4 | **Cursed Map of the Day** in the Hall of Charts: the most-missed chart with ≥ 5 attempts (funny, an inside joke) | "Create inside jokes" brief | COM-4.4 | P1 |
| I5 | **Crew goal:** a daily community target ("Find 50 chests today"). If met, tomorrow is Lantern night | Pixel Together, Hearthvale | DAY-8 | P2 |
| I6 | **Featuring readiness:** in-app catalog assets (icon, featuring asset, tile, tagline, category = Puzzle) and a custom first screen | Featuring guide | `specs/07-launch` SHIP-5 | P1 |
| I7 | Measure **day-1 and day-3 return** of testers and report it on Devpost | Featuring metrics | SHIP-3 | P1 |
| I8 | **Margin note:** one optional phrase on a chart from a fixed list ("Trust the palms", "Not the skull rock", "Count your steps", "Dig twice", "Mind the twin"…). Expressive, funny, trollable, and still limited expression | Dark Souls / Elden Ring messages | CHART-2.7 | P1 |
| I9 | **Spoiler-free result line** for sharing, Wordle-style: `Isle of Maybe · Day 12 · ⛏️⛏️💰 · Deep ●●● · Ink: Steady` (never coordinates) | Wordle share grid | COM-2.6 | P1 |
| I10 | The Dispatch opens with what strangers gave you while you were away (finds, 🧭 votes, salvage) before anything else | Death Stranding Likes | DAY-5.1 (already) | P0 |

## What we did not take
- AI-generated content (Never Ending Reddit style): Reddit warns against AI slop; our content is people.
- Real-time multiplayer (JetOni, Tower Race live): our demo sub is small; async is safer.
- Collaborative stories: on Reddit's overdone list.

## Round 3 (29 Nov): past Reddit winners and the realism pass
The Reddit × Phaser "Games with a Hook" hackathon (summer 2026) drew 700+ games. Its write-up of the winners gives these lessons, and what we did about each:

| Lesson from the winners | Who | What we did |
|---|---|---|
| Something new every day is what brings people back, and also what puts the game in front of new players | Cattack! (daily packs), Delta-V (track unlocks), Hearthvale (weather changes overnight) | Six seeded **biomes** on top of the weekday weather, so every island looks new from the feed (ADV-10) |
| Each place should look different | Hearthvale ("each village looks different") | Biome palettes, plants, sea and ambient touches (ADV-10.2) |
| Players share a map, and anyone nearby joins in | Myndrot (world boss on a shared map) | Live **ghosts** of other hunters, and worn paths (ADV-6), already shipped |
| Racing other players' recordings, with a loop that shows builders whether anyone beat their circuit | Delta-V | The **Dispatch** tells mapmakers who found their chest; the Hall of Charts (already shipped) |
| Rich, living art (about 470,000 animated grass blades) | Myndrot | Swaying flora, smoke, snow, leaves, mist, a reef, footfall puffs (ADV-10, ADV-11) |
| Design for a 30-second session on a phone, with no prior knowledge | All | Practice Cove coach, one hint at a time, the isle title card |
| Retention hooks work better shown than explained | Hearthvale | Crew goal bar, streaks and the Dispatch are shown, not described |

### Realism and smoothness red team (ADV-11)
| Finding | Why it matters | Fix |
|---|---|---|
| The explorer turned instantly to any new direction | Feels robotic, especially on a keyboard (W then D snaps 90°) | Turns along the shortest arc (ADV-11.1) |
| Full speed on the first frame, a dead stop on release | No sense of weight | About 0.12 s of easing in and out (ADV-11.1) |
| Camera smoothing was a fixed amount per frame | Stiffer on 120 Hz phones, laggier on slow ones | Smoothing by elapsed time (ADV-11.2) |
| Feet made no mark on the world | Running over sand or wading looked weightless | Sand and dust puffs and splash rings from a pooled set (ADV-11.3) |
| The dig puff built new meshes every frame | Garbage collection hitches on low-end phones | Left as is: it lasts 300 ms per dig. Noted for later |

