# 08 — Testing

## 1. Unit tests (`node --test`, `src/shared/*`)
| Area | Cases |
|---|---|
| rng/day | Same seed → same sequence; UTC day boundaries (23:59:59 vs 00:00:00 UTC); week numbers |
| island | 200 random seeds valid; every land tile reachable from dock; landmark spacing; twins distance 6–10; deep share ≥ 30%; re-roll terminates; overrides respected |
| path | A* shortest on known maps; never diagonal; blocked/water avoided; unreachable → null |
| depth | boundaries 2/3 and 4/5 |
| scoring | finderGold for every depth × shovels × routeBonus; salvage; trust score with 0, 1, 10 attempts; tiers at 4/5, 24/25, 74/75, 199/200 |
| chart | validate: 6 stamps ok, 7 rejected; 8 segments ok, 9 rejected; 0 and 2 X rejected; out-of-bounds; unknown glyph; inkCheck grades at thresholds |
| captain | X within 2 of chest; budgets respected; deterministic |

## 2. Scroll-trap checks (inline splash) — must all pass
- [ ] Feed scrolls with mouse wheel, trackpad and touch while the pointer/finger is over the splash
- [ ] No `touch-action: none` / `overscroll-behavior: none` on html, body, root or canvas in the splash bundle (grep the built CSS)
- [ ] No `preventDefault` on wheel/touchmove in splash code (grep)
- [ ] No internal scrolling in the splash at 320 px width

## 3. QA matrix
Devices: Android Chrome (Reddit app), iOS Safari (Reddit app), desktop Chrome, desktop Firefox, desktop Safari. Widths: 320, 360, 390, 430, 768, 1440.

| # | Scenario | Expected |
|---|---|---|
| Q1 | First-ever visit, logged in | Splash → sample Dispatch → Pick (hint) → Hunt (hint) → … → Result |
| Q2 | Logged out | Can hunt captain chart; bury asks to log in; no crash |
| Q3 | No player charts today | 3 captain charts; banner |
| Q4 | Find a chest on the 1st dig | Gold = depth × 80 (+ route bonus) |
| Q5 | Miss all 3 | Reveal line + distance; 0 gold; streak counts |
| Q6 | Give up | Same reveal |
| Q7 | Try to bury on unseen tile (craft request) | 400 |
| Q8 | Second bury same day | 400; UI never offers it |
| Q9 | 4th hunt same day | UI says done; API 400 |
| Q10 | Chart with no X | Submit disabled; API 400 |
| Q11 | Rate twice | Second ignored |
| Q12 | 3 reports | Chart hidden from pick; in mod review |
| Q13 | Open yesterday's post | Plays yesterday; can't bury; banner to today |
| Q14 | Rotate phone mid-hunt | No state lost |
| Q15 | Kill network mid-walk | "Lost at sea", retry continues from server position |
| Q16 | Keyboard only (desktop) | Whole loop playable |
| Q17 | Reduced motion | No movement animations |
| Q18 | Share chart | Confirm sheet first; comment under sticky |
| Q19 | Deep-link challenge from share sheet | Challenged chart offered first |
| Q20 | Daily job runs twice | One post |
| Q21 | Day rollover during a hunt | Hunt completes on its day |
| Q22 | Console | Zero errors and warnings in all browsers |

## 4. Break tests (what judges and players will try)
1. Inspect network responses for the chest → never present before `done`.
2. POST a step two tiles away → rejected.
3. Walk into water via crafted steps → rejected.
4. Dig without shovels → rejected.
5. Bury on a landmark or water → rejected.
6. Submit 50 stamps via API → rejected.
7. Hunt own chart via crafted chartId → rejected.
8. ~~Huge payload (5 MB PNG) to share~~ → not possible since #91: the server draws the share image.
9. Spam API 100 req/s → rate limited, no crash.
10. Tamper share deep-link data with garbage → ignored safely.
11. Open in two tabs and hunt in both → server state consistent; hunt count shared.
12. Double-tap Bury → one chest.

Automated run: `npm run build && npm run qa` (see `docs/16-QA-REPORT.md`).

## 5. Judge simulation (do it on 7 Dec and 8 Dec)
A person who has never seen the game opens the demo post link in a private window on a phone and on desktop. Time them. Pass if:
- [ ] They start playing within 10 s without asking anything
- [ ] They finish hunt + bury + chart within 5 minutes
- [ ] They can explain "what happens tomorrow" afterwards
- [ ] They smiled or laughed at least once (the reveal)
- [ ] Leaderboard and Hall of Charts show real data from other players

## 6. Performance
- Splash first paint ≤ 1.5 s on a mid Android over 4G (Chrome DevTools throttling).
- Client bundle ≤ 250 KB gzip (check `dist/`).
- Walking at 60 fps (Performance panel, mid phone).
- `/api/init` ≤ 300 ms p50 in playtest logs.
