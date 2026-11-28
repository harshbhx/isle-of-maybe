// Pure drawing helpers shared by chart and glyph components (kept out of component files).
import { coastLoops, smoothLoop } from '../../shared/coast.ts';
import type { Stroke } from '../../shared/glyphs.ts';
import type { Island } from '../../shared/types.ts';

export const CHART_PX = 400;
export const TILE_PX = CHART_PX / 40;

/** Tile centre in chart pixels. */
export const px = (t: number): number => (t + 0.5) * TILE_PX;

export const strokePath = (s: Stroke, ox = 0, oy = 0, k = 1): string => {
  let d = '';
  for (let i = 0; i + 1 < s.length; i += 2) {
    d += `${i === 0 ? 'M' : 'L'}${ox + (s[i] ?? 0) * k} ${oy + (s[i + 1] ?? 0) * k}`;
  }
  return d;
};

const coastCache = new Map<string, string>();

/** SVG path for the island's shoreline in chart pixels, cached per island. */
export const coastPath = (island: Island): string => {
  const key = island.seed + island.modifier;
  const hit = coastCache.get(key);
  if (hit !== undefined) return hit;
  const d = coastLoops(island.terrain)
    .map(
      (l) =>
        smoothLoop(l)
          .map(
            (p, i) =>
              `${i === 0 ? 'M' : 'L'}${(p.x * TILE_PX).toFixed(1)} ${(p.y * TILE_PX).toFixed(1)}`
          )
          .join('') + 'Z'
    )
    .join('');
  coastCache.set(key, d);
  return d;
};
