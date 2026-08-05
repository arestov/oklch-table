import { windowsActivate } from "@guidepup/guidepup";
import { type NVDAPlaywright, nvdaTest as test } from "@guidepup/playwright";
import { expect, type Page } from "@playwright/test";
import { addColor, goldenPathColors } from "../e2e/support/workspace.ts";
import { setForegroundKeyboardLayout } from "./support/keyboard-layout.ts";

const englishUsLayout = "00000409";
const originalLayouts = new WeakMap<Page, string>();

test.use({
  nvdaStartOptions: {
    settings: {
      presentation: { reportDynamicContentChanges: true },
      speech: { synth: "espeak" },
    },
  },
});

async function activateBrowser(page: Page): Promise<void> {
  const browser = page.context().browser();
  if (!browser) throw new Error("Expected a browser for the NVDA test");
  await windowsActivate(browser.browserType().executablePath(), "OKLCH Table");
  if (!originalLayouts.has(page)) {
    originalLayouts.set(page, await setForegroundKeyboardLayout(englishUsLayout));
  }
}

test.afterEach(async ({ page }) => {
  const originalLayout = originalLayouts.get(page);
  if (!originalLayout || page.isClosed()) return;

  const browser = page.context().browser();
  if (!browser) return;
  await windowsActivate(browser.browserType().executablePath(), "OKLCH Table");
  await setForegroundKeyboardLayout(originalLayout);
  originalLayouts.delete(page);
});

async function spokenText(nvda: NVDAPlaywright): Promise<string> {
  return (await nvda.spokenPhraseLog()).join(" ");
}

async function reportFocus(nvda: NVDAPlaywright): Promise<string> {
  await nvda.clearSpokenPhraseLog();
  await nvda.perform(nvda.keyboardCommands.reportCurrentFocus);
  return nvda.itemText();
}

async function expectLiveRegionReadable(
  page: Page,
  nvda: NVDAPlaywright,
  role: "alert" | "status",
  text: string,
): Promise<void> {
  await expect(page.getByRole(role)).toContainText(text);
  await nvda.clearSpokenPhraseLog();
  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);

  for (let landmark = 0; landmark < 4; landmark += 1) {
    await nvda.perform(nvda.keyboardCommands.moveToNextLandmark);
    for (let item = 0; item < 4; item += 1) {
      if ((await spokenText(nvda)).includes(text)) {
        await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
        return;
      }
      await nvda.next();
    }
  }

  await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode);
  expect(await spokenText(nvda)).toContain(text);
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
  await page.goto("/");
  await expect(page.getByPlaceholder("fill color")).toBeFocused();

  await activateBrowser(page);
  expect(await reportFocus(nvda)).toContain("CSS color for new row 1");
});

test("adds the first and second colors without leaving the draft loop", async ({ page, nvda }) => {
  await page.goto("/");
  await page.getByPlaceholder("fill color").fill(goldenPathColors.accentBackground);
  await activateBrowser(page);
  await enterFocusMode(nvda);
  await nvda.clearSpokenPhraseLog();
  await nvda.press("Enter");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expectLiveRegionReadable(page, nvda, "status", "Color added as row 1");
  expect(await reportFocus(nvda)).toContain("CSS color for new row 2");

  const secondDraft = page.getByPlaceholder("fill color");
  await secondDraft.fill(goldenPathColors.accentHoverBackground);
  await activateBrowser(page);
  await nvda.clearSpokenPhraseLog();
  await secondDraft.press("Enter");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expectLiveRegionReadable(page, nvda, "status", "Color added as row 2");
  expect(await reportFocus(nvda)).toContain("CSS color for new row 3");
});

test("jumps to Lightness and hears one grouped result", async ({ page, nvda }) => {
  await page.goto("/");
  await prepareGoldenWorkspace(page);
  await page.getByRole("textbox", { name: "CSS color for row 5" }).focus();
  await activateBrowser(page);

  expect(await reportFocus(nvda)).toContain("CSS color for row 5");
  await enterFocusMode(nvda);
  await nvda.press("Control+.");
  await nvda.press("3");
  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 5" }),
  ).toBeFocused();
  expect(await reportFocus(nvda)).toContain("Lightness percentage for row 5");

  await nvda.clearSpokenPhraseLog();
  await nvda.press("Control+A");
  await nvda.type("60");
  await nvda.perform(nvda.keyboardCommands.stopSpeech);
  await nvda.clearSpokenPhraseLog();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 5" }),
  ).toHaveValue("60");
  await expect(page.getByRole("status")).toContainText("Lightness 60 percent. Checks updated.");
  await expectLiveRegionReadable(page, nvda, "status", "Lightness 60 percent. Checks updated.");
  await expect(page.getByRole("status")).toContainText("WCAG:");
});

test("reads contrast details and returns to the editing loop", async ({ page, nvda }) => {
  await page.goto("/");
  await prepareGoldenWorkspace(page);
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 5" });
  await lightness.fill("60");
  await lightness.press("Enter");
  await activateBrowser(page);

  expect(await reportFocus(nvda)).toContain("Lightness percentage for row 5");
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
  await page.goto("/");
  const draft = page.getByPlaceholder("fill color");
  await activateBrowser(page);

  expect(await reportFocus(nvda)).toContain("CSS color for new row 1");
  await enterFocusMode(nvda);
  await nvda.type("not-a-color");
  await nvda.perform(nvda.keyboardCommands.stopSpeech);
  await nvda.clearSpokenPhraseLog();
  await nvda.press("Enter");
  await expect(draft).toBeFocused();
  await expect(draft).toHaveAttribute("aria-invalid", "true");
  await expectLiveRegionReadable(page, nvda, "alert", "Invalid CSS color");
  expect(await reportFocus(nvda)).toContain("CSS color for new row 1");
});

test("completes the error-hover golden path through the copied token", async ({ page, nvda }) => {
  await page.goto("/");
  await prepareGoldenWorkspace(page);
  await activateBrowser(page);

  expect(await reportFocus(nvda)).toContain("Lightness percentage for row 5");
  await enterFocusMode(nvda);
  await nvda.clearSpokenPhraseLog();
  await nvda.press("Control+A");
  await nvda.type("60");
  await nvda.perform(nvda.keyboardCommands.stopSpeech);
  await nvda.clearSpokenPhraseLog();
  await page.keyboard.press("Enter");
  await expectLiveRegionReadable(page, nvda, "status", "Lightness 60 percent. Checks updated.");

  await page.getByRole("spinbutton", { name: "Lightness percentage for row 5" }).focus();
  await activateBrowser(page);
  await nvda.press("Control+.");
  await nvda.press("7");
  await expect(page.getByRole("heading", { name: "Text contrast — color 5" })).toBeFocused();
  expect(await reportFocus(nvda)).toContain("Text contrast");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Text contrast for row 5" })).toBeFocused();
  await nvda.press("Control+.");
  await nvda.press("2");
  const token = page.getByRole("textbox", { name: "CSS color for row 5" });
  await expect(token).toBeFocused();
  const expectedToken = await token.inputValue();

  await nvda.press("Control+A");
  await nvda.press("Control+C");
  await nvda.clearSpokenPhraseLog();
  await nvda.perform(nvda.keyboardCommands.reportClipboardText);
  expect(await nvda.itemText()).toContain(expectedToken);
  await expect(token).toHaveValue(expectedToken);
});
