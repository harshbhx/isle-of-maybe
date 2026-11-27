# 11 — Verified facts and gotchas

Checked 28 Nov 2026 against the Devpost page/rules and Reddit's own docs repo (github.com/reddit/devvit-docs, last commit 25 Nov 2026) and templates (github.com/reddit/devvit-template-react, 17 Nov 2026). Page paths below are inside `devvit-docs/docs/`. If something here disagrees with the live docs at https://developers.reddit.com/docs, the live docs win.

## A. Hackathon rules (https://redditgameofday2026.devpost.com/rules)
1. Deadline **8 Dec 2026 18:00 PT = 9 Dec 07:30 IST**. Judging 9 Dec 00:00 PT → 16 Dec 18:00 PT. Winners on or around 17 Dec 15:00 PT.
2. Required: text description; **README.md in the app root** describing the game and how to play; app listing link (developers.reddit.com/apps/{app-name}); **demo post link** in a test subreddit.
3. Demo subreddit must be **public with fewer than 200 members** (or install `devvit-dev-bot` so admins can join). Game must be free and unrestricted for judges until judging ends. Judges aren't required to test.
4. **Video optional.** If included: under 1 minute, shows the game on the intended device, public on YouTube/Vimeo/Facebook Video/Youku.
5. Public repo optional. Developer survey optional (enters "Most Valuable Feedback", $200 × 5).
6. Projects from before 11 Nov must be significantly updated and explained. Past Reddit hackathon winners are ineligible.
7. Stage 1 pass/fail (fits theme, uses required SDK). Stage 2: **Delightful UX, Polish, Reddit-y, Daily Content, equally weighted**.
8. Must install and run consistently; English.
9. Apps don't need to be published; Reddit prefers you wait until after the hackathon. Keep it private while playtesting.
10. Overview page warns: games not running on Reddit can't place; "AI slop" is unwelcome (fit the viewport, unique identity); overdone: space shooters, clones, simple platformers, collaborative storytelling, trivia.

## B. Devvit Web basics (`capabilities/devvit-web/devvit_web_overview.mdx`)
11. Client in `src/client`, server in `src/server`, config `devvit.json`. Server endpoints must start with `/api/`. Internal (scheduler/menu/triggers/forms) endpoints use `/internal/...`.
12. Serverless: no long-running connections, no websockets, no streaming, no `fs`, no native packages.
13. Max request time **30 s**; payload **4 MB**; response **10 MB**.
14. **The client can't call external domains** (CSP); bundle fonts and assets. The server can `fetch` only reviewed domains (we don't need it).
15. **`localStorage` is wiped on each app update** (URL changes per version). Use Redis for anything that matters.
16. `devvit.yaml` is gone as of 0.15.0; use `devvit.json`.
17. Template (React, Nov 2026): @devvit/web 0.15.4, Hono 4, React 19, Vite 8, Tailwind 4, Node ≥ 24. Scripts: `npm run dev` = `devvit playtest`, `npm run deploy` = type-check + lint + `devvit upload`.

## C. View modes and launch (`capabilities/server/launch_screen_and_entry_points/`)
18. Inline mode = inside the post in the feed; expanded = larger modal (web) / full screen (mobile), opened only by user action with `requestExpandedMode(event, entry, { title })`.
19. `_direct_launch` reserved entrypoint opens the game expanded from Daily Games, Featured, Play Again and Category surfaces (iOS/Android; web "coming soon"). Needs CLI ≥ 0.14.6, 0.15.3+ recommended.
20. **Scroll traps get inline apps rejected** (`guides/best-practices/scroll-traps.mdx`): no `preventDefault` on wheel/touchmove across the surface; no `touch-action: none`/`overscroll-behavior: none` on html/body/root/full-surface canvas in inline mode; no internal scrolling. Put canvases, drawing and maps in expanded mode.

## D. Redis (`capabilities/server/redis.mdx`)
21. Supports strings, hashes, sorted sets, numbers, bitfields, transactions. **No plain sets or lists** (use zsets).
22. **Can't list all keys**; keep index structures.
23. Storage: **100 MB for unpublished apps**, 5 GB published. Writes can fail on quota; handle it.
24. 40,000 commands/s per installation; **no pipelining**; 5 MB request size; transactions: 20 concurrent blocks (another line says 30), 5 s timeout; always `unwatch`/`discard` on early exit.
25. `expire` for TTLs.

