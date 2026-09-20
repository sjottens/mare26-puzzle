import type { StorageAdapter, WriteResult } from "./adapter";

/** Functional cookies only: the game state, nothing else. ASCII name (see docs/DECISIONS.md #3). */
export const COOKIE_PREFIX = "mare26_v1_";
/** ~390 days; browsers cap cookie lifetime at about 400. */
export const MAX_AGE_SECONDS = 390 * 24 * 60 * 60;
/** Characters of payload per cookie: keeps every cookie (name + value + attributes) well under 4 KB. */
export const CHUNK_SIZE = 2400;
/** Above this many payload characters we still save but report a warning. */
export const SOFT_LIMIT = 8 * 1024;
/** Above this we refuse to save. */
export const HARD_LIMIT = 16 * 1024;

/** The bit of `document.cookie` we use, so tests can substitute a fake. */
export interface CookieJar {
  /** Same as reading `document.cookie`: "a=1; b=2". */
  read(): string;
  /** Same as assigning `document.cookie`: a single "name=value; attr; attr" string. */
  write(cookie: string): void;
  /** True on https, where cookies get the Secure attribute. */
  isSecure(): boolean;
}

export function documentCookieJar(): CookieJar {
  return {
    read: () => document.cookie,
    write: (c) => {
      document.cookie = c;
    },
    isSecure: () => location.protocol === "https:",
  };
}

function parseCookies(header: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    out.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
  return out;
}

/** Splits a payload into cookie values. Chunk 0 starts with "<total>." so a missing chunk is detectable. */
export function splitPayload(payload: string, chunkSize = CHUNK_SIZE): string[] {
  const parts: string[] = [];
  for (let i = 0; i < payload.length; i += chunkSize) parts.push(payload.slice(i, i + chunkSize));
  if (parts.length === 0) parts.push("");
  parts[0] = `${parts.length}.${parts[0]}`;
  return parts;
}

/** Inverse of splitPayload over the cookies that are present; null if anything is missing/malformed. */
export function joinChunks(get: (index: number) => string | undefined): string | null {
  const first = get(0);
  if (first === undefined) return null;
  const dot = first.indexOf(".");
  if (dot < 1) return null;
  const total = Number(first.slice(0, dot));
  if (!Number.isInteger(total) || total < 1 || total > 64) return null;
  let out = first.slice(dot + 1);
  for (let i = 1; i < total; i++) {
    const part = get(i);
    if (part === undefined) return null;
    out += part;
  }
  return out;
}

export class CookieStorageAdapter implements StorageAdapter {
  constructor(
    private readonly jar: CookieJar = documentCookieJar(),
    private readonly chunkSize = CHUNK_SIZE,
  ) {}

  private attributes(maxAge: number): string {
    return `Path=/; Max-Age=${maxAge}; SameSite=Lax${this.jar.isSecure() ? "; Secure" : ""}`;
  }

  private existingIndexes(): number[] {
    const idx: number[] = [];
    for (const name of parseCookies(this.jar.read()).keys()) {
      if (!name.startsWith(COOKIE_PREFIX)) continue;
      const n = Number(name.slice(COOKIE_PREFIX.length));
      if (Number.isInteger(n) && n >= 0) idx.push(n);
    }
    return idx;
  }

  async read(): Promise<string | null> {
    try {
      const cookies = parseCookies(this.jar.read());
      return joinChunks((i) => cookies.get(COOKIE_PREFIX + i));
    } catch {
      return null;
    }
  }

  async write(payload: string): Promise<WriteResult> {
    // Everything below runs synchronously so a write started in `pagehide` still lands.
    try {
      if (payload.length > HARD_LIMIT) return { ok: false, error: "too-large" };
      const chunks = splitPayload(payload, this.chunkSize);
      // Rewriting every chunk on every save also refreshes each cookie's expiry.
      chunks.forEach((value, i) => this.jar.write(`${COOKIE_PREFIX}${i}=${value}; ${this.attributes(MAX_AGE_SECONDS)}`));
      for (const i of this.existingIndexes()) {
        if (i >= chunks.length) this.jar.write(`${COOKIE_PREFIX}${i}=; ${this.attributes(0)}`);
      }
      // Cookies can be blocked or full; verify that what we wrote can be read back.
      const back = joinChunks((i) => parseCookies(this.jar.read()).get(COOKIE_PREFIX + i));
      if (back !== payload) return { ok: false, error: "unavailable" };
      return payload.length > SOFT_LIMIT
        ? { ok: true, bytes: payload.length, warning: "large" }
        : { ok: true, bytes: payload.length };
    } catch {
      return { ok: false, error: "unavailable" };
    }
  }

  async clear(): Promise<void> {
    try {
      for (const i of this.existingIndexes()) this.jar.write(`${COOKIE_PREFIX}${i}=; ${this.attributes(0)}`);
    } catch {
      /* nothing to do */
    }
  }
}
