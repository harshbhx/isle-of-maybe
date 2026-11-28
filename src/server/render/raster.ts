// Minimal raster drawing on a palette-indexed bitmap: round-capped thick lines and even-odd
// polygon fills. Enough for ink charts.
import type { Pt } from '../../shared/coast.ts';

export class Bitmap {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  constructor(w: number, h: number, fill = 0) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h).fill(fill);
  }

  set(x: number, y: number, c: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }

  get(x: number, y: number): number {
    return this.px[y * this.w + x] ?? 0;
  }

  disc(cx: number, cy: number, r: number, c: number): void {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r2) this.set(x, y, c);
      }
    }
  }

  /** A line of width 2r with round caps. `dash` = [on, off] in pixels. */
  line(
    a: Pt,
    b: Pt,
    r: number,
    c: number,
    dash?: readonly [number, number]
  ): void {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(len / Math.max(0.5, r / 2)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (dash !== undefined && (t * len) % (dash[0] + dash[1]) > dash[0])
        continue;
      this.disc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, r, c);
    }
  }

  polyline(
    pts: readonly Pt[],
    r: number,
    c: number,
    dash?: readonly [number, number]
  ): void {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (a !== undefined && b !== undefined) this.line(a, b, r, c, dash);
    }
  }

  /** Even-odd scanline fill of one or more closed polygons. */
  fillPolys(polys: readonly (readonly Pt[])[], c: number): void {
    for (let y = 0; y < this.h; y++) {
      const sy = y + 0.5;
      const xs: number[] = [];
      for (const poly of polys) {
        for (let i = 0; i < poly.length; i++) {
          const p = poly[i];
          const q = poly[(i + 1) % poly.length];
          if (p === undefined || q === undefined) continue;
          if (p.y <= sy === q.y <= sy) continue;
          xs.push(p.x + ((sy - p.y) * (q.x - p.x)) / (q.y - p.y));
        }
      }
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const from = Math.ceil((xs[i] ?? 0) - 0.5);
        const to = Math.floor((xs[i + 1] ?? 0) - 0.5);
        for (let x = from; x <= to; x++) this.set(x, y, c);
      }
    }
  }
}