## E. Scheduler (`capabilities/server/scheduler.mdx`)
26. Recurring tasks in `devvit.json` under `scheduler.tasks.<name>` with `endpoint` (`/internal/...`) and `cron` (UNIX, UTC). Rescheduled on install/upgrade.
27. `runJob()` limits: 60 creations/min, 60 deliveries/min per installation.

## F. Posts, comments, media, users
28. `reddit.submitCustomPost({ subredditName, title, entry, postData })`; postData max **2 KB**, sent to the client (no secrets) (`server/post-data.mdx`).
29. `media.upload({ url: dataUrlOrRemote, type: 'image' | 'gif' })` → `{ mediaId, mediaUrl }`; PNG/JPEG/WEBP/GIF; 20 MB max; 30 s timeout; needs `"permissions": { "media": true }`. **No delete API.** Canvas `toDataURL` → upload is the documented screenshot pattern (`server/media-uploads.mdx`).
30. User actions (`server/userActions.mdx`): `asUser: ["SUBMIT_POST","SUBMIT_COMMENT","SUBSCRIBE_TO_SUBREDDIT"]`, then `runAs: 'USER'`. **Until the app version is approved, `runAs: 'USER'` posts from the app account** (except actions by the app owner). Apps can't vote or follow.
31. User-action rules (`devvit_rules.md`): only on explicit button + confirmation; make clear it posts as the user; never required for progress; never merged with gameplay actions; **score shares must be comments as the user, replying to a sticky comment**.
32. `reddit.setUserFlair(options)` and `setUserFlairBatch(subredditName, flairs)` (≤ 100 per call) exist (`api/redditapi/RedditClient/classes/RedditClient.md`).
33. Sharing: `showShareSheet({ title, text, data })` with `data ≤ 1024 chars`; read with `getShareData()`; **treat share data as untrusted** (`guides/logged-out-users.mdx`).
34. Logged-out users: `context.userId` only exists when logged in. Prompt to log in at natural breakpoints, not mid-action.

## G. Realtime (`capabilities/realtime/overview.md`)
35. Client `connectRealtime({ channel, onMessage })`; server `realtime.send(channel, data)`. **No `:` in channel names.** Needs `"realtime": true` permission (seen in Pixelary's devvit.json).

## H. Content and data rules (`devvit_rules.md`)
36. Apps that let users create in-app content "should limit the available forms of expression to prevent potential abuse" (emojis, symbols, predefined dictionaries); avoid free-form text.
37. User text/imagery shown in the app needs reportable, actionable attribution.
38. Honour deletions: `onPostDelete`/`onCommentDelete` triggers; delete user data; recommended: delete stored user data within 30 days (use `expire`). There is no account-deletion trigger in the trigger list.
39. No Reddit IP (no Snoo, no "Reddit" in the name), no third-party IP without permission.
40. App README for review: plain-language overview (≤ 1000 words) + how to configure, deploy and use. A vague or template README gets rejected.

## I. Platform news worth knowing
41. 0.15.4 (16 Nov 2026) shipped Direct Launch; 0.15.6 (23 Nov) faster load times; new versions must be uploaded with CLI ≥ 0.13.9.
42. Reddit has a **Daily Games** discovery surface; `_direct_launch` is how games open from it.
43. Streak pattern from Syllo: one bit per UTC day in a yearly bitfield `streaks:<userId>:<year>` (`capabilities/notifications/adding-streaks.md`).
44. Reddit's own Pixelary posts each drawing as its own post (attributed to the user). Our chart kit is our answer to the same safety need.

## J. Past winners, for calibration
45. Daily Games Hackathon (Feb 2026) winners include BridgeDit (3D bridge puzzles + shared levels), Sneakle, SerpenTiles, Fully Packed, Quipit, Spectrum 6, Just Golf It (redditdailygames2026.devpost.com/project-gallery).
46. Games with a Hook (Jul 2026): 700+ entries; winners include Sketchy Solutions, Reddictionary, Cattack!, Gradient Descent, Hearthvale, Delta-V Racing (ghost racing on player tracks), Guess By (redditgameswithahook.devpost.com/project-gallery).
47. Pattern: a clean original mechanic + player-made content + a distinct look. Our pitch matches it.
