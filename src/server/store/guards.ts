// Small hand-written validators for untrusted request bodies (HUNT-6.2). No `any`, no casts.
import { inBounds, type Tile } from '../../shared/types.ts';
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
