// Fails the build if the client bundle points outside itself (e.g. a font URL Vite couldn't
// resolve, which otherwise ships silently as a 404). AGENTS.md rule 4: no external requests.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist/client';
const bad = [];
for (const f of readdirSync(dir)) {
  if (!/\.(css|js|html)$/.test(f)) continue;
  const text = readFileSync(join(dir, f), 'utf8');
  for (const m of text.matchAll(/url\(([^)]+)\)/g)) {
    const u = m[1].replace(/["']/g, '');
    if (u.startsWith('data:') || u.startsWith('#') || u.startsWith('/') && !u.includes('node_modules')) continue;
    if (u.includes('node_modules') || /^https?:/.test(u)) bad.push(`${f}: ${u}`);
  }
}
if (bad.length > 0) {
  console.error(`dist/client refers to files it doesn't contain:\n${bad.join('\n')}`);
  process.exit(1);
}
console.log('dist/client is self-contained');
