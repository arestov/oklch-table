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
  await expect(page.getByRole("status")).toContainText("Color added as row 1.");

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();

  expect(accessibility.violations).toEqual([]);
});

test("adds consecutive colors and preserves OKLCH serialization", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "oklch(60% 0.15 260)");
  await addColor(page, "#ffffff");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.getByRole("textbox", { name: "CSS color for row 1" })).toHaveValue(
    "oklch(60% 0.15 260)",
  );
  await expect(page.getByRole("textbox", { name: "CSS color for row 2" })).toHaveValue("#ffffff");
});

test("compares two accent colors through the text-contrast details", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "oklch(0.5 0.15 260)");
  await page.getByRole("checkbox", { name: "Contrast background for row 1" }).check();
  await addColor(page, "oklch(0.6 0.15 260)");
  await page.getByRole("button", { name: "Text contrast for row 1" }).click();
  await expect(page.getByRole("table", { name: "Background color 1" })).toBeVisible();
});

test("preserves focus through duplicate, delete, shortcuts, and popover details", async ({
  page,
}) => {
  await page.goto("/");
  await addColor(page, "#ffffff");

  await page.getByRole("button", { name: "Duplicate color 1" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 2" }),
  ).toBeFocused();

  await page.keyboard.press("Control+.");
  await page.keyboard.press("7");
  await expect(page.getByRole("heading", { name: "Text contrast — color 2" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Text contrast for row 2" })).toBeFocused();

  await page.getByRole("button", { name: "Delete color 1" }).click();
  await expect(page.getByRole("button", { name: "Duplicate color 1" })).toBeFocused();
});

test("jumps to every supported column from a populated row", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  const css = page.getByRole("textbox", { name: "CSS color for row 1" });

  const jump = async (column: string) => {
    await css.focus();
    await page.keyboard.press("Control+.");
    await page.keyboard.press(column);
  };

  await jump("1");
  await expect(page.getByRole("button", { name: "Duplicate color 1" })).toBeFocused();
  await jump("2");
  await expect(css).toBeFocused();
  await jump("3");
  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 1" }),
  ).toBeFocused();
  await jump("4");
  await expect(page.getByRole("spinbutton", { name: "Chroma for row 1" })).toBeFocused();
  await jump("5");
  await expect(page.getByRole("spinbutton", { name: "Hue in degrees for row 1" })).toBeFocused();
  await jump("6");
  await expect(page.getByRole("checkbox", { name: "Contrast background for row 1" })).toBeFocused();
  await jump("7");
  await expect(page.getByRole("heading", { name: "Text contrast — color 1" })).toBeFocused();
  await page.keyboard.press("Escape");
  await jump("8");
  await expect(page.getByRole("heading", { name: "Checks — color 1" })).toBeFocused();
});

test("renders non-live summaries that update in place and explain their issues", async ({
  page,
}) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  await addColor(page, "#ffffff");
  await page.getByRole("checkbox", { name: "Contrast background for row 2" }).check();

  const css = page.getByRole("textbox", { name: "CSS color for row 1" });
  const textContrast = page.getByRole("button", { name: /^Text contrast for row 1:/ });
  const checks = page.getByRole("button", { name: /^Checks for row 1:/ });
  const initialSummary = await textContrast.innerText();
  await expect(textContrast).not.toHaveAttribute("aria-live");
  await expect(checks).not.toHaveAttribute("aria-live");
  await checks.click();
  await expect(
    page.getByLabel("Checks — color 1").getByText("Text row 1 on background row 2:"),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await css.fill("#000000");
  await expect(css).toBeFocused();
  await expect.poll(() => textContrast.innerText()).not.toBe(initialSummary);
  await expect(textContrast.locator("small")).toBeVisible();
});

test("keeps invalid input focused and publishes only an alert", async ({ page }) => {
  await page.goto("/");
  const draft = page.getByPlaceholder("fill color");
  const status = page.locator('[role="status"]');
  const alert = page.locator('[role="alert"]');
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
  await draft.dispatchEvent("keydown", {
    bubbles: true,
    code: "ControlLeft",
    ctrlKey: true,
    key: "Control",
  });
  await expect(page.locator("main")).toHaveAttribute("data-column-jump-active", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("main")).toHaveAttribute("data-column-jump-active", "false");

  await page.keyboard.press("Control+.");
  await page.keyboard.press("7");
  await expect(draft).toBeFocused();
  await expect(page.getByRole("alert")).toContainText("unavailable until a valid color is entered");

  await page.keyboard.press("Control+.");
  await page.keyboard.press("9");
  await expect(page.locator("main")).toHaveAttribute("data-column-jump-active", "false");
  await expect(draft).toBeFocused();
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

test("publishes one atomic status mutation for an accepted edit", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  const status = page.locator('[role="status"]');
  await page.evaluate(() => {
    const target = document.querySelector('[role="status"]');
    if (!target) throw new Error("Missing status live region");
    const mutations: string[] = [];
    const observer = new MutationObserver(() => {
      mutations.push(target.textContent ?? "");
      window.sessionStorage.setItem("status-mutations", JSON.stringify(mutations));
    });
    observer.observe(target, { childList: true, characterData: true, subtree: true });
  });
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 1" });
  await lightness.fill("80");
  await lightness.press("Enter");
  await expect(status).toContainText("Lightness 80 percent. Checks updated.");
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem("status-mutations") ?? "[]")),
  ).toEqual(["Lightness 80 percent. Checks updated."]);
});

