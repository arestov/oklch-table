import { type NVDAPlaywright, nvdaTest as test } from "@guidepup/playwright";
import { expect, type Page } from "@playwright/test";
import { addColor, goldenPathColors } from "../e2e/support/workspace.ts";
import {
  activateBrowser,
  openNativeWorkspace,
  restoreBrowserSession,
} from "./support/browser-session.ts";
import { typeNumericFast } from "./support/native-keyboard.ts";
import { expectSpokenAfterAction } from "./support/speech.ts";

test.use({
  nvdaStartOptions: {
    settings: {
      presentation: { reportDynamicContentChanges: true },
      speech: { synth: "espeak" },
    },
  },
});

test.afterEach(async ({ page }) => {
  await restoreBrowserSession(page);
});

async function spokenText(nvda: NVDAPlaywright): Promise<string> {
  return (await nvda.spokenPhraseLog()).join(" ");
}

async function reportFocus(nvda: NVDAPlaywright): Promise<string> {
  await nvda.clearSpokenPhraseLog();
  await nvda.perform(nvda.keyboardCommands.reportCurrentFocus);
  return nvda.itemText();
}

async function enterFocusMode(nvda: NVDAPlaywright): Promise<void> {
  await nvda.perform(nvda.keyboardCommands.exitFocusMode);
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
}

async function prepareGoldenWorkspace(page: Page): Promise<void> {
  await addColor(page, goldenPathColors.accentBackground);
  await page.getByRole("checkbox", { name: "Contrast background for row 1" }).check();
  await addColor(page, goldenPathColors.accentHoverBackground);
  await page.getByRole("checkbox", { name: "Contrast background for row 2" }).check();
  await addColor(page, goldenPathColors.whiteText);
  await addColor(page, goldenPathColors.errorBackground);
  await page.getByRole("checkbox", { name: "Contrast background for row 4" }).check();
  await page.getByRole("button", { name: "Duplicate color 4" }).click();
}

test("announces the initial color draft", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  await expect(page.getByPlaceholder("fill color")).toBeFocused();

  await activateBrowser(page, nvda, "CSS color for new row 1");
});

test("adds the first and second colors without leaving the draft loop", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  await page.getByPlaceholder("fill color").fill(goldenPathColors.accentBackground);
  await activateBrowser(page, nvda, "CSS color for new row 1");
  await enterFocusMode(nvda);
  await expectSpokenAfterAction(nvda, () => nvda.press("Enter"), "Color added as row 1");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByRole("status")).toContainText("Color added as row 1");
  expect(await activateBrowser(page, nvda, "CSS color for new row 2")).toContain(
    "CSS color for new row 2",
  );

  const secondDraft = page.getByPlaceholder("fill color");
  await secondDraft.fill(goldenPathColors.accentHoverBackground);
  await activateBrowser(page, nvda, "CSS color for new row 2");
  await expectSpokenAfterAction(nvda, () => nvda.press("Enter"), "Color added as row 2");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByRole("status")).toContainText("Color added as row 2");
  expect(await activateBrowser(page, nvda, "CSS color for new row 3")).toContain(
    "CSS color for new row 3",
  );
});

test("announces background selection and inherited duplication", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  await addColor(page, "#ffffff");
  const css = page.getByRole("textbox", { name: "CSS color for row 1" });
  const background = page.getByRole("checkbox", { name: "Contrast background for row 1" });
  await css.focus();
  await activateBrowser(page, nvda, "CSS color for row 1");
  await enterFocusMode(nvda);

  await expectSpokenAfterAction(
    nvda,
    () => nvda.press("Control+."),
    "Column jump. Press 1 through 8. Escape cancels.",
  );
  await nvda.press("6", { capture: false });
  await expect(background).toBeFocused();
  await expectSpokenAfterAction(
    nvda,
    () => nvda.press("Space", { capture: true }),
    "Row 1 selected as a contrast background.",
  );
  await expect(background).toBeChecked();

  await expectSpokenAfterAction(
    nvda,
    () => nvda.press("Control+."),
    "Column jump. Press 1 through 8. Escape cancels.",
  );
  await nvda.press("1", { capture: false });
  await expect(page.getByRole("button", { name: "Duplicate color 1" })).toBeFocused();
  const duplicateSpeech = await expectSpokenAfterAction(
    nvda,
    () => nvda.press("Enter", { capture: true }),
    "Row 1 duplicated as row 2. It inherits the contrast-background role.",
  );

  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 2" }),
  ).toBeFocused();
  await expect(page.getByRole("checkbox", { name: "Contrast background for row 2" })).toBeChecked();
  expect(duplicateSpeech).toContain("It inherits the contrast-background role.");
});

