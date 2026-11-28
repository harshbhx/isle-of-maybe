# 16 — QA report

Automated run of the QA matrix and break tests (`docs/08-TESTING.md`) against the local preview, 28 Nov 2026, `main` after #152 plus the 3D island (T86). Re-run before every upload to the demo sub (SHIP-4.1):

```bash
npm run build && npm run qa        # writes nothing; add a path to save the table
```

## Automated in the browser and over HTTP (`tools/preview/qa.py`)
| ID | Check | Result | Notes |
|---|---|---|---|
| S2.2 | No touch-action / overscroll lock in the splash bundle | PASS | none found |
| S2.3 | No preventDefault or canvas in the splash entry | PASS | no preventDefault/canvas in the splash entry |
| S2.4 | Splash has no internal scrolling | PASS | 320×300, 360×320, 390×320 fit |
| Q1 | First visit: practice → Dispatch → pick → hunt → bury → chart → result | PASS | practice, dispatch, pick hint, hunt, bury, chart, result: [True, True, True, True]; console 0 |
| Q5 | Miss all three shovels → reveal with distance | PASS | three digs end the hunt with a reveal line |
| Q10 | Chart with no X is refused | PASS | chart without an X → HTTP 400 |
| Q9 | Fourth hunt in a day is refused | PASS | UI shows the day is done; 4th start → HTTP [403, 403, 409, 403] |
| Q16/Q17 | Keyboard focus and reduced motion | PASS | Tab focuses BUTTON; no flying coins under reduced motion |
| Q14 | Rotate mid-game keeps state | PASS | rotating keeps the same screen and state |
| B9 | Spam the API → rate limited, no crash | PASS | 15 of 25 burst calls limited; recovers next second |
| B10 | Tampered share deep-link data is ignored | PASS | garbage challenge id → HTTP 200, ignored |
| B6 | 50 stamps via the API → rejected | PASS | 50 stamps → HTTP 400 |
| B12/Q8 | Second bury / double tap → one chest | PASS | bury again after Q1 → HTTP 400, 400 |
| Q2 | Logged out: hunt captain charts, bury asks to log in | PASS | captain charts only (6); bury asks to log in |
| J1 | Splash says what the game is at every post size | PASS | pitch visible at 390×320, 390×512, 740×320; how-it-works strip only when ≥ 440 px tall |
| J2 | Hunt shows one hint at a time | PASS | hints on screen before/after walking: 1/1 |
| J4 | Wide screens show the chart beside the island | PASS | 1280×800: chart panel beside the island, thumbnail hidden |
| J7 | 3D island renders and taps walk | PASS | three.js chunk loaded: True; a tap walked the sailor: True; console [] |
| J9 | Without WebGL the 2D island takes over | PASS | no WebGL: three.js not loaded True; walking works True; console [] |

**Needs a real device or Reddit (Harsh):**

- [ ] **S2.1** Feed scrolls over the splash with wheel, trackpad and touch (Reddit app, phone + desktop)
- [ ] **Q3** No player charts today (fresh subreddit): 3 captain charts + banner
- [ ] **Q4** Find a chest on the first dig: gold matches depth
- [ ] **Q12** Three reports hide a chart; it appears in Review reported charts
- [ ] **Q13** Open yesterday's post: banner to today; can't bury
- [ ] **Q15** Kill network mid-walk: 'Lost at sea' + retry continues
- [ ] **Q18** Share chart: confirm sheet, comment under the sticky (app account until approval)
- [ ] **Q19** Challenge link from the share sheet opens with that chart first
- [ ] **Q20/Q21** Daily job twice → one post; day rollover during a hunt
- [ ] **Q22** Console clean in Android/iOS Reddit apps, Firefox, Safari
- [ ] **§5** Judge simulation on 7 and 8 Dec (two people, phone + desktop)
- [ ] **J5** Result card: Join the crew opens the subreddit (Reddit only: needs the post's subreddit name)
- [ ] **J6** Every judging day: ≥ 5 tester charts on today's island; Pick shows Trusted and Fresh
- [ ] **J8** 3D island on real phones in the Reddit app: smooth walking (≥ 30 fps), clouds clear as you walk, taps land on the tile you meant; a phone without WebGL gets the 2D island

## Break tests 1–12 → where they're enforced
| # | Attack | Result | Test |
|---|---|---|---|
| 1 | Read the chest from responses before the hunt ends | Never present | `hunts.test.ts` HUNT-4.3; `charts.test.ts` HUNT-1.5 (exact public keys) |
| 2 | Step two tiles away | 400, nothing changes | `hunts.test.ts` HUNT-3.1 |
| 3 | Walk into water with crafted steps | 400 | `hunts.test.ts` HUNT-3.1 |
| 4 | Dig without shovels | 409 | `hunts.test.ts` HUNT-4.2 |
| 5 | Bury on a landmark, the dock or water | 400 | `bury.test.ts` CHART-1.4 |
| 6 | 50 stamps through the API | 400 | `bury.test.ts` CHART-3.1; QA B6 |
| 7 | Hunt your own chart via a crafted id | 403 | `hunts.test.ts` HUNT-1.2/2.3 |
| 8 | 5 MB image to share | Not possible: the server draws the share image itself (#91) | `share.test.ts` COM-2.2 |
| 9 | 100 requests a second | 429 on every route, recovers | `app.test.ts` HUNT-6.1; QA B9 |
| 10 | Garbage share deep-link data | Ignored (shape-checked, then eligibility-checked) | `charts.test.ts` HUNT-1.4; QA B10 |
| 11 | Two tabs, parallel requests | Cap and used charts hold under races | `break.test.ts` HUNT-2.2, HUNT-1.2 |
| 12 | Double-tap Bury | One chest | `bury.test.ts` CHART-1.4; QA B12 |

Extra attacks from the red-team pass (bury before finishing a hunt, scraping the Hall, loid-less viewers, rate-limit order) are in `src/server/break.test.ts` and `docs/01-RED-TEAM.md`.

## Also verified
- axe-core over all 12 screens: 0 violations (#112); re-run after the judge pass on the new splash (390×512) and the wide hunt (1280×800): 0 violations.
- Bundle ≈ 101 KB gzip; `tools/check-dist.mjs` fails the build if anything points outside `dist/client`.
- Every Redis key has a TTL, and nothing but day records, counts, post links and streak bits outlives 30 days (`cleanup.test.ts`).
