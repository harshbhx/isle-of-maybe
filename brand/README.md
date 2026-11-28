# Isle of Maybe: brand kit

Every graphic for Isle of Maybe lives here. Each file is named `isle-of-maybe-<what>-<size>`. The kit is generated from the game's own shapes and renders, so it always matches the game:

```
pip install fonttools brotli pillow playwright
python3 tools/assets/biomes.py   # optional: fresh biome shots from the renderer
python3 tools/brand/build.py     # rebuilds everything below
```

## The mark

The mark is an island seen from above. A dotted path curls into a question mark, and the X is its dot: *maybe* is the path. The wordmark is Fraunces Black, outlined, so it needs no font.

| Use | File |
|---|---|
| Logo on light backgrounds | `logo/lockup/isle-of-maybe-lockup-horizontal-on-light.svg` |
| Logo on lagoon or dark backgrounds | `logo/lockup/isle-of-maybe-lockup-horizontal-on-dark.svg` |
| Square spaces (posters, slides) | `logo/lockup/isle-of-maybe-lockup-stacked-on-light.svg`, `…-on-dark.svg` |
| One colour (print, stamps) | `logo/mark/isle-of-maybe-mark-ink.svg`, `-paper.svg`, `-white.svg` |
| App and subreddit icon | `icons/isle-of-maybe-app-icon.svg`, `icons/png/isle-of-maybe-app-icon-<16…1024>.png` |
| Browser tab | `icons/favicon.svg`, `icons/favicon.ico` |

The PNGs in each `png/` folder are transparent, at 64 to 1024 px for the mark and 1600 px wide for the wordmark and lockups.

**Do:**
- Leave clear space around the mark, at least the width of the X.
- Put the colour mark on paper (`#FFF4DC`) or lagoon (`#0A6468`).
- Use the ink or white mark on photos.

**Don't:**
- Recolour the parts, stretch the mark or add effects.
- Set the name in another typeface.
- Pair the mark with Reddit's logos or mascot. This is an independent game.

## Folders

| Folder | What's in it |
|---|---|
| `logo/mark` | The mark in colour, ink, paper and white (SVG, plus PNGs from 64 to 1024 px) |
| `logo/wordmark` | "Isle of Maybe" outlined, in ink, paper, white and lagoon |
| `logo/lockup` | Mark plus wordmark, horizontal and stacked, for light and dark backgrounds |
| `icons` | App icon (SVG and PNGs from 16 to 1024 px), `favicon.svg`, `favicon.ico` |
| `glyphs` | The ten landmark glyphs, plus the X, the dock and the compass, as drawn on charts (24 px grid) |
| `palette` | `palette.css`, `palette.json` (tokens, roles and biome palettes), with swatch sheets as SVG and PNG |
| `type` | Type specimen. Fraunces for titles and Bricolage Grotesque for everything else, both under the SIL Open Font License |
| `keyart` | Key art (the chest bursting open) and the 1920×1080 featuring image |
| `banners` | Subreddit banners (desktop and mobile) and the Devpost cover |
| `social` | Open Graph card (1200×630), square (1080) and wide (1120×512) tiles |
| `gifs` | Find the chest, a hunt, and drawing a chart, captured from the real game |
| `screens` | Five annotated screens: the loop, the chart editor, tomorrow, desktop, fair play |
| `biomes` | The six daily biomes (Tropical, Volcanic, Autumn, Mangrove, Frost, Coral) and a six-up sheet |
| `video` | The 1500×1000 trailer (MP4) |
| `patterns` | Waves and the torn paper edge used in the app |

## Colours

| Token | Hex | Role |
|---|---|---|
| paper | `#FFF4DC` | Card and chart background |
| ink | `#2B1D12` | Text on paper |
| lagoon | `#0A6468` | App frame |
| foam | `#FFF7E8` | Text on lagoon |
| hibiscus | `#B8233F` | The X, warnings |
| mango | `#FFB21E` | Primary button (ink text) |
| sun | `#FFCF6B` | Gold, links on lagoon |
| shallows | `#4CC3B9` | Shallows, the logo's ring |
| sand | `#F2D99B` | Beach, the logo's island |

The full set, with contrast notes, is in `palette/palette.json` and `docs/03-DESIGN.md`.

## Licence

The art, logo and name are © Harsh Bhanushali. You can use them to write about, review or link to Isle of Maybe. The fonts keep their own licence (SIL OFL 1.1).
