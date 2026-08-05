import { nvdaTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";
import { goldenPath } from "../fixtures/golden-path.ts";
import {
  activateBrowser,
  openNativeWorkspace,
  restoreBrowserSession,
} from "./support/browser-session.ts";
import { restoreNativeClipboard, setNativeClipboard } from "./support/clipboard.ts";
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

/** Sends real native key events without Guidepup waiting for speech between each character. */
async function typeContinuous(
  nvda: Parameters<Parameters<typeof test>[1]>[0]["nvda"],
  text: string,
) {
  await nvda.type(text, { capture: false });
}

async function enterBrowseMode(nvda: Parameters<Parameters<typeof test>[1]>[0]["nvda"]) {
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
}

test.use({
  nvdaStartOptions: {
    settings: { presentation: { reportDynamicContentChanges: true }, speech: { synth: "espeak" } },
  },
});

test.setTimeout(240_000);

test.afterEach(async ({ page }) => {
  await restoreNativeClipboard(page);
  await restoreBrowserSession(page);
});

/** Full user transcript: all mutations come from the NVDA keyboard, never page setup. */
test("completes the empty-workspace error-hover transcript", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  await expect(page.getByPlaceholder("fill color")).toBeFocused();
  await activateBrowser(page, nvda, "CSS color for new row 1");
  await enterBrowseMode(nvda);
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);

  const addColor = async (color: string, index: number) => {
    const draft = page.getByRole("textbox", { name: `CSS color for new row ${index + 1}` });
    await setNativeClipboard(page, color);
    await nvda.press("Control+V");
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
  await nvda.press("7");
  await expect(page.getByRole("heading", { name: "Text contrast — color 4" })).toBeFocused();
  await nvda.clearSpokenPhraseLog();
  await enterBrowseMode(nvda);
  await nvda.perform(nvda.keyboardCommands.moveToNextTable);
  for (
    let index = 0;
    index < 50 && !(await nvda.spokenPhraseLog()).join(" ").includes("Color 3");
    index += 1
  ) {
    await nvda.next();
  }
  const rowFourDetailsSpeech = (await nvda.spokenPhraseLog()).join(" ");
  expect(rowFourDetailsSpeech).toContain("Color 3");
  expect(rowFourDetailsSpeech).toContain("Lc");
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
  await nvda.press("Escape");
  await expect(page.getByRole("button", { name: "Text contrast for row 4" })).toBeFocused();
  await nvda.press("Control+.");
  await nvda.press("1");
  await nvda.press("Enter");

  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 5" });
  await expect(lightness).toBeFocused();
  await nvda.press("Control+A");
  await typeContinuous(nvda, goldenPath.derivedLightness);
  await page.waitForTimeout(800);
  await expect(lightness).toHaveValue(goldenPath.derivedLightness);
  await expect(page.getByRole("status")).toContainText("Lightness 60 percent. Checks updated.");

  const commitLightness = async (value: string, announcement: string | RegExp) => {
    await nvda.press("Control+A");
    await typeContinuous(nvda, value);
    await page.waitForTimeout(800);
    await expect(lightness).toHaveValue(value);
    const status = page.getByRole("status");
    await expect(status).toContainText(announcement);
    const acceptedStatus = await status.textContent();
    await nvda.press("Enter");
    await expect(status).toHaveText(acceptedStatus ?? "");
    return acceptedStatus ?? "";
  };
  await commitLightness("90", "APCA: Text row 3 is no longer readable on background row 5.");
  await commitLightness("60", "APCA: Text row 3 is now readable on background row 5.");
  const sameCategorySpeech = await commitLightness(
    "59.9",
    "Lightness 59.9 percent. Checks updated.",
  );
  await expect(page.getByRole("status")).toHaveText("Lightness 59.9 percent. Checks updated.");
  expect(sameCategorySpeech).not.toMatch(/APCA:|WCAG:|Color vision:/);
  const finalEditSpeech = await commitLightness("60", "Lightness 60 percent. Checks updated.");
  await expect(page.getByRole("status")).toHaveText("Lightness 60 percent. Checks updated.");
  expect(finalEditSpeech).not.toMatch(/APCA:|WCAG:|Color vision:/);

  await nvda.press("Control+.");
  await nvda.press("7");
  await expect(page.getByRole("heading", { name: "Text contrast — color 5" })).toBeFocused();
  await nvda.clearSpokenPhraseLog();
  await enterBrowseMode(nvda);
  await nvda.perform(nvda.keyboardCommands.moveToNextTable);
  for (
    let index = 0;
    index < 50 && !(await nvda.spokenPhraseLog()).join(" ").includes("Color 3");
    index += 1
  ) {
    await nvda.next();
  }
  const detailsSpeech = (await nvda.spokenPhraseLog()).join(" ");
  expect(detailsSpeech).toContain("Color 3");
  expect(detailsSpeech).toContain("Lc");
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
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

test("accepts a CSS token typed character by character", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  const draft = page.getByPlaceholder("fill color");
  await activateBrowser(page, nvda, "CSS color for new row 1");
  await enterBrowseMode(nvda);
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);

  await typeCssColor(nvda, goldenPath.accentBackground);
  await expect(draft).toHaveValue(goldenPath.accentBackground);
  await expectSpokenAfterAction(nvda, () => nvda.press("Enter"), "Color added as row 1.");
  await expect(page.locator("tbody tr")).toHaveCount(2);
});
