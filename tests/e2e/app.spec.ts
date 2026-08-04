import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("serves an accessible static application", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "OKLCH Table" })).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();

  expect(accessibility.violations).toEqual([]);
});
