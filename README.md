# maré26

Solve a nonogram and watch your flat pixel picture pop up into a tiny 3D toy-brick diorama you can rotate and collect.

- 120 handcrafted puzzles in 6 packs (Dutch Icons, Animals, Food, Sea, Space, Retro Toys), plus a 3-puzzle interactive tutorial
- Relax mode (no timer, unlimited undo, "check my board") and Challenge mode (timer, 3 hearts, 1–3 stars)
- Hints every 90 s that explain *why* ("Row 3 has a run of 7 in 10 cells, so the middle 4 must be filled")
- Daily puzzle with a streak (one grace day), Endless mode (generated, always solvable by logic), Museum shelves, stats
- Dutch and English, dark/light, high contrast, colourblind studs, reduced motion, keyboard-only play
- Progress is saved in a few small functional cookies (no tracking, no analytics, no third-party scripts) with export/import codes
- Installable PWA that works fully offline; a pure static export (Capacitor-ready)

Design decisions and assumptions: [docs/DECISIONS.md](docs/DECISIONS.md).

## Run it

Requires Node 22+.

```bash
npm install
npm run dev            # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run check` | typecheck + lint + unit tests |
| `npm run build` | static export to `out/` **and** generates the offline service worker |
| `npm run serve` | serves `out/` on http://localhost:4173 (use it to test the PWA and offline mode) |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright: offline reload, full first-run flow + persistence, mouse painting, back navigation, axe accessibility scan (run `npm run build` first; `npx playwright install chromium` once) |
| `npm run validate:puzzles` | solver-based validation of every puzzle (`-- --preview` prints ASCII art, `-- --pack=food` limits it) |
| `npm run repair:puzzles` | auto-fixes ambiguous hand-drawn puzzles with the fewest pixel changes |
| `npm run sheet:puzzles -- <pack>` | renders a contact-sheet PNG of a pack for reviewing the art |
| `npm run icons` | regenerates the PWA icons in `public/icons` |

## How to play

Numbers say how many cells in a row or column are filled ("3 1" = a run of 3, a gap, a run of 1). Fill cells that must be filled and cross cells that must be empty. Every puzzle can be solved by logic alone.

| Input | Fill | Cross | Erase |
|---|---|---|---|
| Mouse | click / drag | right-click | middle-click, or fill on a filled cell |
| Touch | tap / drag | long-press, or the ✕ tool | the eraser tool |
| Keyboard | Space | X | Backspace |

Also: arrows move, Z undo, Y redo, H hint, Esc pause. On 15×15 and 20×20 boards pinch to zoom, use two fingers to pan and double-tap to fit.

## Layout

```
src/game      pure TypeScript: model, clues, solver, hints, generator, scoring, streak (no React/Three; enforced by ESLint)
src/three     react-three-fiber scene: instanced cells, camera rig, picking, reveal, dioramas, shelves
src/ui        React screens and components
src/store     Zustand stores (game session, save, navigation, scene flags) + the game event bus
src/storage   StorageAdapter, cookie adapter, wire format, migrations, save manager
src/audio     procedural WebAudio + haptics
src/i18n      nl / en dictionaries
src/content   puzzle catalogue (packs, premium flag, daily pool, endless)
content/puzzles   puzzle data (JSON per pack) and daily-pool.json
art/          authoring source for the pictures (shape library + one file per pack)
scripts       service worker builder, icon generator, static server, puzzle validator/repair/contact sheet
docs          DECISIONS.md
tests/e2e     Playwright tests
```

## Adding a puzzle

Puzzles are plain data in `content/puzzles/<pack>.json` (an array; the file name is the pack id):

```json
{
  "id": "food-21",
  "name": { "en": "Tulip", "nl": "Tulp" },
  "pack": "food",
  "size": 10,
  "rows": ["..#.##.#..", "…"],
  "palette": ["#ff7a90"]
}
```

- `rows`: `size` strings of `size` characters. `.` = empty, `#` = filled (colour `palette[0]`). Pick a mid-tone colour so filled cubes contrast with the empty ones.
- Art must be original. Difficulty is computed, not stored.
- Run `npm run validate:puzzles -- --preview --pack=<pack>`. It **fails** if a puzzle is malformed, has more than one solution, needs guessing, or looks unrecognizable, and it prints an ASCII preview.
- A hand-drawn picture that fails only because of ambiguity can usually be fixed with `npm run repair:puzzles -- --pack=<pack>` (it flips the fewest pixels in the ambiguous region and tells you which).
- The shipped catalogue is exactly 6 packs × 20 puzzles + 3 tutorial puzzles; the validator enforces that, so adding a puzzle means adding a slot or replacing one. To be picked for the daily puzzle, add its id to `content/puzzles/daily-pool.json`.
- The original pictures were drawn with the small shape library in `art/` (`node art/build.mjs <pack>` regenerates a pack from `art/<pack>.mjs`; note that this overwrites hand edits and repairs of that pack's JSON).

## Save data

Cookies `mare26_v1_0`, `mare26_v1_1`, … hold a compressed, checksummed JSON save (settings, one small record per puzzle, the current board as a bitset, streak and stats). Settings → *Export save code* gives a copyable `M26:…` string; *Import* restores it. The `StorageAdapter` interface makes it easy to swap cookies for another store later.

## Offline / PWA

`npm run build` writes `out/sw.js`, which precaches the whole export (including the lazily loaded 3D chunks). Open the game once online, then it runs offline and can be installed from the browser menu.

## Wrapping with Capacitor (later)

The app is a static export with no server features: `webDir: "out"`. Screens use hash URLs and the History API, so the Android back button works through the WebView's history.
