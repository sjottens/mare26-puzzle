/** Heuristic "does this look like a picture?" metrics for puzzle validation. */

export interface Quality {
  filled: number;
  /** filled / total. */
  density: number;
  /** 4-connected groups of filled cells. */
  components: number;
  /** Size of the largest group divided by filled cells. */
  largestRatio: number;
  bboxWidth: number;
  bboxHeight: number;
  /** Fraction of filled cells whose left-right mirror is also filled. */
  mirrorScore: number;
}

export function computeQuality(solution: ArrayLike<number>, width: number, height: number): Quality {
  const total = width * height;
  let filled = 0;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let mirrored = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (solution[y * width + x] !== 1) continue;
      filled++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      if (solution[y * width + (width - 1 - x)] === 1) mirrored++;
    }
  }

  const seen = new Uint8Array(total);
  let components = 0;
  let largest = 0;
  for (let start = 0; start < total; start++) {
    if (solution[start] !== 1 || seen[start]) continue;
    components++;
    let size = 0;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop() as number;
      size++;
      const x = i % width;
      const y = Math.floor(i / width);
      const neighbours = [
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ];
      for (const nb of neighbours) {
        if (nb >= 0 && solution[nb] === 1 && !seen[nb]) {
          seen[nb] = 1;
          stack.push(nb);
        }
      }
    }
    largest = Math.max(largest, size);
  }

  return {
    filled,
    density: filled / total,
    components,
    largestRatio: filled ? largest / filled : 0,
    bboxWidth: filled ? maxX - minX + 1 : 0,
    bboxHeight: filled ? maxY - minY + 1 : 0,
    mirrorScore: filled ? mirrored / filled : 0,
  };
}

/** Human-readable reasons a picture is probably not recognizable. Empty array = looks fine. */
export function recognizabilityIssues(q: Quality, width: number, height: number): string[] {
  const issues: string[] = [];
  if (q.density < 0.25) issues.push(`too sparse (${Math.round(q.density * 100)}% filled)`);
  if (q.density > 0.75) issues.push(`too dense (${Math.round(q.density * 100)}% filled)`);
  if (q.largestRatio < 0.6) issues.push(`fragmented (largest part is ${Math.round(q.largestRatio * 100)}% of the picture)`);
  const maxParts = Math.max(2, Math.round((width * height) / 30));
  if (q.components > maxParts) issues.push(`too many separate parts (${q.components} > ${maxParts})`);
  if (q.bboxWidth < width * 0.7 || q.bboxHeight < height * 0.7) {
    issues.push(`does not use the canvas (${q.bboxWidth}x${q.bboxHeight} of ${width}x${height})`);
  }
  return issues;
}

/** Console preview of a picture. */
export function renderAscii(solution: ArrayLike<number>, width: number, height: number): string {
  const lines: string[] = [];
  for (let y = 0; y < height; y++) {
    let s = "";
    for (let x = 0; x < width; x++) s += solution[y * width + x] === 1 ? "██" : "· ";
    lines.push(s);
  }
  return lines.join("\n");
}
