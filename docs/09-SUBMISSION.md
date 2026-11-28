# 09 — Submission

**Deadline: Wed 9 Dec 07:30 IST.** Our target: submitted by **9 Dec 05:30 IST** (2 h buffer). Devpost lets you edit until the deadline.

## 1. Checklist (all required unless marked)
- [ ] App uploaded with the final version (`npm run deploy`)
- [ ] App listing link: `https://developers.reddit.com/apps/<app-name>`
- [ ] Demo post link: today's island post in the test subreddit
- [ ] Subreddit is **public** and has **fewer than 200 members** (check the count on 8 Dec)
- [ ] Demo post opens and plays **logged out** in a private window, on phone and desktop
- [ ] `README.md` in the app root (§3)
- [ ] Text description on Devpost (§2)
- [ ] (optional) Public GitHub repo link
- [ ] (optional) Video under 60 s on YouTube, public (§5)
- [ ] (optional) Developer satisfaction survey (for the $200 Feedback award)
- [ ] (optional) Nominate a helpful person for the Devvit Helper award if someone helped on Discord/r/Devvit
- [ ] Note in the submission: built during the hackathon (new project)
- [ ] Do **not** publish the app; keep it installed only in the test sub

## 2. Devpost text (draft; Harsh edits the voice)

**Tagline (≤ 200 chars):** Bury a chest, draw a map from memory, and trust a stranger's map to find theirs. A new island every day, and tomorrow you learn how many sailors your map led to gold.

**Inspiration**
Treasure maps are the oldest user-generated content: one person draws, another trusts. Most daily games are you against a puzzle. We wanted a daily game where you play *for* strangers: your map is somebody else's puzzle tomorrow. Reddit is the only place with enough strangers, every day, to make that work. (Small map-drawing jam games like Captain Peggles showed the loop is fun; we rebuilt it around a shared daily island and a whole community.)

