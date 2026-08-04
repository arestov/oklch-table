import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node ./tests/e2e/preview-server.mjs",
    url: "http://127.0.0.1:4173",
    // Each runner owns its preview server and Playwright terminates that child
    // when the suite finishes. Reusing an arbitrary listener leaks state and
    // makes sequential local runs non-deterministic.
    reuseExistingServer: false,
  },
});
