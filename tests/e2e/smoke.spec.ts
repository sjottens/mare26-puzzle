import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

interface Def {
  id: string;
  rows: string[];
}
const load = (pack: string): Def[] => JSON.parse(readFileSync(join(process.cwd(), "content", "puzzles", `${pack}.json`), "utf8"));
const tutorial = load("tutorial");
const dutch = load("dutch-icons");

/** Fills a puzzle purely with the keyboard (arrows + Space), the way an accessibility user would. */
async function solveByKeyboard(page: Page, rows: string[]) {
  const stage = page.getByTestId("game-stage");
  await stage.focus();
  const press = async (k: string) => {
    await page.keyboard.press(k);
    await page.waitForTimeout(25);
  };
  await press("ArrowDown"); // first arrow places the cursor at (0,0)
  await press("ArrowUp");
  let cx = 0;
  let cy = 0;
  for (let y = 0; y < rows.length; y++) {
    for (let i = 0; i < rows[y].length; i++) {
      const x = y % 2 === 0 ? i : rows[y].length - 1 - i; // snake order keeps travel short
      while (cx < x) { await press("ArrowRight"); cx++; }
      while (cx > x) { await press("ArrowLeft"); cx--; }
      while (cy < y) { await press("ArrowDown"); cy++; }
      if (rows[y][x] === "#") await press("Space");
    }
  }
}

test("start, tutorial, solve a real puzzle, reload: progress persists", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/");
  await page.getByTestId("play").waitFor();
  await page.getByRole("button", { name: /^(OK)$/ }).click(); // privacy note

  // Tutorial: three tiny puzzles, the last one ends in the diorama reveal.
  await page.getByTestId("play").click();
  await expect(page.getByTestId("coach")).toBeVisible();
  await solveByKeyboard(page, tutorial[0].rows);
  await expect(page.getByTestId("coach")).toContainText("2/3", { timeout: 10_000 });
  await solveByKeyboard(page, tutorial[1].rows);
  await expect(page.getByTestId("coach")).toContainText("3/3", { timeout: 10_000 });
  await solveByKeyboard(page, tutorial[2].rows);
  await expect(page.getByTestId("reveal-panel")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("tutorial-finish").click();

  // First real puzzle from the shelf (Relax mode).
  await page.getByRole("button", { name: /Select puzzle 1:/ }).click();
  await page.getByTestId("start-relax").click();
  await expect(page.getByTestId("game-stage")).toBeVisible();
  await solveByKeyboard(page, dutch[0].rows);
  await expect(page.getByTestId("reveal-panel")).toBeVisible({ timeout: 20_000 });

  // The save is written to cookies (debounced); wait for them, then reload.
  await expect.poll(async () => (await page.context().cookies()).some((c) => c.name === "mare26_v1_0")).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await page.reload();
  await page.getByTestId("play").waitFor();

  // Stats: one collectible solved; the museum offers it.
  await page.getByRole("button", { name: /^Stats$/ }).click();
  await expect(page.getByText("1 / 120")).toBeVisible();
  await page.goBack();
  await page.getByRole("button", { name: /^Museum$/ }).click();
  await expect(page.getByText("Collected: 1")).toBeVisible();

  expect(errors.filter((e) => !/THREE\.Clock/.test(e))).toEqual([]);
});

test("mouse: click and drag paint cells on the 3D board", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("play").waitFor();
  await page.getByRole("button", { name: /^(OK)$/ }).click();
  await page.getByTestId("play").click();
  const stage = page.getByTestId("game-stage");
  await expect(stage).toHaveAttribute("data-filled", "0");
  await page.waitForTimeout(1500); // let the 3D scene fit itself

  // Cell centres come from the clue strips, which are glued to the 3D grid.
  const box = async (label: string) => {
    const b = await page.locator(`[aria-label^="${label}"]`).first().boundingBox();
    expect(b, label).not.toBeNull();
    return { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
  };
  const col1 = await box("Column 1 clue");
  const col3 = await box("Column 3 clue");
  const row2 = await box("Row 2 clue");

  await page.mouse.click((col1.x + col3.x) / 2, row2.y); // centre cell
  await expect(stage).toHaveAttribute("data-filled", "1");
  await page.mouse.click((col1.x + col3.x) / 2, row2.y); // clicking a filled cell erases it
  await expect(stage).toHaveAttribute("data-filled", "0");

  await page.mouse.move(col1.x, row2.y);
  await page.mouse.down();
  await page.mouse.move((col1.x + col3.x) / 2, row2.y, { steps: 6 });
  await page.mouse.move(col3.x, row2.y, { steps: 6 });
  await page.mouse.up();
  await expect(stage).toHaveAttribute("data-filled", "3"); // the whole middle row in one drag
});

test("navigation: back goes one screen at a time (in-app and browser back)", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("play").waitFor();
  await page.getByRole("button", { name: /^(OK)$/ }).click();
  await page.getByTestId("play").click();
  await page.getByRole("button", { name: /Skip tutorial/ }).click(); // -> pack shelf
  await expect(page.getByRole("heading", { name: "Choose a puzzle" })).toBeVisible();

  await page.getByRole("button", { name: /Select puzzle 1:/ }).click();
  await page.getByTestId("start-relax").click();
  await expect(page.getByTestId("game-stage")).toBeVisible();

  await page.getByRole("button", { name: /^Pause$/ }).click();
  await page.getByRole("button", { name: /Quit puzzle/ }).click();
  await expect(page.getByRole("heading", { name: "Choose a puzzle" })).toBeVisible(); // back to the shelf, not the title

  await page.getByRole("button", { name: /^Back$/ }).click();
  await expect(page.getByRole("heading", { name: "maré26" })).toBeVisible();

  await page.getByRole("button", { name: /^Settings$/ }).click();
  await page.goBack(); // the browser / Android back button
  await expect(page.getByRole("heading", { name: "maré26" })).toBeVisible();
});
