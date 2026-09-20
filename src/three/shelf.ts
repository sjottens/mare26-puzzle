/** Linear layout of the shelf view: orthographic camera, so world -> pixels is a simple scale. */
export const SHELF_PITCH_Y = 1.32;
export const SHELF_TILT = (14 * Math.PI) / 180;
/** Dioramas stand upright on the shelf like relief plaques, tipped this far back from vertical. */
export const PLAQUE_TILT = 0.2;

export interface ShelfGeometry {
  /** Pixels per world unit. */
  scale: number;
  /** Pixel centre of item (col,row). */
  itemCenter: (col: number, row: number) => { x: number; y: number };
  /** World position of item (col,row) on the z=0 plane. */
  worldPos: (col: number, row: number) => { x: number; y: number };
  /** Suggested square button size in px. */
  button: number;
}

export function shelfGeometry(width: number, height: number, cols: number, rows: number): ShelfGeometry {
  const cos = Math.cos(SHELF_TILT);
  const scale = Math.max(10, Math.min(width / (cols + 0.5), height / (rows * SHELF_PITCH_Y * cos + 0.55)));
  const worldPos = (col: number, row: number) => ({ x: col - (cols - 1) / 2, y: ((rows - 1) / 2 - row) * SHELF_PITCH_Y });
  const itemCenter = (col: number, row: number) => {
    const p = worldPos(col, row);
    return { x: width / 2 + p.x * scale, y: height / 2 - p.y * cos * scale };
  };
  return { scale, itemCenter, worldPos, button: Math.max(44, Math.min(scale * 0.95, scale * SHELF_PITCH_Y * cos * 0.95)) };
}
