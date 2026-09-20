import * as THREE from "three";
import { boardExtent, PLATE_MARGIN } from "./layout";
import type { StripMetrics } from "./registry";

export const FOV = 30;
/** Gentle 3/4 top-down view used during play. */
export const EL_PLAY = (58 * Math.PI) / 180;
export const MIN_CELL_PX = 22;
export const MAX_CELL_PX = 66;
const REVEAL_SWOOP_SECONDS = 2.3;

export type CamMode = "play" | "reveal" | "orbit";

export interface Pose {
  az: number;
  el: number;
  dist: number;
  tx: number;
  ty: number;
  tz: number;
}

/** Everything the camera loop, the pointer controls and the overlay agree on. Module singleton: one game canvas at a time. */
export const cam = {
  mode: "play" as CamMode,
  puzzleKey: "",
  viewKey: "",
  zoom: 1,
  zoomReadable: 1,
  minZoom: 1,
  maxZoom: 3,
  panX: 0,
  panZ: 0,
  fitDist: 30,
  fitCellPx: 30,
  viewOffX: 0,
  viewOffY: 0,
  cur: { az: 0, el: EL_PLAY, dist: 30, tx: 0, ty: 0, tz: 0 } as Pose,
  parallax: { x: 0, y: 0, tx: 0, ty: 0 },
  parallaxEnabled: true,
  shakeStart: -1e9,
  revealStart: 0,
  orbit: { az: 0.9, el: 0.62, dist: 30 },
  orbitDist: 30,
  lastInteract: 0,
  autoRotate: true,
  reducedMotion: false,
};

const tmpCam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 500);
const tmpV = new THREE.Vector3();

export function poseToCamera(p: Pose, camera: THREE.PerspectiveCamera): void {
  const cosEl = Math.cos(p.el);
  camera.position.set(p.tx + p.dist * cosEl * Math.sin(p.az), p.ty + p.dist * Math.sin(p.el), p.tz + p.dist * cosEl * Math.cos(p.az));
  camera.lookAt(p.tx, p.ty, p.tz);
  camera.updateMatrixWorld();
}

interface Fit {
  dist: number;
  cellPx: number;
  offX: number;
  offY: number;
}

/**
 * Distance at which the whole board fits the free area (viewport minus clue strips and toolbar),
 * plus the pixel offset that centres it in that area.
 */
export function computeFit(w: number, h: number, width: number, height: number, vw: number, vh: number, m: StripMetrics): Fit {
  const ext = boardExtent(w, h);
  const pad = 10;
  const availW = Math.max(60, vw - m.left - m.right - pad * 2);
  const availH = Math.max(60, vh - m.top - m.bottom - pad * 2);
  tmpCam.aspect = vw / vh;
  tmpCam.updateProjectionMatrix();

  const measure = (dist: number) => {
    poseToCamera({ az: 0, el: EL_PLAY, dist, tx: 0, ty: 0, tz: 0 }, tmpCam);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const y of [0.05, -0.55]) {
          tmpV.set(sx * (ext.halfW + PLATE_MARGIN), y, sz * (ext.halfD + PLATE_MARGIN)).project(tmpCam);
          const px = ((tmpV.x + 1) / 2) * vw;
          const py = ((1 - tmpV.y) / 2) * vh;
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
        }
      }
    }
    return { minX, maxX, minY, maxY };
  };

  let dist = 30;
  for (let i = 0; i < 4; i++) {
    const b = measure(dist);
    dist *= Math.max((b.maxX - b.minX) / availW, (b.maxY - b.minY) / availH);
  }
  // Small boards would otherwise fill the whole screen with giant cubes: cap the cell size.
  const capped = measure(dist);
  const cell0 = (capped.maxX - capped.minX) / (2 * ext.halfW);
  if (cell0 > MAX_CELL_PX) dist *= cell0 / MAX_CELL_PX;
  const b = measure(dist);
  const rectCx = m.left + (vw - m.left - m.right) / 2;
  const rectCy = m.top + (vh - m.top - m.bottom) / 2;
  return {
    dist,
    cellPx: (b.maxX - b.minX) / (2 * ext.halfW),
    offX: rectCx - (b.minX + b.maxX) / 2,
    offY: rectCy - (b.minY + b.maxY) / 2,
  };
}

/** Recomputes the fit and (when the puzzle changed) resets zoom/pan to a readable starting view. */
export function refit(w: number, h: number, width: number, height: number, vw: number, vh: number, m: StripMetrics, puzzleId: string): void {
  const fit = computeFit(w, h, width, height, vw, vh, m);
  cam.fitDist = fit.dist;
  cam.fitCellPx = fit.cellPx;
  cam.viewOffX = fit.offX;
  cam.viewOffY = fit.offY;
  cam.minZoom = 1;
  cam.zoomReadable = Math.min(3, Math.max(1, MIN_CELL_PX / fit.cellPx));
  cam.maxZoom = Math.max(3, cam.zoomReadable * 1.6);
  if (cam.puzzleKey !== puzzleId) {
    cam.puzzleKey = puzzleId;
    cam.zoom = cam.zoomReadable;
    cam.panX = 0;
    cam.panZ = 0;
    cam.mode = "play";
    cam.cur = { az: 0, el: EL_PLAY, dist: fit.dist / cam.zoom, tx: 0, ty: 0, tz: 0 };
    // Big boards start zoomed in on the top-left where the solving usually starts.
    if (cam.zoom > 1.05) {
      const ext = boardExtent(w, h);
      cam.panX = -ext.halfW * (1 - 1 / cam.zoom) * 0.9;
      cam.panZ = -ext.halfD * (1 - 1 / cam.zoom) * 0.9;
    }
  }
  clampPan(w, h);
}

