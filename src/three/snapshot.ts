/** The 3D scene registers a function that renders one frame and returns it as a PNG data URL. */
let capture: (() => string | null) | null = null;

export function registerSnapshot(fn: (() => string | null) | null): void {
  capture = fn;
}

export function captureSnapshot(): string | null {
  return capture ? capture() : null;
}
