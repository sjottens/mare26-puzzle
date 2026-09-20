import { generateClues } from "./clues";
import type { Clues } from "./types";

export type PackId = "tutorial" | "dutch-icons" | "animals" | "food" | "sea" | "space" | "retro-toys";

/**
 * Puzzle data as stored in /content/puzzles/*.json.
 * Grid characters: `.` = empty, `#` = palette[0], `1`..`9` = palette[n-1].
 */
export interface PuzzleDef {
  id: string;
  name: { en: string; nl: string };
  pack: PackId;
  size: number;
  rows: string[];
  palette: string[];
}

export interface ParsedPuzzle {
  def: PuzzleDef;
  width: number;
  height: number;
  /** 1 = filled, 0 = empty (row-major). */
  solution: Uint8Array;
  /** Palette index per cell, 1-based, 0 = empty. Ready for multi-colour rendering. */
  colors: Uint8Array;
  clues: Clues;
}

export class PuzzleFormatError extends Error {
  constructor(id: string, message: string) {
    super(`Puzzle "${id}": ${message}`);
    this.name = "PuzzleFormatError";
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function parsePuzzle(def: PuzzleDef): ParsedPuzzle {
  const fail = (m: string): never => {
    throw new PuzzleFormatError(def.id, m);
  };
  if (!def.id) fail("missing id");
  if (!def.name?.en || !def.name?.nl) fail("name needs en and nl");
  if (!Number.isInteger(def.size) || def.size < 2 || def.size > 30) fail(`bad size ${def.size}`);
  if (!Array.isArray(def.palette) || def.palette.length === 0) fail("palette is empty");
  for (const c of def.palette) if (!HEX.test(c)) fail(`bad palette colour "${c}"`);
  if (def.palette.length > 1) fail("multi-colour puzzles are not supported by the solver yet");
  if (def.rows.length !== def.size) fail(`expected ${def.size} rows, got ${def.rows.length}`);

  const width = def.size;
  const height = def.size;
  const solution = new Uint8Array(width * height);
  const colors = new Uint8Array(width * height);
  def.rows.forEach((row, y) => {
    if (row.length !== width) fail(`row ${y + 1} has length ${row.length}, expected ${width}`);
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      let color = 0;
      if (ch === "#") color = 1;
      else if (ch >= "1" && ch <= "9") color = Number(ch);
      else if (ch !== ".") fail(`row ${y + 1}: illegal character "${ch}"`);
      if (color > def.palette.length) fail(`row ${y + 1}: colour ${color} is not in the palette`);
      colors[y * width + x] = color;
      solution[y * width + x] = color > 0 ? 1 : 0;
    }
  });
  return { def, width, height, solution, colors, clues: generateClues(solution, width, height) };
}
