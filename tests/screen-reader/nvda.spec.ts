import { nvdaTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";

test("announces the initial color draft", async ({ page, nvda }) => {
  await page.goto("/");
  await expect(page.getByPlaceholder("fill color")).toBeFocused();

  await nvda.navigateToWebContent();
  expect(await nvda.itemText()).toContain("Accessible OKLCH color workspace");
});
