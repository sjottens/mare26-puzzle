// Authoring helpers for puzzle pictures (not part of the app). See art/build.mjs.
export class Canvas {
  constructor(n) { this.n = n; this.g = Array.from({ length: n }, () => Array(n).fill(0)); }
  set(x, y, v = 1) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.n && y < this.n) this.g[y][x] = v; return this; }
  rect(x, y, w, h, v = 1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, v); return this; }
  clear(x, y, w, h) { return this.rect(x, y, w, h, 0); }
  disc(cx, cy, r, v = 1) { for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.set(x, y, v); return this; }
  ring(cx, cy, r, t = 0.6, v = 1) { for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) if (Math.abs(Math.hypot(x - cx, y - cy) - r) <= t) this.set(x, y, v); return this; }
  ellipse(cx, cy, rx, ry, v = 1) { for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, v); return this; }
  line(x0, y0, x1, y1, v = 1) { const s = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= s; i++) this.set(x0 + ((x1 - x0) * i) / s, y0 + ((y1 - y0) * i) / s, v); return this; }
  poly(pts, v = 1) { for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } if (inside) this.set(x, y, v); } return this; }
  /** Copies the left half onto the right half, mirrored. */
  mirror() { for (let y = 0; y < this.n; y++) for (let x = 0; x < Math.floor(this.n / 2); x++) this.g[y][this.n - 1 - x] = this.g[y][x]; return this; }
  rows() { return this.g.map((r) => r.map((v) => (v ? "#" : ".")).join("")); }
}

/** Hand-drawn art: rows of "#" and ".". */
export const art = (s) => s.trim().split("\n").map((r) => r.trim());

/** Nearest-neighbour upscale of hand-drawn rows (5x5 -> 10x10 with k=2). */
export const scale = (rows, k) => rows.flatMap((r) => { const wide = [...r].map((c) => c.repeat(k)).join(""); return Array(k).fill(wide); });