test("reads WCAG and color-vision issues from Checks and returns to its trigger", async ({
  page,
  nvda,
}) => {
  await openNativeWorkspace(page);
  await addColor(page, "#ffffff");
  await addColor(page, "#ffffff");
  await page.getByRole("checkbox", { name: "Contrast background for row 2" }).check();
  const css = page.getByRole("textbox", { name: "CSS color for row 1" });
  const checks = page.getByRole("button", { name: /^Checks for row 1:/ });
  await css.focus();
  await activateBrowser(page, nvda, "CSS color for row 1");
  await enterFocusMode(nvda);

  await expectSpokenAfterAction(
    nvda,
    () => nvda.press("Control+."),
    "Column jump. Press 1 through 8. Escape cancels.",
  );
  await nvda.press("8", { capture: false });
  await expect(page.getByRole("heading", { name: "Checks — color 1" })).toBeFocused();
  expect(await reportFocus(nvda)).toContain("Checks");

  await nvda.clearSpokenPhraseLog();
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
  for (
    let index = 0;
    index < 40 && !(await spokenText(nvda)).includes("Possible conflict");
    index += 1
  ) {
    await nvda.next();
  }
  const checksSpeech = await spokenText(nvda);
  expect(checksSpeech).toContain("WCAG issues");
  expect(checksSpeech).toContain("Text row 1 on background row 2");
  expect(checksSpeech).toContain("Color vision");
  expect(checksSpeech).toContain("Color 2");
  expect(checksSpeech).toContain("protanopia Possible conflict");

  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
  await nvda.press("Escape");
  await expect(checks).toBeFocused();
  expect(await reportFocus(nvda)).toContain("Checks for row 1");
});

test("announces WCAG and color-vision transitions after one committed edit", async ({
  page,
  nvda,
}) => {
  await openNativeWorkspace(page);
  await addColor(page, "#ffffff");
  await addColor(page, "#ffffff");
  await page.getByRole("checkbox", { name: "Contrast background for row 2" }).check();
  const css = page.getByRole("textbox", { name: "CSS color for row 2" });
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 2" });
  await css.focus();
  await activateBrowser(page, nvda, "CSS color for row 2");
  await enterFocusMode(nvda);
  await nvda.press("Control+.");
  await nvda.press("3", { capture: false });
  await expect(lightness).toBeFocused();

  // NVDA emits an automatic live-region utterance only for a native edit.
  // `typeNumericFast` sends the complete value as one keyboard action, rather
  // than modelling a user's character-by-character editing behaviour.
  const commit = (value: string, phrase: string) =>
    expectSpokenAfterAction(
      nvda,
      async () => {
        await nvda.press("Control+A", { capture: false });
        await typeNumericFast(nvda, value);
        await nvda.press("Enter");
      },
      phrase,
    );

  const resolved = await commit(
    "0",
    "Color vision: conflict between row 1 and row 2 resolved; 0 remain.",
  );
  expect(resolved).toContain("WCAG: 1 failure resolved; 0 remain.");
  await expect(lightness).toHaveValue("0");

  const detected = await commit(
    "96",
    "Color vision: conflict between row 1 and row 2 detected; 1 remain.",
  );
  expect(detected).toContain("WCAG: 1 failure added; 1 remain.");
  await expect(lightness).toHaveValue("96");
});

test("jumps to Lightness and reaches one grouped idle result", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  await prepareGoldenWorkspace(page);
  await page.getByRole("textbox", { name: "CSS color for row 5" }).focus();
  await activateBrowser(page, nvda, "CSS color for row 5");

  await enterFocusMode(nvda);
  await nvda.press("Control+.");
  await nvda.press("3");
  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 5" }),
  ).toBeFocused();
  expect(await reportFocus(nvda)).toContain("Lightness percentage for row 5");

  await nvda.press("Control+A");
  await typeNumericFast(nvda, "60");
  await page.waitForTimeout(800);
  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 5" }),
  ).toHaveValue("60");
  await expect(page.getByRole("status")).toContainText("L 60. Checks updated.");
  await expect(page.getByRole("status")).toContainText("WCAG:");
  const acceptedStatus = await page.getByRole("status").textContent();
  await nvda.press("Enter");
  await expect(page.getByRole("status")).toHaveText(acceptedStatus ?? "");
});

test("announces a fast numeric commit before the idle checkpoint", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  await addColor(page, "#ffffff");
  const css = page.getByRole("textbox", { name: "CSS color for row 1" });
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 1" });
  await css.focus();
  await activateBrowser(page, nvda, "CSS color for row 1");
  await enterFocusMode(nvda);
  await expectSpokenAfterAction(
    nvda,
    () => nvda.press("Control+."),
    "Column jump. Press 1 through 8. Escape cancels.",
  );
  await nvda.press("3", { capture: false });
  await expect(lightness).toBeFocused();

  const speech = await expectSpokenAfterAction(
    nvda,
    async () => {
      await nvda.press("Control+A", { capture: false });
      await typeNumericFast(nvda, "80");
      await nvda.press("Enter");
    },
    "L 80. Checks updated.",
  );

  await expect(lightness).toHaveValue("80");
  await expect(page.getByRole("status")).toHaveText("L 80. Checks updated.");
  expect(speech).toContain("L 80. Checks updated.");
});

