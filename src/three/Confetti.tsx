"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/game";
import { useStage } from "@/store/stage";
import { CONFETTI_COLORS, getCubeGeometry, getToonGradient } from "./assets";

const COUNT = 110;
const DURATION = 3.6;
const START_DELAY = 0.9;

/** A burst of tiny toy bricks when the diorama pops up. One InstancedMesh, tiny CPU physics. */
export function Confetti() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { invalidate } = useThree();
  const startedAt = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const geo = useMemo(() => getCubeGeometry(), []);

  const bits = useMemo(() => {
    const rnd = mulberry32(2026);
    return Array.from({ length: COUNT }, (_, i) => {
      const a = rnd() * Math.PI * 2;
      const speed = 3 + rnd() * 5;
      return {
        p: new THREE.Vector3((rnd() - 0.5) * 5, 1.5 + rnd() * 1.5, (rnd() - 0.5) * 5),
        v: new THREE.Vector3(Math.cos(a) * speed * 0.7, 5 + rnd() * 4, Math.sin(a) * speed * 0.7),
        r: new THREE.Vector3(rnd() * 6, rnd() * 6, rnd() * 6),
        w: new THREE.Vector3((rnd() - 0.5) * 12, (rnd() - 0.5) * 12, (rnd() - 0.5) * 12),
        s: 0.4 + rnd() * 0.4,
        c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      };
    });
  }, []);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
    bits.forEach((b, i) => m.setColorAt(i, color.set(b.c)));
    dummy.scale.setScalar(0.0001);
    dummy.updateMatrix();
    for (let i = 0; i < COUNT; i++) m.setMatrixAt(i, dummy.matrix);
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
    invalidate();
    return useStage.subscribe((s, prev) => {
      if (s.revealing && !prev.revealing && !s.reducedMotion) {
        startedAt.current = performance.now() + START_DELAY * 1000;
        invalidate();
      }
      if (!s.revealing && prev.revealing) {
        startedAt.current = null;
        dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        for (let i = 0; i < COUNT; i++) m.setMatrixAt(i, dummy.matrix);
        m.instanceMatrix.needsUpdate = true;
        invalidate();
      }
    });
  }, [bits, color, dummy, invalidate]);

  useFrame(() => {
    const m = ref.current;
    const t0 = startedAt.current;
    if (!m || t0 === null) return;
    const t = (performance.now() - t0) / 1000;
    if (t < 0) {
      invalidate();
      return;
    }
    if (t > DURATION) {
      dummy.scale.setScalar(0.0001);
      dummy.updateMatrix();
      for (let i = 0; i < COUNT; i++) m.setMatrixAt(i, dummy.matrix);
      m.instanceMatrix.needsUpdate = true;
      startedAt.current = null;
      return;
    }
    const fade = t > DURATION - 0.6 ? Math.max(0.0001, (DURATION - t) / 0.6) : 1;
    bits.forEach((b, i) => {
      const x = b.p.x + b.v.x * t;
      const z = b.p.z + b.v.z * t;
      let y = b.p.y + b.v.y * t - 9.5 * t * t;
      if (y < -0.4) y = -0.4 + Math.abs(Math.sin(t * 3 + i)) * 0.05; // settles on the ground
      dummy.position.set(x, y, z);
      dummy.rotation.set(b.r.x + b.w.x * t, b.r.y + b.w.y * t, b.r.z + b.w.z * t);
      dummy.scale.setScalar(b.s * fade);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    invalidate();
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <primitive object={geo} attach="geometry" dispose={null} />
      <meshToonMaterial gradientMap={getToonGradient()} />
    </instancedMesh>
  );
}
