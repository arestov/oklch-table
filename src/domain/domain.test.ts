import { describe, expect, it } from "vitest";
import { buildAnnouncementPlan } from "../feedback/announcement.ts";
import { createCandidate } from "./analysis.ts";
import { colorFromCss } from "./color.ts";
import { createSemanticSnapshot, diffSemanticSnapshots } from "./semantic.ts";
import type { DocumentTree } from "./types.ts";

function createFixture(): DocumentTree {
  const white = colorFromCss("color-1", "#fff");
  const background = colorFromCss("color-2", "oklch(0.58 0.2 25)", true);

  if (!white || !background) {
    throw new Error("Fixture parsing failed");
  }

  return {
    order: ["color-1", "color-2"],
    byId: { "color-1": white, "color-2": background },
    nextId: 3,
  };
}

describe("semantic color analysis", () => {
  it("describes a lightness change and updates contrast analysis", () => {
    const document = createFixture();
    const background = document.byId["color-2"];
    const before = createCandidate(document);
    const after = createCandidate({
      ...document,
      byId: {
        ...document.byId,
        "color-2": { ...background, lch: { ...background.lch, L: 0.68 } },
      },
    });
    const beforeSnapshot = createSemanticSnapshot(before);
    const afterSnapshot = createSemanticSnapshot(after);
    const changes = diffSemanticSnapshots(beforeSnapshot, afterSnapshot);
    const plan = buildAnnouncementPlan(after, changes, afterSnapshot, {
      colorId: "color-2",
      field: "l",
    });

    expect(changes.rows["color-2"].fields.l).toEqual({ before: 0.58, after: 0.68 });
    expect(Object.keys(after.analysis.contrast)).toContain("color-1-color-2");
    expect(plan.spoken).toMatch(/Lightness 0.68/);
  });

  it("announces an APCA threshold transition", () => {
    const document = createFixture();
    const thresholdBackground = colorFromCss("color-2", "oklch(0.85 0.2 25)", true);

    if (!thresholdBackground) {
      throw new Error("Threshold fixture parsing failed");
    }

    const before = createCandidate({
      ...document,
      byId: { ...document.byId, "color-2": thresholdBackground },
    });
    const after = createCandidate({
      ...document,
      byId: {
        ...document.byId,
        "color-2": {
          ...thresholdBackground,
          lch: { ...thresholdBackground.lch, L: 0.9 },
        },
      },
    });
    const beforeSnapshot = createSemanticSnapshot(before);
    const afterSnapshot = createSemanticSnapshot(after);
    const changes = diffSemanticSnapshots(beforeSnapshot, afterSnapshot);
    const plan = buildAnnouncementPlan(after, changes, afterSnapshot, {
      colorId: "color-2",
      field: "l",
    });

    expect(plan.spoken).toMatch(/APCA: row 1 no longer supports the configured text\./);
  });
});
