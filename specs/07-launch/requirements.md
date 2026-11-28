# 07 · Launch — requirements

Scope: everything needed to submit, be judged and be featurable. Source: Devpost rules (`docs/11-AGENT-KNOWLEDGE.md` §A), `docs/09-SUBMISSION.md`, `docs/13-PLAYTEST.md`, Featuring guide.

## SHIP-1 Required submission items
- **SHIP-1.1** THE repo SHALL have a root `README.md` explaining the game and how to play in plain language (≤ 1,000-word overview) and how moderators set it up.
- **SHIP-1.2** THE submission SHALL include a text description, the app listing link and a demo post link before Wed 9 Dec 07:30 IST (target 05:30).
- **SHIP-1.3** THE demo subreddit SHALL be public with fewer than 200 members, and the demo post SHALL play logged out on phone and desktop.
- **SHIP-1.4** THE game SHALL remain free, installed and posting daily until Thu 17 Dec 07:30 IST.

## SHIP-2 Playtest community
- **SHIP-2.1** THE team SHALL run two subreddits: a private dev sub for playtest mode and the public demo sub for uploaded versions only.
- **SHIP-2.2** THE team SHALL have ≥ 15 real players playing daily from 5 Dec through judging, with ≤ 150 members.
- **SHIP-2.3** THE team SHALL not create fake accounts or scripted player content.

## SHIP-3 Evidence
- **SHIP-3.1** THE team SHALL record daily players, charts, hunts per chart, find rate, and day-1/day-3 return of testers for the Devpost write-up.

## SHIP-4 Quality gates
- **SHIP-4.1** BEFORE each upload to the demo sub, the scroll-trap checks and break tests 1–7 in `docs/08-TESTING.md` SHALL pass.
- **SHIP-4.2** THE judge simulation in `docs/08-TESTING.md` §5 SHALL pass twice (7 and 8 Dec).

## SHIP-5 Featuring readiness (P1)
- **SHIP-5.1** THE team SHALL prepare in-app catalog assets: app icon, featuring image, tile image, featuring description, tile tagline, category (Puzzle).
- **SHIP-5.2** THE same art SHALL be exported for the Devpost gallery and Harsh's presentation.

## SHIP-7 Policies and support (Devvit Rules)
- **SHIP-7.1** THE repo SHALL publish a privacy policy (`PRIVACY.md`) that completely and accurately describes what the app stores, why, for how long, who can see it (including ghost names and positions, worn-path counts and shares), how to remove your content, and how to get help. It SHALL NOT point to Reddit's own policies in its place.
- **SHIP-7.2** THE repo SHALL publish terms of use (`TERMS.md`): who may play (13+), fair play, user content and reports, the moderators' role, no warranty, changes, and contact.
- **SHIP-7.3** THE README and the app page SHALL link both documents and say how to get support: modmail to r/IsleOfMaybe or a GitHub issue. Neither is linked from inside the game, so players aren't sent off Reddit.

## SHIP-8 Brand kit (Harsh, 29 Nov: "one folder called brand, all graphics with their own folders and names")
- **SHIP-8.1** THE repo SHALL keep every graphic in `brand/`, in named folders: logo (mark, wordmark, lockups as SVG and PNG), icons and favicons, glyphs, palette, type, key art, banners, social cards, GIFs, screens, biomes, video and patterns. Each file is named `isle-of-maybe-<what>-<size>`.
- **SHIP-8.2** THE kit SHALL be generated from the game's own shapes and renders by `tools/brand/build.py`. The wordmark is outlined, so no font is needed. `brand/README.md` says what each folder is for and how to use the mark.

## SHIP-9 Website (Harsh, 29 Nov: hosted on Cloudflare, not GitHub Pages)
- **SHIP-9.1** THE repo SHALL hold a static website in `site/` with four pages: home (what the game is, key art, GIFs, the six biomes, how a day works, a "Play on r/IsleOfMaybe" link), How to play, Privacy, and Terms. It also links the press kit (`brand/`).
- **SHIP-9.2** THE site SHALL make no external requests: fonts and images are bundled, with no CDN, analytics or trackers. It SHALL work at 360 px and 1440 px, by keyboard, with visible focus, and respect reduced motion.
- **SHIP-9.3** THE Privacy and Terms pages SHALL be generated from `PRIVACY.md` and `TERMS.md` by `tools/site/build.mjs`, and a test SHALL fail if they drift.
- **SHIP-9.4** THE site SHALL deploy on Cloudflare with no build step: the output folder is `site/`. `docs/SITE.md` gives the steps to connect it from a phone.

## SHIP-6 Optional extras
- **SHIP-6.1** (P1) A public video under 60 seconds recorded on a phone.
- **SHIP-6.2** (P1) The developer satisfaction survey completed.
