import { windowsActivate } from "@guidepup/guidepup";
import type { Page } from "@playwright/test";
import { setForegroundKeyboardLayout } from "./keyboard-layout.ts";

const englishUsLayout = "00000409";
const originalLayouts = new WeakMap<Page, string>();

/** Brings the Playwright browser to the foreground and selects deterministic keyboard input. */
export async function activateBrowser(page: Page): Promise<void> {
  const browser = page.context().browser();
  if (!browser) throw new Error("Expected a browser for the NVDA test");
  await windowsActivate(browser.browserType().executablePath(), "OKLCH Table");
  if (!originalLayouts.has(page)) {
    originalLayouts.set(page, await setForegroundKeyboardLayout(englishUsLayout));
  }
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
