# Isle of Maybe — plan and docs

> **Bury it. Chart it. Trust a stranger's map.**
> Every day there's a new island. You follow a map a stranger drew from memory to find their chest. Then you bury your own and draw a map for the next sailor. Tomorrow you learn how many sailors your map led to gold.

**Event:** Reddit's Game of the Day Hackathon (Devpost) · runs 11 Nov – 8 Dec 2026
**Deadline:** 8 Dec 18:00 PT = **Wed 9 Dec 07:30 IST** · our freeze **Tue 8 Dec 22:00 IST**
**Judging:** until Thu 17 Dec 07:30 IST: keep the game live and played daily
**Prizes:** Best Daily Game $15,000 · 10 × Honorable Mention $1,000 · Feedback $200 × 5
**Video:** optional (< 60 s). **Required:** description, app README, app listing link, demo post in a public sub with < 200 members.

---

## Start here
1. `docs/01-RED-TEAM.md`: why the idea changed and what it survived. `docs/14-INSPIRATION.md`: what past winners taught us.
2. `docs/00-RUNBOOK.md`: Phase 0 (Harsh: Devpost, subreddits, Devvit login), gates, timeline around 404/Kavach/Purna.
3. Give `docs/LAPTOP-PROMPT.md` to the laptop agent.
4. Coding agents read `AGENTS.md` and `specs/README.md`, then work GitHub issues (one per task in `specs/*/tasks.md`) with prompts from `docs/12-PROMPTS.md`.
5. Start recruiting testers now: `docs/13-PLAYTEST.md`. A lively demo sub is what judges will see.

## Files
| File | What it is |
|---|---|
| `AGENTS.md` | Spec-driven workflow, hard rules, stack, commands, git workflow, definition of done |
| `specs/` | 7 feature specs (requirements in EARS with IDs, design, tasks) — the source of truth |
| `docs/LAPTOP-PROMPT.md` | One prompt for the laptop agent to do Phase 0 |
| `docs/00-RUNBOOK.md` | Day-by-day plan, gates, cut line, judging-week routine |
| `docs/01-RED-TEAM.md` | 33 attacks (judging, fun, platform rules, cheating, schedule, originality) and the 7 changes |
| `docs/02-PRD.md` | The game: loop, every screen, scoring formulas, content, moderation, edge cases |
| `docs/03-DESIGN.md` | Identity, colour tokens (contrast-checked), type, glyphs, motion, sound, accessibility |
| `docs/04-WIREFRAMES.md` | 12 phone wireframes incl. empty/error states |
| `docs/05-ARCHITECTURE.md` | Repo layout, devvit.json, API, Redis keys + TTLs, island generator, daily job, budgets, security |
| `docs/06-COPY.md` | Every UI string |
| `docs/07-TASKS.md` | 64 tasks by milestone with owner, priority, estimate, spec and requirement IDs; cut line |
| `docs/08-TESTING.md` | Unit tests, scroll-trap checks, QA matrix, break tests, judge simulation, performance |
| `docs/09-SUBMISSION.md` | Checklist, Devpost text draft, required app README, demo-post setup, 60 s video script |
| `docs/10-DECISIONS.md` | 23 decisions with the rejected options |
| `docs/11-AGENT-KNOWLEDGE.md` | 47 verified facts from the rules and Reddit's docs repo, with paths |
| `docs/12-PROMPTS.md` | Copy-paste prompts per phase + emergencies |
| `docs/13-PLAYTEST.md` | Two-subreddit setup, tester recruiting, invite + reminder messages |
| `docs/14-INSPIRATION.md` | Past winners and the Featuring guide reviewed; 7 ideas we adopted |
| `tools/create-issues.sh` | Labels, milestones and 64 GitHub issues from the tasks (`DRY_RUN=1` to preview; skips existing) |

## Honesty notes
- The core loop (bury, draw a map, play others' maps) exists in tiny itch.io jam games. Nothing like it is on Reddit, and no popular game owns it. Credit the inspiration in the README.
- The game is only as alive as its players. Seeding the demo sub with real testers is a P0 task, not marketing.
- Art decides a lot of Delightful UX and Polish. Ten good glyphs matter more than ten features.
- Platform facts were checked against Reddit's docs repo on 28 Nov 2026. Re-check `devvit.json` keys against the live schema when scaffolding.
| [16-QA-REPORT.md](16-QA-REPORT.md) | Automated QA matrix + break-test map; re-run with `npm run qa` |
| [15-COMPONENTS.md](15-COMPONENTS.md) | Component kit and wireframe → file map |
