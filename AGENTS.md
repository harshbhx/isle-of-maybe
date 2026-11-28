# AGENTS.md — rules for coding agents

You are building **Isle of Maybe**, a daily treasure-map game that runs inside Reddit posts (Devvit Web), for Reddit's Game of the Day Hackathon.
**Deadline:** Wed 9 Dec 2026 07:30 IST · **Freeze:** Tue 8 Dec 22:00 IST · **Judging runs until** Thu 17 Dec 07:30 IST.

## 0. How we work: spec-driven
1. Read `specs/README.md`. Every piece of work is a task line in `specs/<feature>/tasks.md`, mirrored by a GitHub issue.
2. Before coding an issue, read that feature's `requirements.md` and `design.md`. Requirement IDs (e.g. `HUNT-4.3`) are your acceptance criteria.
3. If the spec is wrong or missing something, **stop and open a "Spec change" issue/PR first**. Never code behaviour that isn't in a spec.
4. Background reading: `docs/02-PRD.md` (the game), `docs/03-DESIGN.md` + `docs/04-WIREFRAMES.md` (look), `docs/05-ARCHITECTURE.md` (how), `docs/11-AGENT-KNOWLEDGE.md` (verified platform facts), `docs/10-DECISIONS.md` (don't re-debate), `docs/01-RED-TEAM.md` (why).
5. One issue at a time: branch → commits → PR (template filled: issue, requirement IDs, how tested) → CI green → squash merge → branch deleted → tick the task in `tasks.md`.

---

## 1. Hard rules
1. **The server decides.** The chest position never appears in any response to a seeker before the hunt is done. Every step, dig and bury is re-validated on the server with `src/shared/` logic.
2. **Inline = splash only.** No canvas, drag, pointer capture, `touch-action: none`, `overscroll-behavior: none` or `preventDefault` on wheel/touch in the inline entry. The game and editor live in expanded mode. Violations get the app rejected.
3. **Limited expression only.** Charts are stamps from the fixed set, snapped path points and one X. No freehand drawing, no text input anywhere in the app.
4. **No external requests from the client.** Bundle fonts and assets. No CDNs, no analytics, no runtime AI.
5. **Every Redis write has a TTL** per Architecture §5 and handles quota errors.
6. **User actions only from an explicit confirm sheet.** Never post, comment or subscribe automatically; never require it to continue.
7. **No Reddit or third-party IP.** No Snoo (remove the template's `public/snoo.png`), no "Reddit" in names, no franchise references. Original glyphs.
8. **Deterministic shared logic.** `src/shared/*` has no `Math.random`, no `Date.now` (pass them in), no DOM, no Devvit imports.
9. **Never regenerate a posted day.** The seed is frozen in `day:{d}` and postData. A change to `island.ts` output needs a spec change and a new golden test.
10. **Zero console errors/warnings.** No `console.*` in client production code; server logs short.
11. Don't run `npm run dev` (playtest) against the public demo subreddit after 5 Dec. Use r/IsleOfMaybe_dev.
12. **Freeze at Tue 8 Dec 22:00 IST.** After that, no uploads to the demo sub unless Harsh says so.

## 2. Stack and conventions
- Official Devvit React template: Devvit Web 0.15.x, React 19, Hono, Vite, Tailwind 4, TypeScript (strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`). Node ≥ 24 (`.nvmrc`).
- Island: three.js 3D (WebGL), lazy-loaded in the game entry only, with the Canvas 2D renderer as the fallback. Chart editor: SVG. No game engines, animation libraries or state libraries.
- `/src/server`: Hono, `redis`, `reddit`, `context`, `media`, `realtime` from `@devvit/web/server`. Endpoints start with `/api/`; scheduler/menu/forms/triggers under `/internal/` and registered in `devvit.json`.
- `/src/client`: `splash.html` (inline, keep it tiny), `game.html` (expanded). Use `navigateTo`, `showToast`, `showForm`, `requestExpandedMode`, `showShareSheet` from `@devvit/web/client`. No `window.location`, `alert`, `confirm`, `prompt`, inline `<script>` tags.
- `/src/shared`: pure logic and API types shared by both.
- Prefer type aliases over interfaces, named exports over default exports, and never cast types (`as`).
- Files `kebab-case.ts`, components `PascalCase.tsx`, functions `camelCase`.
- Strings from `src/client/copy.ts` only (`docs/06-COPY.md`). Tokens from `docs/03-DESIGN.md` only.
- Animate only `transform`/`opacity`; respect `prefers-reduced-motion`.
- Tests: `test/**/*.test.ts` and `src/**/*.test.ts` with `node --test`. **Test names start with the requirement ID.**
- Each module starts with a 1–3 line comment saying what it does; other comments explain *why*.

## 3. Commands
| Command | What |
|---|---|
| `npm run dev` | `devvit playtest` (dev subreddit only) |
| `npm run build` | Vite build of client + server |
| `npm run test:unit` | Unit tests |
| `npm run test:types` | Type check |
| `npm run lint` | ESLint |
| `npm run deploy` | Type check + lint + `devvit upload` |
| `npx devvit logs <subreddit>` | Server logs |

CI runs type check, lint, unit tests and build on every PR. A PR merges only when CI is green.

## 4. Git workflow (Harsh's rules — follow exactly)
- **Author:** `Harsh Bhanushali <bhanushaliharsh434@gmail.com>` on every commit.
- **No AI co-author lines.** Never add `Co-Authored-By:` or any AI trailer.
- **Verified commits:** sign commits with Harsh's key, or let GitHub's squash merge create the verified commit on `main`. Check the badge.
- **Commit logically:** one coherent change per commit. Conventional Commits: `feat(hunt): validate steps on the server (HUNT-3.1)`.
- **Issue → PR → merge:** branch `t23-hunt-endpoints`, PR body `Closes #<n>` + requirement IDs + how tested, squash merge, delete branch. **Never leave a PR open.**
- Spec changes: branch `spec/<topic>`, label `spec`, merged before the code that depends on them.
- No Dependabot. Never commit `.env`, tokens, `node_modules/`, `dist/`. Never force-push `main`.

## 5. Definition of done (every issue)
- [ ] Every listed requirement ID is met and has a test (or a manual check written in the PR for UI-only items)
- [ ] Works at 360 px and 1440 px; touch, mouse and keyboard (UI issues)
- [ ] Reduced motion respected; zero console errors/warnings
- [ ] `npm run test:types`, `npm run lint`, `npm run test:unit`, `npm run build` pass (CI green)
- [ ] Strings in `copy.ts`
- [ ] Tested in r/IsleOfMaybe_dev on a phone (UI issues)
- [ ] Task ticked in `specs/<feature>/tasks.md`; PR merged; branch deleted; issue closed

## 6. Don't
- Add features that aren't in a spec.
- Send chest positions, other users' ids or votes to the client.
- Trust anything from the client or from share deep links.
- Change scoring numbers without a spec change (`specs/01-island-engine` ENG-4) and tests.

When unsure, pick the simpler, safer, more readable option. If it affects what a judge sees in the first 30 seconds, ask Harsh.

Devvit docs for agents: https://developers.reddit.com/docs/llms.txt
