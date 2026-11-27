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
