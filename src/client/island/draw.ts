// Canvas 2D drawing of the island (UI-3.1): flat colourful tiles, filled landmark glyphs, dock,
// holes, footprints, the sailor, route preview, fog and reveal markers. Pure: state in, pixels out.
import {
  GLYPH_BOX,
  LANDMARK_GLYPHS,
  X_GLYPH,
  type Glyph,
} from '../../shared/glyphs.ts';
import { hash32 } from '../../shared/rng.ts';
import {
  GRASS,
  H,
  LANDMARK,
  ROCK,
  SAND,
  W,
  WATER,
  idx,
  type Island,
  type Tile,
} from '../../shared/types.ts';

export type Footprint = { x: number; y: number; t: number };
export type Marker = {
  at: Tile;
  kind: 'x' | 'chest' | 'chestOpen' | 'preview';
};

export type Scene = {
  island: Island;
  /** Tiles the player can see; null = everything visible. */
  seen: Uint8Array | null;
  /** Fractional tile position (for smooth walking). */
  sailor: { x: number; y: number } | null;
  footprints: readonly Footprint[];
  holes: readonly Tile[];
  route: readonly Tile[];
  markers: readonly Marker[];
  /** Draw a dashed line between the first x and chest markers (reveal). */
  link: boolean;
  /** Tiles that may be tapped (bury); others are dimmed. */
  highlight: Uint8Array | null;
  /** Sand puffs from digs, with the time they started (docs/03-DESIGN.md §8). */
  puffs?: readonly { at: Tile; t: number }[];
  /** When the reveal's X-to-chest line started drawing itself; it takes 500 ms. */
  linkFrom?: number;
  now: number;
};

export type Camera = { tile: number; ox: number; oy: number };

const COL = {
  sea: '#2E6F8E',
  seaDeep: '#1F4F68',
  wave: 'rgba(243,230,200,0.10)',
  sand: '#E9D29A',
  sandEdge: '#d9bd78',
  grass: '#8DB86B',
  grass2: '#82ae60',
  rock: '#7A7166',
  jungle: '#4E7A43',
  pond: '#5A9BB5',
  ink: '#2B2118',
  fog: 'rgba(20,32,43,0.94)',
  fogSoft: 'rgba(20,32,43,0.55)',
  seal: '#9E2A22',
  gold: '#E8B341',
  plank: '#8a6a44',
};

const LANDMARK_FILL: Record<string, string> = {
  palm: '#4E7A43',
  twinPalms: '#4E7A43',
  boulder: '#9b9186',
  skullRock: '#c9c0b0',
  hut: '#b07a4a',
  wreck: '#8a6a44',
  well: '#9b9186',
  statue: '#b9b0a2',
  campfire: '#E8B341',
  cave: '#4a4038',
};

const seenAt = (s: Scene, i: number): boolean =>
  s.seen === null || (((s.seen[i >> 3] ?? 0) >> (i & 7)) & 1) === 1;

