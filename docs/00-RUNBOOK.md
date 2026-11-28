# 00 — Runbook (now → judging ends)

All times IST. Hard deadline **Wed 9 Dec 07:30**. Our freeze **Tue 8 Dec 22:00**. Judging runs until **Thu 17 Dec 07:30**: the game must stay live and posted daily until then.

Harsh's other commitments in this window (plan around them): 404 Hackathon (Sun 29 Nov 17:17 → Mon 30 Nov 17:17), Kavach (2 Dec), Purna live review (Thu 3 Dec 22:30) and Purna deadline (Tue 8 Dec 03:30), Sem 3 exam prep. Coding agents do most of the build; Harsh's time goes to setup, taste and the tester community.

---

## Status (28 Nov 2026): Phases 1–3 are built
Engine, server and client are merged on `main` with 139 tests, an automated QA run (`npm run qa`, 17/17, including the judge red-team checks J1, J2, J4) and an accessibility scan with 0 violations. Phase 0 is now about getting the built game onto Reddit; `LAPTOP-PROMPT.md` covers it end to end. Gates G1–G2 are passed by tests; G3 and G4 still need phones, testers and the judge simulations.

## Phase 0 — setup (one 45-minute slot, before Tue 1 Dec)
Already done by Claude: repo `harshbhx/isle-of-maybe` scaffolded from the Devvit React template, specs, docs, CI, issue/PR templates, labels, milestones and all task issues (T04, T05).
1. Register on Devpost for "Reddit's Game of the Day Hackathon" (T01).
2. Create **r/IsleOfMaybe_dev** (private) and **r/IsleOfMaybe** (public) (T02). Name decision: 10-DECISIONS D01.
3. On the laptop: clone the repo, Node ≥ 24, `npm install`, `npm run login` (Devvit), then `npm run dev` against r/IsleOfMaybe_dev. See the template post (T03).
4. **Gate 0:** today's island post (mod menu → Post today's island) renders in the dev sub on your phone and Set sail opens the game. If not, fix before anything else.

Laptop agent: give it `LAPTOP-PROMPT.md` (one prompt is enough).

## Phase 1 — engine (agents, Tue 1 – Wed 2 Dec; Harsh reviews 20 min/day)
- T10–T15 in order, all with tests. Then T16 Atlas.
- **Gate 1:** `npm run test:unit` green; Atlas shows 30 islands; Harsh looks at Atlas (T17) and says "fair".

## Phase 2 — server (agents, Wed 2 – Thu 3 Dec)
- T20–T25, T27 (P0). Then T26, T28, T29, T31 if on track.
- **Gate 2:** with curl or a tiny debug page: start a hunt, walk, dig, bury, chart, see it in pick for another test user. Chest never in responses before `done`.

## Phase 3 — client (Fri 4 – Sun 6 Dec; Harsh's main build days)
- Fri 4: T40, T41 (glyphs: Harsh approves), T64, T42, T43, T44.
- Sat 5: T45–T50, T63 (Practice Cove). **05:30 first real island posts in the demo sub; send the tester invite (13-PLAYTEST §4) as soon as a full loop works**, even if rough.
- Sun 6: T51, T54, T55, T58, T65, then P1s (T52, T53, T56, T60, T61).
- **Gate 3 (Sun 6, 21:00):** full loop on phone + desktop, testers playing. If not: apply the cut line (07-TASKS) now.

## Phase 4 — harden (Mon 7 Dec; Purna has priority, agents fix bugs)
- Tester bugs → issues → fixes. 08-TESTING §2 + §4 + QA matrix.
- Judge simulation #1 (08-TESTING §5).
- T70 README.

## Phase 5 — ship (Tue 8 Dec, after Purna is submitted at 03:30)
- Morning: judge simulation #2, last fixes.
- 18:00: T75 video (optional), screenshots from real play.
- **22:00 freeze.** Final `npm run deploy`; update the demo sub install; verify logged-out in a private window on phone and desktop.
- 22:30–23:30: Devpost form (09-SUBMISSION), member count < 200, survey (T76).
- **Submit by Wed 9 Dec 05:30** (target; deadline 07:30).

## Phase 6 — judging (9–17 Dec)
- Every morning after 05:30: check the new island post exists (else mod menu "Post today's island"), glance at logs for errors (T77).
- Every evening ~20:00: tester reminder (13-PLAYTEST §5).
- Don't upload new versions during judging unless something is broken; if you must, upload late night IST, test in the dev sub first.

## Gates summary
| Gate | When | Pass | If it fails |
|---|---|---|---|
| G0 | before 1 Dec | Template runs in dev sub | Stop; fix setup |
| G1 | 2 Dec | Tests green, islands fair | Fix generator before server |
| G2 | 3 Dec | Server loop works by curl | Don't start client screens beyond the island renderer |
| G3 | 6 Dec 21:00 | Full loop on phone, testers playing | Cut line now |
| G4 | 8 Dec 22:00 | All P0 QA rows pass; logged-out works | Submit anyway with known issues listed honestly |

## If everything goes wrong
Minimum shippable game: island + pick (captain + player charts) + hunt + bury + chart + result. No boards, no share, no realtime, no modifiers beyond radius. That still scores on all four criteria. Submit it.
