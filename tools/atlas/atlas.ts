// Atlas (ENG-7.1): the next 30 days of islands on one HTML page, for reviewing seeds before they
// post. Dock, labelled landmarks, deep-zone shading and the modifier. Dev only, never shipped.
//   npm run atlas [-- 2026-12-05 [days] [out.html]]
import { writeFileSync } from 'node:fs';
import { addDays, dayNumber, modifierFor } from '../../src/shared/day.ts';
import { depthClass } from '../../src/shared/depth.ts';
import { generateIsland, seedFor } from '../../src/shared/island.ts';
import { OVERRIDES } from '../../src/shared/overrides.ts';
import { GRASS, H, LANDMARK, ROCK, SAND, W, WATER, idx } from '../../src/shared/types.ts';

const start = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const days = Number(process.argv[3] ?? 30);
const out = process.argv[4] ?? 'atlas.html';
const PX = 8;
const COLOR: Record<number, string> = { [WATER]: '#2E6F8E', [SAND]: '#E9D29A', [GRASS]: '#8DB86B', [ROCK]: '#7A7166', [LANDMARK]: '#8DB86B' };
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const card = (day: string): string => {
  const modifier = modifierFor(day);
  const seed = seedFor(day);
  const island = generateIsland(seed, modifier);
  let tiles = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const code = island.terrain[idx(x, y)] ?? WATER;
      tiles += `<rect x="${x * PX}" y="${y * PX}" width="${PX}" height="${PX}" fill="${COLOR[code] ?? '#000'}"/>`;
      if (code !== WATER && code !== ROCK && code !== LANDMARK && depthClass({ x, y }, island.landmarks) === 'deep') {
        tiles += `<rect x="${x * PX}" y="${y * PX}" width="${PX}" height="${PX}" fill="#9E2A22" opacity="0.28"/>`;
      }
    }
  }
  const marks = island.landmarks
    .map((l) => `<circle cx="${(l.at.x + 0.5) * PX}" cy="${(l.at.y + 0.5) * PX}" r="3.5" fill="#2B2118"/><text x="${(l.at.x + 1) * PX}" y="${l.at.y * PX}" font-size="9" fill="#14202B" stroke="#F3E6C8" stroke-width="2.5" paint-order="stroke">${l.type}</text>`)
    .join('');
  const dock = `<rect x="${island.dock.x * PX}" y="${island.dock.y * PX}" width="${PX}" height="${PX}" fill="none" stroke="#E8B341" stroke-width="2.5"/>`;
  const weekday = WEEKDAY[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? '';
  const overridden = day in OVERRIDES ? ' · <b>override</b>' : '';
  return `<figure><svg width="${W * PX}" height="${H * PX}" viewBox="0 0 ${W * PX} ${H * PX}">${tiles}${dock}${marks}</svg>
<figcaption><b>${esc(day)}</b> ${weekday} · Day ${dayNumber(day)} · ${esc(island.name)}<br>${modifier} · ${island.landmarks.length} landmarks · seed <code>${esc(island.seed)}</code>${overridden}</figcaption></figure>`;
};

const cards = Array.from({ length: days }, (_, i) => card(addDays(start, i))).join('\n');
writeFileSync(
  out,
  `<!doctype html><meta charset="utf-8"><title>Isle of Maybe · Atlas from ${esc(start)}</title>
<style>body{font:13px system-ui;background:#14202B;color:#F3E6C8;margin:16px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:18px}figure{margin:0}figcaption{margin-top:4px;line-height:1.4}code{color:#E8B341}</style>
<h1>Atlas: ${days} islands from ${esc(start)}</h1><p>Gold square = dock · red tint = deep zone · dots = landmarks. Unfair island? Add its date to <code>src/shared/overrides.ts</code> (ENG-2.8).</p>
<main>${cards}</main>`
);
console.log(`wrote ${out} (${days} islands from ${start})`);
