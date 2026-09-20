"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Point, Tool } from "@/game";
import { useGame } from "@/store/game";
import { cam, clampPan, orbitBy, orbitZoom, panByPixels, setZoom, toggleFit } from "./camera";
import { axisLayout, cellAtCoord } from "./layout";
import { overlayRegistry } from "./registry";

const LONG_PRESS_MS = 450;
const MOVE_SLOP = 9;
const DOUBLE_TAP_MS = 320;

interface PaintState {
  id: number;
  x: number;
  y: number;
  touch: boolean;
  longPressed: boolean;
  moved: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  tool: Tool | undefined;
}

/** Translates raw pointer events on the canvas into game strokes, camera gestures and hover. */
export function Picker() {
  const { camera, gl, invalidate } = useThree();

  useEffect(() => {
    const dom = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    const pointers = new Map<number, { x: number; y: number }>();
    let paint: PaintState | null = null;
    let pinch: { dist: number; cx: number; cy: number; zoom: number } | null = null;
    let orbitLast: { x: number; y: number } | null = null;
    let lastTap = { t: 0, x: 0, y: 0 };
    let tapStart = { t: 0, x: 0, y: 0, moved: false };

    const game = () => useGame.getState();

    const cellAt = (clientX: number, clientY: number, clamp: boolean): Point | null => {
      const puzzle = game().puzzle;
      if (!puzzle) return null;
      const rect = dom.getBoundingClientRect();
      const lx = clientX - rect.left;
      const ly = clientY - rect.top;
      if (!clamp && (lx < overlayRegistry.metrics.left || ly < overlayRegistry.metrics.top)) return null; // under the clue strips
      ndc.set((lx / rect.width) * 2 - 1, -(ly / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      const xl = axisLayout(puzzle.width);
      const zl = axisLayout(puzzle.height);
      if (clamp) {
        const x = cellAtCoord(xl, Math.min(xl.max, Math.max(xl.min, hit.x)));
        const y = cellAtCoord(zl, Math.min(zl.max, Math.max(zl.min, hit.z)));
        return { x, y };
      }
      const x = cellAtCoord(xl, hit.x);
      const y = cellAtCoord(zl, hit.z);
      return x < 0 || y < 0 ? null : { x, y };
    };

    const clearTimer = () => {
      if (paint?.timer) clearTimeout(paint.timer);
      if (paint) paint.timer = null;
    };

    const wantsBoard = () => cam.mode === "play" && game().status === "playing" && !game().paused;
    const dims = () => {
      const p = game().puzzle;
      return { w: p?.width ?? 1, h: p?.height ?? 1 };
    };

    const startPinch = () => {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, zoom: cam.zoom };
    };

    const onDown = (e: PointerEvent) => {
      dom.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (cam.mode !== "play") {
        orbitLast = { x: e.clientX, y: e.clientY };
        cam.lastInteract = performance.now();
        return;
      }
      if (game().status !== "playing" || game().paused) return;

      if (pointers.size >= 2) {
        // A second finger turns the gesture into pinch/pan: undo whatever the first finger started.
        clearTimer();
        if (paint) game().strokeCancel();
        paint = null;
        startPinch();
        return;
      }

      const isTouch = e.pointerType === "touch" || e.pointerType === "pen";
      const now = performance.now();

      // Double-tap fits the board (only worth it on zoomable boards).
      const { w, h } = dims();
      if (isTouch && Math.max(w, h) >= 15 && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 28) {
        game().undoLastTap();
        toggleFit(w, h);
        lastTap = { t: 0, x: 0, y: 0 };
        invalidate();
        return;
      }
      tapStart = { t: now, x: e.clientX, y: e.clientY, moved: false };

      const cell = cellAt(e.clientX, e.clientY, false);
      if (!cell) return;
      let tool: Tool | undefined;
      if (e.pointerType === "mouse") {
        if (e.button === 2) tool = "cross";
        else if (e.button === 1) tool = "erase";
        else if (e.button !== 0) return;
      }
      if (!game().strokeStart(cell, tool)) return;
      paint = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: isTouch, longPressed: false, moved: false, timer: null, tool };
      if (isTouch) {
        const p = paint;
        p.timer = setTimeout(() => {
          if (paint !== p || p.moved) return;
          // Long-press = cross: replace the fill that already landed on this cell.
          game().strokeCancel();
          p.longPressed = true;
          p.tool = "cross";
          game().strokeStart(cell, "cross");
          if (navigator.vibrate) navigator.vibrate(12);
        }, LONG_PRESS_MS);
      }
      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (prev) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (e.pointerType === "mouse" && pointers.size === 0) {
        // Hover highlight + parallax follow the mouse.
        const rect = dom.getBoundingClientRect();
        cam.parallax.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        cam.parallax.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        if (wantsBoard()) game().setHover(cellAt(e.clientX, e.clientY, false));
        invalidate();
        return;
      }
      if (!prev) return;

      if (cam.mode !== "play") {
        if (orbitLast && pointers.size === 1) {
          orbitBy(e.clientX - orbitLast.x, e.clientY - orbitLast.y, performance.now());
          orbitLast = { x: e.clientX, y: e.clientY };
          invalidate();
        }
        return;
      }

      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const { w, h } = dims();
        setZoom(pinch.zoom * (dist / pinch.dist), w, h);
        panByPixels(cx - pinch.cx, cy - pinch.cy, dom.clientHeight, w, h);
        pinch.cx = cx;
        pinch.cy = cy;
        invalidate();
        return;
      }

      if (paint && paint.id === e.pointerId) {
        if (Math.hypot(e.clientX - paint.x, e.clientY - paint.y) > MOVE_SLOP) {
          paint.moved = true;
          tapStart.moved = true;
          clearTimer();
        }
        const cell = cellAt(e.clientX, e.clientY, true);
        if (cell) game().strokeMove(cell);
        game().setHover(cell);
        invalidate();
      }
    };

    const endPointer = (e: PointerEvent) => {
      const wasPinch = pinch !== null;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) orbitLast = null;
      if (paint && paint.id === e.pointerId) {
        clearTimer();
        game().strokeEnd();
        if (paint.touch && !paint.moved && !paint.longPressed) lastTap = { t: performance.now(), x: e.clientX, y: e.clientY };
        paint = null;
        if (e.pointerType !== "mouse") game().setHover(null);
      } else if (wasPinch) {
        lastTap = { t: 0, x: 0, y: 0 };
      }
      invalidate();
    };

    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && pointers.size === 0) {
        game().setHover(null);
        cam.parallax.tx = 0;
        cam.parallax.ty = 0;
        invalidate();
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      if (cam.mode === "play") {
        const { w, h } = dims();
        setZoom(cam.zoom * factor, w, h);
        clampPan(w, h);
      } else orbitZoom(1 / factor, performance.now());
      invalidate();
    };

    const onContext = (e: Event) => e.preventDefault();

    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerup", endPointer);
    dom.addEventListener("pointercancel", endPointer);
    dom.addEventListener("pointerleave", onLeave);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("contextmenu", onContext);
    return () => {
      clearTimer();
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerup", endPointer);
      dom.removeEventListener("pointercancel", endPointer);
      dom.removeEventListener("pointerleave", onLeave);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("contextmenu", onContext);
    };
  }, [camera, gl, invalidate]);

  return null;
}
