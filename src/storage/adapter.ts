/**
 * The seam that lets the save layer be swapped (cookies now; Capacitor Preferences, IndexedDB
 * or a server later). Adapters deal in one opaque payload string; encoding, checksums and
 * migrations live above them in ./wire.ts and ./migrate.ts.
 */
export type WriteResult =
  | { ok: true; bytes: number; warning?: "large" }
  | { ok: false; error: "too-large" | "unavailable" };

export interface StorageAdapter {
  /** The stored payload, or null when nothing (complete) is stored. Never throws. */
  read(): Promise<string | null>;
  /** Persists the payload, replacing whatever was stored. Never throws. */
  write(payload: string): Promise<WriteResult>;
  clear(): Promise<void>;
}
