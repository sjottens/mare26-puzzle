/**
 * Authoring helper: makes hand-drawn puzzles valid with as few pixel changes as possible.
 *
 * For every puzzle in content/puzzles/<pack>.json that is ambiguous or needs guessing, it looks at the
 * cells that line logic could not decide (the ambiguous region) and searches for the smallest set of
 * flips there that makes the picture unique and solvable by line logic. It rewrites the file and prints
 * every change so you can review the art (run validate:puzzles -- --preview afterwards).
 *
 * Usage: npx tsx scripts/repair-puzzles.ts [--pack=animals] [--max-flips=3]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyze, computeQuality, generateClues, parsePuzzle, propagate, recognizabilityIssues, type PuzzleDef } from "../src/game";

const DIR = join(process.cwd(), "content", "puzzles");
const packFilter = process.argv.find((a) => a.startsWith("--pack="))?.slice(7);
const maxFlips = Number(process.argv.find((a) => a.startsWith("--max-flips="))?.slice(12) ?? 3);

function good(solution: Uint8Array, size: number): boolean {
  if (recognizabilityIssues(computeQuality(solution, size, size), size, size).length > 0) return false;
  const clues = generateClues(solution, size, size);
  return propagate(clues, new Uint8Array(size * size)).status === "solved";
}

function combos<T>(items: T[], k: number, visit: (c: T[]) => boolean): boolean {
  const pick: T[] = [];
  const rec = (start: number): boolean => {
    if (pick.length === k) return visit(pick);
    for (let i = start; i < items.length; i++) {
      pick.push(items[i]);
      if (rec(i + 1)) return true;
      pick.pop();
    }
    return false;
  };
  return rec(0);
}

let changed = 0;
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "daily-pool.json")) {
  const pack = file.replace(/\.json$/, "");
  if (packFilter && pack !== packFilter) continue;
  const defs: PuzzleDef[] = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  let dirty = false;
  for (const def of defs) {
    const p = parsePuzzle(def);
    const size = p.width;
    if (good(p.solution, size)) continue;

    const grid = new Uint8Array(size * size);
    const r = propagate(p.clues, grid);
    const unknown: number[] = [];
    if (r.status === "stuck") for (let i = 0; i < grid.length; i++) if (grid[i] === 0) unknown.push(i);
    // Widen the search area with the neighbours of the undecided cells.
    const near = new Set<number>(unknown);
    for (const i of unknown) {
      const x = i % size;
      const y = Math.floor(i / size);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < size && ny < size) near.add(ny * size + nx);
      }
    }
    const pools = [unknown, [...near]];
    let fixed: number[] | null = null;
    outer: for (let k = 1; k <= maxFlips; k++) {
      for (const pool of pools) {
        if (pool.length === 0 || (pool.length > 90 && k > 2)) continue;
        const ok = combos(pool, k, (cells) => {
          const s = p.solution.slice();
          for (const c of cells) s[c] ^= 1;
          if (good(s, size)) {
            fixed = cells.slice();
            return true;
          }
          return false;
        });
        if (ok) break outer;
      }
    }
    if (!fixed) {
      console.log(`✗ ${def.id}: no repair found within ${maxFlips} flips (${unknown.length} undecided cells)`);
      continue;
    }
    const cells = fixed as number[];
    const rows = def.rows.map((row) => row.split(""));
    for (const c of cells) {
      const x = c % size;
      const y = Math.floor(c / size);
      rows[y][x] = rows[y][x] === "#" ? "." : "#";
    }
    def.rows = rows.map((r2) => r2.join(""));
    dirty = true;
    changed++;
    console.log(`✓ ${def.id}: flipped ${cells.map((c) => `(${c % size},${Math.floor(c / size)})`).join(" ")}`);
    // Sanity: the repaired puzzle must analyse as unique + line-solvable.
    const a = analyze(parsePuzzle(def).clues);
    if (!a.unique || !a.lineSolvable) throw new Error(`repair of ${def.id} did not verify`);
  }
  if (dirty) writeFileSync(join(DIR, file), JSON.stringify(defs, null, 2) + "\n");
}
console.log(changed === 0 ? "Nothing to repair." : `${changed} puzzle(s) repaired.`);
