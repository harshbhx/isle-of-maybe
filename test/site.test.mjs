// Website checks (SHIP-9.2, SHIP-9.3): the committed site matches its sources and loads nothing
// from anywhere else.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { renderPages } from '../tools/site/build.mjs';

const SITE = new URL('../site/', import.meta.url).pathname;

test('SHIP-9.3 the site pages, including Privacy and Terms, match their sources', () => {
  for (const [file, html] of Object.entries(renderPages()))
    assert.equal(
      readFileSync(join(SITE, file), 'utf8'),
      html,
      `site/${file} is stale: run node tools/site/build.mjs`
    );
});

test('SHIP-9.3 Privacy and Terms carry the policies word for word', () => {
  const privacy = readFileSync(join(SITE, 'privacy.html'), 'utf8');
  const terms = readFileSync(join(SITE, 'terms.html'), 'utf8');
  assert.match(privacy, /<h1>Isle of Maybe: Privacy Policy<\/h1>/);
  assert.match(privacy, /Nothing is sold, and nothing is used to train AI/);
  assert.match(terms, /<h1>Isle of Maybe: Terms of Use<\/h1>/);
  assert.doesNotMatch(terms, /href="PRIVACY\.md"/);
});

test('SHIP-9.2 pages and styles load only the site’s own files', () => {
  const files = readdirSync(SITE).filter((f) => f.endsWith('.html'));
  for (const f of files) {
    const html = readFileSync(join(SITE, f), 'utf8');
    // Links out are fine; anything the browser fetches by itself must be local.
    for (const tag of html.match(/<(script|img|source|video|link)\b[^>]*>/g) ??
      [])
      if (!tag.includes('rel="canonical"'))
        assert.doesNotMatch(
          tag,
          /(src|href|poster)="(https?:)?\/\//,
          `${f}: ${tag}`
        );
    assert.doesNotMatch(
      html,
      /style="/,
      `${f} has an inline style (blocked by the CSP)`
    );
    assert.doesNotMatch(
      html,
      /<script>(?!<\/script>)/,
      `${f} has an inline script`
    );
  }
  const css = readFileSync(join(SITE, 'assets/site.css'), 'utf8');
  assert.doesNotMatch(css, /url\(['"]?(https?:)?\/\//);
  assert.match(
    readFileSync(join(SITE, '_headers'), 'utf8'),
    /default-src 'self'/
  );
});
