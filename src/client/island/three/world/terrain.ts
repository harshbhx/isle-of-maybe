// The sculpted ground mesh (ADV-4.1): one smooth surface over the island and the sea floor,
// coloured by what each spot is (wet and dry sand, grass, jungle floor, cliff rock) and by slope,
// in the day's biome palette (ADV-10.2).
import { BufferAttribute, BufferGeometry, Color } from 'three';
import { hash32 } from '../../../../shared/rng.ts';
import { toTile } from '../../../../shared/relief.ts';
import { tileKind } from '../../../../shared/relief.ts';
import type { Island } from '../../../../shared/types.ts';
import type { GroundPalette } from './biome.ts';
import { ORIGIN, SAMPLES, STEP, type Heights } from './heights.ts';

const toColors = (p: GroundPalette): Record<keyof GroundPalette, Color> => ({
  seabedDeep: new Color(p.seabedDeep),
  seabed: new Color(p.seabed),
  wetSand: new Color(p.wetSand),
  sand: new Color(p.sand),
  drySand: new Color(p.drySand),
  grass: new Color(p.grass),
  grassDark: new Color(p.grassDark),
  grassLight: new Color(p.grassLight),
  jungleFloor: new Color(p.jungleFloor),
  rock: new Color(p.rock),
  rockDark: new Color(p.rockDark),
  pondBed: new Color(p.pondBed),
});

export const buildTerrainGeometry = (
  island: Island,
  heights: Heights,
  palette: GroundPalette
): BufferGeometry => {
  const GROUND = toColors(palette);
  const n = SAMPLES;
  const pos = new Float32Array(n * n * 3);
  const col = new Float32Array(n * n * 3);
  const c = new Color();
  const seed = hash32(`${island.seed}:tint`);
  for (let sy = 0; sy < n; sy++)
    for (let sx = 0; sx < n; sx++) {
      const i = sy * n + sx;
      const wx = ORIGIN + sx * STEP;
      const wz = ORIGIN + sy * STEP;
      const h = heights.data[i] ?? 0;
      pos[i * 3] = wx;
      pos[i * 3 + 1] = h;
      pos[i * 3 + 2] = wz;
      // Slope from neighbouring samples: steep spots read as rock or packed earth.
      const hx =
        (heights.data[sy * n + Math.min(n - 1, sx + 1)] ?? h) -
        (heights.data[sy * n + Math.max(0, sx - 1)] ?? h);
      const hz =
        (heights.data[Math.min(n - 1, sy + 1) * n + sx] ?? h) -
        (heights.data[Math.max(0, sy - 1) * n + sx] ?? h);
      const slope = Math.hypot(hx, hz) / (2 * STEP);
      const t = toTile(wx, wz);
      const kind = t === null ? 'water' : tileKind(island, t.x, t.y);
      const jitter = ((hash32(`${seed}|${sx},${sy}`) % 100) / 100 - 0.5) * 0.06;
      if (h < 0.0) {
        c.copy(GROUND.seabed).lerp(GROUND.seabedDeep, Math.min(1, -h / 1.4));
      } else if (kind === 'rock' || slope > 1.6) {
        c.copy(GROUND.rock).lerp(GROUND.rockDark, Math.min(1, slope / 3));
      } else if (kind === 'pond') {
        c.copy(GROUND.pondBed);
      } else if (kind === 'jungle') {
        c.copy(GROUND.jungleFloor);
      } else if (h < 0.44) {
        // Beach: wet low down, pale and dry higher up.
        c.copy(GROUND.wetSand).lerp(
          GROUND.sand,
          Math.min(1, (h - 0.12) / 0.15)
        );
        if (h > 0.33) c.lerp(GROUND.drySand, (h - 0.33) / 0.11);
      } else {
        const g =
          (hash32(`${seed}|g${Math.floor(sx / 2)},${Math.floor(sy / 2)}`) % 3) /
          2;
        c.copy(GROUND.grass).lerp(
          g < 0.5 ? GROUND.grassDark : GROUND.grassLight,
          0.35 * g
        );
        // The grass line blends into the sand rather than stopping at a tile edge.
        if (h < 0.5) c.lerp(GROUND.drySand, (0.5 - h) / 0.06);
      }
      col[i * 3] = Math.min(1, Math.max(0, c.r + jitter));
      col[i * 3 + 1] = Math.min(1, Math.max(0, c.g + jitter));
      col[i * 3 + 2] = Math.min(1, Math.max(0, c.b + jitter * 0.6));
    }
  const index = new Uint32Array((n - 1) * (n - 1) * 6);
  let k = 0;
  for (let y = 0; y < n - 1; y++)
    for (let x = 0; x < n - 1; x++) {
      const a = y * n + x;
      const b = a + 1;
      const d = a + n;
      const e = d + 1;
      index[k++] = a;
      index[k++] = d;
      index[k++] = b;
      index[k++] = b;
      index[k++] = d;
      index[k++] = e;
    }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('color', new BufferAttribute(col, 3));
  g.setIndex(new BufferAttribute(index, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
};
