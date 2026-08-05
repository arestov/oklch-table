import { windowsActivate } from "@guidepup/guidepup";
import type { NVDAPlaywright } from "@guidepup/playwright";
import type { Page } from "@playwright/test";
import { setForegroundKeyboardLayout } from "./keyboard-layout.ts";

const englishUsLayout = "00000409";
const originalLayouts = new WeakMap<Page, string>();
const activationAttempts = 10;

async function activateFirefoxPage(page: Page): Promise<void> {
  const browser = page.context().browser();
  if (!browser) throw new Error("Expected a browser for the NVDA test");
  await page.bringToFront();
  await windowsActivate(browser.browserType().executablePath(), "OKLCH Table");
  await page.bringToFront();
  await page.waitForFunction(() => document.hasFocus());
  await page.waitForTimeout(250);
}

/** Opens a stable app document before a test starts native window activation. */
export async function openNativeWorkspace(page: Page): Promise<void> {
  const response = await page.goto("/");
  if (!response?.ok())
    throw new Error(`Workspace navigation failed with status ${response?.status()}`);
  await page.waitForLoadState("domcontentloaded");
  const draft = page.getByPlaceholder("fill color");
  await draft.waitFor({ state: "visible" });
  await page.waitForFunction(() => document.readyState === "complete");
  await page.waitForFunction(
    (input) => document.activeElement === input,
    await draft.elementHandle(),
  );
  await activateFirefoxPage(page);
}

/** Activates Firefox and proves that NVDA observes the expected native focus. */
export async function activateBrowser(
  page: Page,
  nvda: NVDAPlaywright,
  expectedFocus: string,
): Promise<string> {
  const browser = page.context().browser();
  if (!browser) throw new Error("Expected a browser for the NVDA test");
  let observedFocus = "";
  let activationError: unknown;
  for (let attempt = 0; attempt < activationAttempts; attempt += 1) {
    try {
      await activateFirefoxPage(page);
      if (!originalLayouts.has(page)) {
        originalLayouts.set(page, await setForegroundKeyboardLayout(englishUsLayout));
      }
      await nvda.clearSpokenPhraseLog();
      await nvda.perform(nvda.keyboardCommands.reportCurrentFocus);
      observedFocus = await nvda.itemText();
      if (observedFocus.includes(expectedFocus)) return observedFocus;
    } catch (error) {
      if (page.isClosed()) throw error;
      activationError = error;
    }
    await page.waitForTimeout(250);
  }
  throw new Error(
    `Firefox did not obtain the expected native focus. Expected ${JSON.stringify(expectedFocus)}, observed ${JSON.stringify(observedFocus)}.${activationError instanceof Error ? ` Last activation error: ${activationError.message}` : ""}`,
  );
}

export async function restoreBrowserSession(page: Page): Promise<void> {
  const originalLayout = originalLayouts.get(page);
  if (!originalLayout || page.isClosed()) return;
  const browser = page.context().browser();
  if (!browser) return;
  await windowsActivate(browser.browserType().executablePath(), "OKLCH Table");
  await setForegroundKeyboardLayout(originalLayout);
  originalLayouts.delete(page);
}
