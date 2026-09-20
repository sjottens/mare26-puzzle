"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/store/game";
import { cam } from "./camera";
import { axisLayout } from "./layout";
import { overlayRegistry } from "./registry";

/**
 * Glues the DOM clue numbers to the 3D grid: every frame the column/row centres are projected to
 * screen space and written into the elements' transforms (no React re-render involved).
 */
export function OverlaySync() {
  const { camera, size } = useThree();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const v = new THREE.Vector3();
  const hit = new THREE.Vector3();

  useFrame(() => {
    const puzzle = useGame.getState().puzzle;
    if (!puzzle || cam.mode !== "play") return;
    const { cols, rows, metrics } = overlayRegistry;
    const xs = axisLayout(puzzle.width).centers;
    const zs = axisLayout(puzzle.height).centers;

    // World depth at the bottom edge of the top strip: columns are read at that depth.
    ray.setFromCamera(new THREE.Vector2(0, 1 - (2 * metrics.top) / size.height), camera);
    const zTop = ray.ray.intersectPlane(plane, hit) ? hit.z : zs[0] - 0.5;

    for (let i = 0; i < xs.length; i++) {
      const el = cols[i];
      if (!el) continue;
      v.set(xs[i], 0, zTop).project(camera);
      el.style.transform = `translate3d(${(((v.x + 1) / 2) * size.width).toFixed(1)}px,0,0) translateX(-50%)`;
    }
    for (let j = 0; j < zs.length; j++) {
      const el = rows[j];
      if (!el) continue;
      v.set(0, 0, zs[j]).project(camera);
      el.style.transform = `translate3d(0,${(((1 - v.y) / 2) * size.height).toFixed(1)}px,0) translateY(-50%)`;
    }
  });
  return null;
}
