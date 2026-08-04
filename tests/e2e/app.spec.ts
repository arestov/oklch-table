import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { addColor } from "./support/workspace.ts";

test("adds a color and keeps the workspace accessible", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Accessible OKLCH color workspace" }),
  ).toBeVisible();

  const draft = page.getByPlaceholder("fill color");
  await expect(draft).toBeFocused();
  await addColor(page, "#ffffff");

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

test("preserves focus through duplicate, delete, shortcuts, and popover details", async ({
  page,
}) => {
  await page.goto("/");
  await addColor(page, "#ffffff");

  await page.getByRole("button", { name: "Duplicate color 1" }).click();
  await expect(page.getByRole("spinbutton", { name: "Lightness for row 2" })).toBeFocused();

  await page.keyboard.press("Control+.");
  await page.keyboard.press("7");
  await expect(page.getByRole("heading", { name: "Text contrast — color 2" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Text contrast for row 2" })).toBeFocused();

  await page.getByRole("button", { name: "Delete color 1" }).click();
  await expect(page.getByRole("button", { name: "Duplicate color 1" })).toBeFocused();
});

test("keeps invalid input focused and publishes only an alert", async ({ page }) => {
  await page.goto("/");
  const draft = page.getByPlaceholder("fill color");
  const status = page.getByRole("status");
  const alert = page.getByRole("alert");
  await expect(status).toHaveAttribute("aria-atomic", "true");
  await expect(alert).toHaveAttribute("aria-atomic", "true");

  await draft.fill("invalid color");
  await draft.press("Enter");

  await expect(draft).toBeFocused();
  await expect(draft).toHaveAttribute("aria-invalid", "true");
  await expect(alert).toContainText("Invalid CSS color");
  await expect(status).toHaveText("");
});

test("cancels and rejects unavailable column jumps without moving draft focus", async ({
  page,
}) => {
  await page.goto("/");
  const draft = page.getByPlaceholder("fill color");
  await page.keyboard.press("Control+.");
  await expect(page.locator("main")).toHaveAttribute("data-column-jump-active", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("main")).toHaveAttribute("data-column-jump-active", "false");

  await page.keyboard.press("Control+.");
  await page.keyboard.press("7");
  await expect(draft).toBeFocused();
  await expect(page.getByRole("alert")).toContainText("unavailable until a valid color is entered");
});

test("keeps each opened popover accessible and restores its trigger focus", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  const checks = page.getByRole("button", { name: "Checks for row 1" });
  await checks.click();
  await expect(page.getByRole("heading", { name: "Checks — color 1" })).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(checks).toBeFocused();

  const help = page.getByRole("button", { name: "Keyboard shortcuts" });
  await help.click();
  await expect(page.getByRole("heading", { name: "Column shortcuts" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
});
