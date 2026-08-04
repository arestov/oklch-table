import type { Page } from "@playwright/test";

export const goldenPathColors = {
  accentBackground: "oklch(0.5 0.15 260)",
  accentHover: "oklch(0.6 0.15 260)",
  whiteText: "#ffffff",
  errorBackground: "oklch(0.5 0.2 25)",
} as const;

export async function addColor(page: Page, css: string): Promise<void> {
  const draft = page.getByPlaceholder("fill color");
  await draft.fill(css);
  await draft.press("Enter");
}
