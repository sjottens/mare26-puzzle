"use client";

import { create } from "zustand";
import { recordDailySolve } from "@/game";
import {
  CookieStorageAdapter,
  createDefaultSave,
  exportSaveCode,
  importSaveCode,
  SaveManager,
  type CurrentGame,
  type GameMode,
  type GameSourceKind,
  type SaveData,
  type Settings,
  type WriteResult,
} from "@/storage";

export interface SolveInfo {
  id: string;
  src: GameSourceKind;
  day: string;
  mode: GameMode;
  /** Seconds (only meaningful in Challenge). */
  time: number;
  /** 0 for Relax solves. */
  stars: number;
  playSeconds: number;
  hintsUsed: number;
}

export interface SolveOutcome {
  isNewBest: boolean;
  firstSolve: boolean;
}

interface SaveState {
  data: SaveData;
  /** Cookies are read only on the client after hydration (avoids SSR mismatch). */
  hydrated: boolean;
  /** Set when the stored save could not be read and defaults were used instead. */
  recoveredFromCorruption: boolean;
  lastWrite: WriteResult | null;
  hydrate: () => Promise<void>;
  update: (fn: (draft: SaveData) => void) => void;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setCurrent: (c: CurrentGame | null) => void;
  recordSolve: (info: SolveInfo) => SolveOutcome;
  exportCode: () => string;
  importCode: (code: string) => boolean;
  resetAll: () => Promise<void>;
  dismissRecovery: () => void;
}

let manager: SaveManager | null = null;
let detach: (() => void) | null = null;

function getManager(set: (p: Partial<SaveState>) => void): SaveManager {
  manager ??= new SaveManager(new CookieStorageAdapter(), { onWrite: (r) => set({ lastWrite: r }) });
  return manager;
}

export const useSaveStore = create<SaveState>((set, get) => ({
  data: createDefaultSave(),
  hydrated: false,
  recoveredFromCorruption: false,
  lastWrite: null,

  async hydrate() {
    if (get().hydrated) return;
    const m = getManager(set);
    const data = await m.load();
    detach?.();
    detach = m.attachLifecycle(window, document);
    set({ data, hydrated: true, recoveredFromCorruption: m.status === "corrupt" });
  },

  update(fn) {
    const next = structuredClone(get().data);
    fn(next);
    set({ data: next });
    getManager(set).set(next);
  },

  setSetting(key, value) {
    get().update((d) => {
      d.settings[key] = value;
    });
  },

  setCurrent(c) {
    get().update((d) => {
      d.current = c;
    });
  },

  recordSolve(info) {
    const before = get().data.puzzles[info.id];
    const outcome: SolveOutcome = { firstSolve: !before || before[0] === 0, isNewBest: false };
    get().update((d) => {
      d.current = null;
      d.stats.playTime += Math.round(info.playSeconds);
      d.stats.hintsUsed += info.hintsUsed;
      if (info.src === "endless") {
        d.stats.endlessSolved += 1;
        return;
      }
      const prev = d.puzzles[info.id] ?? [0, 0, 0];
      let bestTime = prev[1];
      if (info.mode === "challenge" && info.time > 0 && (bestTime === 0 || info.time < bestTime)) {
        bestTime = Math.round(info.time);
        outcome.isNewBest = true;
      }
      d.puzzles[info.id] = [1, bestTime, Math.max(prev[2], info.stars)];
      if (info.src === "daily" && info.day) {
        const next = recordDailySolve(d.daily, info.day);
        d.daily.last = next.last;
        d.daily.streak = next.streak;
        d.daily.best = next.best;
        d.daily.grace = next.grace;
        d.daily.days[info.day] = [Math.round(info.time), info.stars];
        const keys = Object.keys(d.daily.days).sort((a, b) => a.localeCompare(b));
        for (const k of keys.slice(0, Math.max(0, keys.length - 30))) delete d.daily.days[k];
      }
    });
    return outcome;
  },

  exportCode: () => exportSaveCode(get().data),

  importCode(code) {
    const imported = importSaveCode(code);
    if (!imported) return false;
    set({ data: imported });
    getManager(set).set(imported);
    void getManager(set).flush();
    return true;
  },

  async resetAll() {
    const m = getManager(set);
    await m.clear();
    set({ data: createDefaultSave() });
  },

  dismissRecovery() {
    set({ recoveredFromCorruption: false });
  },
}));
