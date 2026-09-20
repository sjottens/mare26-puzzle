"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { ParsedPuzzle } from "@/game";
import { useSaveStore } from "@/store/save";
import { useIsDark } from "@/ui/useTheme";
import { scenePalette, type ScenePalette } from "./assets";
import { Diorama, dioramaScale } from "./Diorama";
import { boardExtent } from "./layout";
import { Lights } from "./Lights";
import { PLAQUE_TILT, SHELF_TILT, shelfGeometry } from "./shelf";

export interface ShelfItem {
  id: string;
  puzzle: ParsedPuzzle | null;
  variant: "color" | "silhouette";
}

interface Props {
  items: ShelfItem[];
  columns: number;
  rows: number;
  width: number;
  height: number;
  hoveredId: string | null;
  selectedId: string | null;
}

function ShelfItemView({ item, x, y, hovered, selected, palette }: { item: ShelfItem; x: number; y: number; hovered: boolean; selected: boolean; palette: ScenePalette }) {
  const group = useRef<THREE.Group>(null);
  const { invalidate } = useThree();
  const target = selected ? 1.16 : hovered ? 1.08 : 1;
  const scale = item.puzzle ? dioramaScale(item.puzzle, 0.92) : 0;
  const halfDepth = item.puzzle ? boardExtent(item.puzzle.width, item.puzzle.height).halfD * scale : 0;

  useEffect(() => invalidate(), [target, invalidate]);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const s = g.scale.x / (scale || 1);
    const next = s + (target - s) * Math.min(1, delta * 14);
    g.scale.setScalar(next * scale);
    if (Math.abs(next - target) > 0.002) invalidate();
  });

  if (!item.puzzle) return null;
  // Upright plaque: the picture faces the viewer and its bricks stick out towards them.
  return (
    <group ref={group} position={[x, y - 0.36 + halfDepth + 0.02, 0.05]} scale={scale} rotation={[Math.PI / 2 - PLAQUE_TILT, 0, 0]}>
      <Diorama puzzle={item.puzzle} palette={palette} variant={item.variant} />
    </group>
  );
}

/** Tilted orthographic view of the shelf; `zoom` is pixels per world unit. */
function aimShelfCamera(cam: THREE.OrthographicCamera, zoom: number): void {
  const D = 30;
  cam.zoom = zoom;
  cam.position.set(0, D * Math.sin(SHELF_TILT), D * Math.cos(SHELF_TILT));
  cam.lookAt(0, 0, 0);
  cam.near = 0.1;
  cam.far = 100;
  cam.updateProjectionMatrix();
}

function Scene({ items, columns, rows, width, height, hoveredId, selectedId }: Props) {
  const { camera, invalidate } = useThree();
  const settings = useSaveStore((s) => s.data.settings);
  const dark = useIsDark();
  const palette = useMemo(() => scenePalette(dark, settings.highContrast), [dark, settings.highContrast]);
  const geo = useMemo(() => shelfGeometry(width, height, columns, rows), [width, height, columns, rows]);
  const boardGeo = useMemo(() => new RoundedBoxGeometry(columns + 0.3, 0.14, 1.1, 3, 0.05), [columns]);
  const wall = dark ? "#2b2f66" : "#efe0cc";
  const wood = dark ? "#4a4f94" : "#d8b98f";

  useEffect(() => {
    aimShelfCamera(camera as THREE.OrthographicCamera, geo.scale);
    invalidate();
  }, [camera, geo.scale, invalidate]);
  useEffect(() => () => boardGeo.dispose(), [boardGeo]);

  const totalH = rows * 1.32;
  return (
    <>
      <Lights dark={dark} />
      <mesh position={[0, 0, -0.65]}>
        <planeGeometry args={[columns + 0.6, totalH + 0.5]} />
        <meshBasicMaterial color={wall} />
      </mesh>
      {Array.from({ length: rows }, (_, r) => {
        const p = geo.worldPos(0, r);
        return (
          <mesh key={r} geometry={boardGeo} position={[0, p.y - 0.36, 0.05]}>
            <meshToonMaterial color={wood} />
          </mesh>
        );
      })}
      {items.map((item, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const p = geo.worldPos(col, row);
        return <ShelfItemView key={item.id} item={item} x={p.x} y={p.y} hovered={hoveredId === item.id} selected={selectedId === item.id} palette={palette} />;
      })}
    </>
  );
}

/** A 3D shelf of dioramas / silhouettes seen through an orthographic camera (see shelf.ts). */
export default function ShelfCanvas(props: Props) {
  return (
    <Canvas frameloop="demand" flat orthographic dpr={[1, 2]} camera={{ zoom: 60, position: [0, 15, 26] }} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
      <Scene {...props} />
    </Canvas>
  );
}
