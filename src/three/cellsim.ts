import { CROSSED, FILLED, type Axis } from "@/game";
import { CUBE_H, LAYER, PRESS } from "./layout";

/** Max extra layers stacked on top of layer 0 in the diorama. */
export const TOWER_LAYERS = 3;

export type RGB = [number, number, number];

export interface SimColors {
  paper: RGB;
  paperCross: RGB;
  fill: RGB;
  mistake: RGB;
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = Math.min(1, Math.max(0, t)) - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
};
const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Animation state for every cell. Pure numbers (no three.js), so the React component only
 * has to copy the results into instance matrices. `update()` returns true while anything moves,
 * which lets the renderer sleep (frameloop="demand") when the board is idle.
 */
export class CellSim {
  readonly n: number;
  /** Logical cell state (0 empty, 1 filled, 2 crossed). */
  readonly state: Uint8Array;
  /** Top surface height of the layer-0 cube. */
  readonly top: Float32Array;
  private readonly vel: Float32Array;
  readonly crossK: Float32Array;
  /** Current colour per cell (rgb). */
  readonly color: Float32Array;
  /** Output: colour after glow/flash. */
  readonly outColor: Float32Array;
  readonly cubeY: Float32Array;
  readonly cubeS: Float32Array;
  readonly crossS: Float32Array;
  readonly towerY: Float32Array;
  readonly towerS: Float32Array;
  readonly studY: Float32Array;
  readonly studS: Float32Array;
  gapScale = 1;
  private readonly glowStart: Float64Array;
  private readonly flashStart: Float64Array;
  private colors: SimColors;
  private showStuds = false;

  revealing = false;
  private revealStart = 0;
  private heights: Uint8Array;
  private revealDelay: Float32Array;
  /** Seconds after which the whole reveal animation has finished. */
  revealDuration = 2.4;

  constructor(
    readonly w: number,
    readonly h: number,
    colors: SimColors,
  ) {
    this.n = w * h;
    const n = this.n;
    this.colors = colors;
    this.state = new Uint8Array(n);
    this.top = new Float32Array(n);
    this.vel = new Float32Array(n);
    this.crossK = new Float32Array(n);
    this.color = new Float32Array(n * 3);
    this.outColor = new Float32Array(n * 3);
    this.cubeY = new Float32Array(n);
    this.cubeS = new Float32Array(n).fill(1);
    this.crossS = new Float32Array(n);
    this.towerY = new Float32Array(n * TOWER_LAYERS);
    this.towerS = new Float32Array(n * TOWER_LAYERS);
    this.studY = new Float32Array(n);
    this.studS = new Float32Array(n);
    this.glowStart = new Float64Array(n).fill(-1e12);
    this.flashStart = new Float64Array(n).fill(-1e12);
    this.heights = new Uint8Array(n);
    this.revealDelay = new Float32Array(n);
    for (let i = 0; i < n; i++) this.setColor(i, colors.paper);
  }

  private setColor(i: number, c: RGB): void {
    this.color[i * 3] = c[0];
    this.color[i * 3 + 1] = c[1];
    this.color[i * 3 + 2] = c[2];
  }

  private targetColor(state: number): RGB {
    return state === FILLED ? this.colors.fill : state === CROSSED ? this.colors.paperCross : this.colors.paper;
  }

  private targetTop(state: number): number {
    return state === FILLED ? -PRESS : state === CROSSED ? -0.07 : 0;
  }

  setColors(colors: SimColors): void {
    this.colors = colors;
  }

  /** Studs on filled cubes (colorblind mode). */
  setStuds(on: boolean): void {
    this.showStuds = on;
  }

  /** Sets the logical state; visuals animate towards it. `snap` jumps there immediately. */
  setState(cells: ArrayLike<number>, snap = false): void {
    for (let i = 0; i < this.n; i++) {
      this.state[i] = cells[i];
      if (snap) {
        this.top[i] = this.targetTop(cells[i]);
        this.vel[i] = 0;
        this.crossK[i] = cells[i] === CROSSED ? 1 : 0;
        this.setColor(i, this.targetColor(cells[i]));
      }
    }
  }

  pulseLine(axis: Axis, index: number, now: number): void {
    const len = axis === "row" ? this.w : this.h;
    for (let i = 0; i < len; i++) {
      const cell = axis === "row" ? index * this.w + i : i * this.w + index;
      this.glowStart[cell] = now + i * 42;
    }
  }

  flashCell(index: number, now: number): void {
    this.flashStart[index] = now;
  }

  startReveal(heights: Uint8Array, now: number): void {
    this.revealing = true;
    this.revealStart = now;
    this.heights = heights;
    const cx = (this.w - 1) / 2;
    const cy = (this.h - 1) / 2;
    const maxD = Math.hypot(cx, cy) || 1;
    for (let i = 0; i < this.n; i++) {
      const x = i % this.w;
      const y = Math.floor(i / this.w);
      this.revealDelay[i] = 0.4 + (Math.hypot(x - cx, y - cy) / maxD) * 0.55;
    }
  }

  cancelReveal(): void {
    this.revealing = false;
    this.gapScale = 1;
    this.towerS.fill(0);
    this.studS.fill(0);
    this.cubeS.fill(1);
  }

