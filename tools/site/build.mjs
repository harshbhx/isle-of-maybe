// Builds the website in site/ (SHIP-9): pages from tools/site/pages, Privacy and Terms from the
// repo's Markdown, today's-island script from the game's shared code, and assets from brand/.
//   node tools/site/build.mjs           write everything
//   import { renderPages } ...          the pages alone, for the freshness test (SHIP-9.3)
// The output is plain files, so Cloudflare serves site/ with no build step (D35).
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = join(ROOT, 'site');
const PAGES = join(ROOT, 'tools', 'site', 'pages');
// The address Cloudflare gives the project; links in cards and the canonical tag use it.
export const SITE_URL =
  process.env.SITE_URL ?? 'https://isle-of-maybe.pages.dev';

const BIOMES = [
  ['tropical', 'Tropical', 'Palms and warm shallows.'],
  ['volcanic', 'Volcanic', 'Black sand under a smoking peak.'],
  ['autumn', 'Autumn', 'Golden meadows and falling leaves.'],
  ['mangrove', 'Mangrove', 'Mud flats and mist on the water.'],
  ['frost', 'Frost', 'Snow on the meadows, ice in the ponds.'],
  ['coral', 'Coral', 'White sand and a reef offshore.'],
];

const esc = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Inline Markdown: code, bold, italics and links (repo links become site links). */
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
      const map = { 'PRIVACY.md': '/privacy', 'TERMS.md': '/terms' };
      return `<a href="${map[href] ?? href}">${text}</a>`;
    })
    .replace(
      /(^|[\s(])(https:\/\/[^\s<)]+[^\s<).,])/g,
      '$1<a href="$2">$2</a>'
    );

/** The small Markdown subset our policies use: headings, paragraphs, lists, tables, bold, links. */
export const markdown = (md) => {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  let title = '';
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i++;
      continue;
    }
    const h = /^(#{1,3}) (.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      if (level === 1) title = h[2];
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('|'))
        rows.push(lines[i++] ?? '');
      const cells = (r) =>
        r
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push(
        '<div class="table"><table><thead><tr>' +
          cells(head ?? '')
            .map((c) => `<th scope="col">${inline(c)}</th>`)
            .join('') +
          '</tr></thead><tbody>' +
          body
            .map(
              (r) =>
                '<tr>' +
                cells(r)
                  .map((c) => `<td>${inline(c)}</td>`)
                  .join('') +
                '</tr>'
            )
            .join('') +
          '</tbody></table></div>'
      );
      continue;
    }
    if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i] ?? ''))
        items.push((lines[i++] ?? '').replace(/^(- |\d+\. )/, ''));
      const tag = ordered ? 'ol' : 'ul';
      out.push(
        `<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`
      );
      continue;
    }
    // A paragraph runs until a blank line; lines ending in two spaces or a bold label break.
    const para = [];
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !/^(#|\||- |\d+\. )/.test(lines[i] ?? '')
    )
      para.push(lines[i++] ?? '');
    out.push(`<p>${para.map(inline).join('<br>')}</p>`);
  }
  return { title, html: out.join('\n') };
};

const frontMatter = (src) => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(src);
  if (!m) throw new Error('page without front matter');
  const meta = Object.fromEntries(
    m[1].split('\n').map((l) => {
      const k = l.indexOf(':');
      return [l.slice(0, k).trim(), l.slice(k + 1).trim()];
    })
  );
  return { meta, body: src.slice(m[0].length) };
};

const layout = (meta, body) => {
  const tpl = readFileSync(join(PAGES, '_layout.html'), 'utf8');
  return tpl
    .replace(/\{\{nav:([^}]+)\}\}/g, (_, p) =>
      p === meta.path ? ' aria-current="page"' : ''
    )
    .replaceAll('{{title}}', esc(meta.title))
    .replaceAll('{{description}}', esc(meta.description))
    .replaceAll('{{url}}', SITE_URL)
    .replaceAll('{{path}}', meta.path === '/' ? '/' : meta.path)
    .replace('{{body}}', body.trim());
};

