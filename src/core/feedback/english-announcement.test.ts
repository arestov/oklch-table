import { describe, expect, it } from "vitest";
import { createSequenceIds } from "../testing/sequence-ids.ts";
import { createEmptyDocument } from "../workspace/model.ts";
import { createActionTransaction } from "../workspace/transactions.ts";
import { buildAnnouncementPlan } from "./announcement-plan.ts";
import { buildEnglishAnnouncement } from "./english-announcement.ts";

const contrast = (row: number, backgroundRow = 9, wcagKey = 2) => ({
  key: `color_test_${row}|color_test_${backgroundRow}`,
  leftId: `color_test_${row}`,
  rightId: `color_test_${backgroundRow}`,
  leftRow: row,
  rightRow: backgroundRow,
  apca: 60,
  recommendationKey: 2,
  regular: 24,
  bold: 16,
  readableTextSupported: false,
  wcagKey,
});

const colorVision = (leftRow: number, rightRow: number, warnings: readonly string[] = []) => ({
  key: `color_test_${leftRow}|color_test_${rightRow}`,
  leftId: `color_test_${leftRow}`,
  rightId: `color_test_${rightRow}`,
  leftRow,
  rightRow,
  warnings,
});

const editTransaction = (changes: object, afterComparisons: object = {}) =>
  ({
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
        comparisons: afterComparisons,
      },
    },
    changes,
  }) as never;

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
              wcagKey: { before: 1, after: 0 },
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
      "L 68. Checks updated. APCA: row 1 is no longer readable on background row 2. WCAG: 1 failure added; 0 remain. Color vision: conflict between row 1 and row 2 detected; 0 remain.",
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
      "L 50. Checks updated. APCA: row 1 is no longer readable on background row 9. APCA: row 2 is now readable on background row 9.",
    );
    expect(rendered.visible).toMatchObject({ wcag: "", cvd: "" });
  });

  it("bounds APCA row groups at four named rows and summarizes five or more", () => {
    const transaction = editTransaction(
      {
        rows: {},
        comparisons: {
          contrast: {
            one: { after: contrast(1), recommendationKey: { before: 2, after: 1 } },
            three: { after: contrast(3), recommendationKey: { before: 2, after: 1 } },
            four: { after: contrast(4), recommendationKey: { before: 2, after: 1 } },
            six: { after: contrast(6), support: { before: true, after: false } },
            seven: { after: contrast(7), support: { before: true, after: false } },
            eight: { after: contrast(8), support: { before: true, after: false } },
            nine: { after: contrast(9), support: { before: true, after: false } },
            ten: { after: contrast(10), support: { before: true, after: false } },
          },
          colorVision: {},
        },
      },
      { contrast: {}, colorVision: {} },
    );

    expect(buildEnglishAnnouncement(transaction).visible.apca).toBe(
      "APCA: 5 rows are no longer readable on background row 9. APCA: rows 1, 3, 4 now require larger text on background row 9.",
    );
  });

  it("renders WCAG tier changes and aggregates sorted CVD pairs with the remaining count", () => {
    const transaction = editTransaction(
      {
        rows: {},
        comparisons: {
          contrast: {
            largeOne: { after: contrast(1, 9, 1), wcagKey: { before: 2, after: 1 } },
            largeTwo: { after: contrast(2, 9, 1), wcagKey: { before: 2, after: 1 } },
            normal: { after: contrast(3, 9, 2), wcagKey: { before: 1, after: 2 } },
          },
          colorVision: {
            later: {
              after: colorVision(4, 5, ["protanopia"]),
              warningsAdded: ["protanopia"],
              warningsResolved: [],
            },
            first: {
              after: colorVision(1, 2, ["deuteranopia"]),
              warningsAdded: ["deuteranopia"],
              warningsResolved: [],
            },
          },
        },
      },
      {
        contrast: {
          failed: contrast(8, 9, 0),
          largeOne: contrast(1, 9, 1),
          largeTwo: contrast(2, 9, 1),
          normal: contrast(3, 9, 2),
        },
        colorVision: {
          later: colorVision(4, 5, ["protanopia"]),
          first: colorVision(1, 2, ["deuteranopia"]),
        },
      },
    );

    const rendered = buildEnglishAnnouncement(transaction);
    expect(rendered.visible.wcag).toBe(
      "WCAG: 2 comparisons now support large text only. WCAG: 1 comparison now supports normal text.",
    );
    expect(rendered.visible.cvd).toBe("Color vision: 2 possible conflicts detected; 2 remain.");
    expect(buildAnnouncementPlan(transaction).cvd[0]?.pairs).toEqual([
      [1, 2],
      [4, 5],
    ]);
  });
});
