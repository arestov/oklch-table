import { describe, expect, it } from "vitest";
import { createSequenceIds } from "../testing/sequence-ids.ts";
import { createEmptyDocument } from "../workspace/model.ts";
import { createActionTransaction } from "../workspace/transactions.ts";
import { buildEnglishAnnouncement } from "./english-announcement.ts";

describe("English announcements", () => {
  it("renders an action only from its transaction", () => {
    const document = createEmptyDocument();
    const result = createActionTransaction({
      ids: createSequenceIds(),
      cause: { type: "add-color", createdId: "color_test_1" },
      before: {
        document,
        analysis: {} as never,
        semantic: { rows: {}, comparisons: { contrast: {}, colorVision: {} } },
      },
      after: {
        document: { colors: { order: ["color_test_1"], byId: {} } },
        analysis: {} as never,
        semantic: { rows: {}, comparisons: { contrast: {}, colorVision: {} } },
      },
      changes: { rows: {}, comparisons: { contrast: {}, colorVision: {} } },
      isEmpty: () => false,
    });
    if (result.status !== "accepted") throw new Error("Expected transaction");
    expect(buildEnglishAnnouncement(result.transaction).spoken).toBe("Color added as row 1.");
  });

  it("renders edit, APCA, WCAG, and color-vision sections in deterministic order", () => {
    const contrast = {
      key: "color_test_1|color_test_2",
      leftId: "color_test_1",
      rightId: "color_test_2",
      leftRow: 1,
      rightRow: 2,
      apca: 60,
      recommendationKey: 60,
      regular: 60,
      bold: 45,
      configuredTextSupported: false,
      wcagKey: 2,
    };
    const cvd = {
      key: "color_test_1|color_test_2",
      leftId: "color_test_1",
      rightId: "color_test_2",
      leftRow: 1,
      rightRow: 2,
      warnings: ["protanopia"],
    };
    const rendered = buildEnglishAnnouncement({
      cause: {
        type: "edit-field",
        edit: { colorId: "color_test_1", field: "l", raw: "0.68", lastValidPatch: null },
        reason: "enter",
      },
      before: { document: createEmptyDocument(), analysis: {} as never, semantic: {} as never },
      after: {
        document: { colors: { order: ["color_test_1"], byId: {} as never } },
        analysis: {} as never,
        semantic: { rows: { color_test_1: { l: 0.68 } } } as never,
      },
      changes: {
        rows: {},
        comparisons: {
          contrast: {
            "color_test_1|color_test_2": {
              key: "color_test_1|color_test_2",
              after: contrast,
              support: { before: true, after: false },
              wcagKey: { before: 3, after: 2 },
            },
          },
          colorVision: {
            "color_test_1|color_test_2": {
              key: "color_test_1|color_test_2",
              after: cvd,
              warningsAdded: ["protanopia"],
              warningsResolved: [],
            },
          },
        },
      },
    } as never);
    expect(rendered.spoken).toBe(
      "Lightness 0.68. Checks updated. APCA: Row 1 no longer supports the configured text on row 2. WCAG: Row 1 and row 2 changed from level 3 to 2. Color vision: New warning (protanopia) between rows 1 and 2.",
    );
  });
});
