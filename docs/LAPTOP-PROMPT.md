# Laptop agent: one prompt

The game is built and merged on `main`: the 3D island (three.js, with a 2D fallback), the Tropical day look, the logo, the gallery and all QA tooling. What's left needs a real Reddit account, phones and the Devvit CLI. Paste the prompt below into Claude Code on the laptop. Steps marked **[Harsh]** need you at the keyboard. Browser work on reddit.com, developers.reddit.com and Devpost (subreddit set-up, catalog uploads, the Devpost form) is in `docs/19-CHROME-RUNBOOK.md`, for a Claude session with Claude in Chrome.

## Part 0: first-time setup (paste this first)

```
Set up this laptop for my Reddit hackathon game "Isle of Maybe" (repo: https://github.com/harshbhx/isle-of-maybe). Work step by step, check each step worked, and stop to ask me whenever a browser login or an admin password is needed.

1. Detect the OS (Windows / macOS / Linux) and use its package manager (winget on Windows, Homebrew on macOS, apt on Linux).
2. Install or check: Git, GitHub CLI (gh), Node.js 24 via a version manager (nvm-windows / nvm / fnm; the repo has .nvmrc), Python 3.11+ with pip, and Google Chrome. Print every version at the end.
3. Git identity, global: user.name "Harsh Bhanushali", user.email "bhanushaliharsh434@gmail.com". Never add Co-Authored-By or AI trailer lines to commits. Don't create signing keys without asking me.
4. Run `gh auth login` (GitHub.com, HTTPS, browser login; I'll do the browser part), then confirm with `gh auth status`.
5. Clone the repo into ~/code/isle-of-maybe (on Windows, %USERPROFILE%\code\isle-of-maybe). Then `nvm use` (or install the .nvmrc version) and `npm install`.
6. `pip install playwright` and `python -m playwright install chromium`. If Chrome isn't in its usual place, set CHROME_PATH to the Chrome executable (the QA scripts read it, and fall back to Playwright's Chromium). On Windows, if `python3` doesn't exist, run the QA script as `python tools/preview/qa.py`.
7. Run, in order: `npm run test:types`, `npm run lint`, `npm run test:unit`, `npm run build`, `npm run qa`. Expect all green and QA 19/19. If something fails, show me the exact error and don't change code yet.
8. Check the Devvit CLI with `npx devvit --version`, then run `npx devvit login` (I'll finish it in the browser) and confirm with `npx devvit whoami`.
9. Don't run `npm run dev` or `devvit upload` yet. Don't commit or push anything.
10. Report: OS, all tool versions, the repo path, results of every check, and the Devvit username. Then wait for my next prompt (Part 1 below).
```

## Part 1: from built to running on Reddit

> Take my Reddit hackathon game **Isle of Maybe** from "built" to "running on Reddit". Repo: https://github.com/harshbhx/isle-of-maybe. Read `AGENTS.md`, `docs/00-RUNBOOK.md`, `docs/16-QA-REPORT.md` and `docs/17-JUDGE-REDTEAM.md` first. Another Claude keeps merging fixes from the cloud, so `git pull` before every build or upload.
> 1. **Tools.** Make sure these are installed: Node 24 (see `.nvmrc`), git, the GitHub CLI, Python 3, Playwright for Python (`pip install playwright && playwright install chromium`) and Google Chrome. The git author must be "Harsh Bhanushali <bhanushaliharsh434@gmail.com>", with no Co-Authored-By or AI trailer lines.
> 2. **Checks.** Clone into `~/code/isle-of-maybe`, run `npm install`, then `npm run test:types && npm run lint && npm run test:unit && npm run build`. All must pass. Then run `npm run qa`, which starts the local preview itself. If Chrome isn't at `/usr/bin/google-chrome`, set `executable_path` in `tools/preview/qa.py`. Expect 19/19, including J7 (3D island renders, taps walk) and J9 (no WebGL falls back to 2D).
> 3. **[Harsh]** Run `npx devvit login` and log in to Reddit's developer platform in the browser.
> 4. **Subreddits.** r/IsleOfMaybe_dev (private) and r/IsleOfMaybe (public, under 200 members) must exist. If they don't, stop and ask me: I'll create them by hand from `docs/19-CHROME-RUNBOOK.md` §B (Claude in Chrome can't open reddit.com).
> 5. **Playtest.** Run `npm run dev` against r/IsleOfMaybe_dev.
>    - If the app name `isle-of-maybe` is taken, use `isle-of-maybe-game`: change `devvit.json` and `package.json` through an issue → PR.
>    - If `devvit.json` is rejected, fix only the reported keys through an issue → PR.
> 6. **Gate 0.** In the dev sub, open the subreddit mod menu → **Isle of Maybe: Post today's island**. Open the post on my phone and on desktop and send me the link. It passes when:
>    - the splash shows the logo, the pitch line, today's date and today's coastline
>    - Set sail opens the game
>    - the island is **3D** (cloud over the land, trees, the sailor) on a phone that has WebGL
> 7. **Real-device QA, with me.** Work through the "Needs a real device or Reddit" list in `docs/16-QA-REPORT.md`:
>    - feed scrolling over the splash
>    - a full loop on phone and desktop
>    - logged out, in a private window
>    - **J8:** the 3D island on at least two phones in the Reddit app (smooth walking, cloud clears as you walk, taps land on the tile you meant). Also check one browser with WebGL off: it must show the 2D island with no error.
>    - Share my chart (confirm sheet → comment under the sticky; until the app is approved it posts as the app account)
>    - Challenge a friend
>    - Join the crew (opens the subreddit)
>    - Review reported charts (report one chart from three accounts)
>    - the Stats menu and the Crew goal setting
>
>    After each one, check `npx devvit logs r/IsleOfMaybe_dev` for errors.
> 8. **Bugs.** For every problem, open a GitHub issue with steps, a screenshot and the log lines, labelled `bug`. Fix it through branch → PR (requirement IDs, how tested) → CI green → squash merge. Never leave a PR open.
> 9. **Public sub.** Before 5 Dec, after QA passes, run `npm run deploy` (`devvit upload`) and install the uploaded version in r/IsleOfMaybe. After 5 Dec, never run `npm run dev` against the public sub. **Don't submit the app for publishing**: the organisers ask us to keep it unpublished until the hackathon ends.
> 10. **Stop and report:** what passed, what's broken (with issue links), and anything that needs my decision.
>
> Rules: no Dependabot. Every change goes through issue → PR → squash merge. Don't upload to r/IsleOfMaybe after the freeze (Tue 8 Dec 22:00 IST) unless I say so.
