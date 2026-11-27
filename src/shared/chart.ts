// Chart validation (limited expression kit) and the Ink check grade (ENG-5).
import { euclid } from './path.ts';
import {
  LANDMARK_TYPES,
  inBounds,
  type ChartPiece,
  type Island,
  type LandmarkType,
  type Tile,
} from './types.ts';

export const MAX_STAMPS = 6;
export const MAX_SEGMENTS = 8;

export type ChartCheck = { ok: true } | { ok: false; reason: string };

const isInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n);
const okTile = (t: { x: unknown; y: unknown }): boolean =>
  isInt(t.x) && isInt(t.y) && inBounds(t.x, t.y);
const isLandmarkType = (t: unknown): t is LandmarkType =>
  typeof t === 'string' && (LANDMARK_TYPES as readonly string[]).includes(t);

/** Validate a chart's pieces (ENG-5.1). Works on untrusted input. */
export const validateChart = (pieces: readonly ChartPiece[]): ChartCheck => {
  if (!Array.isArray(pieces))
    return { ok: false, reason: 'pieces must be a list' };
  let stamps = 0;
  let paths = 0;
  let xs = 0;
  for (const p of pieces) {
    if (p.k === 'stamp') {
      if (!isLandmarkType(p.t)) return { ok: false, reason: 'unknown stamp' };
      if (!okTile(p)) return { ok: false, reason: 'stamp out of bounds' };
      stamps++;
    } else if (p.k === 'path') {
      if (
        !Array.isArray(p.pts) ||
        p.pts.length < 2 ||
        p.pts.length > MAX_SEGMENTS + 1
      ) {
        return { ok: false, reason: `path needs 2–${MAX_SEGMENTS + 1} points` };
      }
      for (let i = 0; i < p.pts.length; i++) {
        const t = p.pts[i];
        if (t === undefined || !okTile(t))
          return { ok: false, reason: 'path point out of bounds' };
        const prev = p.pts[i - 1];
        if (prev !== undefined && prev.x === t.x && prev.y === t.y) {
          return { ok: false, reason: 'path has a zero-length segment' };
        }
      }
      paths++;
    } else if (p.k === 'x') {
      if (!okTile(p)) return { ok: false, reason: 'X out of bounds' };
      xs++;
    } else {
      return { ok: false, reason: 'unknown piece' };
    }
  }
  if (stamps > MAX_STAMPS)
    return { ok: false, reason: `at most ${MAX_STAMPS} stamps` };
  if (paths > 1) return { ok: false, reason: 'at most one path' };
  if (xs !== 1) return { ok: false, reason: 'exactly one X' };
  return { ok: true };
};

export type Grade = 'sharp' | 'steady' | 'wobbly' | 'cursed';
export type InkCheck = { grade: Grade; xError: number; stampErrors: number[] };

/** Distance used when a stamp's landmark type doesn't exist on the island. */
export const MISSING_STAMP_ERROR = 10;

/** Ink check: how close the chart is to the truth (ENG-5.2). */
export const inkCheck = (
  island: Island,
  chest: Tile,
  pieces: readonly ChartPiece[]
): InkCheck => {
  const stampErrors = pieces.flatMap((p) => {
    if (p.k !== 'stamp') return [];
    const same = island.landmarks.filter((l) => l.type === p.t);
    if (same.length === 0) return [MISSING_STAMP_ERROR];
    return [Math.min(...same.map((l) => euclid(l.at, p)))];
  });
  const x = pieces.find((p) => p.k === 'x');
  const xError = x === undefined ? Infinity : euclid(x, chest);
  const meanStamp =
    stampErrors.length === 0
      ? 0
      : stampErrors.reduce((a, b) => a + b, 0) / stampErrors.length;
  const grade: Grade =
    xError <= 1 && meanStamp <= 1.5
      ? 'sharp'
      : xError <= 3
        ? 'steady'
        : xError <= 6
          ? 'wobbly'
          : 'cursed';
  return { grade, xError, stampErrors };
};

/** The chart's X, if any. */
export const chartX = (pieces: readonly ChartPiece[]): Tile | null => {
  for (const p of pieces) if (p.k === 'x') return { x: p.x, y: p.y };
  return null;
};
