// A tiny 8-bit indexed PNG encoder in plain TypeScript (no canvas or zlib on the server).
// Deflate uses stored blocks: bigger files, but simple and always valid.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export const crc32 = (bytes: Uint8Array): number => {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const adler32 = (bytes: Uint8Array): number => {
  let a = 1;
  let b = 0;
  for (const x of bytes) {
    a = (a + x) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
};

const u32 = (n: number): number[] => [
  (n >>> 24) & 255,
  (n >>> 16) & 255,
  (n >>> 8) & 255,
  n & 255,
];

const chunk = (type: string, data: Uint8Array): Uint8Array => {
  const typed = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) typed[i] = type.charCodeAt(i);
  typed.set(data, 4);
  const out = new Uint8Array(12 + data.length);
  out.set(u32(data.length), 0);
  out.set(typed, 4);
  out.set(u32(crc32(typed)), 8 + data.length);
  return out;
};

/** zlib stream made of stored (uncompressed) deflate blocks. */
const zlibStored = (raw: Uint8Array): Uint8Array => {
  const MAX = 65535;
  const blocks = Math.max(1, Math.ceil(raw.length / MAX));
  const out = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let o = 2;
  for (let i = 0; i < blocks; i++) {
    const part = raw.subarray(i * MAX, Math.min(raw.length, (i + 1) * MAX));
    out[o++] = i === blocks - 1 ? 1 : 0;
    out[o++] = part.length & 255;
    out[o++] = part.length >>> 8;
    out[o++] = ~part.length & 255;
    out[o++] = (~part.length >>> 8) & 255;
    out.set(part, o);
    o += part.length;
  }
  out.set(u32(adler32(raw)), o);
  return out;
};

export type Rgb = readonly [number, number, number];

/** Encode width×height palette indices (row-major) as a PNG. */
export const encodePng = (
  width: number,
  height: number,
  pixels: Uint8Array,
  palette: readonly Rgb[]
): Uint8Array => {
  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0; // filter: none
    raw.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  }
  const ihdr = new Uint8Array([...u32(width), ...u32(height), 8, 3, 0, 0, 0]);
  const plte = new Uint8Array(palette.flatMap((c) => [c[0], c[1], c[2]]));
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('IDAT', zlibStored(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const toBase64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    s += B64[(n >> 18) & 63];
    s += B64[(n >> 12) & 63];
    s += b === undefined ? '=' : B64[(n >> 6) & 63];
    s += c === undefined ? '=' : B64[n & 63];
  }
  return s;
};

export const pngDataUrl = (png: Uint8Array): string =>
  `data:image/png;base64,${toBase64(png)}`;
