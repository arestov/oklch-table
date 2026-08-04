import { describe, expect, it } from "vitest";
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
});
