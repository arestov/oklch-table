import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("adds a color and keeps the workspace accessible", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Accessible OKLCH color workspace" }),
  ).toBeVisible();

  const draft = page.getByPlaceholder("fill color");
  await draft.fill("#ffffff");
  await draft.press("Enter");

  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(
    page
      .getByRole("region", { name: "Last feedback checkpoint" })
      .getByText("Color added as row 1.", { exact: false }),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();

  expect(accessibility.violations).toEqual([]);
});