test("announces APCA loss and restoration", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  await prepareGoldenWorkspace(page);
  const css = page.getByRole("textbox", { name: "CSS color for row 5" });
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 5" });
  await css.focus();
  await activateBrowser(page, nvda, "CSS color for row 5");
  await enterFocusMode(nvda);
  await expectSpokenAfterAction(
    nvda,
    () => nvda.press("Control+."),
    "Column jump. Press 1 through 8. Escape cancels.",
  );
  await nvda.press("3", { capture: false });
  await expect(lightness).toBeFocused();

  const commit = (value: string, announcement: string | RegExp) =>
    expectSpokenAfterAction(
      nvda,
      async () => {
        await nvda.press("Control+A", { capture: false });
        await typeNumericFast(nvda, value);
        await nvda.press("Enter");
      },
      announcement,
    );

  await commit("90", "APCA: row 3 is no longer readable on background row 5.");
  await expect(lightness).toHaveValue("90");
  const restoredSpeech = await commit("60", "APCA: row 3 is now readable on background row 5.");
  await expect(lightness).toHaveValue("60");
  expect(restoredSpeech).toContain("L 60. Checks updated.");
});

test("announces a no-category edit without metric sections", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  await prepareGoldenWorkspace(page);
  const css = page.getByRole("textbox", { name: "CSS color for row 5" });
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 5" });
  await lightness.fill("60");
  await lightness.press("Enter");
  await css.focus();
  await activateBrowser(page, nvda, "CSS color for row 5");
  await enterFocusMode(nvda);
  await expectSpokenAfterAction(
    nvda,
    () => nvda.press("Control+."),
    "Column jump. Press 1 through 8. Escape cancels.",
  );
  await nvda.press("3", { capture: false });
  await expect(lightness).toBeFocused();

  const noCategorySpeech = await expectSpokenAfterAction(
    nvda,
    async () => {
      await nvda.press("Control+A", { capture: false });
      await typeNumericFast(nvda, "59.9");
      await nvda.press("Enter");
    },
    "L 59.9. Checks updated.",
  );
  await expect(lightness).toHaveValue("59.9");
  expect(noCategorySpeech).not.toMatch(/APCA:|WCAG:|Color vision:/);
});

test("keeps the final numeric state after delayed native character input", async ({
  page,
  nvda,
}) => {
  await openNativeWorkspace(page);
  await addColor(page, "#ffffff");
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 1" });
  await lightness.focus();
  await activateBrowser(page, nvda, "Lightness percentage for row 1");

  await enterFocusMode(nvda);
  await nvda.press("Control+A");
  await nvda.type("8");
  await page.waitForTimeout(750);
  await expect(page.getByRole("status")).toHaveText("L 8. Checks updated.");

  await nvda.type("0");
  await page.waitForTimeout(750);
  await expect(lightness).toHaveValue("80");
  await expect(page.getByRole("status")).toHaveText("L 80. Checks updated.");
});

test("reads contrast details and returns to the editing loop", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  await prepareGoldenWorkspace(page);
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 5" });
  await lightness.fill("60");
  await lightness.press("Enter");
  await activateBrowser(page, nvda, "Lightness percentage for row 5");

  await enterFocusMode(nvda);
  await nvda.press("Control+.");
  await nvda.press("7");
  await expect(page.getByRole("heading", { name: "Text contrast — color 5" })).toBeFocused();
  expect(await reportFocus(nvda)).toContain("Text contrast");

  await nvda.clearSpokenPhraseLog();
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
  await nvda.perform(nvda.keyboardCommands.moveToNextTable);
  for (
    let index = 0;
    index < 50 && !(await spokenText(nvda)).includes("Light text on dark background");
    index += 1
  ) {
    await nvda.next();
  }
  const detailsSpeech = await spokenText(nvda);
  expect(detailsSpeech).toContain("UI and non-body text");
  expect(detailsSpeech).toContain("24px");
  expect(detailsSpeech).toContain("16px");
  expect(detailsSpeech).toContain("Lc");
  expect(detailsSpeech).toContain("Light text on dark background");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Text contrast for row 5" })).toBeFocused();
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
  await nvda.press("Control+.");
  await nvda.press("3");
  await expect(lightness).toBeFocused();
  expect(await reportFocus(nvda)).toContain("Lightness percentage for row 5");
});

test("announces an invalid CSS color and preserves its focus", async ({ page, nvda }) => {
  await openNativeWorkspace(page);
  const draft = page.getByPlaceholder("fill color");
  await activateBrowser(page, nvda, "CSS color for new row 1");

  await enterFocusMode(nvda);
  await nvda.type("not-a-color");
  await expectSpokenAfterAction(nvda, () => nvda.press("Enter"), "Invalid CSS color");
  await expect(draft).toBeFocused();
  await expect(draft).toHaveAttribute("aria-invalid", "true");
  await activateBrowser(page, nvda, "CSS color for new row 1");
});
