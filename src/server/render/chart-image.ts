// Draws a player's chart as an 800×800 parchment PNG for sharing (COM-2.2): coastline and dock
// from the true island (as pre-printed on every chart), then only the player's own pieces.
import { centre, coastLoops, smoothLoop, type Pt } from '../../shared/coast.ts';
import {
  COMPASS_GLYPH,
  DOCK_GLYPH,
  GLYPH_BOX,
  LANDMARK_GLYPHS,
  X_GLYPH,
  type Glyph,
} from '../../shared/glyphs.ts';
import { rngFor } from '../../shared/rng.ts';
import type { ChartPiece, Depth, Island } from '../../shared/types.ts';
import { H, W } from '../../shared/types.ts';
import { encodePng, type Rgb } from './png.ts';
import { Bitmap } from './raster.ts';

export const IMAGE_SIZE = 800;
const TILE = 18;
const PAD = (IMAGE_SIZE - TILE * W) / 2;

/** Palette from docs/03-DESIGN.md §3 (parchment, ink, seal, compass). */
const C = {
  parchment: 0,
  speck: 1,
  sand: 2,
  ink: 3,
  soft: 4,
  seal: 5,
  hatch: 6,
} as const;
const PALETTE: readonly Rgb[] = [
  [0xf3, 0xe6, 0xc8],
  [0xea, 0xda, 0xb6],
  [0xe4, 0xd2, 0xa8],
  [0x2b, 0x21, 0x18],
  [0x5c, 0x4a, 0x36],
  [0x9e, 0x2a, 0x22],
  [0xc9, 0xb5, 0x8c],
];

const toPx = (p: Pt): Pt => ({ x: PAD + p.x * TILE, y: PAD + p.y * TILE });

const drawGlyph = (
  bm: Bitmap,
  g: Glyph,
  at: Pt,
  size: number,
  r: number,
  color: number
): void => {
  const k = size / GLYPH_BOX;
  const pt = (s: readonly number[], i: number): Pt => ({
    x: at.x - size / 2 + (s[i] ?? 0) * k,
    y: at.y - size / 2 + (s[i + 1] ?? 0) * k,
  });
  for (const s of g.strokes) {
    const pts: Pt[] = [];
    for (let i = 0; i + 1 < s.length; i += 2) pts.push(pt(s, i));
    bm.polyline(pts, r, color);
  }
};

export const chartImage = (
  island: Island,
  pieces: readonly ChartPiece[],
  depth: Depth
): Uint8Array => {
  const bm = new Bitmap(IMAGE_SIZE, IMAGE_SIZE, C.parchment);

  // Paper grain, deterministic per island.
  const rnd = rngFor(`${island.seed}|paper`);
  for (let i = 0; i < 9000; i++) {
    bm.set(
      Math.floor(rnd() * IMAGE_SIZE),
      Math.floor(rnd() * IMAGE_SIZE),
      C.speck
    );
  }

  // Sea: light horizontal hatching over the map area, then land on top.
  const right = PAD + TILE * W;
  const bottom = PAD + TILE * H;
  for (let y = PAD + 8, row = 0; y < bottom; y += 14, row++) {
    for (let x = PAD + (row % 2) * 12; x < right - 10; x += 24) {
      bm.line({ x, y }, { x: x + 10, y }, 0.8, C.hatch);
    }
  }
  const loops = coastLoops(island.terrain).map((l) => smoothLoop(l).map(toPx));
  bm.fillPolys(loops, C.sand);
  for (const l of loops) {
    const first = l[0];
    bm.polyline(first === undefined ? l : [...l, first], 1.6, C.ink);
  }

  // Frame and furniture.
  for (const inset of [PAD - 18, PAD - 12]) {
    const a = inset;
    const b = IMAGE_SIZE - inset;
    bm.polyline(
      [
        { x: a, y: a },
        { x: b, y: a },
        { x: b, y: b },
        { x: a, y: b },
        { x: a, y: a },
      ],
      inset === PAD - 18 ? 1.6 : 0.8,
      C.soft
    );
  }
  drawGlyph(bm, COMPASS_GLYPH, { x: right - 30, y: PAD + 34 }, 52, 1.2, C.soft);
  const dots = depth === 'deep' ? 3 : depth === 'buried' ? 2 : 1;
  for (let i = 0; i < dots; i++) bm.disc(PAD + 16 + i * 18, PAD + 16, 6, C.ink);
  drawGlyph(bm, DOCK_GLYPH, toPx(centre(island.dock)), TILE * 1.3, 1.3, C.ink);

  // The player's pieces: path, stamps, then the X on top.
  for (const p of pieces) {
    if (p.k === 'path')
      bm.polyline(
        p.pts.map((t) => toPx(centre(t))),
        2.2,
        C.ink,
        [10, 8]
      );
  }
  for (const p of pieces) {
    if (p.k === 'stamp')
      drawGlyph(
        bm,
        LANDMARK_GLYPHS[p.t],
        toPx(centre(p)),
        TILE * 2.2,
        1.6,
        C.ink
      );
  }
  for (const p of pieces) {
    if (p.k === 'x')
      drawGlyph(bm, X_GLYPH, toPx(centre(p)), TILE * 2, 3.2, C.seal);
  }

  return encodePng(IMAGE_SIZE, IMAGE_SIZE, bm.px, PALETTE);
};

/** Palette index of the X ink, for tests. */
export const SEAL_INDEX = C.seal;
export const tileCentrePx = (x: number, y: number): Pt =>
  toPx(centre({ x, y }));
