// Small hand-written validators for untrusted request bodies (HUNT-6.2). No `any`, no casts.
import {
  LANDMARK_TYPES,
  inBounds,
  type ChartPiece,
  type Tile,
} from '../../shared/types.ts';
import {
  BOARD_KINDS,
  VOTES,
  type BoardKind,
  type Vote,
} from '../../shared/api.ts';
import { ApiError } from './errors.ts';

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const reqString = (
  body: Record<string, unknown>,
  key: string,
  max = 64
): string => {
  const v = body[key];
  if (typeof v !== 'string' || v.length === 0 || v.length > max) {
    throw new ApiError('bad_request', `${key} must be a non-empty string`);
  }
  return v;
};

export const reqInt = (
  body: Record<string, unknown>,
  key: string,
  min: number,
  max: number
): number => {
  const v = body[key];
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    throw new ApiError(
      'bad_request',
      `${key} must be an integer in ${min}..${max}`
    );
  }
  return v;
};

export const asTile = (v: unknown): Tile => {
  if (!isRecord(v)) throw new ApiError('bad_request', 'tile must be an object');
  const { x, y } = v;
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    !inBounds(x, y)
  ) {
    throw new ApiError('bad_request', 'tile out of bounds');
  }
  return { x, y };
};

export const reqTile = (body: Record<string, unknown>, key: string): Tile =>
  asTile(body[key]);

export const reqTiles = (
  body: Record<string, unknown>,
  key: string,
  max: number
): Tile[] => {
  const v = body[key];
  if (!Array.isArray(v) || v.length > max)
    throw new ApiError(
      'bad_request',
      `${key} must be a list of at most ${max}`
    );
  return v.map(asTile);
};

export const reqBody = (v: unknown): Record<string, unknown> => {
  if (!isRecord(v))
    throw new ApiError('bad_request', 'body must be a JSON object');
  return v;
};

/** Rebuild chart pieces field by field, so nothing unexpected is stored (ENG-5.1 checks the rest). */
export const asPiece = (v: unknown): ChartPiece => {
  if (!isRecord(v))
    throw new ApiError('bad_request', 'piece must be an object');
  if (v.k === 'stamp') {
    const t = LANDMARK_TYPES.find((l) => l === v.t);
    if (t === undefined) throw new ApiError('bad_request', 'unknown stamp');
    const at = asTile(v);
    return { k: 'stamp', t, x: at.x, y: at.y };
  }
  if (v.k === 'path') {
    if (!Array.isArray(v.pts) || v.pts.length > 9)
      throw new ApiError('bad_request', 'path must be a short list of points');
    return { k: 'path', pts: v.pts.map(asTile) };
  }
  if (v.k === 'x') {
    const at = asTile(v);
    return { k: 'x', x: at.x, y: at.y };
  }
  throw new ApiError('bad_request', 'unknown piece');
};

export const reqPieces = (
  body: Record<string, unknown>,
  key: string,
  max: number
): ChartPiece[] => {
  const v = body[key];
  if (!Array.isArray(v) || v.length > max)
    throw new ApiError(
      'bad_request',
      `${key} must be a list of at most ${max}`
    );
  return v.map(asPiece);
};

export const reqVote = (body: Record<string, unknown>, key: string): Vote => {
  const v = VOTES.find((x) => x === body[key]);
  if (v === undefined)
    throw new ApiError('bad_request', `${key} must be true or cursed`);
  return v;
};

export const asBoardKind = (v: string | undefined): BoardKind => {
  const k = BOARD_KINDS.find((x) => x === v);
  if (k === undefined) throw new ApiError('bad_request', 'unknown board');
  return k;
};
