import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** WCAG A/AA scan of each main screen (contrast, names, roles, labels). */
async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `${label}: accessibility violations`).toEqual([]);
}

test("main screens have no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("play").waitFor();
  await page.getByRole("button", { name: /^(OK)$/ }).click();
  await scan(page, "title");

  await page.getByRole("button", { name: /^How to play$/ }).click();
  await scan(page, "how to play");
  await page.goBack();

  await page.getByRole("button", { name: /^Stats$/ }).click();
  await scan(page, "stats");
  await page.goBack();

  await page.getByRole("button", { name: /^Settings$/ }).click();
  await scan(page, "settings");
  await page.goBack();

  await page.getByTestId("play").click();
  await expect(page.getByTestId("coach")).toBeVisible();
  await page.waitForTimeout(1500);
  await scan(page, "game (tutorial)");
});
