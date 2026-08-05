import { describe, expect, it } from "vitest";
import { summarizeChecks, summarizeTextContrast } from "./presentation.ts";

const recommendation = (key: number) =>
  key === 0
    ? { min: 0, key, label: "not suitable for readable text", regular: null, bold: null }
    : { min: 60, key, label: "UI and non-body text", regular: 24, bold: 16 };

function candidate(
  readable: readonly boolean[],
  cvdWarnings: readonly boolean[] = [],
  background = true,
  wcagKeys: readonly number[] = readable.map((value) => (value ? 2 : 0)),
) {
  const order = ["color_target", ...readable.map((_, index) => `color_${index + 1}`)];
  return {
    status: "valid",
    document: {
      colors: {
        order,
        byId: Object.fromEntries(
          order.map((id) => [
            id,
            {
              id,
              value: { l: 0.5, c: 0, h: 0, alpha: 1 },
              serialization: { format: "oklch", lightnessUnit: "number" },
              roles: { contrastBackground: id === "color_target" && background },
            },
          ]),
        ),
      },
    },
    analysis: {
      colors: {},
      comparisons: {
        contrast: Object.fromEntries(
          readable.map((isReadable, index) => {
            const leftId = `color_${index + 1}`;
            const key = `${leftId}|color_target`;
            return [
              key,
              {
                key,
                leftId,
                rightId: "color_target",
                apca: isReadable ? 60 : 20,
                recommendation: recommendation(isReadable ? 2 : 0),
                readableTextSupported: isReadable,
                ratio: isReadable ? 4.5 : 1,
                wcag: {
                  key: wcagKeys[index],
                  label: wcagKeys[index] === 0 ? "fail" : "AA pass",
                },
              },
            ];
          }),
        ),
        colorVision: Object.fromEntries(
          cvdWarnings.map((warning, index) => {
            const otherId = `color_${index + 1}`;
            const key = ["color_target", otherId].sort().join("|");
            return [
              key,
              {
                key,
                leftId: "color_target",
                rightId: otherId,
                modes: {
                  protanopia: { distance: 0, warning },
                  deuteranopia: { distance: 0, warning },
                  tritanopia: { distance: 0, warning: false },
                },
              },
            ];
          }),
        ),
      },
    },
  } as never;
}

describe("bounded result summaries", () => {
  it("distinguishes unchecked, supported, mixed, and unreadable contrast", () => {
    expect(summarizeTextContrast(candidate([]), "color_target")).toMatchObject({
      text: "Not checked",
    });
    expect(summarizeTextContrast(candidate([true, true]), "color_target")).toMatchObject({
      text: "All 2 supported",
    });
    expect(summarizeTextContrast(candidate([true, false]), "color_target")).toMatchObject({
      text: "1 not readable · 1 supported",
    });
    expect(summarizeTextContrast(candidate([false, false]), "color_target")).toMatchObject({
      text: "2 not readable",
    });
  });

  it("keeps contrast summary length bounded as comparison count grows", () => {
    const three = summarizeTextContrast(candidate([false, false, false]), "color_target");
    const thirty = summarizeTextContrast(candidate(Array(30).fill(false)), "color_target");
    expect(three.text).toBe("3 not readable");
    expect(thirty.text).toBe("30 not readable");
    expect(thirty.text.length - three.text.length).toBeLessThanOrEqual(2);
  });

  it("counts one CVD pair once even when several modes warn", () => {
    expect(summarizeChecks(candidate([true], [true]), "color_target")).toMatchObject({
      text: "1 CVD warning",
    });
    expect(summarizeChecks(candidate([false], [true]), "color_target")).toMatchObject({
      text: "1 WCAG issue, 1 CVD warning",
    });
  });

  it("keeps APCA text suitability independent from WCAG checks", () => {
    expect(summarizeTextContrast(candidate([true], [], true, [0]), "color_target")).toMatchObject({
      text: "All 1 supported",
      className: "status-pass",
    });
    expect(summarizeChecks(candidate([true], [], true, [0]), "color_target")).toMatchObject({
      text: "1 WCAG issue",
      className: "status-fail",
    });
    expect(summarizeTextContrast(candidate([false], [], true, [2]), "color_target")).toMatchObject({
      text: "1 not readable",
      className: "status-fail",
    });
    expect(summarizeChecks(candidate([false], [], true, [2]), "color_target")).toMatchObject({
      text: "No issues",
      className: "status-pass",
    });
  });
});
