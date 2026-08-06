import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { addColor } from "./support/workspace.ts";

async function expectNoAxeViolations(page: import("@playwright/test").Page): Promise<void> {
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
}

async function pasteText(input: import("@playwright/test").Locator, text: string): Promise<void> {
  await input.evaluate((element, value) => {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: (type: string) => (type === "text/plain" ? value : "") },
    });
    element.dispatchEvent(event);
  }, text);
}

async function observeTextMutations(
  page: import("@playwright/test").Page,
  selector: string,
  storageKey: string,
): Promise<void> {
  await page.evaluate(
    ({ key, targetSelector }) => {
      const target = document.querySelector(targetSelector);
      if (!target) throw new Error(`Missing live region: ${targetSelector}`);
      const mutations: string[] = [];
      sessionStorage.setItem(key, JSON.stringify(mutations));
      new MutationObserver(() => {
        mutations.push(target.textContent ?? "");
        sessionStorage.setItem(key, JSON.stringify(mutations));
      }).observe(target, { childList: true, characterData: true, subtree: true });
    },
    { key: storageKey, targetSelector: selector },
  );
}

test("adds a color and keeps the workspace accessible", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "OKLCH color checks" })).toBeVisible();

  const draft = page.getByPlaceholder("fill color");
  await expect(draft).toBeFocused();
  await addColor(page, "#ffffff");

  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByRole("status")).toContainText("Color added as row 1.");

  await expectNoAxeViolations(page);
});

test("adds a pasted CSS color immediately", async ({ page, context, browserName }) => {
  await page.goto("/");

  const draft = page.getByPlaceholder("fill color");
  await page.evaluate(() => {
    const target = document.querySelector('[role="status"]');
    if (!target) throw new Error("Missing status live region");
    const mutations: string[] = [];
    new MutationObserver(() => {
      mutations.push(target.textContent ?? "");
      window.sessionStorage.setItem("paste-status-mutations", JSON.stringify(mutations));
    }).observe(target, { childList: true, characterData: true, subtree: true });
    window.sessionStorage.setItem("paste-status-mutations", JSON.stringify(mutations));
  });
  const token = "oklch(0.7 0.1 60)";
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.evaluate((text) => navigator.clipboard.writeText(text), token);
    await draft.press("Control+V");
  } else {
    await pasteText(draft, token);
  }

  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByRole("textbox", { name: "CSS color for row 1" })).toHaveValue(token);
  await expect(page.getByRole("textbox", { name: "CSS color for new row 2" })).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("Color added as row 1.");
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem("paste-status-mutations") ?? "[]")),
  ).toEqual(["Color added as row 1."]);
});

test("rejects an invalid pasted CSS color without leaving the draft", async ({ page }) => {
  await page.goto("/");

  const draft = page.getByPlaceholder("fill color");
  await pasteText(draft, "not-a-color");

  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(draft).toBeFocused();
  await expect(draft).toHaveValue("not-a-color");
  await expect(draft).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert")).toHaveText("Invalid CSS color. Enter HEX, RGB, or OKLCH.");
  await expect(page.getByRole("status")).toHaveText("");
});

test("accepts one manually typed CSS color on Enter", async ({ page }) => {
  await page.goto("/");

  const draft = page.getByPlaceholder("fill color");
  await draft.pressSequentially("oklch(0.7 0.1 60)");
  await expect(draft).toHaveValue("oklch(0.7 0.1 60)");
  await draft.press("Enter");

  await expect(page.getByRole("textbox", { name: "CSS color for row 1" })).toHaveValue(
    "oklch(0.7 0.1 60)",
  );
  await expect(page.getByRole("textbox", { name: "CSS color for new row 2" })).toBeFocused();
});

test("keeps empty, invalid, and dark workspaces accessible", async ({ page }) => {
  await page.goto("/");
  await expectNoAxeViolations(page);

  const draft = page.getByRole("textbox", { name: "CSS color for new row 1" });
  await draft.fill("invalid color");
  await draft.press("Enter");
  await expect(draft).toHaveAttribute("aria-invalid", "true");
  await expectNoAxeViolations(page);

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await addColor(page, "#ffffff");
  await expectNoAxeViolations(page);
});

test("adds consecutive colors and preserves OKLCH serialization", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "oklch(60% 0.15 260)");
  await expect(page.getByRole("textbox", { name: "CSS color for new row 2" })).toBeFocused();
  await addColor(page, "#ffffff");
  await expect(page.getByRole("textbox", { name: "CSS color for new row 3" })).toBeFocused();
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

