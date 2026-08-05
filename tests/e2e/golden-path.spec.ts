import { expect, test } from "@playwright/test";
import { addColor, goldenPathColors } from "./support/workspace.ts";

test("supports the error-hover token golden path", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");

  // Start with the same empty-table input loop used by a person. The accent rows
  // exist solely to compare OKLCH components; they are not contrast backgrounds.
  await addColor(page, goldenPathColors.accentBackground);
  await addColor(page, goldenPathColors.accentHoverBackground);
  const rowOneLightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 1" });
  await rowOneLightness.focus();
  await page.keyboard.press("Control+.");
  await page.keyboard.press("4");
  await expect(page.getByRole("spinbutton", { name: "Chroma for row 1" })).toHaveValue("0.15");
  await page.keyboard.press("Control+.");
  await page.keyboard.press("5");
  await expect(page.getByRole("spinbutton", { name: "Hue in degrees for row 1" })).toHaveValue(
    "260",
  );
  await page.getByRole("spinbutton", { name: "Lightness percentage for row 2" }).focus();
  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 2" }),
  ).toHaveValue("60");
  await addColor(page, goldenPathColors.whiteText);

  // Add error-background, mark it as a background, then derive error-hover-background.
  await addColor(page, goldenPathColors.errorBackground);
  await page.getByRole("checkbox", { name: "Contrast background for row 4" }).check();
  await page.getByRole("button", { name: "Duplicate color 4" }).click();

  const derivedLightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 5" });
  await expect(derivedLightness).toBeFocused();
  await expect(page.getByRole("checkbox", { name: "Contrast background for row 5" })).toBeChecked();

  await derivedLightness.fill(goldenPathColors.derivedLightness);
  await derivedLightness.press("Enter");
  await expect(page.getByRole("status")).toContainText("Lightness 60 percent. Checks updated.");

  // Detailed contrast remains reachable from the edit loop and restores its trigger focus.
  await page.keyboard.press("Control+.");
  await page.keyboard.press("7");
  await expect(page.getByRole("heading", { name: "Text contrast — color 5" })).toBeFocused();
  await expect(page.locator("[popover]:popover-open")).toContainText("Color 3");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Text contrast for row 5" })).toBeFocused();

  // Return directly to the serialized token and verify that copying does not change it.
  await page.keyboard.press("Control+.");
  await page.keyboard.press("2");
  const token = page.getByRole("textbox", { name: "CSS color for row 5" });
  await expect(token).toBeFocused();
  const expectedToken = await token.inputValue();
  await token.press("Control+A");
  await token.press("Control+C");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expectedToken);
  await expect(token).toHaveValue(expectedToken);
});
