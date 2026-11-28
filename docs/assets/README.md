# Catalog and presentation assets (SHIP-5.1, SHIP-5.2)

Tropical day identity (D24) and the question-mark logo (D25). The banners, featuring image and Devpost cover are a portolan-style sea chart of the real launch-week islands (their actual coastlines and names), drawn with the game's own glyphs. Regenerate with:

```bash
node --experimental-strip-types tools/assets/make-art.ts && python3 tools/assets/render.py
```

| File | Use |
|---|---|
| `icon-1024.png`, `icon-256.png` | App icon and subreddit icon: the logo on the lagoon (readable at 64 px) |
| `featuring-1920x1080.png` | Featuring image / presentation title slide |
| `tile-1080x1080.png` | Square tile: logo + wordmark |
| `tile-1120x512.png` | App page tile image (the page asks for 560x256; this is 2x) |
| `featuring-1500x1000.mp4` | App page featuring video (MP4, 20 s, silent, 680 KB): the sea chart, the find, walking the island, charting, the sea chart |
| `gallery-0-find.gif` | Animated find moment from the real renderer (`python3 tools/assets/scene.py`, which also writes the splash key art `src/client/assets/keyart.webp`) |
| `devpost-gallery-1500x1000.png` | Devpost gallery cover (3:2) |
| `gallery-0-hunt.gif`, `gallery-0-chart.gif` | Animated Devpost images: walking the 3D island as the cloud lifts; charting from memory and the Ink check |
| `gallery-1-loop.png` … `gallery-5-fair.png` | Devpost gallery slides from a real playthrough (`python3 tools/assets/gallery.py`); order and alt text in `docs/18-SUBREDDIT-KIT.md` §4 |
| `subreddit-banner-1920x384.png`, `subreddit-banner-mobile-1600x480.png` | r/IsleOfMaybe header images (left quarter kept plain for Reddit's icon and name) |
| `../img/screens/*.png` | Gameplay screenshots for the gallery and slides |

## App page (developers.reddit.com, as entered 28 Nov)
| Field | Value |
|---|---|
| Display name | Isle of Maybe |
| Description (15–200) | A new treasure island every day. Follow a map another redditor drew from memory, then bury your own chest and chart it. Tomorrow, see how many sailors found it. |
| Promotional icon | `icon-1024.png` |
| Featuring asset (MP4) | `featuring-1500x1000.mp4` |
| Fallback asset | `devpost-gallery-1500x1000.png` |
| Tile image | `tile-1120x512.png` |
| Featuring description (≤ 35) | A new treasure island every day |
| Tile tagline (≤ 20) | Bury it. Chart it. |
| Category | Puzzle |
| NSFW | No |

## Listing text
- **Name:** Isle of Maybe
- **Tile tagline (short):** Bury it. Chart it. Trust a stranger's map.
- **Featuring description:** A new island every day. Follow a treasure map another redditor drew from memory, dig with three shovels, then bury your own chest and draw the map for the next sailor. Tomorrow, find out how many found it.
- **Category:** Puzzle
- **Content:** Charts use only a fixed set of stamps, a snapped path, one X and one optional phrase from a fixed list. No free text or drawing. Player content expires after 30 days.

Harsh: upload the icon, featuring and tile images in the app's catalog settings once the app is on the Developer Platform (Phase 0, #3). The sizes there may differ; if so, rerun the tools with new sizes in `make-art.ts`.
