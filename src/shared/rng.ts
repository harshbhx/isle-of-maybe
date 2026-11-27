// Seeded randomness for the engine. Same seed string → same sequence on client and server.
// Never use Math.random in src/shared (ENG-1.1, ENG-1.2).

export type Rng = () => number;

/** FNV-1a 32-bit hash of a string. */
export const hash32 = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32: small, fast, good enough for level generation. Returns floats in [0, 1). */
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const rngFor = (seed: string): Rng => mulberry32(hash32(seed));

/** Integer in [lo, hi], both inclusive. */
export const int = (rng: Rng, lo: number, hi: number): number =>
  lo + Math.floor(rng() * (hi - lo + 1));

/** Element at index, or throw (keeps noUncheckedIndexedAccess honest without casts). */
export const at = <T>(arr: readonly T[], i: number): T => {
  const v = arr[i];
  if (v === undefined)
    throw new Error(`index ${i} out of range (${arr.length})`);
  return v;
};

export const pick = <T>(rng: Rng, arr: readonly T[]): T =>
  at(arr, int(rng, 0, arr.length - 1));

/** Fisher–Yates shuffle of a copy. */
export const shuffle = <T>(rng: Rng, arr: readonly T[]): T[] => {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(rng, 0, i);
    const a = at(out, i);
    out[i] = at(out, j);
    out[j] = a;
  }
  return out;
};
