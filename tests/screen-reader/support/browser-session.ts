import { windowsActivate } from "@guidepup/guidepup";
import type { NVDAPlaywright } from "@guidepup/playwright";
import type { Page } from "@playwright/test";
import { setForegroundKeyboardLayout } from "./keyboard-layout.ts";

const englishUsLayout = "00000409";
const originalLayouts = new WeakMap<Page, string>();

/** Activates Firefox and proves that NVDA observes the expected native focus. */
export async function activateBrowser(
  page: Page,
  nvda: NVDAPlaywright,
  expectedFocus: string,
): Promise<string> {
  const browser = page.context().browser();
  if (!browser) throw new Error("Expected a browser for the NVDA test");
  await page.bringToFront();
  let observedFocus = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await windowsActivate(browser.browserType().executablePath(), "OKLCH Table");
    if (!originalLayouts.has(page)) {
      originalLayouts.set(page, await setForegroundKeyboardLayout(englishUsLayout));
    }
    await nvda.clearSpokenPhraseLog();
    await nvda.perform(nvda.keyboardCommands.reportCurrentFocus);
    observedFocus = await nvda.itemText();
    if (observedFocus.includes(expectedFocus)) return observedFocus;
  }
  throw new Error(
    `Firefox did not obtain the expected native focus. Expected ${JSON.stringify(expectedFocus)}, observed ${JSON.stringify(observedFocus)}.`,
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
