"use client";

/** Warm key light plus hemisphere fill. One directional light, no shadow maps (cheap on phones). */
export function Lights({ dark }: { dark: boolean }) {
  return (
    <>
      <hemisphereLight args={[dark ? "#9aa8ff" : "#e8f0ff", dark ? "#3a2f5c" : "#f4d9c2", dark ? 1.3 : 1.2]} />
      <directionalLight position={[-6, 8, 3.2]} intensity={dark ? 2.0 : 1.9} color={dark ? "#ffe6c9" : "#fff0dc"} />
    </>
  );
}
