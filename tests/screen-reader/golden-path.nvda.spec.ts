import { nvdaTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";
import { goldenPath } from "../fixtures/golden-path.ts";
import { activateBrowser, restoreBrowserSession } from "./support/browser-session.ts";
import { expectSpokenAfterAction } from "./support/speech.ts";

test.use({
  nvdaStartOptions: {
    settings: { presentation: { reportDynamicContentChanges: true }, speech: { synth: "espeak" } },
  },
});

test.afterEach(async ({ page }) => {
  await restoreBrowserSession(page);
});

/** Full user transcript: all mutations come from the NVDA keyboard, never page setup. */
test("completes the empty-workspace error-hover transcript", async ({ page, nvda }) => {
  await page.goto("/");
  await expect(page.getByPlaceholder("fill color")).toBeFocused();
  await activateBrowser(page, nvda, "CSS color for new row 1");
  await nvda.perform(nvda.keyboardCommands.exitFocusMode);
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);

  for (const color of [
    goldenPath.accentBackground,
    goldenPath.accentHoverBackground,
    goldenPath.whiteText,
    goldenPath.errorBackground,
  ]) {
    await nvda.type(color);
    await nvda.press("Enter");
  }
  await expect(page.locator("tbody tr")).toHaveCount(5);

  await nvda.press("Control+Alt+Up");
  await nvda.press("Control+.");
  await nvda.press("6");
  await nvda.press("Space");
  await expect(page.getByRole("checkbox", { name: "Contrast background for row 4" })).toBeChecked();
  await nvda.press("Control+.");
  await nvda.press("1");
  await nvda.press("Enter");

  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 5" });
  await expect(lightness).toBeFocused();
  await expectSpokenAfterAction(
    nvda,
    async () => {
      await nvda.press("Control+A");
      await nvda.type(goldenPath.derivedLightness);
      await nvda.press("Enter");
    },
    /Lightness 60 percent\. Checks updated\./,
  );

  await nvda.press("Control+.");
  await nvda.press("7");
  await expect(page.getByRole("heading", { name: "Text contrast — color 5" })).toBeFocused();
  await nvda.press("Escape");
  await nvda.press("Control+.");
  await nvda.press("2");
  const token = page.getByRole("textbox", { name: "CSS color for row 5" });
  await expect(token).toBeFocused();
  await nvda.press("Control+A");
  await nvda.press("Control+C");
  await nvda.perform(nvda.keyboardCommands.reportClipboardText);
  expect(await nvda.itemText()).toContain(goldenPath.finalToken);
});
