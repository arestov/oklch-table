import { screenReaderConfig } from "@guidepup/playwright";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  ...screenReaderConfig,
  testDir: "./tests/screen-reader",
  timeout: 120_000,
  fullyParallel: false,
  reporter: "list",
  globalSetup: "./tests/screen-reader/server.ts",
  use: {
    baseURL: "http://127.0.0.1:4174",
    ...devices["Desktop Chrome"],
    headless: false,
  },
});
