import { describe, expect, it } from "vitest";
import { requireValue } from "../core/safety/required.ts";
import { createCandidate } from "./analysis.ts";
import { colorFromCss } from "./color.ts";

describe("semantic color analysis", () => {
  it("uses stable IDs in directed contrast keys", () => {
    const text = colorFromCss("color_text", "#fff");
    const background = colorFromCss("color_background", "oklch(0.58 0.2 25)", true);
    if (!text || !background) throw new Error("Fixture parsing failed");
    const candidate = createCandidate({
      colors: {
        order: [text.id, background.id],
        byId: { [text.id]: text, [background.id]: background },
      },
    });
    expect(Object.keys(candidate.analysis.comparisons.contrast)).toEqual([
      "color_text|color_background",
    ]);
  });

  it("exposes recommendation facts without claiming configured text support", () => {
    const text = colorFromCss("color_text", "#fff");
    const background = colorFromCss("color_background", "#000", true);
    if (!text || !background) throw new Error("Fixture parsing failed");
    const candidate = createCandidate({
      colors: {
        order: [text.id, background.id],
        byId: { [text.id]: text, [background.id]: background },
      },
    });
    const comparison = requireValue(
      candidate.analysis.comparisons.contrast["color_text|color_background"],
      "Expected contrast comparison",
    );
    expect(comparison.readableTextSupported).toBe(true);
    expect(comparison.recommendation.key).toBeGreaterThan(0);
  });

  it("compares every unordered color pair in every color-vision mode", () => {
    const colors = ["#ffffff", "#000000", "#ff0000", "#0000ff"].map((value, index) => {
      const color = colorFromCss(`color_${index + 1}`, value);
      if (!color) throw new Error("Fixture parsing failed");
      return color;
    });
    const candidate = createCandidate({
      colors: {
        order: colors.map((color) => color.id),
        byId: Object.fromEntries(colors.map((color) => [color.id, color])),
      },
    });

    const comparisons = Object.values(candidate.analysis.comparisons.colorVision);
    expect(comparisons).toHaveLength(6);
    expect(comparisons.map((comparison) => comparison.key)).toEqual([
      "color_1|color_2",
      "color_1|color_3",
      "color_1|color_4",
      "color_2|color_3",
      "color_2|color_4",
      "color_3|color_4",
    ]);
    for (const comparison of comparisons) {
      expect(comparison.leftId).not.toBe(comparison.rightId);
      expect(Object.keys(comparison.modes).sort()).toEqual([
        "deuteranopia",
        "protanopia",
        "tritanopia",
      ]);
    }
  });
});
