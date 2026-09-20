// Post-build step: scans ./out and writes out/sw.js with a hashed precache manifest.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";

const OUT = "out";
const SKIP = new Set(["sw.js", "_redirects"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(OUT)
  .map((p) => ({ p, rel: relative(OUT, p).split(sep).join("/") }))
  .filter((f) => !SKIP.has(f.rel) && !f.rel.endsWith(".map"));

const hash = createHash("sha256");
const urls = [];
for (const f of files.sort((a, b) => a.rel.localeCompare(b.rel))) {
  hash.update(f.rel).update(readFileSync(f.p));
  if (f.rel === "index.html") urls.push("/");
  else if (f.rel.endsWith("/index.html")) urls.push("/" + f.rel.slice(0, -"index.html".length));
  urls.push("/" + f.rel);
}
const version = hash.digest("hex").slice(0, 12);
const template = readFileSync("scripts/sw-template.js", "utf8");
writeFileSync(
  join(OUT, "sw.js"),
  template.replace("__VERSION__", version).replace("__PRECACHE__", JSON.stringify([...new Set(urls)], null, 1)),
);
console.log(`sw.js written: ${urls.length} precache entries, version ${version}`);
