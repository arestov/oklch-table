import { windowsActivate } from "@guidepup/guidepup";
import { nvdaTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";

test.use({
  nvdaStartOptions: {
    settings: {
      speech: { synth: "espeak" },
    },
  },
});

test("announces the initial color draft", async ({ page, nvda }) => {
  await page.goto("/");
  await expect(page.getByPlaceholder("fill color")).toBeFocused();

  const browser = page.context().browser();
  if (!browser) throw new Error("Expected a browser for the NVDA test");
  await windowsActivate(browser.browserType().executablePath(), "OKLCH Table");
  await nvda.clearSpokenPhraseLog();
  await nvda.perform(nvda.keyboardCommands.reportCurrentFocus);
  expect(await nvda.itemText()).toContain("CSS color for new row 1");
});
