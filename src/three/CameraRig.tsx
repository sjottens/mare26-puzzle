"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/store/game";
import { useStage } from "@/store/stage";
import { cam, endReveal, poseToCamera, refit, startReveal, targetPose, type Pose } from "./camera";
import { overlayRegistry, sceneSignals } from "./registry";

const POSE_KEYS: (keyof Pose)[] = ["az", "el", "dist", "tx", "ty", "tz"];

/** Owns the camera: fit-to-viewport, zoom/pan, subtle parallax, mistake shake and the reveal swoop. */
export function CameraRig() {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    return useStage.subscribe((s, prev) => {
      const puzzle = useGame.getState().puzzle;
      cam.reducedMotion = s.reducedMotion;
      if (s.revealing && !prev.revealing && puzzle) {
        startReveal(performance.now(), puzzle.width, puzzle.height, size.width / size.height);
        invalidate();
      }
      if (!s.revealing && prev.revealing) {
        endReveal();
        cam.viewKey = ""; // force a fresh fit
        invalidate();
      }
    });
  }, [size.width, size.height, invalidate]);

  // Device tilt gives a tiny parallax on phones (Android/Chrome; ignored elsewhere).
  useEffect(() => {
    let last = 0;
    const onTilt = (e: DeviceOrientationEvent) => {
      const now = performance.now();
      if (now - last < 60 || e.gamma == null || e.beta == null) return;
      last = now;
      cam.parallax.tx = Math.max(-1, Math.min(1, e.gamma / 25));
      cam.parallax.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
      invalidate();
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, [invalidate]);

  useFrame((_, delta) => {
    const puzzle = useGame.getState().puzzle;
    if (!puzzle) return;
    const cam3 = camera as THREE.PerspectiveCamera;
    const m = overlayRegistry.metrics;
    const key = `${size.width}x${size.height}|${puzzle.def.id}|${m.left},${m.top},${m.bottom},${m.right}|${sceneSignals.fitRequested}`;
    if (key !== cam.viewKey) {
      cam.viewKey = key;
      refit(puzzle.width, puzzle.height, puzzle.width, puzzle.height, size.width, size.height, m, puzzle.def.id);
    }

    const now = performance.now();
    const dt = Math.min(delta, 0.05);
    const { pose, offX, offY } = targetPose(now, dt, size.width, size.height);

    // Parallax eases towards its target.
    const pk = 1 - Math.exp(-dt * 6);
    const px = cam.parallax.x + (cam.parallax.tx - cam.parallax.x) * pk;
    const py = cam.parallax.y + (cam.parallax.ty - cam.parallax.y) * pk;
    const parallaxMoving = Math.abs(px - cam.parallax.tx) > 0.002 || Math.abs(py - cam.parallax.ty) > 0.002;
    cam.parallax.x = px;
    cam.parallax.y = py;

    let moving = parallaxMoving;
    if (cam.mode === "play") {
      const k = 1 - Math.exp(-dt * 16);
      for (const f of POSE_KEYS) {
        const d = pose[f] - cam.cur[f];
        if (Math.abs(d) > (f === "dist" ? 0.002 : 0.0004)) moving = true;
        cam.cur[f] += d * k;
      }
      if (now - cam.shakeStart < 400) moving = true;
    } else {
      cam.cur = pose;
      moving = true; // reveal/orbit are always animating (auto-rotate, swoop)
      if (cam.mode === "orbit" && (cam.reducedMotion || !cam.autoRotate) && now - cam.lastInteract > 2600) moving = false;
    }

    poseToCamera(cam.cur, cam3);
    cam3.setViewOffset(size.width, size.height, -offX, -offY, size.width, size.height);
    if (!overlayRegistry.ready) {
      overlayRegistry.ready = true;
      useStage.getState().setReady(true);
    }
    if (moving) invalidate();
  });

  return null;
}
