# 18 — Pages and presentation kit

What the submission needs, what it doesn't, and copy-paste text for every surface a judge or tester can see. Checked against the hackathon rules on 28 Nov 2026.

## 1. Do we need a marketing site or a docs site?

**No.** Neither is required, and neither would be judged.

- **Required:**
  - the app listing link (`developers.reddit.com/apps/{app-name}`, created when we upload)
  - a README in the repo root that explains the game and how to play
  - a text description on Devpost
  - a link to the test subreddit and to a post running the game
  - a public subreddit with fewer than 200 members
  - English
- **Optional:**
  - a video under one minute, showing the game running on the device it was built for, public on YouTube/Vimeo
  - a public repo
  - the feedback survey
- **How we're judged:** from the demo post, with the experience made "as self explanatory as possible". The rules also say judges *may* judge only from the text description, images and video. So the Devpost text, the gallery images and the video matter as much as the post.
- **Don't publish the app.** Organisers ask that apps stay unpublished (uploaded, private) until after the hackathon. So the app won't be approved during judging, and anything we do "as the user" (`runAs: 'USER'`) runs as the app account. That's why share comments show as the app until approval and why Join the crew opens the subreddit instead of calling a subscribe API (docs/17 J5).

An outside website would also pull judges away from the one thing that's scored, the post. Every surface below lives on Reddit or Devpost.

## 2. Surfaces and what's ready

| Surface | Who sees it | Ready | Harsh does |
|---|---|---|---|
| Daily post (splash + game) | Judges, players | ✅ shipped | Link judges to **today's** post |
| Devpost text | Judges | ✅ draft in `docs/09-SUBMISSION.md` §2 | Fill real numbers (Stats menu) on 8 Dec |
| Devpost images | Judges | ✅ `docs/assets/devpost-gallery-1500x1000.png` (cover) + `gallery-1…5-*.png` | Upload in this order: cover, 1, 2, 3, 4, 5 |
| Video (optional, < 60 s, phone) | Judges | ✅ shot list in `docs/09-SUBMISSION.md` §5 | Record on the phone in r/IsleOfMaybe on 7–8 Dec |
| App listing page | Judges, mods | ✅ icon, featuring, tile and listing text in `docs/assets/` | Upload in the app's settings (#56) |
| Subreddit r/IsleOfMaybe | Judges, players | ✅ this doc §3 + banners | Paste the text, upload banner and icon |
| GitHub README | Judges who click through | ✅ final | Nothing |

Regenerate any image:
- **Gallery:** `npm run build && python3 tools/assets/gallery.py`. It plays the real game in the local preview on 9 Dec and lays out the slides.
- **Icon, banners and catalog art:** `node --experimental-strip-types tools/assets/make-art.ts && python3 tools/assets/render.py`.

## 3. r/IsleOfMaybe set-up (copy-paste)

**Settings → General**
- **Community name:** IsleOfMaybe
- **Display name:** Isle of Maybe
- **Description** (shown under the name, ≤ 500 characters):
  > A new treasure island every day. Follow a map another redditor drew from memory, dig with three shovels, then bury your own chest and chart it for the next sailor. Tomorrow you learn how many found it. Free, no sign-up beyond Reddit.
- **Type:** Public. **Mature (18+):** off.
- **Topics:** Gaming → Puzzle games (closest available).
- **Discovery:** if the settings offer it, turn off recommending the community to new people. Members must stay under 200 until judging ends (17 Dec), and testers join by invite.

**Appearance**
- **Banner (desktop):** `docs/assets/subreddit-banner-1920x384.png`. The left quarter stays plain because Reddit puts the icon and name there.
- **Banner (mobile):** `docs/assets/subreddit-banner-mobile-1600x480.png`
- **Icon:** `docs/assets/icon-256.png`
- **Base colour:** #0A6468 (lagoon). **Highlight:** #FFB21E (mango).