test("creates one idle checkpoint after 700 ms and does not repeat it on Enter", async ({
  page,
}) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  const status = page.getByRole("status");
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 1" });
  await page.evaluate(() => {
    const target = document.querySelector('[role="status"]');
    if (!target) throw new Error("Missing status live region");
    const mutations: string[] = [];
    const observer = new MutationObserver(() => {
      mutations.push(target.textContent ?? "");
      window.sessionStorage.setItem("idle-status-mutations", JSON.stringify(mutations));
    });
    observer.observe(target, { childList: true, characterData: true, subtree: true });
  });

  await lightness.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("8");
  await page.waitForTimeout(500);
  await page.keyboard.press("0");
  await page.waitForTimeout(199);
  await expect(status).toHaveText("Color added as row 1.");
  await page.waitForTimeout(1);
  await expect(status).toHaveText("Lightness 80 percent. Checks updated.");

  await lightness.press("Enter");
  await page.waitForTimeout(50);
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem("idle-status-mutations") ?? "[]")),
  ).toEqual(["Lightness 80 percent. Checks updated."]);
});

test("uses bounded, unit-aware numeric controls", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 1" });
  const chroma = page.getByRole("spinbutton", { name: "Chroma for row 1" });
  const hue = page.getByRole("spinbutton", { name: "Hue in degrees for row 1" });

  await expect(lightness).toHaveAttribute("min", "0");
  await expect(lightness).toHaveAttribute("max", "100");
  await expect(lightness).toHaveAttribute("step", "0.1");
  await expect(lightness).toHaveAttribute("inputmode", "decimal");
  await expect(chroma).toHaveAttribute("min", "0");
  await expect(chroma).not.toHaveAttribute("max");
  await expect(chroma).toHaveAttribute("step", "0.001");
  await expect(hue).toHaveAttribute("min", "0");
  await expect(hue).toHaveAttribute("max", "360");
  await expect(hue).toHaveAttribute("step", "0.1");

  await lightness.fill("60");
  await lightness.press("ArrowUp");
  await expect(lightness).toHaveValue("60.1");
  await lightness.press("Enter");
  await expect(page.getByRole("status")).toContainText("Lightness 60.1 percent. Checks updated.");

  await lightness.fill("101");
  await lightness.press("Enter");
  await expect(lightness).toBeFocused();
  await expect(lightness).toHaveAttribute("aria-invalid", "true");
  await expect(lightness).toHaveAttribute("aria-describedby");
  await lightness.fill("60");
  await expect(lightness).not.toHaveAttribute("aria-invalid", "true");
});

test("keeps the populated table aligned without horizontal overflow at 1280px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  for (const color of [
    "oklch(0.5 0.15 260)",
    "oklch(0.6 0.15 260)",
    "#ffffff",
    "oklch(0.5 0.2 25)",
  ]) {
    await addColor(page, color);
  }
  await page.getByRole("checkbox", { name: "Contrast background for row 4" }).check();

  const shell = page.locator(".table-shell");
  const dimensions = await shell.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  const cssCell = page.locator("tbody tr").first().locator("td").nth(1);
  const draftInputCell = page.locator('tr[data-draft="true"] .draft-input-cell');
  const [cssBox, draftBox] = await Promise.all([
    cssCell.boundingBox(),
    draftInputCell.boundingBox(),
  ]);
  expect(cssBox).not.toBeNull();
  expect(draftBox).not.toBeNull();
  expect(draftBox?.x).toBe(cssBox?.x);
});

test("keeps visible screen-reader feedback in stable page flow", async ({ page }) => {
  await page.goto("/");
  const monitor = page.getByRole("region", { name: "Screen reader feedback" });
  const table = page.getByRole("table", { name: "Colors in the current workspace" });
  const before = await Promise.all([monitor.boundingBox(), table.boundingBox()]);
  await addColor(page, "#ffffff");
  await expect(page.getByRole("status")).toContainText("Color added as row 1.");
  const after = await Promise.all([monitor.boundingBox(), table.boundingBox()]);

  expect(before[0]?.height).toBe(after[0]?.height);
  expect(before[1]?.y).toBe(after[1]?.y);
  expect(
    await page
      .locator(".announcement-viewport")
      .evaluate((element) => getComputedStyle(element).overflowY),
  ).toBe("auto");
});