test("explains the font-metrics limit of contrast size guidance", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  await addColor(page, "#000000");
  await page.getByRole("checkbox", { name: "Contrast background for row 2" }).check();
  await page.getByRole("button", { name: "Text contrast for row 1" }).click();
  await expect(page.getByLabel("Text contrast — color 1")).toContainText(
    "Size guidance is based on Arial/Helvetica-like fonts. Fonts with a smaller x-height may require a larger size.",
  );
});

test("anchors each result popover below its table cell", async ({ page }) => {
  await page.goto("/");
  test.skip(
    !(await page.evaluate(
      () =>
        CSS.supports("position-anchor: --popover-anchor") && CSS.supports("top: anchor(bottom)"),
    )),
    "CSS anchor positioning is unavailable in this browser.",
  );
  await addColor(page, "#ffffff");

  const verifyPopover = async (triggerName: string) => {
    const trigger = page.getByRole("button", { name: triggerName });
    const cell = trigger.locator("xpath=..");
    await trigger.click();
    const popover = page.locator(".anchored-popover:popover-open");
    await expect(popover).toBeVisible();

    const [cellBox, popoverBox] = await Promise.all([cell.boundingBox(), popover.boundingBox()]);
    expect(cellBox).not.toBeNull();
    expect(popoverBox).not.toBeNull();
    if (!cellBox || !popoverBox) return;

    expect(popoverBox.y).toBeGreaterThan(cellBox.y + cellBox.height);
    expect(Math.abs(popoverBox.x + popoverBox.width - (cellBox.x + cellBox.width))).toBeLessThan(1);
    const arrow = page.locator(".anchored-popover-arrow:popover-open");
    await expect(arrow).toBeVisible();
    const arrowBox = await arrow.boundingBox();
    expect(arrowBox).not.toBeNull();
    if (!arrowBox) return;

    expect(
      Math.abs(arrowBox.x + arrowBox.width / 2 - (cellBox.x + cellBox.width / 2)),
    ).toBeLessThan(1);
    await page.keyboard.press("Escape");
  };

  await verifyPopover("Text contrast for row 1");
  await verifyPopover("Checks for row 1");
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

test("leaves row details before a column jump and keeps the selected row", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  await addColor(page, "#000000");
  await page.getByRole("checkbox", { name: "Contrast background for row 2" }).check();

  const textContrast = page.getByRole("button", { name: "Text contrast for row 2" });
  const checks = page.getByRole("button", { name: "Checks for row 2" });
  const textPopover = page.getByLabel("Text contrast — color 2");
  const checksPopover = page.getByLabel("Checks — color 2");

  await textContrast.click();
  await expect(page.getByRole("heading", { name: "Text contrast — color 2" })).toBeFocused();
  await page.keyboard.press("Control+.");
  await expect(textPopover).not.toBeVisible();
  await expect(textContrast).toBeFocused();
  await expect(page.locator("main")).toHaveAttribute("data-column-jump-active", "true");
  await page.keyboard.press("3");
  await expect(
    page.getByRole("spinbutton", { name: "Lightness percentage for row 2" }),
  ).toBeFocused();

  await page.keyboard.press("Control+.");
  await page.keyboard.press("8");
  await expect(page.getByRole("heading", { name: "Checks — color 2" })).toBeFocused();
  await page.keyboard.press("Control+.");
  await expect(checksPopover).not.toBeVisible();
  await expect(checks).toBeFocused();
  await page.keyboard.press("7");
  await expect(page.getByRole("heading", { name: "Text contrast — color 2" })).toBeFocused();
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

test("reveals all passing color-vision comparisons from Checks on request", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  await addColor(page, "#000000");
  await addColor(page, "#fefefe");

  const checks = page.getByRole("button", { name: /^Checks for row 1:/ });
  await checks.click();
  const popover = page.getByLabel("Checks — color 1");
  const hidePass = popover.getByRole("checkbox", { name: "Hide all-pass comparisons" });

  await expect(hidePass).toBeChecked();
  await expect(popover.getByText("Color 3:")).toBeVisible();
  await expect(popover.getByText("Color 2:")).toHaveCount(0);

  await hidePass.uncheck();
  await expect(popover.getByText("Color 2:")).toBeVisible();
  await expect(popover.getByText("Color 3:")).toBeVisible();
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
  await expect(draft).toHaveAttribute("aria-describedby", "draft-help draft-error");
  await expect(page.locator("#draft-error")).toHaveText(
    "Invalid CSS color. Enter HEX, RGB, or OKLCH.",
  );
  await expect(alert).toContainText("Invalid CSS color");
  await expect(status).toHaveText("");

  await draft.fill("#ffffff");
  await draft.press("Enter");
  await expect(draft).not.toHaveAttribute("aria-invalid", "true");
  await expect(alert).toHaveText("");
  await expect(status).toContainText("Color added as row 1.");
});

test("scopes an invalid numeric edit and its focus recovery to the active row", async ({
  page,
}) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  await addColor(page, "#000000");
  const first = page.getByRole("spinbutton", { name: "Lightness percentage for row 1" });
  const second = page.getByRole("spinbutton", { name: "Lightness percentage for row 2" });

  await second.fill("101");
  await second.press("Enter");

  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute("aria-invalid", "true");
  await expect(first).not.toHaveAttribute("aria-invalid", "true");
});

test("associates an invalid CSS edit with its field error and clears the alert on recovery", async ({
  page,
}) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  const css = page.getByRole("textbox", { name: "CSS color for row 1" });

  await css.fill("invalid color");
  await css.press("Enter");

  await expect(css).toBeFocused();
  await expect(css).toHaveAttribute("aria-invalid", "true");
  const errorId = await css.getAttribute("aria-describedby");
  expect(errorId).toBeTruthy();
  await expect(page.locator(`#${errorId}`)).toHaveText(
    "Invalid CSS color. Enter HEX, RGB, or OKLCH.",
  );

  await css.fill("#000000");
  await css.press("Enter");
  await expect(css).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert")).toHaveText("");
  await expect(page.getByRole("status")).toContainText("CSS color #000000. Checks updated.");
});

