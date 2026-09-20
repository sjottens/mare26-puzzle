/**
 * Diorama heights for the reveal: how many bricks tall each filled cell becomes.
 * Cells deep inside the picture are taller than cells at its edge, giving a sculpted dome.
 */
export function dioramaHeights(solution: ArrayLike<number>, width: number, height: number, maxHeight = 4): Uint8Array {
  const total = width * height;
  const dist = new Int16Array(total).fill(-1);
  const queue: number[] = [];
  // Distance (in steps) from the nearest empty cell or the outside border.
  for (let i = 0; i < total; i++) {
    if (solution[i] !== 1) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % width;
    const y = Math.floor(i / width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const n = ny * width + nx;
      if (dist[n] === -1) {
        dist[n] = dist[i] + 1;
        queue.push(n);
      }
    }
  }
  const out = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (solution[i] !== 1) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    // The outside border counts as empty.
    const edge = Math.min(x, y, width - 1 - x, height - 1 - y) + 1;
    const d = Math.min(dist[i], edge);
    out[i] = Math.min(maxHeight, 1 + Math.floor(d / 2));
  }
  return out;
}
