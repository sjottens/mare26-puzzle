/**
 * Board progress as a compact string: 2 bits per cell (0 empty, 1 filled, 2 crossed),
 * four cells per byte, base64url encoded. A 20x20 board is 100 bytes = 134 characters.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const REVERSE = new Map<string, number>([...ALPHABET].map((c, i) => [c, i]));

export function packCells(cells: ArrayLike<number>): string {
  const bytes = new Uint8Array(Math.ceil(cells.length / 4));
  for (let i = 0; i < cells.length; i++) bytes[i >> 2] |= (cells[i] & 3) << ((i & 3) * 2);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += ALPHABET[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += ALPHABET[n & 63];
  }
  return out;
}

/** Returns null when the string is malformed or does not match `count` cells. */
export function unpackCells(packed: string, count: number): Uint8Array | null {
  const byteLen = Math.ceil(count / 4);
  const expectedChars = Math.ceil((byteLen * 4) / 3);
  if (packed.length !== expectedChars) return null;
  const bytes = new Uint8Array(byteLen + 3);
  let bi = 0;
  for (let i = 0; i < packed.length; i += 4) {
    let n = 0;
    let chars = 0;
    for (let j = 0; j < 4; j++) {
      const ch = packed[i + j];
      if (ch === undefined) {
        n <<= 6;
        continue;
      }
      const v = REVERSE.get(ch);
      if (v === undefined) return null;
      n = (n << 6) | v;
      chars++;
    }
    bytes[bi++] = (n >> 16) & 255;
    if (chars > 2) bytes[bi++] = (n >> 8) & 255;
    if (chars > 3) bytes[bi++] = n & 255;
  }
  const cells = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const v = (bytes[i >> 2] >> ((i & 3) * 2)) & 3;
    if (v === 3) return null;
    cells[i] = v;
  }
  return cells;
}
