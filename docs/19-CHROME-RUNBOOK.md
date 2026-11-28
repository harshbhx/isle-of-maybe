# 19 — Chrome runbook (Reddit, developers.reddit.com, Devpost)

For a Claude session that has **Claude in Chrome** on Harsh's laptop, signed in to his Reddit and Devpost accounts. It covers every browser step the laptop agent can't do from a terminal. Files to upload are in the laptop clone: `~/code/isle-of-maybe/docs/assets/`. Run `git pull` there first.

## Ground rules

- **Ask Harsh before every action that publishes or acts as him:**
  - creating a subreddit
  - posting, commenting, pinning or sending a message
  - registering, or pressing Submit on Devpost

  Everything else (filling forms, uploading images, changing community settings he has approved below) can go ahead, and you report each step.
- Stop at captchas, two-factor prompts and payment pages. Harsh does those.
- Never change account settings, email, password or billing.
- Never submit the app for publishing on developers.reddit.com. The organisers ask that it stays unpublished until the hackathon ends.
- Text comes from the repo, word for word: `docs/18-SUBREDDIT-KIT.md` (subreddit) and `docs/09-SUBMISSION.md` (Devpost). Don't improvise copy.

## A. Devpost registration (#1, now)
1. Open https://redditgameofday2026.devpost.com and choose **Join hackathon**. **Ask Harsh** before confirming.
2. Report the registered account email. Harsh's Devpost may still show bhanushaliharsh434@gmail.com, which is the same Google account as harshbhx@gmail.com.

## B. Subreddits (#2)
1. **Ask Harsh**, then create **r/IsleOfMaybe_dev**: private, not 18+.
2. **Ask Harsh**, then create **r/IsleOfMaybe**: public, not 18+.
3. In r/IsleOfMaybe, apply `docs/18-SUBREDDIT-KIT.md` §3:
   - description
   - topics
   - recommendations off (if offered)
   - banner (desktop `subreddit-banner-1920x384.png`, mobile `subreddit-banner-mobile-1600x480.png`) and icon `icon-256.png`
   - base colour #0A6468 and highlight #FFB21E
   - post flair (Daily island, How to play, Feedback, Bug)
   - user flair on
   - the five rules
   - the welcome message
4. **Ask Harsh**, then post the pinned "How to play" text post from §3 with flair How to play, and pin it.
5. Give r/IsleOfMaybe_dev the same banner and icon, so playtests look like the real thing.

## C. App page on developers.reddit.com (#56, after the laptop agent's first upload)
1. Open the app's page (`developers.reddit.com/apps/<app-name>`) and copy the URL into `docs/09-SUBMISSION.md` §1. That goes through the laptop agent as an issue → PR, or you hand the URL to Harsh.
2. In the app's settings or catalog, upload:
   - `icon-1024.png` as the icon
   - `featuring-1920x1080.png` as the featuring image
   - `tile-1080x1080.png` as the tile
3. Fill the listing text from `docs/assets/README.md`: name, tile tagline, featuring description, category Puzzle. If a size differs from what the page asks for, stop and report it. The art can be re-rendered at any size.

## D. Devpost submission (#61, 8 Dec; draft earlier)
1. Start the project draft. Fill these from `docs/09-SUBMISSION.md` §2:
   - title "Isle of Maybe"
   - the tagline
   - Inspiration, What it does, How we built it, Challenges, Accomplishments (with real numbers from the Stats menu), What we learned, What's next
   - built with
2. Upload the images in the order in `docs/18-SUBREDDIT-KIT.md` §4. Start with the cover, then the two GIFs, then the slides, and add each caption.
3. Links:
   - the app listing URL (C1)
   - r/IsleOfMaybe
   - **today's** daily post in r/IsleOfMaybe
   - the repo https://github.com/harshbhx/isle-of-maybe
   - the video (YouTube, under 60 s), if recorded
4. Save as a draft. **Ask Harsh**, then press Submit, before Wed 9 Dec 07:30 IST (target: Tue 8 Dec 22:00).
5. Optional: open the developer satisfaction survey from the hackathon page and let Harsh answer it (#63, $200 Feedback Award).

## E. Daily checks during judging (#64, 9–17 Dec)
Every morning after 05:30 IST:
- Open r/IsleOfMaybe and check that today's island was posted and the splash loads.
- Play one hunt from the post on desktop.
- Check members are under 200.
- Check the mod menu's **Review reported charts** queue.
- Count the player maps on today's island. If there are fewer than 5 by noon IST, tell Harsh so testers can bury some (J6).

Report a one-line summary each day.
