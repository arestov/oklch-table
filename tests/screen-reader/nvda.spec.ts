import { type NVDAPlaywright, nvdaTest as test } from "@guidepup/playwright";
import { expect, type Page } from "@playwright/test";
import { addColor, goldenPathColors } from "../e2e/support/workspace.ts";
import {
  activateBrowser,
  openNativeWorkspace,
  restoreBrowserSession,
} from "./support/browser-session.ts";
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

/** Sends real native key events without Guidepup waiting for speech between each character. */
async function typeContinuous(nvda: NVDAPlaywright, text: string): Promise<void> {
  await nvda.type(text, { capture: false });
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

test("jumps to Lightness and hears one grouped result", async ({ page, nvda }) => {
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

  await expectSpokenAfterAction(
    nvda,
    async () => {
      await nvda.press("Control+A");
      await typeContinuous(nvda, "60");
      await nvda.press("Enter");
    },
    "Lightness 60 percent. Checks updated.",
  );
  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 5" }),
  ).toHaveValue("60");
  await expect(page.getByRole("status")).toContainText("Lightness 60 percent. Checks updated.");
  await expect(page.getByRole("status")).toContainText("WCAG:");
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
  await expect(page.getByRole("status")).toHaveText("Lightness 8 percent. Checks updated.");

  await nvda.type("0");
  await page.waitForTimeout(750);
  await expect(lightness).toHaveValue("80");
  await expect(page.getByRole("status")).toHaveText("Lightness 80 percent. Checks updated.");
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
  for (let index = 0; index < 20 && !(await spokenText(nvda)).includes("Lc"); index += 1) {
    await nvda.next();
  }
  expect(await spokenText(nvda)).toContain("Lc");

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

  expect(await reportFocus(nvda)).toContain("CSS color for new row 1");
  await enterFocusMode(nvda);
  await nvda.type("not-a-color");
  await expectSpokenAfterAction(nvda, () => nvda.press("Enter"), "Invalid CSS color");
  await expect(draft).toBeFocused();
  await expect(draft).toHaveAttribute("aria-invalid", "true");
  expect(await reportFocus(nvda)).toContain("CSS color for new row 1");
});
