// The biome's ambient touch (ADV-10.2): smoke from the volcanic peak, autumn leaves drifting down,
// snowfall over Frost, a low mist over the mangrove water. Absent under reduced motion.
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  NormalBlending,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  type Texture,
} from 'three';
import { hash32 } from '../../../../shared/rng.ts';
import type { Ambient } from './biome.ts';
import { ORIGIN, SAMPLES, STEP, type Heights } from './heights.ts';

export type Weather = {
  group: Group;
  tick: (t: number, dt: number) => void;
  dispose: () => void;
};

/** A soft round puff drawn once on a canvas: no image files, no requests. */
export const puffTexture = (leaf: boolean): Texture => {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  if (g !== null) {
    if (leaf) {
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(32, 32, 26, 12, 0.6, 0, Math.PI * 2);
      g.fill();
    } else {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)');
      r.addColorStop(0.45, 'rgba(255,255,255,0.55)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
    }
  }
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
};

const unit = (seed: number, k: number): number =>
  (hash32(`${seed}|${k}`) % 10000) / 10000;

/** Falling flakes or leaves in a box over the island, wrapped back to the top when they land. */
const fall = (seed: number, count: number, leaves: boolean): Weather => {
  const group = new Group();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  const phase = new Float32Array(count);
  const tints = leaves
    ? [0xd0602a, 0xe39632, 0xb33f27, 0xf2c14e]
    : [0xffffff, 0xf2f7fb];
  const c = new Color();
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (unit(seed, i * 5) - 0.5) * 44;
    pos[i * 3 + 1] = unit(seed, i * 5 + 1) * 14;
    pos[i * 3 + 2] = (unit(seed, i * 5 + 2) - 0.5) * 44;
    speed[i] = (leaves ? 0.6 : 0.9) + unit(seed, i * 5 + 3) * 0.7;
    phase[i] = unit(seed, i * 5 + 4) * 6.28;
    c.setHex(tints[i % tints.length] ?? 0xffffff);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  const geo = new BufferGeometry();
  const attr = new Float32BufferAttribute(pos, 3);
  geo.setAttribute('position', attr);
  geo.setAttribute('color', new Float32BufferAttribute(col, 3));
  const map = puffTexture(leaves);
  const mat = new PointsMaterial({
    size: leaves ? 0.26 : 0.16,
    map,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.05,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);
  return {
    group,
    tick: (t, dt) => {
      const step = Math.min(dt, 0.1);
      for (let i = 0; i < count; i++) {
        const p = phase[i] ?? 0;
        const v = speed[i] ?? 1;
        let y = (pos[i * 3 + 1] ?? 0) - v * step;
        if (y < 0) y += 14;
        pos[i * 3 + 1] = y;
        // Leaves flutter side to side; snow drifts on the breeze.
        pos[i * 3] =
          (pos[i * 3] ?? 0) +
          (leaves
            ? Math.sin(t * 2.2 + p) * 0.9
            : 0.25 + Math.sin(t * 0.6 + p) * 0.2) *
            step;
        pos[i * 3 + 2] =
          (pos[i * 3 + 2] ?? 0) + Math.cos(t * 1.4 + p) * 0.3 * step;
        if ((pos[i * 3] ?? 0) > 22) pos[i * 3] = (pos[i * 3] ?? 0) - 44;
      }
      attr.needsUpdate = true;
    },
    dispose: () => {
      geo.dispose();
      mat.dispose();
      map.dispose();
    },
  };
};

/** Puffs rising from a point, growing and fading: the volcano's plume, or low mist banks. */
const puffs = (
  seed: number,
  count: number,
  kind: 'smoke' | 'mist',
  from: { x: number; y: number; z: number }
): Weather => {
  const group = new Group();
  const map = puffTexture(false);
  const items: {
    s: Sprite;
    m: SpriteMaterial;
    life: number;
    ox: number;
    oz: number;
  }[] = [];
  for (let i = 0; i < count; i++) {
    const m = new SpriteMaterial({
      map,
      color: kind === 'smoke' ? 0x77716c : 0xe6eee4,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      opacity: 0,
    });
    const s = new Sprite(m);
    // Drawn after the see-through sea, which would otherwise wash the puffs out.
    s.renderOrder = 3;
    group.add(s);
    items.push({
      s,
      m,
      life: i / count,
      ox: (unit(seed, i * 3) - 0.5) * (kind === 'mist' ? 40 : 0.6),
      oz: (unit(seed, i * 3 + 1) - 0.5) * (kind === 'mist' ? 40 : 0.6),
    });
  }
  return {
    group,
    tick: (_t, dt) => {
      for (const it of items) {
        it.life = (it.life + dt / (kind === 'smoke' ? 9 : 26)) % 1;
        const l = it.life;
        if (kind === 'smoke') {
          // Rise, lean with the wind, swell and thin out.
          it.s.position.set(
            from.x + it.ox + l * 5,
            from.y + 0.6 + l * 14,
            from.z + it.oz + l * 1.2
          );
          it.s.scale.setScalar(1.4 + l * 8);
          it.m.opacity = Math.min(1, Math.sin(l * Math.PI) * 1.1) * 0.8;
        } else {
          // Banks of mist creep across the water and back.
          it.s.position.set(
            it.ox + Math.sin(l * Math.PI * 2) * 3,
            from.y + 0.35,
            it.oz + Math.cos(l * Math.PI * 2) * 2
          );
          it.s.scale.set(11, 2.6, 1);
          it.m.opacity = 0.18 + Math.sin(l * Math.PI) * 0.22;
        }
      }
    },
    dispose: () => {
      for (const it of items) it.m.dispose();
      map.dispose();
    },
  };
};

/** The highest point of the island, where the volcanic plume rises. */
const peak = (h: Heights): { x: number; y: number; z: number } => {
  let best = 0;
  for (let i = 1; i < h.data.length; i++)
    if ((h.data[i] ?? 0) > (h.data[best] ?? 0)) best = i;
  return {
    x: ORIGIN + (best % SAMPLES) * STEP,
    y: h.data[best] ?? 1,
    z: ORIGIN + Math.floor(best / SAMPLES) * STEP,
  };
};

export const createWeather = (
  ambient: Ambient,
  seed: string,
  heights: Heights,
  high: boolean
): Weather | null => {
  const s = hash32(`${seed}:weather`);
  if (ambient === 'snow') return fall(s, high ? 420 : 200, false);
  if (ambient === 'leaves') return fall(s, high ? 140 : 70, true);
  if (ambient === 'smoke')
    return puffs(s, high ? 22 : 12, 'smoke', peak(heights));
  if (ambient === 'mist')
    return puffs(s, high ? 10 : 6, 'mist', { x: 0, y: 0.1, z: 0 });
  return null;
};