  /** Advances the simulation. Returns true while anything is still moving. */
  update(now: number, dt: number): boolean {
    let active = false;
    const step = Math.min(dt, 1 / 30);
    const k = 260;
    const c = 17;

    for (let i = 0; i < this.n; i++) {
      const st = this.state[i];
      // Spring the pressed/raised height (tiny bounce).
      if (!this.revealing) {
        const target = this.targetTop(st);
        const diff = target - this.top[i];
        if (Math.abs(diff) > 0.0005 || Math.abs(this.vel[i]) > 0.005) {
          this.vel[i] += (k * diff - c * this.vel[i]) * step;
          this.top[i] += this.vel[i] * step;
          active = true;
        } else {
          this.top[i] = target;
          this.vel[i] = 0;
        }
      }
      // Colour and cross-mark easing.
      const tc = this.targetColor(st);
      const lerp = 1 - Math.exp(-step * 22);
      for (let ch = 0; ch < 3; ch++) {
        const idx = i * 3 + ch;
        const d = tc[ch] - this.color[idx];
        if (Math.abs(d) > 0.002) {
          this.color[idx] += d * lerp;
          active = true;
        } else this.color[idx] = tc[ch];
      }
      const tx = st === CROSSED && !this.revealing ? 1 : 0;
      const dx = tx - this.crossK[i];
      if (Math.abs(dx) > 0.01) {
        this.crossK[i] += dx * (1 - Math.exp(-step * 26));
        active = true;
      } else this.crossK[i] = tx;
    }

    // Line-complete wave and mistake flash.
    for (let i = 0; i < this.n; i++) {
      const g = this.glowAt(i, now);
      const f = this.flashAt(i, now);
      if (g > 0.001 || f > 0.001) active = true;
      const bump = g * 0.09;
      const base = this.revealing ? 0 : bump;
      this.cubeY[i] = this.revealing ? this.cubeY[i] : this.top[i] + base;
      const o = i * 3;
      for (let ch = 0; ch < 3; ch++) {
        const v = this.color[o + ch];
        const lit = v + (1 - v) * g * 0.6;
        this.outColor[o + ch] = lit + (this.colors.mistake[ch] - lit) * f;
      }
      this.crossS[i] = this.crossK[i];
      if (!this.revealing) {
        this.cubeS[i] = 1;
        this.studS[i] = this.showStuds && this.state[i] === FILLED ? 1 : 0;
        this.studY[i] = this.cubeY[i];
      }
    }

    if (this.revealing) active = this.updateReveal((now - this.revealStart) / 1000) || active;
    return active;
  }

  private glowAt(i: number, now: number): number {
    const t = (now - this.glowStart[i]) / 1000;
    if (t < 0 || t > 1.4) return 0;
    return t < 0.09 ? t / 0.09 : Math.exp(-(t - 0.09) * 4.5);
  }

  private flashAt(i: number, now: number): number {
    const t = (now - this.flashStart[i]) / 1000;
    if (t < 0 || t > 0.9) return 0;
    return Math.exp(-t * 4.5);
  }

  /** The diorama reveal: guide gaps close, empties sink away, filled cubes rise into towers. */
  private updateReveal(T: number): boolean {
    this.gapScale = 1 - smooth(T / 0.45);
    for (let i = 0; i < this.n; i++) {
      const delay = this.revealDelay[i];
      const filled = this.state[i] === FILLED;
      const height = this.heights[i];
      if (filled) {
        const p = clamp01((T - delay) / 0.4);
        this.cubeY[i] = -PRESS + PRESS * easeOutBack(p) + (p > 0 ? 0 : 0);
        this.cubeS[i] = 1;
        for (let L = 1; L <= TOWER_LAYERS; L++) {
          const idx = i * TOWER_LAYERS + (L - 1);
          if (L >= height) {
            this.towerS[idx] = 0;
            continue;
          }
          const q = clamp01((T - delay - 0.2 - L * 0.13) / 0.34);
          const e = easeOutBack(q);
          this.towerS[idx] = q <= 0 ? 0 : Math.min(1.08, e);
          this.towerY[idx] = L * LAYER - (1 - Math.min(1, e)) * 0.5;
        }
        const topLayer = Math.max(0, Math.min(height, TOWER_LAYERS + 1) - 1);
        const sq = clamp01((T - delay - 0.35 - topLayer * 0.13) / 0.25);
        this.studS[i] = sq > 0 ? Math.min(1.1, easeOutBack(sq)) : 0;
        this.studY[i] = topLayer * LAYER;
      } else {
        const p = clamp01((T - delay * 0.55) / 0.32);
        this.cubeS[i] = 1 - smooth(p);
        this.cubeY[i] = this.top[i] - 0.5 * smooth(p);
        this.crossS[i] = 0;
        this.studS[i] = 0;
        for (let L = 0; L < TOWER_LAYERS; L++) this.towerS[i * TOWER_LAYERS + L] = 0;
      }
    }
    return T < this.revealDuration;
  }
}

/** Half-height helper: cubes are centered on their instance origin, tops are what we animate. */
export const cubeCenterY = (top: number): number => top - CUBE_H / 2;
