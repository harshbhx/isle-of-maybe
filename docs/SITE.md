# The website (SHIP-9)

The website is plain files in `site/`: Home, How to play, Press, Privacy, Terms and a 404 page. Cloudflare serves them as they are, with no build step (D35). Nothing on it loads from anywhere else: the fonts, images and clips are all in the folder, and `site/_headers` tells browsers to refuse anything else.

## Connect it to Cloudflare (about 5 minutes, works on a phone)

1. Open **dash.cloudflare.com**, sign in, and go to **Workers & Pages**.
2. Tap **Create** (or **Create application**), then the **Pages** tab, then **Connect to Git** (on some screens it says **Import an existing Git repository**).
3. Pick **GitHub** and allow the Cloudflare app to see **harshbhx/isle-of-maybe** (only that repo is enough). Select it and tap **Begin setup**.
4. Fill in the settings:
   | Field                  | Value                                                              |
   | ---------------------- | ------------------------------------------------------------------ |
   | Project name           | `isle-of-maybe` (this makes the address `isle-of-maybe.pages.dev`) |
   | Production branch      | `main`                                                             |
   | Framework preset       | None                                                               |
   | Build command          | `exit 0`                                                           |
   | Build output directory | `site`                                                             |
5. Optional but faster: open **Environment variables (advanced)** and add `SKIP_DEPENDENCY_INSTALL` = `1`, so Cloudflare doesn't install the game's packages it doesn't need.
6. Tap **Save and Deploy**. When it finishes, open `https://isle-of-maybe.pages.dev`. You should see "Trust a stranger's map." and today's island coastline.

After this, every merge to `main` redeploys the site by itself.

**If Cloudflare gives a different address** (for example `isle-of-maybe-abc.pages.dev`, or a custom domain), tell the coding agent the address. It reruns `SITE_URL=https://that-address npm run site` so the share cards and canonical links point to the right place.

**Custom domain (optional):** in the project, go to **Custom domains** → **Set up a domain**, then follow the prompts.

## After it's live

- Paste the address into the Devvit app page's **Website** field (see `docs/assets/README.md`). Use `/privacy` and `/terms` for the policy fields.
- Check one link preview: paste the address into a chat. The card should show the island art and "Isle of Maybe".

## Editing the site

- Page sources are in `tools/site/pages/`, with the shared header and footer in `_layout.html`. Styles are in `site/assets/site.css`.
- Privacy and Terms are generated from `PRIVACY.md` and `TERMS.md`. Edit the Markdown, never the HTML.
- After any change, run `npm run site`. The unit tests fail if `site/` is out of date with its sources (SHIP-9.3) or if a page tries to load anything from outside (SHIP-9.2).
- To try it locally, serve `site/` with any static server. Cloudflare maps `/how-to-play` to `how-to-play.html`, and so do most static servers with "clean URLs" on.
