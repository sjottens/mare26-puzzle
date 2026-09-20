import type { StorageAdapter, WriteResult } from "./adapter";
import { createDefaultSave, type SaveData } from "./schema";
import { decodePayload, encodePayload } from "./wire";

export type LoadStatus = "idle" | "empty" | "ok" | "corrupt";

export interface SaveManagerEvents {
  onWrite?: (result: WriteResult) => void;
}

interface Target {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

/**
 * Owns the in-memory SaveData and persists it through a StorageAdapter: debounced writes
 * (about 500 ms), immediate flush when the page is hidden or closed.
 * Loading NEVER throws: unreadable data falls back to defaults.
 */
export class SaveManager {
  data: SaveData = createDefaultSave();
  status: LoadStatus = "idle";
  lastWrite: WriteResult | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor(
    private readonly adapter: StorageAdapter,
    private readonly events: SaveManagerEvents = {},
    private readonly debounceMs = 500,
  ) {}

  async load(): Promise<SaveData> {
    let raw: string | null = null;
    try {
      raw = await this.adapter.read();
    } catch {
      raw = null;
    }
    if (raw === null || raw === "") {
      this.status = "empty";
      this.data = createDefaultSave();
    } else {
      const decoded = decodePayload(raw);
      this.status = decoded ? "ok" : "corrupt";
      this.data = decoded ?? createDefaultSave();
    }
    return this.data;
  }

  /** Replaces the data and schedules a debounced write. */
  set(data: SaveData): void {
    this.data = data;
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.debounceMs);
  }

  /** Writes now if anything changed since the last write. */
  async flush(): Promise<WriteResult | null> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.dirty) return null;
    this.dirty = false;
    // Start the write synchronously: `pagehide` gives us no time to await anything.
    const pending = this.adapter.write(encodePayload(this.data));
    const result = await pending;
    this.lastWrite = result;
    this.events.onWrite?.(result);
    return result;
  }

  /** Flush when the tab is hidden or the page is being closed. Returns an unsubscribe function. */
  attachLifecycle(win: Target, doc: Target & { visibilityState?: string }): () => void {
    const onHide = () => void this.flush();
    const onVisibility = () => {
      if (doc.visibilityState === "hidden") void this.flush();
    };
    win.addEventListener("pagehide", onHide);
    doc.addEventListener("visibilitychange", onVisibility);
    return () => {
      win.removeEventListener("pagehide", onHide);
      doc.removeEventListener("visibilitychange", onVisibility);
    };
  }

  async clear(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.dirty = false;
    await this.adapter.clear();
    this.data = createDefaultSave();
    this.status = "empty";
  }
}
