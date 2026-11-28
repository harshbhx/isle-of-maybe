# Catalog and presentation assets (SHIP-5.1, SHIP-5.2)

All art is drawn from the real launch-day island (seed `maybe-2026-12-05`) and the game's own glyphs, so it matches what players see. Regenerate with:

```bash
node --experimental-strip-types tools/assets/make-art.ts && python3 tools/assets/render.py
```

| File | Use |
|---|---|
| `icon-1024.png`, `icon-256.png` | App icon (bold chart, readable at 64 px) |
| `featuring-1920x1080.png` | Featuring image / presentation title slide |
| `tile-1080x1080.png` | Tile image |
| `devpost-gallery-1500x1000.png` | Devpost gallery cover (3:2) |
| `../img/screens/*.png` | Gameplay screenshots for the gallery and slides |

## Listing text
- **Name:** Isle of Maybe
- **Tile tagline (short):** Bury it. Chart it. Trust a stranger's map.
- **Featuring description:** A new island every day. Follow a treasure map another redditor drew from memory, dig with three shovels, then bury your own chest and draw the map for the next sailor. Tomorrow, find out how many found it.
- **Category:** Puzzle
- **Content:** Charts use only a fixed set of stamps, a snapped path, one X and one optional phrase from a fixed list. No free text or drawing. Player content expires after 30 days.

Harsh: upload the icon, featuring and tile images in the app's catalog settings once the app is on the Developer Platform (Phase 0, #3). The sizes there may differ; if so, rerun the tools with new sizes in `make-art.ts`.
