import { expect, test } from "@playwright/test";

test("app shell paints without console errors and works offline after first load", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "maré26" })).toBeVisible();

  // Wait for the service worker to be active and controlling the page.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((res) => navigator.serviceWorker.addEventListener("controllerchange", () => res()));
    }
    return reg.active?.state;
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "maré26" })).toBeVisible();

  const manifest = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.getAttribute("href"));
  expect(manifest).toBe("/manifest.webmanifest");
  expect(errors).toEqual([]);
});
