"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { dioramaHeights, type ParsedPuzzle } from "@/game";
import { fillColorFor, getCubeGeometry, getStudGeometry, getToonGradient, type ScenePalette } from "./assets";
import { axisLayout, boardExtent, CUBE_H, LAYER, PLATE_MARGIN } from "./layout";

interface Props {
  puzzle: ParsedPuzzle;
  palette: ScenePalette;
  /** "silhouette" renders a flat dark footprint (unsolved / locked puzzles). */
  variant?: "color" | "silhouette";
  studs?: boolean;
}

const SILHOUETTE_COLOR = "#7f86b8";

/** A finished (or silhouetted) diorama as three instanced meshes: bricks, studs and a base plate. */
export function Diorama({ puzzle, palette, variant = "color", studs = true }: Props) {
  const bricks = useRef<THREE.InstancedMesh>(null);
  const studMesh = useRef<THREE.InstancedMesh>(null);
  const { width: w, height: h } = puzzle;
  const flat = variant === "silhouette";

  const heights = useMemo(() => dioramaHeights(puzzle.solution, w, h), [puzzle, w, h]);
  const total = useMemo(() => heights.reduce((a, b) => a + (flat ? Math.min(1, b) : b), 0), [heights, flat]);
  const filled = useMemo(() => heights.filter((v) => v > 0).length, [heights]);
  const ext = boardExtent(w, h);
  const plateGeo = useMemo(() => new RoundedBoxGeometry((ext.halfW + PLATE_MARGIN) * 2, 0.5, (ext.halfD + PLATE_MARGIN) * 2, 3, 0.3), [ext.halfW, ext.halfD]);
  const fill = flat ? SILHOUETTE_COLOR : fillColorFor(puzzle.def.palette[0], palette);
  const plateColor = flat ? "#5b6198" : palette.plate;

  useLayoutEffect(() => {
    const b = bricks.current;
    const s = studMesh.current;
    if (!b || !s) return;
    const xs = axisLayout(w, 0).centers;
    const zs = axisLayout(h, 0).centers;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color(fill);
    b.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, total) * 3), 3);
    s.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, filled) * 3), 3);
    let bi = 0;
    let si = 0;
    for (let i = 0; i < w * h; i++) {
      const height = flat ? Math.min(1, heights[i]) : heights[i];
      if (height === 0) continue;
      const x = xs[i % w];
      const z = zs[Math.floor(i / w)];
      for (let L = 0; L < height; L++) {
        dummy.position.set(x, L * LAYER - CUBE_H / 2, z);
        dummy.scale.set(1, flat ? 0.45 : 1, 1);
        dummy.updateMatrix();
        b.setMatrixAt(bi, dummy.matrix);
        // Slight per-layer shade so towers read as stacked bricks.
        b.setColorAt(bi, color.clone().multiplyScalar(1 - 0.05 * (L % 2)));
        bi++;
      }
      if (!flat && studs) {
        dummy.position.set(x, (height - 1) * LAYER, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        s.setMatrixAt(si, dummy.matrix);
        s.setColorAt(si, color);
        si++;
      }
    }
    b.count = bi;
    s.count = si;
    b.instanceMatrix.needsUpdate = true;
    s.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    if (s.instanceColor) s.instanceColor.needsUpdate = true;
  }, [w, h, heights, fill, flat, studs, total, filled]);

  const cube = useMemo(() => getCubeGeometry(), []);
  const stud = useMemo(() => getStudGeometry(), []);

  return (
    <group>
      <mesh geometry={plateGeo} position={[0, -0.75, 0]}>
        <meshToonMaterial color={plateColor} gradientMap={getToonGradient()} />
      </mesh>
      <instancedMesh ref={bricks} args={[undefined, undefined, Math.max(1, total)]} frustumCulled={false}>
        <primitive object={cube} attach="geometry" dispose={null} />
        <meshToonMaterial gradientMap={getToonGradient()} />
      </instancedMesh>
      <instancedMesh ref={studMesh} args={[undefined, undefined, Math.max(1, filled)]} frustumCulled={false}>
        <primitive object={stud} attach="geometry" dispose={null} />
        <meshToonMaterial gradientMap={getToonGradient()} />
      </instancedMesh>
    </group>
  );
}

/** Scale that fits a diorama of this puzzle into a square of `size` world units. */
export function dioramaScale(puzzle: ParsedPuzzle, size: number): number {
  return size / (Math.max(puzzle.width, puzzle.height) + 1.6);
}
