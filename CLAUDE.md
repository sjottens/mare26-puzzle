@AGENTS.md

# maré26 — project notes

3D nonogram diorama game. Read `README.md` (run/commands/adding puzzles) and `docs/DECISIONS.md` (why things are the way they are).

- Pure static export (`output: 'export'`): no API routes, no middleware, no server features. Screens are Zustand state with hash URLs.
- `src/game` is pure TypeScript (no React/Three, enforced by ESLint). Put game rules there, with tests.
- Cookies are the save store (`mare26_v1_*`, ASCII name on purpose). Keep the `StorageAdapter` seam.
- Puzzle JSON in `content/puzzles` must pass `npm run validate:puzzles` (unique, solvable without guessing, recognizable; 6 × 20 + 3 tutorial).
- Before finishing a change: `npm run check`, and for anything touching gameplay/UI also `npm run build && npm run test:e2e`.
- Don't use shell heredocs with backticks/apostrophes for big edits on this machine; use the file tools.
