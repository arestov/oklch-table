import { describe, expect, it } from "vitest";
import { createSequenceIds } from "../testing/sequence-ids.ts";
import { createEmptyDocument } from "../workspace/model.ts";
import { createActionTransaction } from "../workspace/transactions.ts";
import { buildAnnouncementPlan } from "./announcement-plan.ts";
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
      readableTextSupported: false,
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
      "Lightness 68 percent. Checks updated. APCA: Text row 1 is no longer readable on background row 2. WCAG: 1 issue added; 0 remain. Color vision: conflict with row 1 and row 2 detected.",
    );
  });

  it("orders lost support before restored support and omits unchanged sections", () => {
    const comparison = (row: number) => ({
      key: `color_test_${row}|color_test_9`,
      leftId: `color_test_${row}`,
      rightId: "color_test_9",
      leftRow: row,
      rightRow: 9,
      apca: 60,
      recommendationKey: 2,
      regular: 24,
      bold: 16,
      readableTextSupported: false,
      wcagKey: 2,
    });
    const transaction = {
      cause: {
        type: "edit-field",
        edit: { colorId: "color_test_1", field: "l", raw: "0.5", lastValidPatch: null },
        reason: "enter",
      },
      before: { document: createEmptyDocument() },
      after: {
        document: { colors: { order: ["color_test_1"], byId: {} } },
        semantic: {
          rows: { color_test_1: { l: 0.5 } },
          comparisons: { contrast: {}, colorVision: {} },
        },
      },
      changes: {
        rows: {},
        comparisons: {
          contrast: {
            b: { after: comparison(2), support: { before: false, after: true } },
            a: { after: comparison(1), support: { before: true, after: false } },
          },
          colorVision: {},
        },
      },
    } as never;
    const plan = buildAnnouncementPlan(transaction);
    expect(plan.apca.map((item) => `${item.direction}:${item.textRows[0]}`)).toEqual([
      "lost:1",
      "restored:2",
    ]);
    const rendered = buildEnglishAnnouncement(transaction);
    expect(rendered.spoken).toBe(
      "Lightness 50 percent. Checks updated. APCA: Text row 1 is no longer readable on background row 9. APCA: Text row 2 is now readable on background row 9.",
    );
    expect(rendered.visible).toMatchObject({ wcag: "", cvd: "" });
  });
});
