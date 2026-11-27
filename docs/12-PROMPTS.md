# 12 — Prompts for coding agents

Paste one at a time. Each assumes the agent has the repo with `AGENTS.md` and `docs/`.

## P0 · Setup check
> Read AGENTS.md and docs/00-RUNBOOK.md Phase 0. Verify the repo is the official Devvit React template, Node ≥ 24, `npm run build` passes, and `devvit.json` matches docs/05-ARCHITECTURE.md §2 (check every key against the live schema at https://developers.reddit.com/schema/config-file.v1.json and fix my sketch if it's wrong). Set git author and signing per AGENTS.md §4. Run tools/create-issues.sh. Report what you changed.

## P1 · Engine
> Work issues T10–T15 in order (docs/07-TASKS.md). All logic goes in src/shared with no DOM, no Devvit imports, no Math.random/Date.now. Follow docs/05-ARCHITECTURE.md §6–7 and docs/02-PRD.md §5–7 exactly. Write the tests from docs/08-TESTING.md §1 first, then the code. One PR per issue, merged, branch deleted.

## P1b · Atlas
> Do T16: tools/atlas.html renders the next 30 days' islands (using src/shared/island.ts through a tiny Vite dev entry or a prebuilt script) as a grid with landmark labels, dock, deep-zone shading and the modifier name. It's dev-only and must not ship in dist/client.

## P2 · Server
> Do T20–T25 and T27 (docs/07-TASKS.md) following docs/05-ARCHITECTURE.md §3–5, §9, §13. Hard rule: the chest position must never be in any response before a hunt is done. Add a test or script that runs a full loop against the handlers with two fake users and asserts that. Use hSetNX/transactions as described. Every key gets its TTL.

## P3 · Island screen
> Do T40–T44. Canvas 2D island renderer with fog, camera, sailor, footprints; tap-to-move with A* route preview (first tap previews, second walks, tap during walk skips); keyboard arrows. Use the tokens and glyphs from docs/03-DESIGN.md. Must hold 60 fps on a mid phone. Inline splash (T42) must pass docs/08-TESTING.md §2.

## P3b · Hunt to reveal
> Do T45–T47 using docs/04-WIREFRAMES.md W3–W5 and copy keys from docs/06-COPY.md. The reveal for a miss draws the chart's X, the true chest and an ink line with the distance in paces. Hook up to the real server endpoints.

## P3c · Bury, chart, ink check
> Do T48–T50. Bury shows only server-revealed tiles. Chart editor per W7: stamps (max 6), path (max 8 snapped segments), exactly one X, select/move/delete, undo (20), budget meter; touch, mouse and keyboard; `touch-action: none` only on the editor element in expanded mode. Ink check overlay per W8 and PRD §5.6.

## P3d · Result, dispatch, states
> Do T51, T54, T55, T58. Every button on the result card is optional. First-time players see the sample Dispatch. Implement every state in W12.

## P4 · Polish pass
> Go screen by screen through docs/04-WIREFRAMES.md at 360 px and 1440 px. Fix spacing, alignment, contrast, focus rings, reduced motion, empty states. List anything that looks generic or "AI-made" and fix it with the ink-and-parchment style from docs/03-DESIGN.md. No new features.

## P5 · Break it
> Run every case in docs/08-TESTING.md §3 and §4. For each failure, open an issue, fix it, merge. Report the table with pass/fail.

## Emergency prompts
- **Behind schedule:** "Apply the cut line in docs/07-TASKS.md. Close the cut issues with a 'cut' label and a comment. Make sure the remaining loop has no dead buttons."
- **Scroll trap rejection risk:** "Audit the inline entry bundle for anything in docs/11-AGENT-KNOWLEDGE.md §C.20 and remove it."
- **Daily post missing:** "Check `npx devvit logs <sub>` for the daily job; run the 'Post today's island' mod menu; fix the job so it's idempotent."
- **Redis quota:** "Measure key sizes, tighten TTLs per docs/05-ARCHITECTURE.md §8, and make writes fail gracefully with err.quota."
