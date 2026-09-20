"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ParsedPuzzle } from "@/game";
import { useSaveStore } from "@/store/save";
import { useIsDark, useReducedMotion } from "@/ui/useTheme";
import { scenePalette } from "./assets";
import { Diorama, dioramaScale } from "./Diorama";
import { Lights } from "./Lights";
import { registerSnapshot } from "./snapshot";

interface Props {
  puzzle: ParsedPuzzle;
  /** Drag to rotate. */
  interactive?: boolean;
  /** Radians per second of automatic spin (0 = none). */
  spin?: number;
  /** Register this canvas for PNG snapshots (share). */
  snapshot?: boolean;
}

function Spinner({ puzzle, interactive, spin, snapshot }: Required<Props>) {
  const { gl, camera, scene, invalidate } = useThree();
  const group = useRef<THREE.Group>(null);
  const settings = useSaveStore((s) => s.data.settings);
  const dark = useIsDark();
  const reduced = useReducedMotion();
  const palette = useMemo(() => scenePalette(dark, settings.highContrast), [dark, settings.highContrast]);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const lastInteract = useRef(0);
  const scale = dioramaScale(puzzle, 2.5);

  useEffect(() => {
    (camera as THREE.PerspectiveCamera).fov = 30;
    camera.position.set(0, 4.2, 6.4);
    camera.lookAt(0, 0.1, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, puzzle]);

  useEffect(() => {
    if (!snapshot) return;
    registerSnapshot(() => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    });
    return () => registerSnapshot(null);
  }, [snapshot, gl, scene, camera]);

  useEffect(() => {
    if (!interactive) return;
    const dom = gl.domElement;
    const down = (e: PointerEvent) => {
      dom.setPointerCapture?.(e.pointerId);
      drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      lastInteract.current = performance.now();
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || !group.current) return;
      group.current.rotation.y += (e.clientX - d.x) * 0.012;
      group.current.rotation.x = Math.min(0.5, Math.max(-0.25, group.current.rotation.x + (e.clientY - d.y) * 0.004));
      d.x = e.clientX;
      d.y = e.clientY;
      lastInteract.current = performance.now();
      invalidate();
    };
    const up = () => {
      drag.current = null;
      lastInteract.current = performance.now();
    };
    dom.addEventListener("pointerdown", down);
    dom.addEventListener("pointermove", move);
    dom.addEventListener("pointerup", up);
    dom.addEventListener("pointercancel", up);
    return () => {
      dom.removeEventListener("pointerdown", down);
      dom.removeEventListener("pointermove", move);
      dom.removeEventListener("pointerup", up);
      dom.removeEventListener("pointercancel", up);
    };
  }, [interactive, gl, invalidate]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    if (spin > 0 && !reduced && !drag.current && performance.now() - lastInteract.current > 1800) {
      g.rotation.y += spin * Math.min(delta, 0.05);
      invalidate();
    }
    if (drag.current) invalidate();
  });

  return (
    <>
      <Lights dark={dark} />
      <group ref={group} scale={scale} rotation={[0.08, 0.6, 0]}>
        <Diorama puzzle={puzzle} palette={palette} studs />
      </group>
    </>
  );
}

/** A single rotating/draggable diorama (title screen, Museum viewer). */
export default function DioramaCanvas({ puzzle, interactive = false, spin = 0.5, snapshot = false }: Props) {
  return (
    <Canvas
      frameloop="demand"
      flat
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.5, far: 100, position: [0, 4.2, 6.4] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: interactive ? "none" : "auto", userSelect: "none" }}
      aria-hidden="true"
    >
      <Spinner puzzle={puzzle} interactive={interactive} spin={spin} snapshot={snapshot} />
    </Canvas>
  );
}
