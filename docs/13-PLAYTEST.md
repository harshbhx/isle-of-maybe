# 13 — Playtest and seeding plan

Why this matters most: judges play the demo post once. If the island has real charts, real ratings, a real leaderboard and a real Hall of Charts, Isle of Maybe looks alive. If it's empty, the best mechanic in the hackathon looks like a single-player toy (red team A1, A2).

**All activity must be genuine play by real people.** No fake accounts, no scripted charts. Old Captain charts are the only game-made content, and they're labelled.

## 1. Two subreddits
| Sub | Visibility | Purpose |
|---|---|---|
| `r/<name>_dev` | private | `npm run dev` (playtest mode) during development. Breaks freely. |
| `r/<name>` (demo) | **public, < 200 members** | Installed uploaded versions only. Testers and judges play here. Never run playtest mode against it after 5 Dec. |

## 2. Timeline (IST)
| Date | What |
|---|---|
| by 3 Dec | Recruit 20–40 testers (target 15+ daily). Make a WhatsApp group "Isle of Maybe crew". |
| Sat 5 Dec 05:30 | First real island posted in the demo sub (Day 1). Send the invite message. |
| 5–8 Dec | Testers play daily. Collect bugs in the group; agents fix; upload new versions in the evening (not during peak play). |
| 8 Dec | Freeze. Check member count < 200. |
| 9–17 Dec (judging) | Keep testers playing daily. Daily reminder. This is what judges see. |

## 3. Who to ask
Classmates (Sem 3), friends from diploma days, the AWS Student Builder Group at Parul, hackathon friends, family members with a Reddit account. Each needs a Reddit account (free). Cap the subreddit at about 150 members to stay safely under 200.

## 4. Invite message (WhatsApp)
> Hey! I made a daily treasure-map game that runs inside Reddit for a hackathon. Every day there's a new island: you follow a map someone else drew to find their chest, then bury yours and draw a map for the next person. Takes 3–4 minutes a day.
> 1. Join: https://reddit.com/r/<name>
> 2. Open today's "Isle of Maybe · Day N" post and tap **Set sail**.
> 3. Come back tomorrow to see how many people found your chest 😄
> Please play every day till 17 Dec if you can. Bugs and ideas → this group. Thank you!

## 5. Daily reminder (send around 20:00 IST, when students are free)
> 🏝️ Day {N} is live: {island}. {found} chests found so far today. Your map from yesterday has a Dispatch waiting! → <post link>

## 6. Tester asks (pinned in the group)
- Play once a day; rate every chart you follow (True/Cursed).
- Try a Deep chest at least once.
- Share your chart as a comment if you're proud of it (optional).
- Tell us: what confused you in the first minute? What made you laugh?

## 7. What we measure (for the Devpost "Accomplishments")
Daily players, charts per day, hunts per chart, find rate (target 40–60%), day-2 return rate, funniest misses (screenshots for the video).

## 8. Feedback triage
Each evening: list bugs → GitHub issues → agents fix → Harsh tests in the dev sub → `devvit upload` → install update in the demo sub after 23:00 IST (low traffic). Never upload a version that fails `08-TESTING §2` (scroll traps) or §4 (break tests 1–7).
