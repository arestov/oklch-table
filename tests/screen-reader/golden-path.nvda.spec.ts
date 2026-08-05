import { nvdaTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";
import { goldenPath } from "../fixtures/golden-path.ts";
import { activateBrowser, restoreBrowserSession } from "./support/browser-session.ts";
import { expectSpokenAfterAction } from "./support/speech.ts";

async function typeCssColor(
  nvda: Parameters<Parameters<typeof test>[1]>[0]["nvda"],
  color: string,
) {
  for (const character of color) {
    if (character === "(") {
      await nvda.press("Shift+9");
    } else if (character === ")") {
      await nvda.press("Shift+0");
    } else if (character === "#") {
      await nvda.press("Shift+3");
    } else {
      await nvda.type(character);
    }
  }
}

async function enterBrowseMode(nvda: Parameters<Parameters<typeof test>[1]>[0]["nvda"]) {
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
}

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
  await enterBrowseMode(nvda);
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);

  const addColor = async (color: string, index: number) => {
    const draft = page.getByRole("textbox", { name: `CSS color for new row ${index + 1}` });
    await typeCssColor(nvda, color);
    await expect(draft).toHaveValue(color);
    await expectSpokenAfterAction(
      nvda,
      () => nvda.press("Enter"),
      `Color added as row ${index + 1}.`,
    );
    await expect(page.locator("tbody tr")).toHaveCount(index + 2);
  };

  await addColor(goldenPath.accentBackground, 0);
  await addColor(goldenPath.accentHoverBackground, 1);

  await enterBrowseMode(nvda);
  await nvda.press("Control+Alt+Up");
  await nvda.press("Control+Alt+Up");
  expect(await nvda.itemText()).toContain("CSS color for row 1");
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
  await nvda.press("Control+.");
  await nvda.press("3");
  const rowOneLightness = page.getByRole("spinbutton", {
    name: "Lightness percentage for row 1",
  });
  await expect(rowOneLightness).toBeFocused();
  await expect(rowOneLightness).toHaveValue("50");
  await nvda.press("Control+.");
  await nvda.press("4");
  await expect(page.getByRole("spinbutton", { name: "Chroma for row 1" })).toHaveValue("0.15");
  await nvda.press("Control+.");
  await nvda.press("5");
  await expect(page.getByRole("spinbutton", { name: "Hue in degrees for row 1" })).toHaveValue(
    "260",
  );

  await enterBrowseMode(nvda);
  await nvda.press("Control+Alt+Down");
  expect(await nvda.itemText()).toContain("Hue in degrees for row 2");
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
  await nvda.press("Control+.");
  await nvda.press("3");
  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 2" }),
  ).toHaveValue("60");
  await nvda.press("Control+.");
  await nvda.press("4");
  await expect(page.getByRole("spinbutton", { name: "Chroma for row 2" })).toHaveValue("0.15");
  await nvda.press("Control+.");
  await nvda.press("5");
  await expect(page.getByRole("spinbutton", { name: "Hue in degrees for row 2" })).toHaveValue(
    "260",
  );
  await nvda.press("Control+.");
  await nvda.press("2");
  await enterBrowseMode(nvda);
  await nvda.press("Control+Alt+Down");
  expect(await nvda.itemText()).toContain("CSS color for new row 3");
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);

  await addColor(goldenPath.whiteText, 2);
  await addColor(goldenPath.errorBackground, 3);

  await enterBrowseMode(nvda);
  await nvda.press("Control+Alt+Up");
  expect(await nvda.itemText()).toContain("CSS color for row 4");
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
  await nvda.press("Control+.");
  await nvda.press("6");
  await expect(page.getByRole("checkbox", { name: "Contrast background for row 4" })).toBeFocused();
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
