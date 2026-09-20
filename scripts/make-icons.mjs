// Generates the PWA icons (pure Node, no deps): a bevelled toy-brick heart on indigo.
// Usage: node scripts/make-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const PATTERN = [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."];
const BG = [43, 45, 91];
const BRICK = [255, 143, 163];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Signed distance to a rounded box centred at (0,0) with half-size h and corner radius r.
function sdRoundBox(px, py, h, r) {
  const qx = Math.abs(px) - (h - r), qy = Math.abs(py) - (h - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const grid = 5, content = size * 0.66, cell = content / grid, off = (size - content) / 2;
  const half = cell * 0.44, radius = cell * 0.2, bevel = cell * 0.12;
  const SS = 3; // supersampling
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const fx = x + (sx + 0.5) / SS, fy = y + (sy + 0.5) / SS;
      let col = BG;
      const gx = Math.floor((fx - off) / cell), gy = Math.floor((fy - off) / cell);
      if (gx >= 0 && gy >= 0 && gx < grid && gy < grid && PATTERN[gy][gx] === "X") {
        const lx = fx - off - (gx + 0.5) * cell, ly = fy - off - (gy + 0.5) * cell;
        const d = sdRoundBox(lx, ly, half, radius);
        if (d < 0) {
          const edge = -d;
          let k = 1;
          if (edge < bevel) k = (lx + ly < 0) ? 1.18 : 0.8; // light top-left, dark bottom-right
          col = BRICK.map((v) => Math.min(255, Math.round(v * k)));
        }
      }
      r += col[0]; g += col[1]; b += col[2];
    }
    const i = (y * size + x) * 4, n = SS * SS;
    buf[i] = r / n; buf[i + 1] = g / n; buf[i + 2] = b / n; buf[i + 3] = 255;
  }
  return png(size, buf);
}

mkdirSync("public/icons", { recursive: true });
for (const s of [180, 192, 512]) writeFileSync(`public/icons/icon-${s}.png`, render(s));
// The brick sits inside the maskable safe zone, so the same art serves both purposes.
writeFileSync("public/icons/maskable-512.png", render(512));
console.log("icons written");
