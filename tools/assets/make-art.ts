// Catalog, subreddit and presentation art (SHIP-5.1, SHIP-5.2) in the Tropical day identity (D24, D25):
// writes one HTML page per asset; tools/assets/render.py screenshots them to PNG.
//   node --experimental-strip-types tools/assets/make-art.ts && python3 tools/assets/render.py
// The banners and title art are a portolan-style sea chart of the real launch-week islands (their
// actual coastlines and names from the shared generator), so the art shows the game's own world.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { coastLoops, smoothLoop } from '../../src/shared/coast.ts';
import { LAUNCH_DAY, addDays, modifierFor } from '../../src/shared/day.ts';
import { COMPASS_GLYPH, LANDMARK_GLYPHS, X_GLYPH, type Glyph } from '../../src/shared/glyphs.ts';
import { generateIsland } from '../../src/shared/island.ts';
import { LOGO_BOX, LOGO_ISLAND, LOGO_PATH, LOGO_X } from '../../src/shared/logo.ts';

const OUT = '/tmp/iom-art';
mkdirSync(OUT, { recursive: true });

const C = {
  paper: '#FFF4DC',
  paper2: '#F3E1B8',
  ink: '#2B1D12',
  inkSoft: '#6A513A',
  hibiscus: '#B8233F',
  lagoon: '#0A6468',
  lagoon2: '#08575C',
  foam: '#FFF7E8',
  sun: '#FFCF6B',
  shallows: '#4CC3B9',
  hatch: '#8CC5BC',
  reef: '#BDE9E1',
  sand: '#F2D99B',
};