**What it does**
- Every day there's a new 3D island, the same for everyone, under low cloud that lifts where you walk. The map you follow, and the one you draw, are flat ink on paper: the gap between the real island and a remembered map is the game.
- You pick one of three maps drawn by other players (or the Old Captain's), walk the fogged island and dig with three shovels.
- Then you bury your own chest, but only where you've been, and draw a map to it from memory with a small ink kit: landmark stamps, a dotted path and one X.
- An instant Ink check grades your map. Tomorrow's Dispatch tells you how many sailors found your chest.
- Chests far from landmarks pay more, to you and to whoever finds them, so the best players hide boldly and chart carefully.
- Good maps rise (players rate them True or Cursed) and their makers earn Cartographer tiers. You can share your chart as a comment and challenge friends with a link.
- Each weekday has a twist (Twins, Low tide, Thick jungle, Sea fog, Lantern night). A daily **crew goal** turns tomorrow into Lantern night when the community finds enough chests, and the top reply under the day's sticky **names tomorrow's island**.
- A 45-second Practice Cove teaches the hunt on a perfect map; the Hall of Charts keeps the best maps of past days.
- The post itself says what the game is ("Follow a stranger's map to buried gold. Then bury yours.") over today's coastline. On a wide screen the map sits beside the island, so you read and walk at the same time. The result card ends with one optional invitation to join the crew.

**How we built it**
Devvit Web: React client, a three.js 3D island (lazy-loaded only in the game, with a Canvas 2D fallback for phones without WebGL), SVG chart editor; Hono server; Redis for everything; the scheduler posts a new island at 00:00 UTC with a sticky comment for chart shares. The island is generated from a daily seed by shared TypeScript that runs on both client and server, so the server re-checks every step and dig: the chest's location never reaches your device until the hunt ends. Charts are structured data, not freehand images, which keeps them safe to show to strangers and lets the game grade them. Even the share image is drawn on the server (a small PNG encoder in plain TypeScript), so nobody can post an arbitrary picture through the app. We red-teamed our own server with break tests (parallel requests, crafted steps, scraping) and fixed five bugs before launch; an automated QA run and an accessibility scan (0 violations, fully keyboard-playable) gate every upload.

**Challenges**
Making a two-part loop easy: we made you *use* a stranger's map before you draw one, so you learn by doing. Making it fair: bury-where-you've-been, depth multipliers and the Ink check. Making it work with few players: Old Captain charts and a "fresh chart" slot that gives every new map exposure.

**Accomplishments**
(fill from real numbers: players, charts, finds, find rate, best chart)

**What we learned**
(fill)

**What's next**
Storm days that move a landmark at noon (so morning maps go wrong), seasonal islands, and letting subreddits run their own archipelago.

**Built with:** devvit, devvit-web, react, typescript, three.js, webgl, hono, redis, canvas, svg, vite, tailwindcss

## 3. App README.md (in the repo root — required)

```markdown
# Isle of Maybe — a daily treasure-map game

**Bury it. Chart it. Trust a stranger's map.**

Every day there's a new island. Follow a map another player drew from memory to find their buried chest. Then bury your own and draw a map for the next sailor. Tomorrow, see how many sailors your map led to gold.

## How to play
1. Tap **Set sail** on today's post.
2. Pick a chart: Trusted, Fresh, or the Old Captain's.
3. Tap the island to walk. Open the chart any time. You have **3 shovels**: dig where the X says.
4. Rate the chart: True map or Cursed map.
5. Bury your chest on a spot you've seen. Far from landmarks = Deep = more gold for you and the finder.
6. Draw your chart from memory: up to 6 landmark stamps, a dotted path of up to 8 steps, and one X.
7. Get your Ink check now. Come back tomorrow for your Dispatch.

You can hunt up to 3 charts a day and bury 1 chest.

## For moderators
- Install the app in your subreddit. A new island post appears every day at 00:00 UTC, with a sticky comment for chart shares.
- Mod menu: **Post today's island** (if a post is missing), **Review reported charts** (restore or delete), **Re-run daily job**.
- Players can report charts. Charts with 3 reports are hidden until you review them.
- All player content expires after 30 days.

## Safety and privacy
Charts are made only from a fixed set of symbols (no text, no freehand). Each chart shows its author. Sharing a chart as a comment is optional and always asks first.

## Credits
Fonts: IM Fell English SC and Atkinson Hyperlegible (SIL Open Font License). Inspired by small map-drawing games such as *Captain Peggles: That Man's Chest*. All art and code made for this hackathon.
```

## 4. Demo post set-up (8 Dec)
1. Make sure today's island post exists and has activity (charts, finds) from testers: at least 5 player charts every day from 7 to 16 Dec, so Pick shows Trusted and Fresh charts, not only the Old Captain (`docs/17-JUDGE-REDTEAM.md` J6). Link judges to **today's** post.
2. Set up r/IsleOfMaybe from `docs/18-SUBREDDIT-KIT.md` §3: description, banner and icon, rules, flair, welcome message and the pinned "How to play" post.
3. Upload the Devpost images in the order in `docs/18-SUBREDDIT-KIT.md` §4.
4. Check member count < 200.

## 5. Optional video (≤ 60 s, phone screen recording)
| Time | Shot | Voice-over / caption |
|---|---|---|
| 0–5 s | Feed scroll → stop on the Isle of Maybe post (pitch line and coastline visible) → Set sail | "Every day, a new island." |
| 5–15 s | Pick a stranger's chart → walk in fog | "Follow a map a stranger drew from memory." |
| 15–22 s | Dig → chest opens, gold | "Three shovels. Find their chest." |
| 22–28 s | A miss reveal with the ink line | "…or find out how wrong their map was." |
| 28–40 s | Bury on a far tile (Deep ×3) → fade → place stamps, path, X | "Then bury yours and draw the way, from memory." |
| 40–47 s | Ink check "Steady" | "Get graded now…" |
| 47–55 s | Next-day Dispatch: 14 tried, 9 found | "…and tomorrow, see how many sailors your map saved." |
| 55–60 s | Title card | "Isle of Maybe. Bury it. Chart it. Trust a stranger's map." |

Record on a phone (the intended device). Lowest resolution for drafts, full quality for the final.

Rules for the video: under one minute (judges may stop at 60 s), showing the game running on the device it was built for (the Reddit app on a phone), public on YouTube or Vimeo. Record in r/IsleOfMaybe on 7–8 Dec with tester charts on the island, so Pick shows real players' maps. Skip the miss shot if time is tight; the find and the Dispatch matter more.