test("requires a populated row and cancels column jump without moving focus", async ({ page }) => {
  await page.goto("/");
  const draft = page.getByPlaceholder("fill color");
  await page.keyboard.press("Control+.");
  await expect(page.locator("main")).toHaveAttribute("data-column-jump-active", "false");
  await expect(page.locator(".jump-prompt")).toHaveText(
    "Select a color row before using column jump.",
  );
  await addColor(page, "#ffffff");
  const css = page.getByRole("textbox", { name: "CSS color for row 1" });
  await css.focus();
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

  await draft.focus();
  await page.keyboard.press("Control+.");
  await page.keyboard.press("7");
  await expect(draft).toBeFocused();
  await expect(page.locator("main")).toHaveAttribute("data-column-jump-active", "false");

  await css.focus();
  await page.keyboard.press("Control+.");
  await page.keyboard.press("9");
  await expect(page.locator("main")).toHaveAttribute("data-column-jump-active", "false");
  await expect(css).toBeFocused();
});

test("keeps every opened popover accessible and restores its trigger focus", async ({ page }) => {
  await page.goto("/");
  await addColor(page, "#ffffff");
  await addColor(page, "#000000");
  await page.getByRole("checkbox", { name: "Contrast background for row 2" }).check();

  const verifyPopover = async (triggerName: string | RegExp, heading: string) => {
    const trigger = page.getByRole("button", { name: triggerName });
    await trigger.click();
    await expect(page.getByRole("heading", { name: heading })).toBeFocused();
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  };

  await verifyPopover(/^Text contrast for row 1:/, "Text contrast — color 1");
  await verifyPopover(/^Checks for row 1:/, "Checks — color 1");
  await verifyPopover("Keyboard shortcuts", "Column shortcuts");
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
  await expect(status).toContainText("L 80. Checks updated.");
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem("status-mutations") ?? "[]")),
  ).toEqual(["L 80. Checks updated."]);
});

test("mutates live regions when identical announcements are republished", async ({ page }) => {
  await page.goto("/");
  const draft = page.getByPlaceholder("fill color");
  await observeTextMutations(page, '[role="alert"]', "repeated-alert-mutations");

  await draft.fill("not-a-color");
  await draft.press("Enter");
  await draft.press("Enter");
  const invalidMessage = "Invalid CSS color. Enter HEX, RGB, or OKLCH.";
  await expect(page.getByRole("alert")).toHaveText(invalidMessage);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(sessionStorage.getItem("repeated-alert-mutations") ?? "[]")),
    )
    .toEqual([invalidMessage, invalidMessage]);

  await draft.fill("#ffffff");
  await draft.press("Enter");
  const css = page.getByRole("textbox", { name: "CSS color for row 1" });
  await css.focus();
  await observeTextMutations(page, '[role="status"]', "repeated-status-mutations");
  await page.keyboard.press("Control+.");
  await page.keyboard.press("Control+.");
  const shortcutMessage = "Column jump. Press 1 through 8. Escape cancels.";
  await expect(page.getByRole("status")).toHaveText(shortcutMessage);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(sessionStorage.getItem("repeated-status-mutations") ?? "[]")),
    )
    .toEqual([shortcutMessage, shortcutMessage]);
});