**Post flair** (moderators only, except Feedback and Bug)
| Flair | Use |
|---|---|
| Daily island | The app's daily post |
| How to play | The pinned guide below |
| Feedback | Testers' notes |
| Bug | Problems (moderators move them to GitHub issues) |

**User flair:** leave user flair on. The daily job sets tier flair for players who climb: Deckhand, Mapmaker, Navigator, Cartographer, Legend of the Isles. Members don't need to choose anything.

**Rules** (Mod tools → Rules)
1. **Be kind.** Tease the map, never the player.
2. **No spoilers.** Don't post where a chest is, or screenshots of an open island, in titles or comments. Maps and the share images are fine.
3. **One account per sailor.** Alts that farm finds or ratings get removed.
4. **Keep it about the island.** Game talk, maps, feedback and bugs.
5. **Report broken or mean maps** with the in-game Report button. Three reports hide a map until a moderator looks.

**Welcome message** (Mod tools → Welcome message, sent to new members)
> Welcome aboard! Every day at 05:30 IST (00:00 UTC) a new island appears as a post here. Tap **Set sail**, follow a stranger's map, then bury your own chest and draw the way from memory. Tomorrow the Dispatch tells you how many sailors found it. Three hunts a day, one chest a day. Be kind, no spoilers. Fair winds!

**Pinned text post** (flair: How to play; pin it beside the daily post)
- **Title:** How to play Isle of Maybe (60 seconds)
- **Body:**
  > **Every day, one new island.** It's the same island for everyone, and it's covered in fog.
  >
  > 1. **Pick a map.** Other sailors drew them from memory (the Old Captain fills in on quiet days).
  > 2. **Walk and dig.** Tap the island to walk; you have three shovels. On a computer, arrows walk, Space digs, M shows the map.
  > 3. **Bury your own chest,** only where you've been. Deeper (far from landmarks) pays more, to you and to whoever finds it.
  > 4. **Chart it from memory:** landmark stamps, a dotted path, one X. The Ink check grades it on the spot.
  > 5. **Come back tomorrow.** The Dispatch shows how many sailors found your chest. Rate maps True or Cursed; good mapmakers earn flair.
  >
  > **Crew goal:** if we find enough chests today, tomorrow is Lantern night. **Name tomorrow's island:** reply under the daily post's pinned comment with one name (3–24 letters); the top-voted reply wins.
  >
  > Sharing your chart or joining is always optional. Player maps disappear after 30 days.

## 4. Devpost image order and alt text

| Order | File | Caption / alt text |
|---|---|---|
| Cover | `devpost-gallery-1500x1000.png` | Isle of Maybe: a sea chart of the first week's islands, with the question-mark logo. |
| 1 | `gallery-0-find.gif` (animated) | The find: the chest bursts open on a fountain of gold, engraved Buried by u/name; another hunter's ghost nearby. |
| 2 | `gallery-0-hunt.gif` (animated) | Walking and running a new 3D island with a stranger's map before the tide comes in. |
| 3 | `gallery-0-chart.gif` (animated) | Charting from memory on paper, then the Ink check lays the map over the real island. |
| 4 | `gallery-1-loop.png` | Pick a stranger's map, walk the island, dig. |
| 5 | `gallery-2-chart.png` | Bury your chest, chart it from memory, Ink check, result card. |
| 6 | `gallery-3-tomorrow.png` | Tomorrow's Dispatch shows who found your chest; share your chart as a comment. |
| 7 | `gallery-4-desktop.png` | On desktop the paper map sits beside the 3D island; fully playable by keyboard. |
| 8 | `gallery-5-fair.png` | The server decides every dig; maps use a fixed stamp kit; player content expires in 30 days. |

Every image comes from the shipped client in the local preview set to 9 Dec (Day 5), rebuilt by `python3 tools/assets/gallery.py` (slides and GIFs). Devpost takes PNG and GIF up to 5 MB; ours are 0.1–0.5 MB. Once the game runs on Reddit, a real screenshot of the daily post can replace slide 7's splash.
