# Isle of Maybe: Privacy Policy

**Effective date:** 28 November 2026
**App:** Isle of Maybe, a daily treasure-map game that runs inside Reddit posts on Reddit's Developer Platform (Devvit).
**Developer:** Harsh Bhanushali (u/GrassJunior7078). This is an independent app. It is not made or endorsed by Reddit.
**Contact:** send modmail to r/IsleOfMaybe, or open an issue at https://github.com/harshbhx/isle-of-maybe/issues.

This policy covers what the app itself stores and shows. Reddit runs the platform the game lives on and processes data under its own terms. The app's own practices are described below.

## The short version
- The app knows your Reddit **username and user id** only while you play, because Reddit passes them to it. It never asks for a password, email, real name, location or any other personal information.
- It stores **game data** (your hunts, your chart, your gold and your streak) so the game works. Nearly all of it **expires automatically within 30 days**.
- Some things are **shown to other players**: your username on charts you draw, on leaderboards, as a ghost while you hunt (you can turn this off), and on share comments you choose to post.
- No analytics, ads, trackers or third parties. Nothing is sold, and nothing is used to train AI.
- You can **delete your own chart** at any time from the game.

## What the app stores, and why

| Data | Why | Who can see it | Kept for |
|---|---|---|---|
| Your Reddit username and user id | To attach your chart, gold, streak and hunts to you | Your username is shown on your charts, the boards and (if on) your ghost | With the records below |
| Your hunt: start time, tiles stepped on, shovels used, the result | So the server can check every step and dig fairly (nothing about the chest is sent to you until the hunt ends) | Only the server | 2 days |
| Tiles you have seen today | You can only bury where you've been | Only you (on the bury screen) | 2 days |
| Your chart (stamps, path, X, optional phrase from a fixed list) and where you buried your chest | It's the game: other players follow your chart | Other players see the chart and your username, never the chest's position until their hunt ends | 30 days, or until you delete it |
| Votes (True / Cursed) and reports on charts | Trust ranking and moderation | Totals are shown; who voted or reported is never shown | 30 days |
| Gold, finds, flair tier, which charts you hunted | Scores, boards and tiers | Gold and tier on the boards and your hat | 30 days after your last play |
| Streak (which days you played) | Daily streak | Only you | 30 days after your last play |
| Daily player list (user ids only) | Counting daily players and return rates for the moderators' stats | Moderators see counts, never names | 30 days |
| Worn paths: how many hunts crossed each tile today | The crowd's trails on the island | Everyone sees the trails, which are counts only and never who walked where. A tile shows wear only after 3 or more hunts | 40 days, with the day's counts |
| Ghost pings: your name, current tile and flair tier while you hunt | Other hunters see you live | Players on the same island at the same moment | **Not stored.** They're sent over Reddit's realtime channel and gone. Only a "last ping" timestamp is kept, for 1 minute, to rate-limit |
| Rate-limit counters | Abuse protection | Only the server | Seconds |
| The day's island (its seed, name, who named it) and totals | The daily post | Everyone | Up to 400 days, so old posts still open (it holds no personal data apart from the redditor who named the island, which is already public in a comment) |

All of this lives in the app's own Redis storage on Reddit's Developer Platform. Nothing is sent anywhere else: the app makes no requests to outside services, and the game client loads only its own files.

## What other players can see
- **Charts:** "Charted by u/name" and the chart itself. Never your chest's position before they've finished hunting.
- **Boards and the Hall of Charts:** usernames with gold, finds or trust.
- **Ghosts:** while you hunt in 3D, other hunters on the same island can see a ghost with your username and flair tier at your current tile. **Turn it off with "Ghosts: on" in the hunt's header.** Off works both ways: you see no ghosts and nobody sees yours. The game explains this on your first hunt.
- **Share comments:** only if you choose "Share my chart" and confirm. The app then posts a comment with your chart image and a spoiler-free line under the day's sticky comment. Until the app is approved by Reddit, these comments appear from the app's account. It's always optional.

## Your choices and controls
- **Delete your chart:** "Delete my chart" on the result card or in your Dispatch. It's removed with its stats, votes and reports. Your chest stays buried for that day, but nobody can follow your chart to it.
- **Ghosts:** on or off, any time, remembered on your device.
- **Sharing and joining the subreddit:** always optional. The game never posts, comments or subscribes on its own.
- **Everything else** expires on its own within 30 days of your last play.
- **Deleted posts and comments:** when a day's post is deleted, that day's charts and records are deleted. When a share comment is deleted, the app forgets it.
- **Your Reddit account:** if you delete your Reddit account, all of your records here expire within 30 days. To have them removed sooner, send modmail to r/IsleOfMaybe or open a GitHub issue, and they'll be deleted within 7 days.

## On your device
The game keeps a few small settings in your browser's local storage on Reddit: hint and tutorial progress, the sound setting, and your ghost setting. They never leave your device.

## Children
The game is not directed at children under 13, and it does not knowingly collect information from them. Reddit requires its users to be at least 13 years old.

## Security
Data is stored only on Reddit's Developer Platform. The server decides every outcome, and the client is never trusted with hidden information. If a security problem ever affected your data, we would tell Reddit and post a notice in r/IsleOfMaybe.

## Changes
If this policy changes, the new version will be posted at this same address with a new effective date, and the change will be noted in r/IsleOfMaybe.

## Contact
Modmail to r/IsleOfMaybe, or https://github.com/harshbhx/isle-of-maybe/issues.
