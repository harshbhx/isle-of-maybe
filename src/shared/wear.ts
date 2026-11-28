// Crowd-worn paths (ADV-6.4, D32): how many hunts crossed each tile today, as wear levels 0–3.
// Aggregate only, and a tile shows wear only after WEAR_MIN hunts, so no one person's route shows.
import { H, W } from './types.ts';

export const WEAR_MIN = 3;

/** 0 under WEAR_MIN hunts; then 1, 2 and 3 at 3, 6 and 15 hunts. */
export const wearLevel = (hunts: number): number =>
  hunts >= 15 ? 3 : hunts >= 6 ? 2 : hunts >= WEAR_MIN ? 1 : 0;

/** One digit per tile, row-major: the form the server sends. */
export const encodeWear = (
  counts: Readonly<Record<string, string>>
): string => {
  const out = new Array<string>(W * H).fill('0');
  for (const [k, v] of Object.entries(counts)) {
    const i = Number(k);
    if (Number.isInteger(i) && i >= 0 && i < W * H)
      out[i] = String(wearLevel(Number(v) || 0));
  }
  return out.join('');
};

export const decodeWear = (s: string): Uint8Array => {
  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const v = s.charCodeAt(i) - 48;
    out[i] = v >= 0 && v <= 3 ? v : 0;
  }
  return out;
};
