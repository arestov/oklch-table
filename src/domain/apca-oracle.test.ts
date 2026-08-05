import { expect, it } from "vitest";
import { createCandidate } from "./analysis.ts";
import { colorFromCss } from "./color.ts";

/**
 * Values independently calculated with the APCA-W3 0.0.98G-4g reference
 * algorithm (apca-w3 library 0.1.9), not with this application's analysis code.
 * Source and constants: https://github.com/Myndex/apca-w3#current-apca-constants
 * APCA takes text first and background second.
 */
const APCA_W3_FIXTURES = [
  { text: "#000000", background: "#ffffff", expectedLc: 106.040673 },
  { text: "#ffffff", background: "#000000", expectedLc: -107.884733 },
  { text: "#777777", background: "#ffffff", expectedLc: 71.111103 },
  { text: "#ffffff", background: "#777777", expectedLc: -76.581946 },
] as const;

it("matches independent APCA-W3 0.0.98G-4g reference fixtures", () => {
  for (const fixture of APCA_W3_FIXTURES) {
    const text = colorFromCss("color_text", fixture.text);
    const background = colorFromCss("color_background", fixture.background, true);
    if (!text || !background) throw new Error("Fixture parsing failed");
    const candidate = createCandidate({
      colors: {
        order: [text.id, background.id],
        byId: { [text.id]: text, [background.id]: background },
      },
    });
    const actual = candidate.analysis.comparisons.contrast["color_text|color_background"]?.apca;
    // CSS colors round-trip through OKLCH before analysis, so preserve four decimal places.
    expect(actual).toBeCloseTo(fixture.expectedLc, 4);
  }
});
