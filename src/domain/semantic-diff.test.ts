import { describe, expect, it } from "vitest";
import { diffSemanticSnapshots } from "./semantic-diff.ts";
import type { SemanticSnapshot } from "./types.ts";

const snapshot = (
  recommendationKey: number,
  regular: number | null,
  wcagKey: number,
): SemanticSnapshot => ({
  rows: {},
  comparisons: {
    contrast: {
      "color_text|color_background": {
        key: "color_text|color_background",
        leftId: "color_text",
        rightId: "color_background",
        leftRow: 3,
        rightRow: 5,
        apca: 60,
        recommendationKey,
        regular,
        bold: regular ? 16 : null,
        readableTextSupported: recommendationKey > 0,
        wcagKey,
      },
    },
    colorVision: {},
  },
});

describe("semantic contrast diff", () => {
  it("keeps numeric APCA changes silent inside the same recommendation category", () => {
    const before = snapshot(2, 24, 2);
    const after = structuredClone(before);
    after.comparisons.contrast["color_text|color_background"].apca = 61;
    expect(diffSemanticSnapshots(before, after).comparisons.contrast).toEqual({});
  });

  it("captures stricter recommendation and WCAG issue facts", () => {
    const changes = diffSemanticSnapshots(snapshot(2, 24, 2), snapshot(1, 32, 0));
    const comparison = changes.comparisons.contrast["color_text|color_background"];
    expect(comparison.recommendationKey).toEqual({ before: 2, after: 1 });
    expect(comparison.regular).toEqual({ before: 24, after: 32 });
    expect(comparison.wcagKey).toEqual({ before: 2, after: 0 });
  });
});
