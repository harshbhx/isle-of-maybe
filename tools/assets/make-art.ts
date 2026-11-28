// Catalog and presentation art (SHIP-5.1, SHIP-5.2): writes an HTML page per asset from the real
// launch-day coastline and the shared glyphs; tools/assets/render.py screenshots them to PNG.
//   node --experimental-strip-types tools/assets/make-art.ts && python3 tools/assets/render.py
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { coastLoops, smoothLoop } from '../../src/shared/coast.ts';
import { COMPASS_GLYPH, LANDMARK_GLYPHS, X_GLYPH, type Glyph } from '../../src/shared/glyphs.ts';
import { generateIsland } from '../../src/shared/island.ts';

const OUT = '/tmp/iom-art';
mkdirSync(OUT, { recursive: true });
const island = generateIsland('maybe-2026-12-05', 'clear');
const T = 10; // px per tile in a 400 box
const coast = coastLoops(island.terrain)
  .map((l) => smoothLoop(l).map((p, i) => `${i ? 'L' : 'M'}${(p.x * T).toFixed(1)} ${(p.y * T).toFixed(1)}`).join('') + 'Z')
  .join('');
const g = (gl: Glyph, x: number, y: number, size: number, color: string, w = 2): string =>
  gl.strokes
    .map((s) => {
      let d = '';
      for (let i = 0; i + 1 < s.length; i += 2) d += `${i ? 'L' : 'M'}${x - size / 2 + (s[i] ?? 0) * (size / 24)} ${y - size / 2 + (s[i + 1] ?? 0) * (size / 24)}`;
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');
const lm = island.landmarks.slice(0, 5);
const chest = { x: 26, y: 20 };
const chart = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
<defs><pattern id="h" width="24" height="14" patternUnits="userSpaceOnUse"><path d="M2 7h10M14 0h8M14 14h8" stroke="#C9B58C" stroke-width="1.2" stroke-linecap="round"/></pattern></defs>
<rect width="400" height="400" fill="#F3E6C8"/><rect x="6" y="6" width="388" height="388" fill="url(#h)" stroke="#5C4A36" stroke-width="1.5"/>
<path d="${coast}" fill="#E4D2A8" fill-rule="evenodd" stroke="#2B2118" stroke-width="2"/>
${lm.map((l) => g(LANDMARK_GLYPHS[l.type], (l.at.x + 0.5) * T, (l.at.y + 0.5) * T, 26, '#2B2118', 1.8)).join('')}
<polyline points="${(island.dock.x + 0.5) * T},${(island.dock.y + 0.5) * T} ${(island.dock.x + 0.5) * T},${(chest.y + 0.5) * T} ${(chest.x + 0.5) * T},${(chest.y + 0.5) * T}" fill="none" stroke="#2B2118" stroke-width="2.5" stroke-dasharray="4 4" stroke-linecap="round"/>
${g(X_GLYPH, (chest.x + 0.5) * T, (chest.y + 0.5) * T, 30, '#9E2A22', 4)}${g(COMPASS_GLYPH, 370, 32, 36, '#5C4A36', 1.4)}</svg>`;

/** Bolder, simpler chart for the icon: readable at 64 px. */
const iconChart = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
<rect width="400" height="400" fill="#F3E6C8"/>
<path d="${coast}" fill="#E4D2A8" fill-rule="evenodd" stroke="#2B2118" stroke-width="7"/>
<polyline points="${(island.dock.x + 0.5) * T},${(island.dock.y + 0.5) * T} ${(island.dock.x + 0.5) * T},${(chest.y + 0.5) * T} ${(chest.x + 0.5) * T},${(chest.y + 0.5) * T}" fill="none" stroke="#2B2118" stroke-width="9" stroke-dasharray="14 12" stroke-linecap="round"/>
${g(X_GLYPH, (chest.x + 0.5) * T, (chest.y + 0.5) * T, 110, '#9E2A22', 16)}</svg>`;

const fonts = `
@font-face{font-family:Fell;src:url(data:font/woff2;base64,${readFileSync('node_modules/@fontsource/im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff2').toString('base64')})}
@font-face{font-family:Atk;font-weight:700;src:url(data:font/woff2;base64,${readFileSync('node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2').toString('base64')})}`;
const page = (w: number, h: number, body: string): string =>
  `<!doctype html><meta charset="utf-8"><style>${fonts}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#14202B}
.card{background:#F3E6C8;border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.45);padding:14px}.t{font-family:Fell;color:#F3E6C8}.g{color:#E8B341}.s{font-family:Atk;color:#A9B4BF}</style>${body}`;

const icon = (w: number) =>
  page(w, w, `<div style="width:${w}px;height:${w}px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,#1F4F68,#14202B 72%)">
  <div class="card" style="width:${w * 0.74}px;transform:rotate(-6deg);padding:${w * 0.025}px">${iconChart}</div></div>`);

const banner = (w: number, h: number) =>
  page(w, h, `<div style="display:flex;align-items:center;gap:${w * 0.05}px;padding:0 ${w * 0.07}px;height:${h}px;background:radial-gradient(circle at 75% 50%,#1F4F68,#14202B 65%)">
  <div style="flex:1"><div class="t" style="font-size:${h * 0.15}px;line-height:1">Isle of Maybe</div>
  <div class="t g" style="font-size:${h * 0.065}px;margin-top:${h * 0.03}px">Bury it. Chart it. Trust a stranger’s map.</div>
  <div class="s" style="font-size:${h * 0.04}px;margin-top:${h * 0.05}px;max-width:${w * 0.42}px;line-height:1.35">A new island every day. Follow a map a stranger drew from memory, then draw one for the next sailor.</div></div>
  <div class="card" style="width:${h * 0.72}px;transform:rotate(-4deg)">${chart}</div></div>`);

const files: Record<string, string> = {
  'icon-1024': icon(1024),
  'icon-256': icon(256),
  'featuring-1920x1080': banner(1920, 1080),
  'devpost-gallery-1500x1000': banner(1500, 1000),
  'tile-1080x1080': icon(1080),
};
for (const [name, html] of Object.entries(files)) writeFileSync(`${OUT}/${name}.html`, html);
console.log(`wrote ${Object.keys(files).length} pages to ${OUT}`);
