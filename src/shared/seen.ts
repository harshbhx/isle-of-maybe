// Hex codec for the seen-tiles mask (HUNT-3.2): one bit per tile, row-major, 1,600 bits.
// Shared so the server writes it and the bury screen reads it the same way (CHART-1.2).
import { bitsFromHex, bitsToHex, getBit, setBit } from './bits.ts';
import { H, W } from './types.ts';

export const SEEN_BYTES = (W * H) / 8;

export const seenFromHex = (hex: string | undefined): Uint8Array =>
  bitsFromHex(hex, SEEN_BYTES);
export const seenToHex = bitsToHex;
export const hasSeen = getBit;
export const markSeen = setBit;
