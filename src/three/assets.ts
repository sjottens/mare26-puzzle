import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CUBE, CUBE_H } from "./layout";
import type { RGB, SimColors } from "./cellsim";

export interface ScenePalette {
  paper: string;
  paperCross: string;
  plate: string;
  xmark: string;
  mistake: string;
  highlight: string;
  cursor: string;
  /** Overrides the puzzle colour (high contrast). */
  fillOverride: string | null;
}

export function scenePalette(dark: boolean, highContrast: boolean): ScenePalette {
  if (highContrast) {
    return dark
      ? { paper: "#101010", paperCross: "#2a2a2a", plate: "#000000", xmark: "#ffffff", mistake: "#ff3b3b", highlight: "#ffffff", cursor: "#ffe14a", fillOverride: "#ffe14a" }
      : { paper: "#ffffff", paperCross: "#dcdcdc", plate: "#202020", xmark: "#000000", mistake: "#e00000", highlight: "#000000", cursor: "#0050ff", fillOverride: "#14146b" };
  }
  return dark
    ? { paper: "#4a4f94", paperCross: "#383d78", plate: "#20234b", xmark: "#c6c8ee", mistake: "#ff6b70", highlight: "#ffffff", cursor: "#8fd0ff", fillOverride: null }
    : { paper: "#f8efe2", paperCross: "#e4d6c3", plate: "#d8c6b0", xmark: "#8f7a66", mistake: "#ff5a5f", highlight: "#2b2d5b", cursor: "#2f7bff", fillOverride: null };
}

function luminance(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/** Makes sure a pastel puzzle colour stays clearly distinguishable from the empty "paper" cubes. */
export function fillColorFor(hex: string, palette: ScenePalette): string {
  if (palette.fillOverride) return palette.fillOverride;
  const fill = new THREE.Color(hex);
  const paper = new THREE.Color(palette.paper);
  const minGap = 0.16;
  let guard = 0;
  while (Math.abs(luminance(fill) - luminance(paper)) < minGap && guard++ < 12) {
    // Darken on light backgrounds, lighten on dark ones.
    if (luminance(paper) > 0.3) fill.multiplyScalar(0.88);
    else fill.lerp(new THREE.Color("#ffffff"), 0.12);
  }
  return `#${fill.getHexString()}`;
}

const rgb = (hex: string): RGB => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};

export function simColors(palette: ScenePalette, puzzleHex: string): SimColors {
  return {
    paper: rgb(palette.paper),
    paperCross: rgb(palette.paperCross),
    fill: rgb(fillColorFor(puzzleHex, palette)),
    mistake: rgb(palette.mistake),
  };
}

let cubeGeo: THREE.BufferGeometry | null = null;
let studGeo: THREE.BufferGeometry | null = null;
let crossGeo: THREE.BufferGeometry | null = null;
let toon: THREE.DataTexture | null = null;

/** Shared bevelled cube used by every cell and by every diorama brick. */
export function getCubeGeometry(): THREE.BufferGeometry {
  cubeGeo ??= new RoundedBoxGeometry(CUBE, CUBE_H, CUBE, 3, 0.15);
  return cubeGeo;
}

export function getStudGeometry(): THREE.BufferGeometry {
  if (!studGeo) {
    studGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 18);
    studGeo.translate(0, 0.06, 0);
  }
  return studGeo;
}

/** An X made of two flat bars, engraved on crossed cells. */
export function getCrossGeometry(): THREE.BufferGeometry {
  if (!crossGeo) {
    const a = new THREE.BoxGeometry(0.56, 0.05, 0.1);
    a.rotateY(Math.PI / 4);
    const b = new THREE.BoxGeometry(0.56, 0.05, 0.1);
    b.rotateY(-Math.PI / 4);
    crossGeo = mergeGeometries([a, b]);
    crossGeo.translate(0, 0.025, 0);
  }
  return crossGeo;
}

export function getToonGradient(): THREE.DataTexture {
  if (!toon) {
    toon = new THREE.DataTexture(new Uint8Array([112, 156, 200, 255]), 4, 1, THREE.RedFormat);
    toon.minFilter = THREE.NearestFilter;
    toon.magFilter = THREE.NearestFilter;
    toon.needsUpdate = true;
  }
  return toon;
}

export function makeToonMaterial(color = "#ffffff"): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: getToonGradient() });
}

/** Soft blurred blob used as a baked contact shadow (no shadow maps). */
export function makeShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, "rgba(40,30,70,0.30)");
    grad.addColorStop(0.55, "rgba(40,30,70,0.12)");
    grad.addColorStop(1, "rgba(40,30,70,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const CONFETTI_COLORS = ["#ff8fa3", "#8fc7ff", "#8fdcc3", "#ffd98f", "#c4b0ff", "#ffb08f"];
