import LZString from "lz-string";
import { normalizeSave } from "./migrate";
import type { SaveData } from "./schema";

/** FNV-1a 32-bit, as 8 hex characters. */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Wire format: `<8-hex checksum><lz-string data>`. The data alphabet (A-Z a-z 0-9 + - $) is legal
 * in cookie values and safe to copy/paste, so the same string doubles as the export code.
 */
export function encodePayload(data: SaveData): string {
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
  return checksum(compressed) + compressed;
}

/** Returns null for anything that is not an intact payload; never throws. */
export function decodePayload(payload: string): SaveData | null {
  try {
    if (payload.length < 9) return null;
    const sum = payload.slice(0, 8);
    const compressed = payload.slice(8);
    if (checksum(compressed) !== sum) return null;
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return null;
    return normalizeSave(parsed);
  } catch {
    return null;
  }
}

const CODE_PREFIX = "M26:";

/** Copyable save code for Settings > Export. */
export function exportSaveCode(data: SaveData): string {
  return CODE_PREFIX + encodePayload(data);
}

/** Parses a pasted save code (whitespace tolerant). Returns null if it is not valid. */
export function importSaveCode(code: string): SaveData | null {
  const trimmed = code.replace(/\s+/g, "");
  if (!trimmed.startsWith(CODE_PREFIX)) return null;
  return decodePayload(trimmed.slice(CODE_PREFIX.length));
}
