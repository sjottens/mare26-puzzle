import { defineConfig, devices } from "@playwright/test";

// The e2e smoke test runs against the static export served from ./out.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 150_000,
  fullyParallel: false,
  workers: 1, // software WebGL is CPU-heavy; parallel workers starve each other
  retries: 0,
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  webServer: {
    command: "npm run serve",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        // Software WebGL so the 3D canvas renders in headless CI.
        launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
      },
    },
  ],
});
