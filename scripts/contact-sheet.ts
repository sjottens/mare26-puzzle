/**
 * Renders a pack as one PNG contact sheet (5 puzzles per row) so a whole pack can be reviewed at a glance.
 * Usage: npx tsx scripts/contact-sheet.ts <pack> [out.png]
 */
import { deflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parsePuzzle, type PuzzleDef } from "../src/game";

const pack = process.argv[2];
const out = process.argv[3] ?? join(process.env.TEMP ?? ".", `sheet-${pack}.png`);
const defs: PuzzleDef[] = JSON.parse(readFileSync(join(process.cwd(), "content", "puzzles", `${pack}.json`), "utf8"));

const CELL = 220;
const COLS = 5;
const rows = Math.ceil(defs.length / COLS);
const W = COLS * CELL;
const H = rows * CELL;
const px = Buffer.alloc(W * H * 3, 250);

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

defs.forEach((def, i) => {
  const p = parsePuzzle(def);
  const ox = (i % COLS) * CELL;
  const oy = Math.floor(i / COLS) * CELL;
  const scale = Math.floor((CELL - 24) / p.width);
  const size = scale * p.width;
  const sx = ox + Math.floor((CELL - size) / 2);
  const sy = oy + Math.floor((CELL - size) / 2);
  const color = hex(def.palette[0]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const filled = p.solution[Math.floor(y / scale) * p.width + Math.floor(x / scale)] === 1;
      const edge = x % scale === 0 || y % scale === 0;
      const c = filled ? (edge ? color.map((v) => Math.floor(v * 0.85)) : color) : edge ? [232, 226, 218] : [244, 240, 234];
      const o = ((sy + y) * W + sx + x) * 3;
      px[o] = c[0];
      px[o + 1] = c[1];
      px[o + 2] = c[2];
    }
  }
  // Frame between sheets.
  for (let k = 0; k < CELL; k++) for (const [x, y] of [[ox + k, oy], [ox, oy + k]]) { const o = (y * W + x) * 3; px[o] = px[o + 1] = px[o + 2] = 170; }
});

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log(`wrote ${out} (${defs.length} puzzles)`);
