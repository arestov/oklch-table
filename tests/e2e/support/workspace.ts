import type { Page } from "@playwright/test";
import { goldenPath } from "../../fixtures/golden-path.ts";

export const goldenPathColors = goldenPath;

export async function addColor(page: Page, css: string): Promise<void> {
  const draft = page.getByPlaceholder("fill color");
  await draft.fill(css);
  await draft.press("Enter");
}