export function clampPan(w: number, h: number): void {
  const ext = boardExtent(w, h);
  const limX = Math.max(0, ext.halfW * (1 - 1 / cam.zoom)) + 1.5;
  const limZ = Math.max(0, ext.halfD * (1 - 1 / cam.zoom)) + 1.5;
  cam.panX = Math.min(limX, Math.max(-limX, cam.panX));
  cam.panZ = Math.min(limZ, Math.max(-limZ, cam.panZ));
}

/** World units per screen pixel at the target depth. */
export function unitsPerPixel(viewH: number): number {
  return (2 * cam.cur.dist * Math.tan((FOV * Math.PI) / 360)) / viewH;
}

export function setZoom(z: number, w: number, h: number): void {
  cam.zoom = Math.min(cam.maxZoom, Math.max(cam.minZoom, z));
  clampPan(w, h);
}

export function panByPixels(dx: number, dy: number, viewH: number, w: number, h: number): void {
  const u = unitsPerPixel(viewH);
  cam.panX -= dx * u;
  cam.panZ -= (dy * u) / Math.sin(EL_PLAY);
  clampPan(w, h);
}

/** Toggles between the whole board and the readable zoom (double-tap). */
export function toggleFit(w: number, h: number): void {
  const nearFit = Math.abs(cam.zoom - 1) < 0.08;
  cam.zoom = nearFit ? cam.zoomReadable : 1;
  if (cam.zoom === 1) {
    cam.panX = 0;
    cam.panZ = 0;
  }
  clampPan(w, h);
}

export function shake(now: number): void {
  if (!cam.reducedMotion) cam.shakeStart = now;
}

export function orbitDistanceFor(w: number, h: number, aspect: number): number {
  const ext = boardExtent(w, h);
  const radius = Math.hypot(ext.halfW + PLATE_MARGIN, ext.halfD + PLATE_MARGIN) + 0.6;
  const vHalf = (FOV * Math.PI) / 360;
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  return (radius / Math.sin(Math.min(vHalf, hHalf))) * 1.22;
}

export function startReveal(now: number, w: number, h: number, aspect: number): void {
  cam.orbitDist = orbitDistanceFor(w, h, aspect);
  cam.revealStart = now;
  cam.lastInteract = now;
  cam.autoRotate = true;
  cam.orbit = { az: 0.9, el: 0.62, dist: cam.orbitDist };
  cam.mode = cam.reducedMotion ? "orbit" : "reveal";
}

export function endReveal(): void {
  cam.mode = "play";
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Target pose for the current mode. `now` in ms. Returns the pose and the view offset to use. */
export function targetPose(now: number, dt: number, vw: number, vh: number): { pose: Pose; offX: number; offY: number } {
  const shakeT = (now - cam.shakeStart) / 1000;
  const shakeX = shakeT >= 0 && shakeT < 0.35 ? Math.sin(shakeT * 70) * 0.16 * (1 - shakeT / 0.35) : 0;

  if (cam.mode === "play") {
    const px = cam.parallaxEnabled && !cam.reducedMotion ? cam.parallax.x : 0;
    const py = cam.parallaxEnabled && !cam.reducedMotion ? cam.parallax.y : 0;
    return {
      pose: { az: px * 0.035, el: EL_PLAY + py * 0.025, dist: cam.fitDist / cam.zoom, tx: cam.panX + shakeX, ty: 0, tz: cam.panZ },
      offX: cam.viewOffX,
      offY: cam.viewOffY,
    };
  }

  const revealOffY = -vh * 0.15;
  if (cam.mode === "reveal") {
    const T = (now - cam.revealStart) / 1000;
    const p = easeInOut(Math.min(1, T / REVEAL_SWOOP_SECONDS));
    const from: Pose = { az: 0, el: EL_PLAY, dist: cam.fitDist / cam.zoom, tx: cam.panX, ty: 0, tz: cam.panZ };
    const bump = 1 + 0.16 * Math.sin(Math.PI * p);
    const pose: Pose = {
      az: from.az + (cam.orbit.az + 0.5 - from.az) * p,
      el: from.el + (cam.orbit.el - from.el) * p,
      dist: (from.dist + (cam.orbitDist - from.dist) * p) * bump,
      tx: from.tx * (1 - p),
      ty: 0.5 * p,
      tz: from.tz * (1 - p),
    };
    if (T >= REVEAL_SWOOP_SECONDS) {
      cam.mode = "orbit";
      cam.orbit = { az: pose.az, el: pose.el, dist: cam.orbitDist };
      cam.lastInteract = now;
    }
    return { pose, offX: cam.viewOffX * (1 - p), offY: cam.viewOffY * (1 - p) + revealOffY * p };
  }

  // orbit: drag to rotate; slowly auto-rotates when left alone.
  if (cam.autoRotate && !cam.reducedMotion && now - cam.lastInteract > 2500) cam.orbit.az += dt * 0.28;
  return { pose: { az: cam.orbit.az, el: cam.orbit.el, dist: cam.orbit.dist, tx: 0, ty: 0.5, tz: 0 }, offX: 0, offY: revealOffY };
}

export function orbitBy(dx: number, dy: number, now: number): void {
  cam.orbit.az -= dx * 0.008;
  cam.orbit.el = Math.min(1.35, Math.max(0.15, cam.orbit.el + dy * 0.006));
  cam.lastInteract = now;
}

export function orbitZoom(factor: number, now: number): void {
  cam.orbit.dist = Math.min(cam.orbitDist * 1.8, Math.max(cam.orbitDist * 0.45, cam.orbit.dist * factor));
  cam.lastInteract = now;
}
