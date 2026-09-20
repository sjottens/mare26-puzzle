// Builds content/puzzles/<pack>.json from art/<pack>.mjs.  Usage: node art/build.mjs <pack> [<pack> ...]
import { writeFileSync } from "node:fs";
const packs = process.argv.slice(2);
for (const pack of packs) {
  const mod = await import(`./${pack}.mjs`);
  const list = mod.default;
  const out = list.map((p, i) => {
    const rows = Array.isArray(p.art) ? p.art : p.art.rows();
    if (!rows.every((r) => r.length === rows.length)) throw new Error(`${pack} #${i + 1} "${p.en}": rows are not square (${rows.map((r) => r.length).join(",")})`);
    return { id: `${pack}-${String(i + 1).padStart(2, "0")}`, name: { en: p.en, nl: p.nl }, pack, size: rows.length, rows, palette: [p.color] };
  });
  writeFileSync(`content/puzzles/${pack}.json`, JSON.stringify(out, null, 2) + "\n");
  console.log(`${pack}: ${out.length} puzzles`);
}
