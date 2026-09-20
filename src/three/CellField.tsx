"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { dioramaHeights } from "@/game";
import { gameEvents } from "@/store/events";
import { useGame } from "@/store/game";
import { useStage } from "@/store/stage";
import { getCrossGeometry, getCubeGeometry, getStudGeometry, getToonGradient, simColors, type ScenePalette } from "./assets";
import { shake } from "./camera";
import { CellSim, cubeCenterY, TOWER_LAYERS } from "./cellsim";
import { axisLayout } from "./layout";

interface Props {
  palette: ScenePalette;
  colorblind: boolean;
}

function attachColors(mesh: THREE.InstancedMesh | null, n: number): void {
  if (mesh && !mesh.instanceColor) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
}

/** All cells of the board as instanced meshes: cubes, engraved crosses, studs and diorama towers. */
export function CellField({ palette, colorblind }: Props) {
  const puzzle = useGame((s) => s.puzzle);
  if (!puzzle) return null;
  return <CellFieldInner key={puzzle.def.id} palette={palette} colorblind={colorblind} />;
}

function CellFieldInner({ palette, colorblind }: Props) {
  const puzzle = useGame.getState().puzzle!;
  const { invalidate } = useThree();
  const { width: w, height: h } = puzzle;
  const n = w * h;
  const cubes = useRef<THREE.InstancedMesh>(null);
  const crosses = useRef<THREE.InstancedMesh>(null);
  const studs = useRef<THREE.InstancedMesh>(null);
  const towers = useRef<THREE.InstancedMesh>(null);
  const dirty = useRef(true);
  const revealNotified = useRef(false);

  const puzzleHex = puzzle.def.palette[0];
  // One simulation per puzzle (this component is keyed by puzzle id); palette changes retarget it below.
  const [sim] = useState(() => new CellSim(w, h, simColors(palette, puzzleHex)));
  const heights = useMemo(() => dioramaHeights(puzzle.solution, w, h), [puzzle, w, h]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const geo = useMemo(() => ({ cube: getCubeGeometry(), cross: getCrossGeometry(), stud: getStudGeometry() }), []);

  useLayoutEffect(() => {
    attachColors(cubes.current, n);
    attachColors(studs.current, n);
    attachColors(towers.current, n * TOWER_LAYERS);
  }, [n]);

  // Palette / colourblind changes retarget the simulation.
  useEffect(() => {
    sim.setColors(simColors(palette, puzzleHex));
    sim.setStuds(colorblind);
    dirty.current = true;
    invalidate();
  }, [sim, palette, puzzleHex, colorblind, invalidate]);

  // Game state -> simulation.
  useEffect(() => {
    sim.setState(useGame.getState().board.cells, true);
    sim.setStuds(colorblind);
    dirty.current = true;
    invalidate();
    const offStore = useGame.subscribe((s, prev) => {
      if (s.version !== prev.version) {
        sim.setState(s.board.cells);
        dirty.current = true;
        invalidate();
      }
    });
    const offEvents = gameEvents.on((e) => {
      const now = performance.now();
      if (e.type === "line") sim.pulseLine(e.axis, e.index, now);
      else if (e.type === "mistake") {
        sim.flashCell(e.index, now);
        shake(now);
      } else if (e.type === "check") for (const i of e.wrong) sim.flashCell(i, now);
      else if (e.type === "reset") {
        sim.cancelReveal();
        sim.setState(useGame.getState().board.cells, true);
      } else return;
      dirty.current = true;
      invalidate();
    });
    return () => {
      offStore();
      offEvents();
    };
  }, [sim, colorblind, invalidate]);

  // Reveal trigger.
  useEffect(() => {
    const start = () => {
      revealNotified.current = false;
      const { reducedMotion, revealAt } = useStage.getState();
      sim.setState(useGame.getState().board.cells, true);
      sim.startReveal(heights, revealAt);
      if (reducedMotion) sim.revealDuration = 0.001;
      dirty.current = true;
      invalidate();
    };
    if (useStage.getState().revealing) start();
    return useStage.subscribe((s, prev) => {
      if (s.revealing && !prev.revealing) start();
      if (!s.revealing && prev.revealing) {
        sim.cancelReveal();
        sim.setState(useGame.getState().board.cells, true);
        dirty.current = true;
        invalidate();
      }
    });
  }, [sim, heights, invalidate]);

  useFrame((_, delta) => {
    const now = performance.now();
    const active = sim.update(now, Math.min(delta, 0.05));
    // Tell the UI when the reveal animation has finished (checked every frame, even when nothing moves).
    if (sim.revealing && !revealNotified.current && (now - useStage.getState().revealAt) / 1000 > sim.revealDuration + 0.15) {
      revealNotified.current = true;
      useStage.getState().setDone(true);
    }
    if (!active && !dirty.current) return;
    dirty.current = false;

    const xs = axisLayout(w, sim.gapScale).centers;
    const zs = axisLayout(h, sim.gapScale).centers;
    const cm = cubes.current;
    const xm = crosses.current;
    const sm = studs.current;
    const tm = towers.current;
    if (!cm || !xm || !sm || !tm) return;

    for (let i = 0; i < n; i++) {
      const x = xs[i % w];
      const z = zs[Math.floor(i / w)];
      const o = i * 3;

      dummy.rotation.set(0, 0, 0);
      dummy.position.set(x, cubeCenterY(sim.cubeY[i]), z);
      dummy.scale.setScalar(Math.max(0.0001, sim.cubeS[i]));
      dummy.updateMatrix();
      cm.setMatrixAt(i, dummy.matrix);
      cm.setColorAt(i, tmp.setRGB(sim.outColor[o], sim.outColor[o + 1], sim.outColor[o + 2]));

      dummy.position.set(x, sim.cubeY[i] + 0.004, z);
      dummy.scale.setScalar(Math.max(0.0001, sim.crossS[i]));
      dummy.updateMatrix();
      xm.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, sim.studY[i], z);
      dummy.scale.setScalar(Math.max(0.0001, sim.studS[i]));
      dummy.updateMatrix();
      sm.setMatrixAt(i, dummy.matrix);
      sm.setColorAt(i, tmp.setRGB(sim.color[o], sim.color[o + 1], sim.color[o + 2]));

      for (let L = 0; L < TOWER_LAYERS; L++) {
        const idx = i * TOWER_LAYERS + L;
        dummy.position.set(x, cubeCenterY(sim.towerY[idx]), z);
        dummy.scale.setScalar(Math.max(0.0001, sim.towerS[idx]));
        dummy.updateMatrix();
        tm.setMatrixAt(idx, dummy.matrix);
        tm.setColorAt(idx, tmp.setRGB(sim.color[o], sim.color[o + 1], sim.color[o + 2]));
      }
    }
    for (const m of [cm, xm, sm, tm]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    if (active) invalidate();
  });

  return (
    <group>
      <instancedMesh ref={cubes} args={[undefined, undefined, n]} frustumCulled={false}>
        <primitive object={geo.cube} attach="geometry" dispose={null} />
        <meshToonMaterial gradientMap={getToonGradient()} />
      </instancedMesh>
      <instancedMesh ref={towers} args={[undefined, undefined, n * TOWER_LAYERS]} frustumCulled={false}>
        <primitive object={geo.cube} attach="geometry" dispose={null} />
        <meshToonMaterial gradientMap={getToonGradient()} />
      </instancedMesh>
      <instancedMesh ref={crosses} args={[undefined, undefined, n]} frustumCulled={false}>
        <primitive object={geo.cross} attach="geometry" dispose={null} />
        <meshToonMaterial color={palette.xmark} gradientMap={getToonGradient()} />
      </instancedMesh>
      <instancedMesh ref={studs} args={[undefined, undefined, n]} frustumCulled={false}>
        <primitive object={geo.stud} attach="geometry" dispose={null} />
        <meshToonMaterial gradientMap={getToonGradient()} />
      </instancedMesh>
    </group>
  );
}