test("creates one idle checkpoint after 700 ms and does not repeat it on Enter", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2025-01-01T00:01:00Z"));
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

  await lightness.fill("8");
  await page.clock.runFor(500);
  await lightness.fill("80");
  await page.clock.runFor(699);
  await expect(status).toHaveText("Color added as row 1.");
  await page.clock.runFor(1);
  await expect(status).toHaveText("L 80. Checks updated.");

  await lightness.press("Enter");
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem("idle-status-mutations") ?? "[]")),
  ).toEqual(["L 80. Checks updated."]);
});

test("continues numeric input after an idle commit boundary", async ({ page }) => {
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2025-01-01T00:01:00Z"));
  await addColor(page, "#ffffff");
  const status = page.getByRole("status");
  const lightness = page.getByRole("spinbutton", { name: "Lightness percentage for row 1" });

  await lightness.fill("8");
  await page.clock.runFor(700);
  await expect(status).toHaveText("L 8. Checks updated.");

  await lightness.pressSequentially("0");
  await expect(lightness).toHaveValue("80");
  await page.clock.runFor(700);
  await expect(status).toHaveText("L 80. Checks updated.");
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
  await expect(page.getByRole("status")).toContainText("L 60.1. Checks updated.");

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

  const firstRow = page.locator("tbody tr").first();
  const [cssInputBox, resultButtonBox, checkboxBox] = await Promise.all([
    firstRow.getByRole("textbox").boundingBox(),
    firstRow.getByRole("button", { name: /^Text contrast/ }).boundingBox(),
    firstRow.getByRole("checkbox").boundingBox(),
  ]);
  expect(cssInputBox?.y).toBe(resultButtonBox?.y);
  expect(cssInputBox).not.toBeNull();
  expect(checkboxBox).not.toBeNull();
  const inputFirstLineCenter = (cssInputBox?.y ?? 0) + 17;
  const checkboxCenter = (checkboxBox?.y ?? 0) + (checkboxBox?.height ?? 0) / 2;
  expect(Math.abs(inputFirstLineCenter - checkboxCenter)).toBeLessThanOrEqual(1);

  const controlGeometry = await firstRow.evaluate((row) => {
    const rowHeading = row.querySelector('th[scope="row"]');
    const action = row.querySelector<HTMLButtonElement>(".actions button");
    const cssInput = row.querySelector<HTMLInputElement>("input.css-color");
    if (!rowHeading || !action || !cssInput) throw new Error("Expected complete color row");
    const heading = getComputedStyle(rowHeading);
    const button = getComputedStyle(action);
    const input = getComputedStyle(cssInput);
    return {
      inputType: cssInput.type,
      headingTextTop: rowHeading.getBoundingClientRect().y + Number.parseFloat(heading.paddingTop),
      buttonTextTop:
        action.getBoundingClientRect().y +
        Number.parseFloat(button.borderTopWidth) +
        Number.parseFloat(button.paddingTop),
      inputTextTop:
        cssInput.getBoundingClientRect().y +
        Number.parseFloat(input.borderTopWidth) +
        Number.parseFloat(input.paddingTop),
    };
  });
  expect(controlGeometry.inputType).toBe("text");
  expect(
    Math.abs(controlGeometry.headingTextTop - controlGeometry.buttonTextTop),
  ).toBeLessThanOrEqual(0.5);
  expect(controlGeometry.inputTextTop).toBe(controlGeometry.buttonTextTop);

  const glyphTops = await firstRow.evaluate((row) => {
    const rangeTop = (element: Element | null) => {
      if (!element) throw new Error("Expected text element");
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getBoundingClientRect().top;
    };
    return {
      heading: rangeTop(row.querySelector('th[scope="row"]')),
      action: rangeTop(row.querySelector(".actions button")),
    };
  });
  expect(glyphTops.heading).toBe(glyphTops.action);

  const numericHeadingAlignment = await page
    .locator("thead .numeric-heading")
    .evaluateAll((headings) => headings.map((heading) => getComputedStyle(heading).textAlign));
  expect(numericHeadingAlignment).toEqual(["right", "right", "right", "right"]);
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
