"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useGame } from "@/store/game";
import { makeShadowTexture, type ScenePalette } from "./assets";
import { axisLayout, boardExtent, PLATE_MARGIN } from "./layout";

const PLATE_TOP = -0.5;

/** Base plate, baked contact shadow, row/column highlight and the keyboard cursor. */
export function BoardMesh({ palette, showGuides = true }: { palette: ScenePalette; showGuides?: boolean }) {
  const puzzle = useGame((s) => s.puzzle);
  const hover = useGame((s) => s.hover);
  const cursor = useGame((s) => s.cursor);
  const status = useGame((s) => s.status);
  const { invalidate } = useThree();
  const w = puzzle?.width ?? 1;
  const h = puzzle?.height ?? 1;
  const ext = boardExtent(w, h);

  const plateGeo = useMemo(() => new RoundedBoxGeometry((ext.halfW + PLATE_MARGIN) * 2, 0.5, (ext.halfD + PLATE_MARGIN) * 2, 3, 0.3), [ext.halfW, ext.halfD]);
  const cursorGeo = useMemo(() => {
    const bar = 0.07;
    const parts = [
      new THREE.BoxGeometry(1.02, 0.05, bar).translate(0, 0, -0.5),
      new THREE.BoxGeometry(1.02, 0.05, bar).translate(0, 0, 0.5),
      new THREE.BoxGeometry(bar, 0.05, 1.02).translate(-0.5, 0, 0),
      new THREE.BoxGeometry(bar, 0.05, 1.02).translate(0.5, 0, 0),
    ];
    return mergeGeometries(parts);
  }, []);
  const shadowTex = useMemo(() => makeShadowTexture(), []);
  useEffect(() => () => shadowTex.dispose(), [shadowTex]);
  useEffect(() => () => plateGeo.dispose(), [plateGeo]);
  useEffect(() => invalidate(), [hover, cursor, palette, invalidate]);

  if (!puzzle) return null;
  const xs = axisLayout(w).centers;
  const zs = axisLayout(h).centers;
  const focus = status === "playing" ? (hover ?? cursor) : null;

  return (
    <group>
      <mesh geometry={plateGeo} position={[0, PLATE_TOP - 0.25, 0]}>
        <meshToonMaterial color={palette.plate} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.78, 0]}>
        <planeGeometry args={[(ext.halfW + PLATE_MARGIN) * 2 + 3.4, (ext.halfD + PLATE_MARGIN) * 2 + 3.4]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
      </mesh>
      {showGuides && focus && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, zs[focus.y]]} renderOrder={2}>
            <planeGeometry args={[ext.halfW * 2, 1]} />
            <meshBasicMaterial color={palette.cursor} transparent opacity={0.16} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[xs[focus.x], -0.039, 0]} renderOrder={2}>
            <planeGeometry args={[1, ext.halfD * 2]} />
            <meshBasicMaterial color={palette.cursor} transparent opacity={0.16} depthWrite={false} />
          </mesh>
        </>
      )}
      {showGuides && cursor && status === "playing" && (
        <mesh geometry={cursorGeo} position={[xs[cursor.x], 0.04, zs[cursor.y]]}>
          <meshBasicMaterial color={palette.cursor} />
        </mesh>
      )}
    </group>
  );
}
