import { describe, expect, it } from "vitest";
import { formatLightnessPercent } from "../../domain/color.ts";
import { parseLightnessPercent, parseNumericField } from "./numeric-fields.ts";

describe("OKLCH numeric fields", () => {
  it("converts lightness between the normalized model and percent UI", () => {
    expect(formatLightnessPercent(0.621)).toBe(62.1);
    expect(parseLightnessPercent("62.1")).toBe(0.621);
    expect(parseLightnessPercent("0")).toBe(0);
    expect(parseLightnessPercent("100")).toBe(1);
  });

  it("rejects values outside the field ranges", () => {
    expect(parseNumericField("l", "-0.1")).toBeNull();
    expect(parseNumericField("l", "100.1")).toBeNull();
    expect(parseNumericField("c", "-0.001")).toBeNull();
    expect(parseNumericField("h", "-0.1")).toBeNull();
    expect(parseNumericField("h", "360.1")).toBeNull();
  });
});
