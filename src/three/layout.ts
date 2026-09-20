/** Board geometry shared by the scene, picking and the clue overlay. World units: 1 cell = 1. */

export const PITCH = 1;
export const GROUP = 5;
/** Extra space between every 5 cells (guide lines). */
export const GROUP_GAP = 0.16;
export const CUBE = 0.9;
export const CUBE_H = 0.6;
/** How far a filled cube presses down. */
export const PRESS = 0.2;
export const LAYER = CUBE_H + 0.04;
export const PLATE_MARGIN = 0.45;

export interface AxisLayout {
  centers: number[];
  /** Outer edge of the first/last cell. */
  min: number;
  max: number;
}

/** Cell centers along one axis, centered on 0. `gapScale` 1 = normal guide gaps, 0 = closed (reveal). */
export function axisLayout(n: number, gapScale = 1): AxisLayout {
  const raw = Array.from({ length: n }, (_, i) => i * PITCH + Math.floor(i / GROUP) * GROUP_GAP * gapScale);
  const mid = (raw[n - 1] ?? 0) / 2;
  const centers = raw.map((v) => v - mid);
  return { centers, min: (centers[0] ?? 0) - PITCH / 2, max: (centers[n - 1] ?? 0) + PITCH / 2 };
}

/** Index of the cell under world coordinate `coord`, or -1 when outside the board. */
export function cellAtCoord(layout: AxisLayout, coord: number, tolerance = 0.02): number {
  if (coord < layout.min - tolerance || coord > layout.max + tolerance) return -1;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < layout.centers.length; i++) {
    const d = Math.abs(coord - layout.centers[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export interface BoardExtent {
  halfW: number;
  halfD: number;
}

export function boardExtent(w: number, h: number): BoardExtent {
  const x = axisLayout(w);
  const z = axisLayout(h);
  return { halfW: x.max, halfD: z.max };
}
