// Hex codec for the seen-tiles mask (HUNT-3.2): one bit per tile, row-major, 1,600 bits.
// Shared so the server writes it and the bury screen reads it the same way (CHART-1.2).
import { H, W } from './types.ts';

export const SEEN_BYTES = (W * H) / 8;

export const seenFromHex = (hex: string | undefined): Uint8Array => {
  const out = new Uint8Array(SEEN_BYTES);
  if (hex === undefined || hex.length !== SEEN_BYTES * 2) return out;
  for (let i = 0; i < SEEN_BYTES; i++)
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0;
  return out;
};

export const seenToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export const hasSeen = (mask: Uint8Array, tileIndex: number): boolean =>
  (((mask[tileIndex >> 3] ?? 0) >> (tileIndex & 7)) & 1) === 1;

export const markSeen = (mask: Uint8Array, tileIndex: number): void => {
  mask[tileIndex >> 3] = (mask[tileIndex >> 3] ?? 0) | (1 << (tileIndex & 7));
};
