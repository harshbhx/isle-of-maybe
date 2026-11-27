# Laptop agent: one prompt

Paste this to the laptop agent. Steps marked **[Harsh]** need you at the keyboard.

> Set up my Reddit hackathon game **Isle of Maybe** locally. The repo already exists: https://github.com/harshbhx/isle-of-maybe (specs, docs, CI and issues are in it).
> 1. Make sure Node 24 (see `.nvmrc`), git and the GitHub CLI are installed. Git author for this repo must be "Harsh Bhanushali <bhanushaliharsh434@gmail.com>", commits signed with my existing signing key (tell me if none is set up).
> 2. Clone the repo into ~/code/isle-of-maybe and run `npm install`, `npm run test:types`, `npm run lint`, `npm run test:unit`, `npm run build`. All must pass.
> 3. **[Harsh]** Run `npm run login` and log in to Reddit's developer platform when the browser opens.
> 4. **[Harsh]** I create r/IsleOfMaybe_dev (private) and r/IsleOfMaybe (public). Wait for me to confirm.
> 5. Run `npm run dev` against r/IsleOfMaybe_dev and confirm the template post loads. Send me the post link. If the app name `isle-of-maybe` is taken on developers.reddit.com, use `isle-of-maybe-game`, update `devvit.json` and `package.json` through an issue → PR, and tell me.
> 6. Read AGENTS.md and specs/README.md. Don't start feature work; tell me when Gate 0 in docs/00-RUNBOOK.md passes.
> Rules: no Dependabot, no Co-Authored-By lines, every change through issue → PR → squash merge, never leave a PR open.