const glyphPath = (
  ctx: CanvasRenderingContext2D,
  g: Glyph,
  cx: number,
  cy: number,
  size: number,
  which: 'strokes' | 'fills'
): void => {
  const k = size / GLYPH_BOX;
  ctx.beginPath();
  for (const s of which === 'strokes' ? g.strokes : (g.fills ?? [])) {
    for (let i = 0; i + 1 < s.length; i += 2) {
      const x = cx - size / 2 + (s[i] ?? 0) * k;
      const y = cy - size / 2 + (s[i + 1] ?? 0) * k;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (which === 'fills') ctx.closePath();
  }
};

export const drawGlyph = (
  ctx: CanvasRenderingContext2D,
  g: Glyph,
  cx: number,
  cy: number,
  size: number,
  ink: string,
  fill?: string,
  width = 2
): void => {
  if (fill !== undefined && g.fills !== undefined) {
    ctx.fillStyle = fill;
    glyphPath(ctx, g, cx, cy, size, 'fills');
    ctx.fill();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = (width * size) / GLYPH_BOX;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  glyphPath(ctx, g, cx, cy, size, 'strokes');
  ctx.stroke();
};

const drawSailor = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  ghost: boolean
): void => {
  ctx.save();
  ctx.globalAlpha = ghost ? 0.45 : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + t * 0.32, t * 0.28, t * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f4a6b';
  ctx.beginPath();
  ctx.roundRect(x - t * 0.18, y - t * 0.12, t * 0.36, t * 0.42, t * 0.08);
  ctx.fill();
  ctx.fillStyle = '#f1c9a0';
  ctx.beginPath();
  ctx.arc(x, y - t * 0.22, t * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COL.ink;
  ctx.beginPath();
  ctx.moveTo(x - t * 0.24, y - t * 0.28);
  ctx.lineTo(x + t * 0.24, y - t * 0.28);
  ctx.lineTo(x, y - t * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawChest = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  open: boolean
): void => {
  const w = t * 0.7;
  const h = t * 0.46;
  ctx.fillStyle = '#8a5a2b';
  ctx.strokeStyle = COL.ink;
  ctx.lineWidth = Math.max(1, t * 0.06);
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2 + t * 0.06, w, h, t * 0.05);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COL.gold;
  if (open) {
    ctx.beginPath();
    ctx.ellipse(x, y - h / 2 + t * 0.06, w * 0.42, t * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(x - t * 0.06, y - t * 0.04, t * 0.12, t * 0.14);
  }
};

/** Draw the scene into a canvas of css size (cw, ch); the canvas is already DPR-scaled. */
export const drawScene = (
  ctx: CanvasRenderingContext2D,
  s: Scene,
  cam: Camera,
  cw: number,
  ch: number
): void => {
  const t = cam.tile;
  const X = (tx: number): number => cam.ox + tx * t;
  const Y = (ty: number): number => cam.oy + ty * t;
  const { island } = s;
  // Translucent layers use exact pixel cells so neighbours never overlap into seams.
  const cell = (x: number, y: number): void => {
    const x0 = Math.round(X(x));
    const y0 = Math.round(Y(y));
    ctx.fillRect(x0, y0, Math.round(X(x + 1)) - x0, Math.round(Y(y + 1)) - y0);
  };

  // Sea with drifting wave ticks.
  ctx.fillStyle = COL.seaDeep;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = COL.sea;
  ctx.fillRect(X(0), Y(0), W * t, H * t);
  ctx.strokeStyle = COL.wave;
  ctx.lineWidth = Math.max(1, t * 0.06);
  const drift = (s.now / 900) % 1;
  for (let y = 0; y < H; y += 2) {
    for (let x = (y / 2) % 3; x < W; x += 3) {
      if (island.terrain[idx(x, y)] !== WATER) continue;
      const wx = X(x + drift);
      ctx.beginPath();
      ctx.moveTo(wx, Y(y + 0.5));
      ctx.lineTo(wx + t * 0.5, Y(y + 0.5));
      ctx.stroke();
    }
  }

  // Land tiles.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const code = island.terrain[idx(x, y)];
      if (code === WATER) continue;
      const h = hash32(`${island.seed}|${x},${y}`);
      let fill = COL.sand;
      if (code === GRASS || code === LANDMARK)
        fill = h % 3 === 0 ? COL.grass2 : COL.grass;
      if (code === ROCK)
        fill =
          island.modifier === 'jungle' || h % 4 === 0
            ? COL.jungle
            : h % 5 === 0
              ? COL.pond
              : COL.rock;
      ctx.fillStyle = fill;
      ctx.fillRect(X(x) - 0.5, Y(y) - 0.5, t + 1, t + 1);
      if (code === SAND) {
        // Sand rim toward the water reads as a shoreline.
        ctx.fillStyle = COL.sandEdge;
        if (island.terrain[idx(x, y + 1)] === WATER)
          ctx.fillRect(X(x), Y(y + 1) - t * 0.12, t, t * 0.12);
      }
      if (code === ROCK && fill === COL.rock) {
        ctx.fillStyle = 'rgba(43,33,24,0.25)';
        ctx.beginPath();
        ctx.arc(X(x + 0.35), Y(y + 0.4), t * 0.18, 0, Math.PI * 2);
        ctx.arc(X(x + 0.65), Y(y + 0.62), t * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Dock: planks out into the water.
  ctx.fillStyle = COL.plank;
  for (let i = 0; i < 3; i++)
    ctx.fillRect(
      X(island.dock.x + 0.15),
      Y(island.dock.y + 0.12 + i * 0.3),
      t * 0.7,
      t * 0.2
    );

  // Holes and footprints.
  for (const hole of s.holes) {
    ctx.fillStyle = 'rgba(43,33,24,0.55)';
    ctx.beginPath();
    ctx.ellipse(
      X(hole.x + 0.5),
      Y(hole.y + 0.6),
      t * 0.3,
      t * 0.16,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  for (const f of s.footprints) {
    const age = (s.now - f.t) / 6000;
    if (age >= 1) continue;
    ctx.fillStyle = `rgba(43,33,24,${0.35 * (1 - age)})`;
    ctx.beginPath();
    ctx.arc(X(f.x + 0.4), Y(f.y + 0.55), t * 0.07, 0, Math.PI * 2);
    ctx.arc(X(f.x + 0.6), Y(f.y + 0.45), t * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  const drawLandmarks = (onlyLit: boolean): void => {
    for (const l of island.landmarks) {
      const i = idx(l.at.x, l.at.y);
      if (onlyLit === seenAt(s, i)) continue;
      drawGlyph(
        ctx,
        LANDMARK_GLYPHS[l.type],
        X(l.at.x + 0.5),
        Y(l.at.y + 0.5),
        t * 1.25,
        COL.ink,
        LANDMARK_FILL[l.type],
        1.8
      );
    }
  };
  drawLandmarks(false);

  // Fog over unseen tiles, softer next to seen ones.
  if (s.seen !== null) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = idx(x, y);
        if (seenAt(s, i)) continue;
        const edge =
          (x > 0 && seenAt(s, i - 1)) ||
          (x < W - 1 && seenAt(s, i + 1)) ||
          (y > 0 && seenAt(s, i - W)) ||
          (y < H - 1 && seenAt(s, i + W));
        ctx.fillStyle = edge ? COL.fogSoft : COL.fog;
        cell(x, y);
      }
    }
    // Lantern night: landmarks glow through the fog.
    if (island.modifier === 'lanterns') {
      ctx.save();
      ctx.globalAlpha = 0.85;
      drawLandmarks(true);
      ctx.restore();
    }
  }

  if (s.highlight !== null) {
    for (let i = 0; i < W * H; i++) {
      if (((s.highlight[i >> 3] ?? 0) >> (i & 7)) & 1) continue;
      if (s.seen !== null && !seenAt(s, i)) continue;
      ctx.fillStyle = 'rgba(20,32,43,0.45)';
      cell(i % W, Math.floor(i / W));
    }
  }

  // Route preview: dotted line to a ghost sailor.
  if (s.route.length > 1) {
    ctx.strokeStyle = 'rgba(243,230,200,0.9)';
    ctx.lineWidth = Math.max(2, t * 0.12);
    ctx.setLineDash([t * 0.15, t * 0.25]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    s.route.forEach((p, i) =>
      i === 0
        ? ctx.moveTo(X(p.x + 0.5), Y(p.y + 0.5))
        : ctx.lineTo(X(p.x + 0.5), Y(p.y + 0.5))
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Reveal markers and the dashed line between the chart's X and the chest.
  const x = s.markers.find((m) => m.kind === 'x');
  const chest = s.markers.find(
    (m) => m.kind === 'chest' || m.kind === 'chestOpen'
  );
  if (s.link && x !== undefined && chest !== undefined) {
    const k =
      s.linkFrom === undefined
        ? 1
        : Math.min(1, Math.max(0, (s.now - s.linkFrom) / 500));
    const ax = X(x.at.x + 0.5);
    const ay = Y(x.at.y + 0.5);
    ctx.strokeStyle = COL.ink;
    ctx.lineWidth = Math.max(2, t * 0.1);
    ctx.setLineDash([t * 0.25, t * 0.2]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(
      ax + (X(chest.at.x + 0.5) - ax) * k,
      ay + (Y(chest.at.y + 0.5) - ay) * k
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const m of s.markers) {
    const cx = X(m.at.x + 0.5);
    const cy = Y(m.at.y + 0.5);
    if (m.kind === 'x')
      drawGlyph(ctx, X_GLYPH, cx, cy, t * 1.3, COL.seal, undefined, 3.5);
    else if (m.kind === 'preview') {
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = Math.max(2, t * 0.1);
      ctx.strokeRect(X(m.at.x) + 1, Y(m.at.y) + 1, t - 2, t - 2);
      drawChest(ctx, cx, cy, t, false);
    } else drawChest(ctx, cx, cy, t, m.kind === 'chestOpen');
  }

  // Sand puffs: six grains thrown out and fading over 300 ms.
  for (const p of s.puffs ?? []) {
    const age = (s.now - p.t) / 300;
    if (age < 0 || age >= 1) continue;
    ctx.fillStyle = `rgba(233,210,154,${1 - age})`;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.arc(
        X(p.at.x + 0.5) + Math.cos(a) * t * 0.55 * age,
        Y(p.at.y + 0.5) + Math.sin(a) * t * 0.4 * age - t * 0.2 * age,
        t * 0.08,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  if (s.sailor !== null)
    drawSailor(ctx, X(s.sailor.x + 0.5), Y(s.sailor.y + 0.5), t, false);
  const end = s.route[s.route.length - 1];
  if (s.route.length > 1 && end !== undefined)
    drawSailor(ctx, X(end.x + 0.5), Y(end.y + 0.5), t, true);
};

/** Camera centred on a point, clamped to the island. */
export const cameraFor = (
  cw: number,
  ch: number,
  zoom: number,
  focus: { x: number; y: number } | null
): Camera => {
  const fitTile = Math.min(cw / W, ch / H);
  // zoom 0 = the whole island; 1× = 18 tiles across the short side; 2× = 9 tiles.
  const tile =
    zoom <= 0 ? fitTile : Math.max(fitTile, Math.min(cw, ch) / 18) * zoom;
  const worldW = W * tile;
  const worldH = H * tile;
  const fx = focus === null ? W / 2 : focus.x + 0.5;
  const fy = focus === null ? H / 2 : focus.y + 0.5;
  const clamp = (o: number, view: number, world: number): number =>
    world <= view ? (view - world) / 2 : Math.min(0, Math.max(view - world, o));
  return {
    tile,
    ox: clamp(cw / 2 - fx * tile, cw, worldW),
    oy: clamp(ch / 2 - fy * tile, ch, worldH),
  };
};

export const tileAt = (cam: Camera, px: number, py: number): Tile | null => {
  const x = Math.floor((px - cam.ox) / cam.tile);
  const y = Math.floor((py - cam.oy) / cam.tile);
  return x < 0 || y < 0 || x >= W || y >= H ? null : { x, y };
};