const biomeFigures = () =>
  BIOMES.map(
    ([k, name, line]) =>
      `      <figure><img src="/assets/img/biome-${k}.webp" alt="A ${name.toLowerCase()} island in the game" width="900" height="600" loading="lazy"><figcaption><b>${name}</b>${line}</figcaption></figure>`
  ).join('\n');

/** Every HTML page, as file name → contents. Pure apart from reading sources (SHIP-9.3 test). */
export const renderPages = () => {
  const pages = {};
  for (const f of readdirSync(PAGES)) {
    if (f.startsWith('_') || !f.endsWith('.html')) continue;
    const { meta, body } = frontMatter(readFileSync(join(PAGES, f), 'utf8'));
    pages[f] = layout(meta, body.replace('{{biomes}}', biomeFigures()));
  }
  for (const [md, path, file, description] of [
    [
      'PRIVACY.md',
      '/privacy',
      'privacy.html',
      'What Isle of Maybe stores, why, for how long, and who can see it.',
    ],
    [
      'TERMS.md',
      '/terms',
      'terms.html',
      'The terms for playing Isle of Maybe and installing it in a community.',
    ],
  ]) {
    const { title, html } = markdown(readFileSync(join(ROOT, md), 'utf8'));
    pages[file] = layout(
      { path, title, description },
      `<div class="paper doc"><article class="wrap">\n${html}\n</article></div>`
    );
  }
  return pages;
};

const copy = (from, to) => {
  mkdirSync(dirname(join(SITE, to)), { recursive: true });
  copyFileSync(join(ROOT, from), join(SITE, to));
};

const main = async () => {
  for (const [file, html] of Object.entries(renderPages()))
    writeFileSync(join(SITE, file), html);
  const { build } = await import('esbuild');
  await build({
    entryPoints: [join(ROOT, 'tools/site/today.ts')],
    outfile: join(SITE, 'assets/today.js'),
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2020',
    legalComments: 'none',
  });
  const font = (pkg, w) =>
    `node_modules/@fontsource/${pkg}/files/${pkg}-latin-${w}-normal.woff2`;
  copy(font('fraunces', 700), 'assets/fonts/fraunces-700.woff2');
  copy(font('fraunces', 900), 'assets/fonts/fraunces-900.woff2');
  copy(font('bricolage-grotesque', 400), 'assets/fonts/bricolage-400.woff2');
  copy(font('bricolage-grotesque', 600), 'assets/fonts/bricolage-600.woff2');
  copy(font('bricolage-grotesque', 800), 'assets/fonts/bricolage-800.woff2');
  copy(
    'brand/logo/lockup/isle-of-maybe-lockup-horizontal-on-dark.svg',
    'assets/img/lockup-on-dark.svg'
  );
  for (const [k] of BIOMES)
    copy(
      `brand/biomes/isle-of-maybe-biome-${k}.webp`,
      `assets/img/biome-${k}.webp`
    );
  copy('brand/icons/favicon.svg', 'favicon.svg');
  copy('brand/icons/favicon.ico', 'favicon.ico');
  copy(
    'brand/icons/png/isle-of-maybe-app-icon-180.png',
    'apple-touch-icon.png'
  );
  copy('brand/social/isle-of-maybe-og-1200x630.png', 'og.png');
  for (const f of [
    'logo/lockup/isle-of-maybe-lockup-horizontal-on-light.svg',
    'logo/lockup/isle-of-maybe-lockup-horizontal-on-dark.svg',
    'logo/lockup/png/isle-of-maybe-lockup-horizontal-on-light-1600.png',
    'icons/isle-of-maybe-app-icon.svg',
    'icons/png/isle-of-maybe-app-icon-1024.png',
    'biomes/isle-of-maybe-six-biomes.webp',
  ])
    copy(`brand/${f}`, `press/${f.split('/').pop()}`);
  writeFileSync(
    join(SITE, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
      '/',
      '/how-to-play',
      '/press',
      '/privacy',
      '/terms',
    ]
      .map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`)
      .join('\n')}\n</urlset>\n`
  );
  writeFileSync(
    join(SITE, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
  console.log('site/ built:', Object.keys(renderPages()).length, 'pages');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
