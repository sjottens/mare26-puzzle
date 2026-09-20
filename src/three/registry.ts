/**
 * A tiny bridge between the DOM clue strips (React) and the 3D camera (three.js).
 * The camera loop writes projected positions straight into these elements' transforms, so the
 * numbers stay glued to the grid without any React re-render per frame.
 */
export interface StripMetrics {
  /** Width of the left (row clue) strip in CSS px. */
  left: number;
  /** Height of the top (column clue) strip in CSS px. */
  top: number;
  /** Space reserved below the board (px). */
  bottom: number;
  /** Space reserved to the right of the board (px). */
  right: number;
}

export const overlayRegistry = {
  cols: [] as (HTMLElement | null)[],
  rows: [] as (HTMLElement | null)[],
  metrics: { left: 0, top: 0, bottom: 0, right: 0 } as StripMetrics,
  /** Set by the scene: true once the first frame has been drawn. */
  ready: false,
};

/** Gestures/UI can ask the scene for a re-fit (e.g. after strips change size). */
export const sceneSignals = {
  fitRequested: 0,
  requestFit() {
    this.fitRequested++;
  },
};
