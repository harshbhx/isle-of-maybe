import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inflateSync } from 'node:zlib';
import { coastLoops, smoothLoop } from '../../shared/coast.ts';
import { generateIsland } from '../../shared/island.ts';
import { LANDMARK_GLYPHS } from '../../shared/glyphs.ts';
import { LANDMARK_TYPES, type ChartPiece } from '../../shared/types.ts';
import {
  IMAGE_SIZE,
  SEAL_INDEX,
  chartImage,
  tileCentrePx,
} from './chart-image.ts';
import { crc32, encodePng, pngDataUrl, toBase64 } from './png.ts';

/** Minimal PNG reader for tests: checks every CRC and inflates IDAT with node's zlib. */
const readPng = (png: Uint8Array): { w: number; h: number; px: Uint8Array } => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  let o = 8;
  let w = 0;
  let h = 0;
  const idat: Uint8Array[] = [];
  while (o < png.length) {
    const len = view.getUint32(o);
    const typed = png.subarray(o + 4, o + 8 + len);
    assert.equal(view.getUint32(o + 8 + len), crc32(typed), 'chunk CRC');
    const type = String.fromCharCode(...typed.subarray(0, 4));
    const data = typed.subarray(4);
    if (type === 'IHDR') {
      w = new DataView(data.buffer, data.byteOffset).getUint32(0);
      h = new DataView(data.buffer, data.byteOffset).getUint32(4);
    }
    if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const px = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    px.set(raw.subarray(y * (w + 1) + 1, (y + 1) * (w + 1)), y * w);
  return { w, h, px };
};

test('COM-2.2 the PNG encoder writes a valid indexed PNG', () => {
  const px = new Uint8Array(300 * 260).map((_, i) => i % 3);
  const back = readPng(
    encodePng(300, 260, px, [
      [0, 0, 0],
      [255, 0, 0],
      [0, 0, 255],
    ])
  );
  assert.equal(back.w, 300);
  assert.equal(back.h, 260);
  assert.deepEqual(back.px, px);
  assert.equal(toBase64(new Uint8Array([77, 97, 110, 77])), 'TWFuTQ==');
  assert.ok(
    pngDataUrl(new Uint8Array([1])).startsWith('data:image/png;base64,')
  );
});

test('CHART-2.1 the coastline is a set of closed loops around the land', () => {
  const island = generateIsland('coast-test', 'clear');
  const loops = coastLoops(island.terrain);
  assert.ok(loops.length >= 1);
  for (const l of loops) {
    assert.ok(l.length >= 3);
    for (const p of l)
      assert.ok(p.x >= 0 && p.x <= 41 && p.y >= 0 && p.y <= 41);
  }
  assert.equal(
    smoothLoop(loops[0] ?? [], 2).length,
    (loops[0]?.length ?? 0) * 4
  );
});

test('UI-2.3 every landmark type has a glyph inside its 24-unit box', () => {
  for (const t of LANDMARK_TYPES) {
    const g = LANDMARK_GLYPHS[t];
    assert.ok(g.strokes.length > 0, t);
    for (const s of g.strokes) {
      assert.equal(s.length % 2, 0, t);
      for (const v of s) assert.ok(v >= 0 && v <= 24, `${t} ${v}`);
    }
  }
});

test('COM-2.2 the share image shows the X in seal ink and is the same every time', () => {
  const island = generateIsland('share-test', 'clear');
  const x = { x: island.dock.x, y: island.dock.y - 3 };
  const pieces: ChartPiece[] = [{ k: 'x', ...x }];
  const png = chartImage(island, pieces, 'buried');
  assert.deepEqual(png, chartImage(island, pieces, 'buried'));
  const img = readPng(png);
  assert.equal(img.w, IMAGE_SIZE);
  const c = tileCentrePx(x.x, x.y);
  assert.equal(img.px[Math.round(c.y) * img.w + Math.round(c.x)], SEAL_INDEX);
  assert.ok(png.length < 1_500_000);
});
