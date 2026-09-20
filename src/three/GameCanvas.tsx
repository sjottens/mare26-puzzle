"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useSaveStore } from "@/store/save";
import { useStage } from "@/store/stage";
import { useIsDark } from "@/ui/useTheme";
import { scenePalette } from "./assets";
import { BoardMesh } from "./BoardMesh";
import { CameraRig } from "./CameraRig";
import { CellField } from "./CellField";
import { FOV } from "./camera";
import { Confetti } from "./Confetti";
import { Lights } from "./Lights";
import { OverlaySync } from "./OverlaySync";
import { Picker } from "./Picker";
import { overlayRegistry } from "./registry";
import { registerSnapshot } from "./snapshot";

function SnapshotBridge() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    registerSnapshot(() => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    });
    return () => registerSnapshot(null);
  }, [gl, scene, camera]);
  return null;
}

/** The interactive 3D board. Lazy-loaded (see GameStage) so the first paint stays instant. */
export default function GameCanvas() {
  const settings = useSaveStore((s) => s.data.settings);
  const dark = useIsDark();
  const palette = useMemo(() => scenePalette(dark, settings.highContrast), [dark, settings.highContrast]);
  const [dpr, setDpr] = useState(() => Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1));

  useEffect(() => {
    overlayRegistry.ready = false;
    useStage.getState().setReady(false);
  }, []);

  return (
    <Canvas
      frameloop="demand"
      flat
      dpr={dpr}
      camera={{ fov: FOV, near: 0.5, far: 300, position: [0, 20, 12] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      style={{ position: "absolute", inset: 0, touchAction: "none", userSelect: "none" }}
      aria-hidden="true"
    >
      <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.5))} onIncline={() => setDpr((d) => Math.min(2, d + 0.25))} flipflops={3} />
      <Lights dark={dark} />
      <CameraRig />
      <OverlaySync />
      <BoardMesh palette={palette} />
      <CellField palette={palette} colorblind={settings.colorblind} />
      <Confetti />
      <Picker />
      <SnapshotBridge />
    </Canvas>
  );
}
