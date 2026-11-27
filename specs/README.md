# Specs — how we build Isle of Maybe

We build **spec-first**. Nothing is coded that isn't in a spec, and every change to behaviour starts as a change to a spec.

```
docs/02-PRD.md   (the whole game, the "why")
      ↓
specs/<feature>/requirements.md   (what must be true — numbered, testable)
specs/<feature>/design.md         (how we'll make it true)
specs/<feature>/tasks.md          (the work, one line = one GitHub issue)
      ↓
GitHub issue  →  branch  →  PR (links issue + requirement IDs)  →  squash merge  →  issue closed
```

## Features

| Folder | Covers | Requirement prefix |
|---|---|---|
| `01-island-engine/` | Seeded islands, paths, fog, depth, scoring, chart validation, Old Captain charts (all pure shared logic) | `ENG` |
| `02-hunt/` | Picking a chart, server-authoritative hunts, digging, reveal, rating | `HUNT` |
| `03-bury-and-chart/` | Burying on seen tiles, the chart editor kit, Ink check | `CHART` |
| `04-daily-cycle/` | Daily post job, modifiers, streaks, Dispatch, day rollover | `DAY` |
| `05-community/` | Reports, moderation, leaderboards, Hall of Charts, sharing, realtime, flair | `COM` |
| `06-client-shell/` | Design system, splash, screens, states, accessibility, performance | `UI` |
| `07-launch/` | App README, playtest community, submission, judging week | `SHIP` |

## Writing requirements (EARS)
Each requirement has an ID and uses one of these shapes:
- **Ubiquitous:** THE `<system>` SHALL `<response>`.
- **Event:** WHEN `<trigger>`, THE `<system>` SHALL `<response>`.
- **State:** WHILE `<state>`, THE `<system>` SHALL `<response>`.
- **Unwanted:** IF `<condition>`, THEN THE `<system>` SHALL `<response>`.
- **Optional:** WHERE `<feature is included>`, THE `<system>` SHALL `<response>`.

"System" is one of: *the engine* (`src/shared`), *the server*, *the client*, *the daily job*, *the moderator tools*.

Every requirement must be testable. If you can't write the test, rewrite the requirement.

## Rules
1. **Spec before code.** A PR that changes behaviour without a matching spec change is not merged.
2. **Changing a spec** = its own issue (template "Spec change") and PR labelled `spec`, merged before the code PR.
3. **Traceability.** Every task line names its requirement IDs. Every PR description lists the IDs it satisfies and how they were tested (template enforces it).
4. **Tests name requirements.** Test titles start with the ID: `test('ENG-2.3 every land tile is reachable from the dock', …)`.
5. **Done** = requirements met + tests passing + AGENTS.md definition of done.
6. The PRD and docs/ explain *why*. When a spec and the PRD disagree, the spec wins and the PRD gets fixed in the same PR.

## Status
Each `tasks.md` line is mirrored by a GitHub issue (created by `tools/create-issues.sh`). The issue is the live status; tick the box in `tasks.md` in the PR that closes the issue.