const glyph = (gl: Glyph, x: number, y: number, size: number, color: string, w: number): string =>
  gl.strokes
    .map((s) => {
      let d = '';
      for (let i = 0; i + 1 < s.length; i += 2)
        d += `${i ? 'L' : 'M'}${(x - size / 2 + (s[i] ?? 0) * (size / 24)).toFixed(1)} ${(y - size / 2 + (s[i + 1] ?? 0) * (size / 24)).toFixed(1)}`;
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');

/** The logo mark at (x, y) with side `s`. */
const logo = (x: number, y: number, s: number): string => {
  const k = s / LOGO_BOX;
  const xs = LOGO_X.map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${C.hibiscus}" stroke-width="4.5" stroke-linecap="round"/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${k})">
<path d="${LOGO_ISLAND}" fill="${C.shallows}" stroke="${C.shallows}" stroke-width="7" stroke-linejoin="round"/>
<path d="${LOGO_ISLAND}" fill="${C.sand}" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="${LOGO_PATH}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 5"/>${xs}</g>`;
};

type Placed = { day: number; name: string; cx: number; cy: number; size: number };

/** One launch-week island: shallows ring, sand, ink coast, a few landmark glyphs, its name. */
const islandAt = (dayIndex: number, cx: number, cy: number, size: number, label: boolean): { svg: string; placed: Placed } => {
  const day = addDays(LAUNCH_DAY, dayIndex);
  const isl = generateIsland(`maybe-${day}`, modifierFor(day));
  const k = size / 40;
  const ox = cx - size / 2;
  const oy = cy - size / 2;
  const d = coastLoops(isl.terrain)
    .map((l) => smoothLoop(l).map((p, i) => `${i ? 'L' : 'M'}${(ox + p.x * k).toFixed(1)} ${(oy + p.y * k).toFixed(1)}`).join('') + 'Z')
    .join('');
  const marks = isl.landmarks
    .slice(0, 4)
    .map((l) => glyph(LANDMARK_GLYPHS[l.type], ox + (l.at.x + 0.5) * k, oy + (l.at.y + 0.5) * k, size * 0.085, C.ink, Math.max(1, size / 110)))
    .join('');
  const name = label
    ? `<text x="${cx}" y="${cy + size * 0.56}" text-anchor="middle" font-family="Fell" font-size="${Math.max(13, size * 0.11)}" fill="${C.inkSoft}">Day ${dayIndex + 1} · ${isl.name}</text>`
    : '';
  return {
    svg: `<path d="${d}" fill="${C.reef}" stroke="${C.reef}" stroke-width="${size * 0.07}" stroke-linejoin="round" fill-rule="evenodd"/>
<path d="${d}" fill="${C.paper2}" stroke="${C.ink}" stroke-width="${Math.max(1.2, size / 80)}" stroke-linejoin="round" fill-rule="evenodd"/>${marks}${name}`,
    placed: { day: dayIndex, name: isl.name, cx, cy, size },
  };
};

/**
 * A sea chart w × h: paper, a double border, sea hatching, rhumb lines from a compass rose, the
 * given islands, and a dotted route between them that ends in the X on the last one.
 */
const seaChart = (
  w: number,
  h: number,
  islands: { day: number; x: number; y: number; size: number }[],
  rose: { x: number; y: number; r: number },
  labels = true
): string => {
  const rhumbs = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const L = Math.hypot(w, h);
    return `<line x1="${rose.x}" y1="${rose.y}" x2="${(rose.x + Math.cos(a) * L).toFixed(0)}" y2="${(rose.y + Math.sin(a) * L).toFixed(0)}" stroke="${C.hatch}" stroke-width="${i % 2 ? 0.8 : 1.4}" opacity="0.7"/>`;
  }).join('');
  const drawn = islands.map((i) => islandAt(i.day, i.x, i.y, i.size, labels));
  const pts = drawn.map((d) => d.placed);
  let route = '';
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (a === undefined || b === undefined) continue;
    const mx = (a.cx + b.cx) / 2;
    const my = (a.cy + b.cy) / 2 - Math.abs(b.cx - a.cx) * 0.18;
    route += `<path d="M${a.cx + a.size * 0.18} ${a.cy} Q${mx} ${my} ${b.cx - b.size * 0.18} ${b.cy}" fill="none" stroke="${C.ink}" stroke-width="${Math.max(1.6, h / 220)}" stroke-dasharray="${h / 90} ${h / 70}" stroke-linecap="round"/>`;
  }
  const last = pts[pts.length - 1];
  const x = last ? glyph(X_GLYPH, last.cx, last.cy, last.size * 0.32, C.hibiscus, Math.max(3, last.size / 28)) : '';
  const m = Math.min(w, h) * 0.035;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><pattern id="hatch" width="34" height="18" patternUnits="userSpaceOnUse"><path d="M3 9h12M20 2h10M20 16h10" stroke="${C.hatch}" stroke-width="1.4" stroke-linecap="round"/></pattern>
<radialGradient id="age" cx="50%" cy="50%" r="75%"><stop offset="70%" stop-color="${C.paper}" stop-opacity="0"/><stop offset="100%" stop-color="${C.paper2}"/></radialGradient></defs>
<rect width="${w}" height="${h}" fill="${C.paper}"/><rect width="${w}" height="${h}" fill="url(#hatch)" opacity="0.55"/>${rhumbs}
<rect width="${w}" height="${h}" fill="url(#age)"/>
<rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" fill="none" stroke="${C.inkSoft}" stroke-width="2"/>
<rect x="${m + 6}" y="${m + 6}" width="${w - 2 * m - 12}" height="${h - 2 * m - 12}" fill="none" stroke="${C.inkSoft}" stroke-width="0.8"/>
${glyph(COMPASS_GLYPH, rose.x, rose.y, rose.r * 2, C.inkSoft, Math.max(1.5, rose.r / 22))}
<circle cx="${rose.x}" cy="${rose.y}" r="${rose.r * 0.92}" fill="none" stroke="${C.inkSoft}" stroke-width="1"/>
${drawn.map((d) => d.svg).join('')}${route}${x}</svg>`;
};

const fonts = `
@font-face{font-family:Fell;src:url(data:font/woff2;base64,${readFileSync('node_modules/@fontsource/im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff2').toString('base64')})}
@font-face{font-family:Atk;font-weight:700;src:url(data:font/woff2;base64,${readFileSync('node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2').toString('base64')})}`;
const page = (w: number, h: number, body: string): string =>
  `<!doctype html><meta charset="utf-8"><style>${fonts}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${C.paper}}
.word{font-family:Fell;color:${C.ink};line-height:1}.tag{font-family:Fell;color:${C.inkSoft}}.pitch{font-family:Atk;font-weight:700;color:${C.ink}}
.cart{position:absolute;background:${C.paper};border:2px solid ${C.inkSoft};box-shadow:0 0 0 6px ${C.paper},0 0 0 7px ${C.inkSoft}}</style>${body}`;

const waves = (w: number, h: number): string => {
  const rows: string[] = [];
  const step = w / 7;
  for (let y = step * 0.6, r = 0; y < h; y += step * 0.55, r++)
    for (let x = (r % 2) * step * 0.5 - step; x < w; x += step)
      rows.push(`<path d="M${x} ${y}c${step * 0.12} ${-step * 0.1} ${step * 0.25} ${-step * 0.1} ${step * 0.37} 0s${step * 0.25} ${step * 0.1} ${step * 0.37} 0" fill="none" stroke="${C.foam}" stroke-opacity="0.12" stroke-width="${w / 170}" stroke-linecap="round"/>`);
  return rows.join('');
};

/** App icon / tile: the logo mark on the lagoon, with faint waves. No text (reads at 64 px). */
const icon = (w: number, word = false): string =>
  page(
    w,
    w,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}"><rect width="${w}" height="${w}" fill="${C.lagoon}"/>${waves(w, w)}
${word ? logo(w * 0.2, w * 0.1, w * 0.6) : logo(w * 0.12, w * 0.12, w * 0.76)}
${word ? `<text x="${w / 2}" y="${w * 0.86}" text-anchor="middle" font-family="Fell" font-size="${w * 0.1}" fill="${C.foam}">Isle of Maybe</text>` : ''}</svg>`
  );

/** Wide catalog tile (the app page asks for 560x256): logo left, wordmark right, on the lagoon. */
const wideTile = (w: number, h: number): string =>
  page(
    w,
    h,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="position:absolute"><rect width="${w}" height="${h}" fill="${C.lagoon}"/>${waves(w, h)}</svg>
<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:${h * 0.08}px">
<svg width="${h * 0.6}" height="${h * 0.6}" viewBox="0 0 ${h * 0.6} ${h * 0.6}">${logo(0, 0, h * 0.6)}</svg>
<div class="word" style="font-size:${h * 0.19}px;color:${C.foam}">Isle of Maybe</div></div>`
  );

/** Subreddit header: the chart runs edge to edge; the wordmark sits right of centre, clear of Reddit's icon. */
const subBanner = (w: number, h: number, mobile: boolean): string => {
  const s = h * (mobile ? 0.5 : 0.62);
  const isl = mobile
    ? [
        { day: 0, x: w * 0.76, y: h * 0.4, size: s * 0.85 },
        { day: 1, x: w * 0.86, y: h * 0.6, size: s * 0.75 },
        { day: 2, x: w * 0.94, y: h * 0.34, size: s * 0.62 },
      ]
    : [
        { day: 0, x: w * 0.71, y: h * 0.46, size: s * 0.9 },
        { day: 1, x: w * 0.81, y: h * 0.56, size: s * 0.78 },
        { day: 2, x: w * 0.91, y: h * 0.42, size: s * 0.88 },
      ];
  const chart = seaChart(w, h, isl, { x: w * 0.06, y: h * 0.32, r: h * 0.2 }, false);
  const left = mobile ? w * 0.08 : w * 0.24;
  return page(
    w,
    h,
    `${chart}<div style="position:absolute;left:${left}px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:${h * 0.06}px">
<svg width="${h * 0.42}" height="${h * 0.42}" viewBox="0 0 ${h * 0.42} ${h * 0.42}">${logo(0, 0, h * 0.42)}</svg>
<div><div class="word" style="font-size:${h * (mobile ? 0.17 : 0.2)}px">Isle of Maybe</div>
<div class="tag" style="font-size:${h * (mobile ? 0.075 : 0.085)}px;margin-top:${h * 0.03}px">Bury it. Chart it. Trust a stranger’s map.</div></div></div>`
  );
};

/** Featuring image and Devpost cover: the launch-week archipelago with a title cartouche. */
const title = (w: number, h: number): string => {
  const s = h * 0.24;
  const chart = seaChart(
    w,
    h,
    [
      { day: 0, x: w * 0.56, y: h * 0.26, size: s * 0.9 },
      { day: 1, x: w * 0.75, y: h * 0.2, size: s * 0.85 },
      { day: 2, x: w * 0.88, y: h * 0.42, size: s },
      { day: 3, x: w * 0.6, y: h * 0.62, size: s * 0.95 },
      { day: 4, x: w * 0.82, y: h * 0.78, size: s * 1.1 },
    ],
    { x: w * 0.92, y: h * 0.12, r: h * 0.07 }
  );
  return page(
    w,
    h,
    `${chart}<div class="cart" style="left:${w * 0.06}px;top:${h * 0.1}px;width:${w * 0.33}px;padding:${h * 0.04}px ${w * 0.025}px">
<svg width="${h * 0.16}" height="${h * 0.16}" viewBox="0 0 ${h * 0.16} ${h * 0.16}">${logo(0, 0, h * 0.16)}</svg>
<div class="word" style="font-size:${h * 0.1}px;margin-top:${h * 0.02}px">Isle of Maybe</div>
<div class="tag" style="font-size:${h * 0.042}px;margin-top:${h * 0.02}px">Bury it. Chart it. Trust a stranger’s map.</div>
<div class="pitch" style="font-size:${h * 0.03}px;line-height:1.4;margin-top:${h * 0.035}px">A new island every day. Follow a map another redditor drew from memory, then bury your own chest and draw the way for the next sailor.</div></div>`
  );
};

const files: Record<string, string> = {
  'icon-1024': icon(1024),
  'icon-256': icon(256),
  'tile-1080x1080': icon(1080, true),
  'tile-1120x512': wideTile(1120, 512),
  'subreddit-banner-1920x384': subBanner(1920, 384, false),
  'subreddit-banner-mobile-1600x480': subBanner(1600, 480, true),
  'featuring-1920x1080': title(1920, 1080),
  'devpost-gallery-1500x1000': title(1500, 1000),
};
for (const [name, html] of Object.entries(files)) writeFileSync(`${OUT}/${name}.html`, html);
console.log(`wrote ${Object.keys(files).length} pages to ${OUT}`);
