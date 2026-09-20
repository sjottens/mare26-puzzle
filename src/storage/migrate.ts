import { createDefaultSave, defaultSettings, SCHEMA_VERSION, type CurrentGame, type DailyData, type PuzzleRecord, type SaveData } from "./schema";

type Raw = Record<string, unknown>;
type Migration = (data: Raw) => Raw;

const isObj = (x: unknown): x is Raw => typeof x === "object" && x !== null && !Array.isArray(x);

const bool = (x: unknown, def: boolean): boolean => (typeof x === "boolean" ? x : def);
const num = (x: unknown, def: number, min: number, max: number): number =>
  typeof x === "number" && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : def;
const oneOf = <T extends string>(x: unknown, allowed: readonly T[], def: T): T =>
  typeof x === "string" && (allowed as readonly string[]).includes(x) ? (x as T) : def;
const str = (x: unknown, def: string, maxLen: number): string => (typeof x === "string" && x.length <= maxLen ? x : def);

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PUZZLES = 400;
const MAX_DAYS = 60;

/**
 * Migrations run in order, each one upgrading version N to N+1. Version 0 is the pre-release
 * prototype format `{ solved: string[], times: Record<id, seconds>, sound?, lang? }`.
 */
const MIGRATIONS: Record<number, Migration> = {
  0: (d) => {
    const puzzles: Record<string, PuzzleRecord> = {};
    const times = isObj(d.times) ? d.times : {};
    if (Array.isArray(d.solved)) {
      for (const id of d.solved) {
        if (typeof id !== "string") continue;
        const t = times[id];
        puzzles[id] = [1, typeof t === "number" ? t : 0, 0];
      }
    }
    const settings: Raw = {};
    if (typeof d.sound === "boolean") settings.sound = d.sound;
    if (d.lang === "nl" || d.lang === "en") settings.lang = d.lang;
    return { v: 1, puzzles, settings };
  },
};

/** Upgrades old data step by step until it reaches the current schema version. */
export function migrateRaw(input: Raw): Raw {
  let data = input;
  let version = typeof data.v === "number" && Number.isInteger(data.v) && data.v >= 0 ? data.v : Array.isArray(data.solved) ? 0 : SCHEMA_VERSION;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break;
    data = step(data);
    version++;
  }
  return data;
}

/**
 * Turns ANY value into a valid SaveData: unknown fields are dropped, wrong types fall back
 * to defaults, numbers are clamped. Never throws, so a corrupt save can never crash the app.
 */
export function normalizeSave(raw: unknown): SaveData {
  const out = createDefaultSave();
  if (!isObj(raw)) return out;
  const d = migrateRaw(raw);

  const s = isObj(d.settings) ? d.settings : {};
  const def = defaultSettings();
  out.settings = {
    lang: oneOf(s.lang, ["auto", "nl", "en"], def.lang),
    theme: oneOf(s.theme, ["auto", "light", "dark"], def.theme),
    sound: bool(s.sound, def.sound),
    music: bool(s.music, def.music),
    haptics: bool(s.haptics, def.haptics),
    colorblind: bool(s.colorblind, def.colorblind),
    highContrast: bool(s.highContrast, def.highContrast),
    reducedMotion: oneOf(s.reducedMotion, ["auto", "on", "off"], def.reducedMotion),
    autoCross: bool(s.autoCross, def.autoCross),
    tutorialDone: bool(s.tutorialDone, def.tutorialDone),
    privacyAck: bool(s.privacyAck, def.privacyAck),
  };

  if (isObj(d.puzzles)) {
    let count = 0;
    for (const [id, rec] of Object.entries(d.puzzles)) {
      if (count >= MAX_PUZZLES) break;
      if (id.length === 0 || id.length > 40 || !Array.isArray(rec)) continue;
      out.puzzles[id] = [
        num(rec[0], 0, 0, 1) ? 1 : 0,
        Math.round(num(rec[1], 0, 0, 359_999)),
        Math.round(num(rec[2], 0, 0, 3)),
      ];
      count++;
    }
  }

  if (isObj(d.current)) {
    const c = d.current;
    const id = str(c.id, "", 40);
    const cells = str(c.cells, "", 200);
    if (id && cells) {
      const current: CurrentGame = {
        id,
        mode: oneOf(c.mode, ["relax", "challenge"], "relax"),
        src: oneOf(c.src, ["pack", "daily", "endless", "tutorial"], "pack"),
        day: typeof c.day === "string" && DATE_KEY.test(c.day) ? c.day : "",
        cells,
        time: Math.round(num(c.time, 0, 0, 359_999)),
        hearts: Math.round(num(c.hearts, 3, 0, 3)),
        hintClock: Math.round(num(c.hintClock, 0, 0, 3600)),
        hintsUsed: Math.round(num(c.hintsUsed, 0, 0, 9999)),
        mistakes: Math.round(num(c.mistakes, 0, 0, 9999)),
      };
      out.current = current;
    }
  }

  if (isObj(d.daily)) {
    const dd = d.daily;
    const daily: DailyData = {
      last: typeof dd.last === "string" && DATE_KEY.test(dd.last) ? dd.last : "",
      streak: Math.round(num(dd.streak, 0, 0, 100_000)),
      best: Math.round(num(dd.best, 0, 0, 100_000)),
      grace: num(dd.grace, 1, 0, 1) >= 1 ? 1 : 0,
      days: {},
    };
    if (isObj(dd.days)) {
      const keys = Object.keys(dd.days).filter((k) => DATE_KEY.test(k)).sort((a, b) => a.localeCompare(b)).slice(-MAX_DAYS);
      for (const k of keys) {
        const v = dd.days[k];
        if (Array.isArray(v)) daily.days[k] = [Math.round(num(v[0], 0, 0, 359_999)), Math.round(num(v[1], 0, 0, 3))];
      }
    }
    out.daily = daily;
  }

  if (isObj(d.stats)) {
    out.stats = {
      playTime: Math.round(num(d.stats.playTime, 0, 0, 1e9)),
      hintsUsed: Math.round(num(d.stats.hintsUsed, 0, 0, 1e7)),
      endlessSolved: Math.round(num(d.stats.endlessSolved, 0, 0, 1e7)),
    };
  }
  out.endlessSeed = Math.round(num(d.endlessSeed, 1, 1, 2_000_000_000));
  out.v = SCHEMA_VERSION;
  return out;
}
