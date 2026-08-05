import { expect, it } from "vitest";
import { createCandidate } from "./analysis.ts";
import { colorFromCss } from "./color.ts";

function contrastFacts(lightness: string) {
  const entries = [
    colorFromCss("color_1", "oklch(0.5 0.15 260)"),
    colorFromCss("color_2", "oklch(0.6 0.15 260)"),
    colorFromCss("color_3", "#ffffff"),
    colorFromCss("color_4", "oklch(0.5 0.2 25)", true),
    colorFromCss("color_5", `oklch(${lightness} 0.2 25)`, true),
  ];
  if (entries.some((entry) => !entry)) throw new Error("Fixture parsing failed");
  const colors = entries as NonNullable<(typeof entries)[number]>[];
  const candidate = createCandidate({
    colors: {
      order: colors.map((color) => color.id),
      byId: Object.fromEntries(colors.map((color) => [color.id, color])),
    },
  });
  const comparison = candidate.analysis.comparisons.contrast["color_3|color_5"];
  return {
    apca: comparison.apca,
    recommendation: comparison.recommendation,
    readable: comparison.readableTextSupported,
    wcag: comparison.wcag,
    ratio: comparison.ratio,
  };
}

it("keeps the golden-path L=60 and L=59.9 comparison in one semantic category", () => {
  const l60 = contrastFacts("0.6");
  const l599 = contrastFacts("0.599");
  expect(l60.apca).toBeCloseTo(-74.29, 2);
  expect(l599.apca).toBeCloseTo(-74.42, 2);
  expect(l599.recommendation).toEqual(l60.recommendation);
  expect(l599.readable).toBe(l60.readable);
  expect(l599.wcag).toEqual(l60.wcag);
});
