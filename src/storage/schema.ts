/**
 * Save-data schema. Everything the game persists lives in one small object, serialized by
 * ./wire.ts and stored by a StorageAdapter (cookies today, e.g. Capacitor Preferences later).
 *
 * Compact by design: one tuple per puzzle, board progress only for the CURRENT puzzle.
 */

export const SCHEMA_VERSION = 1;

export type LangSetting = "auto" | "nl" | "en";
export type ThemeSetting = "auto" | "light" | "dark";
export type MotionSetting = "auto" | "on" | "off";
export type GameMode = "relax" | "challenge";
export type GameSourceKind = "pack" | "daily" | "endless" | "tutorial";

export interface Settings {
  lang: LangSetting;
  theme: ThemeSetting;
  sound: boolean;
  music: boolean;
  haptics: boolean;
  colorblind: boolean;
  highContrast: boolean;
  /** "auto" follows prefers-reduced-motion. */
  reducedMotion: MotionSetting;
  autoCross: boolean;
  tutorialDone: boolean;
  /** The player has seen the cookie/privacy note. */
  privacyAck: boolean;
}

/** [solved (0|1), best time in seconds (0 = none), stars (0-3)] */
export type PuzzleRecord = [solved: number, bestTime: number, stars: number];

export interface CurrentGame {
  id: string;
  mode: GameMode;
  /** Where the puzzle came from (decides streak/endless handling on completion). */
  src: GameSourceKind;
  /** Date key for daily puzzles, otherwise "". */
  day: string;
  /** Packed board, 2 bits per cell (see bitset.ts). */
  cells: string;
  /** Elapsed seconds. */
  time: number;
  hearts: number;
  /** Seconds accumulated towards the next free hint. */
  hintClock: number;
  hintsUsed: number;
  mistakes: number;
}

export interface DailyData {
  /** Date key (YYYY-MM-DD) of the last solved daily, "" if none. */
  last: string;
  streak: number;
  best: number;
  /** Grace days available (0 or 1). */
  grace: number;
  /** Recent solved dailies: date key -> [time, stars]. Pruned to ~30 entries. */
  days: Record<string, [number, number]>;
}

export interface StatsData {
  /** Seconds spent in puzzles. */
  playTime: number;
  hintsUsed: number;
  endlessSolved: number;
}

export interface SaveData {
  v: number;
  settings: Settings;
  puzzles: Record<string, PuzzleRecord>;
  current: CurrentGame | null;
  daily: DailyData;
  stats: StatsData;
  /** Counter for the next Endless puzzle seed. */
  endlessSeed: number;
}

export function defaultSettings(): Settings {
  return {
    lang: "auto",
    theme: "auto",
    sound: true,
    music: false,
    haptics: true,
    colorblind: false,
    highContrast: false,
    reducedMotion: "auto",
    autoCross: true,
    tutorialDone: false,
    privacyAck: false,
  };
}

export function createDefaultSave(): SaveData {
  return {
    v: SCHEMA_VERSION,
    settings: defaultSettings(),
    puzzles: {},
    current: null,
    daily: { last: "", streak: 0, best: 0, grace: 1, days: {} },
    stats: { playTime: 0, hintsUsed: 0, endlessSolved: 0 },
    endlessSeed: 1,
  };
}
