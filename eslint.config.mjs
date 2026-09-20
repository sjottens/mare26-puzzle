import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/sw.js", "art/**"]),
  {
    // Architecture guard: /src/game is pure TypeScript (no React, no Three).
    files: ["src/game/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-dom", "react/*", "next", "next/*"], message: "src/game must stay framework-free." },
            { group: ["three", "three/*", "@react-three/*"], message: "src/game must stay renderer-free." },
            { group: ["@/ui/*", "@/three/*", "@/storage/*", "@/i18n/*"], message: "src/game must not depend on other layers." },
          ],
        },
      ],
    },
  },
  {
    // three.js objects (cameras, simulations, instanced meshes) are mutable by design; the React
    // compiler immutability rule does not apply to them.
    files: ["src/three/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
]);

export default eslintConfig;
