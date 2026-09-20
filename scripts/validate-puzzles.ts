/**
 * Validates every puzzle in /content/puzzles/*.json with the nonogram solver.
 *
 * FAILS (exit code 1) when a puzzle:
 *   - is malformed (bad rows, palette, names, duplicate id, wrong pack for its file),
 *   - has zero or more than one solution (uniqueness is proven by the solver),
 *   - cannot be solved by line logic alone (the hint engine promises deducible moves),
 *   - is probably not recognizable (too sparse/dense, fragmented, does not use the canvas).
 * Also computes difficulty from solver passes.
 *
 * Usage: npm run validate:puzzles [-- --preview] [-- --pack=animals]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { analyze, computeQuality, parsePuzzle, rateDifficulty, recognizabilityIssues, renderAscii, type PuzzleDef } from "../src/game";

const DIR = join(process.cwd(), "content", "puzzles");
const POOL_FILE = "daily-pool.json";
const preview = process.argv.includes("--preview");
const packFilter = process.argv.find((a) => a.startsWith("--pack="))?.slice("--pack=".length);

const files = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== POOL_FILE).sort((a, b) => a.localeCompare(b));
const errors: string[] = [];
const seenIds = new Set<string>();
let total = 0;
const perPack = new Map<string, number>();

for (const file of files) {
  const pack = file.replace(/\.json$/, "");
  if (packFilter && pack !== packFilter) continue;
  let defs: PuzzleDef[];
  try {
    defs = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    if (!Array.isArray(defs)) throw new Error("file must contain a JSON array of puzzles");
  } catch (e) {
    errors.push(`${file}: cannot read (${(e as Error).message})`);
    continue;
  }

  console.log(`\n== ${pack} (${defs.length} puzzles) ==`);
  for (const def of defs) {
    total++;
    perPack.set(pack, (perPack.get(pack) ?? 0) + 1);
    const fail = (msg: string) => errors.push(`${def.id ?? "?"} [${file}]: ${msg}`);
    if (seenIds.has(def.id)) fail("duplicate id");
    seenIds.add(def.id);
    if (def.pack !== pack) fail(`pack "${def.pack}" does not match file name "${pack}"`);

    let parsed;
    try {
      parsed = parsePuzzle(def);
    } catch (e) {
      fail((e as Error).message);
      continue;
    }

    const a = analyze(parsed.clues);
    if (a.solutionCount === 0) fail("no solution (clues are inconsistent)");
    else if (!a.exhaustive) fail("uniqueness could not be proven (search budget exhausted)");
    else if (a.solutionCount > 1) fail("more than one solution");
    else if (!a.lineSolvable) fail(`needs guessing (line logic gets stuck; depth ${a.guessDepth}) — adjust the picture`);

    const issues = recognizabilityIssues(computeQuality(parsed.solution, parsed.width, parsed.height), parsed.width, parsed.height);
    for (const i of issues) fail(`not recognizable: ${i}`);

    const d = rateDifficulty(a, def.size);
    const status = errors.some((e) => e.startsWith(`${def.id} `)) ? "FAIL" : "ok  ";
    console.log(`${status} ${def.id.padEnd(22)} ${String(def.size).padStart(2)}x${def.size}  passes=${String(a.passes).padStart(2)}  difficulty=${d.level} (${d.score.toFixed(1)})  ${def.name.en}`);
    if (preview) console.log(renderAscii(parsed.solution, parsed.width, parsed.height) + "\n");
  }
}

console.log(`\n${total} puzzle(s) checked.`);
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log("All puzzles valid.");
