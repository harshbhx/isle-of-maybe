// Fixed-size bit sets stored as hex strings in Redis (seen tiles, streak days).

export const bitsFromHex = (
  hex: string | undefined,
  bytes: number
): Uint8Array => {
  const out = new Uint8Array(bytes);
  if (hex === undefined || hex.length !== bytes * 2) return out;
  for (let i = 0; i < bytes; i++)
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0;
  return out;
};

export const bitsToHex = (bits: Uint8Array): string =>
  Array.from(bits, (b) => b.toString(16).padStart(2, '0')).join('');

export const getBit = (bits: Uint8Array, i: number): boolean =>
  (((bits[i >> 3] ?? 0) >> (i & 7)) & 1) === 1;

export const setBit = (bits: Uint8Array, i: number): void => {
  bits[i >> 3] = (bits[i >> 3] ?? 0) | (1 << (i & 7));
};
