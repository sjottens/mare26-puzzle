import tutorial from "@content/puzzles/tutorial.json";
import dutchIcons from "@content/puzzles/dutch-icons.json";
import animals from "@content/puzzles/animals.json";
import food from "@content/puzzles/food.json";
import sea from "@content/puzzles/sea.json";
import space from "@content/puzzles/space.json";
import retroToys from "@content/puzzles/retro-toys.json";
import dailyPool from "@content/puzzles/daily-pool.json";
import { analyze, dailyIndex, generatePuzzle, parsePuzzle, rateDifficulty, type Difficulty, type PackId, type ParsedPuzzle, type PuzzleDef } from "@/game";

/** Packs that live on the shelf (the tutorial is separate). */
export type ShelfPackId = Exclude<PackId, "tutorial">;

/** Packs in shelf order. */
export const PACKS: ShelfPackId[] = ["dutch-icons", "animals", "food", "sea", "space", "retro-toys"];

/** Free tier: the first 30 puzzles (in pack order). Everything after is premium. Payments are NOT implemented. */
export const FREE_PUZZLE_COUNT = 30;

const RAW: Record<PackId, PuzzleDef[]> = {
  tutorial: tutorial as PuzzleDef[],
  "dutch-icons": dutchIcons as PuzzleDef[],
  animals: animals as PuzzleDef[],
  food: food as PuzzleDef[],
  sea: sea as PuzzleDef[],
  space: space as PuzzleDef[],
  "retro-toys": retroToys as PuzzleDef[],
};

export interface CatalogEntry {
  id: string;
  pack: PackId;
  /** Position within its pack (0-based). */
  index: number;
  /** Position across all packs in shelf order (0-based); -1 for tutorial puzzles. */
  order: number;
  def: PuzzleDef;
  /** Behind the premium flag (data-layer stub only). */
  isPremium: boolean;
}

export const TUTORIAL_IDS = RAW.tutorial.map((d) => d.id);

const entries: CatalogEntry[] = [];
const byId = new Map<string, CatalogEntry>();

RAW.tutorial.forEach((def, index) => {
  const e: CatalogEntry = { id: def.id, pack: "tutorial", index, order: -1, def, isPremium: false };
  entries.push(e);
  byId.set(e.id, e);
});
let order = 0;
for (const pack of PACKS) {
  RAW[pack].forEach((def, index) => {
    const e: CatalogEntry = { id: def.id, pack, index, order, def, isPremium: order >= FREE_PUZZLE_COUNT };
    entries.push(e);
    byId.set(e.id, e);
    order++;
  });
}

export const CATALOG: readonly CatalogEntry[] = entries;

/** The 120 collectible puzzles (everything except the tutorial). */
export const COLLECTIBLES: readonly CatalogEntry[] = entries.filter((e) => e.pack !== "tutorial");

export function packPuzzles(pack: PackId): CatalogEntry[] {
  return entries.filter((e) => e.pack === pack);
}

export function getEntry(id: string): CatalogEntry | undefined {
  return byId.get(id);
}

/** Total number of collectable (non-tutorial) puzzles. */
export const TOTAL_PUZZLES = order;

const parsedCache = new Map<string, ParsedPuzzle>();
const difficultyCache = new Map<string, Difficulty>();

export function getParsed(id: string): ParsedPuzzle | undefined {
  const cached = parsedCache.get(id);
  if (cached) return cached;
  const entry = byId.get(id);
  if (entry) {
    const p = parsePuzzle(entry.def);
    parsedCache.set(id, p);
    return p;
  }
  const endless = parseEndlessId(id);
  if (endless) return endlessPuzzle(endless.size, endless.seed);
  return undefined;
}

export function getDifficulty(id: string): Difficulty {
  const cached = difficultyCache.get(id);
  if (cached) return cached;
  const p = getParsed(id);
  const d = p ? rateDifficulty(analyze(p.clues), p.width) : { score: 0, level: 1 as const };
  difficultyCache.set(id, d);
  return d;
}

export function localizedName(def: PuzzleDef, lang: "nl" | "en"): string {
  return def.name[lang];
}

/* ---------- Daily ---------- */

/** Curated pool for the daily puzzle. Falls back to every free puzzle while the pool file is empty. */
export function dailyPoolIds(): string[] {
  const listed = (dailyPool as string[]).filter((id) => byId.has(id));
  if (listed.length > 0) return listed;
  return entries.filter((e) => e.pack !== "tutorial").map((e) => e.id);
}

/** Same puzzle for everyone on the same date. */
export function dailyPuzzleId(dateKey: string): string {
  const pool = dailyPoolIds();
  return pool[dailyIndex(dateKey, pool.length)];
}

/* ---------- Endless ---------- */

export type EndlessSize = 5 | 10 | 15 | 20;

export function endlessId(size: number, seed: number): string {
  return `endless-${size}-${seed}`;
}

export function parseEndlessId(id: string): { size: number; seed: number } | null {
  const m = /^endless-(\d+)-(\d+)$/.exec(id);
  return m ? { size: Number(m[1]), seed: Number(m[2]) } : null;
}

export function endlessPuzzle(size: number, seed: number): ParsedPuzzle | undefined {
  const id = endlessId(size, seed);
  const cached = parsedCache.get(id);
  if (cached) return cached;
  const g = generatePuzzle({ seed: `endless-${size}-${seed}`, size });
  if (!g) return undefined;
  const colors = Uint8Array.from(g.solution);
  const def: PuzzleDef = {
    id,
    name: { en: `Endless #${seed}`, nl: `Eindeloos #${seed}` },
    pack: "tutorial",
    size,
    rows: Array.from({ length: size }, (_, y) => Array.from(colors.slice(y * size, (y + 1) * size), (v) => (v ? "#" : ".")).join("")),
    palette: [ENDLESS_COLORS[seed % ENDLESS_COLORS.length]],
  };
  const parsed: ParsedPuzzle = { def, width: size, height: size, solution: g.solution, colors, clues: g.clues };
  parsedCache.set(id, parsed);
  return parsed;
}

const ENDLESS_COLORS = ["#ff8fa3", "#8fc7ff", "#8fdcc3", "#ffd98f", "#c4b0ff", "#ffb08f"];
