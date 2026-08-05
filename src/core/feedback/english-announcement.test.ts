import { describe, expect, it } from "vitest";
import { colorVisionKey, contrastKey } from "../../domain/analysis.ts";
import type {
  AnalysisTree,
  ColorId,
  CvdMode,
  DocumentTree,
  SemanticChanges,
  SemanticContrast,
  SemanticCvd,
  SemanticSnapshot,
} from "../../domain/types.ts";
import { createSequenceIds } from "../testing/sequence-ids.ts";
import { createEmptyDocument } from "../workspace/model.ts";
import { createActionTransaction, type WorkspaceTransaction } from "../workspace/transactions.ts";
import { buildAnnouncementPlan } from "./announcement-plan.ts";
import { buildEnglishAnnouncement } from "./english-announcement.ts";

const colorId = (row: number): ColorId => `color_test_${row}`;

const emptyAnalysis = (): AnalysisTree => ({
  colors: {},
  comparisons: { contrast: {}, colorVision: {} },
});

const emptySemantic = (): SemanticSnapshot => ({
  rows: {},
  comparisons: { contrast: {}, colorVision: {} },
});

const documentWithColor = (id: ColorId): DocumentTree => ({
  colors: {
    order: [id],
    byId: {
      [id]: {
        id,
        value: { l: 0.5, c: 0, h: 0, alpha: 1 },
        serialization: { format: "oklch", lightnessUnit: "number" },
        roles: { contrastBackground: false },
      },
    },
  },
});

const semanticRow = (row: number, l: number) => ({
  id: colorId(row),
  row,
  css: `oklch(${l} 0 0)`,
  l,
  c: 0,
  h: 0,
  background: false,
});

const contrast = (row: number, backgroundRow = 9, wcagKey = 2): SemanticContrast => {
  const leftId = colorId(row);
  const rightId = colorId(backgroundRow);
  return {
    key: contrastKey(leftId, rightId),
    leftId,
    rightId,
    leftRow: row,
    rightRow: backgroundRow,
    apca: 60,
    recommendationKey: 2,
    regular: 24,
    bold: 16,
    readableTextSupported: false,
    wcagKey,
  };
};

const colorVision = (
  leftRow: number,
  rightRow: number,
  warnings: readonly CvdMode[] = [],
): SemanticCvd => {
  const leftId = colorId(leftRow);
  const rightId = colorId(rightRow);
  return {
    key: colorVisionKey(leftId, rightId),
    leftId,
    rightId,
    leftRow,
    rightRow,
    warnings: [...warnings],
  };
};

type AnnouncementTransaction = WorkspaceTransaction<
  AnalysisTree,
  SemanticSnapshot,
  SemanticChanges
>;

const editTransaction = (
  changes: SemanticChanges,
  options: { afterComparisons?: SemanticSnapshot["comparisons"]; lightness?: number } = {},
): AnnouncementTransaction => {
  const lightness = options.lightness ?? 0.5;
  const afterComparisons = options.afterComparisons ?? emptySemantic().comparisons;
  return {
    id: "tx_test_1",
    cause: {
      type: "edit-field",
      edit: { colorId: "color_test_1", field: "l", raw: String(lightness), lastValidPatch: null },
      reason: "enter",
    },
    before: {
      document: createEmptyDocument(),
      analysis: emptyAnalysis(),
      semantic: emptySemantic(),
    },
    after: {
      document: createEmptyDocument(),
      analysis: emptyAnalysis(),
      semantic: {
        rows: { color_test_1: semanticRow(1, lightness) },
        comparisons: afterComparisons,
      },
    },
    changes,
  };
};

describe("English announcements", () => {
  it("renders an action only from its transaction", () => {
    const document = createEmptyDocument();
    const result = createActionTransaction({
      ids: createSequenceIds(),
      cause: { type: "add-color", createdId: "color_test_1" },
      before: {
        document,
        analysis: emptyAnalysis(),
        semantic: { rows: {}, comparisons: { contrast: {}, colorVision: {} } },
      },
      after: {
        document: documentWithColor("color_test_1"),
        analysis: emptyAnalysis(),
        semantic: { rows: {}, comparisons: { contrast: {}, colorVision: {} } },
      },
      changes: { rows: {}, comparisons: { contrast: {}, colorVision: {} } },
      isEmpty: () => false,
    });
    if (result.status !== "accepted") throw new Error("Expected transaction");
    expect(buildEnglishAnnouncement(result.transaction).spoken).toBe("Color added as row 1.");
  });

  it("renders edit, APCA, WCAG, and color-vision sections in deterministic order", () => {
    const comparison = { ...contrast(1, 2), recommendationKey: 60, regular: 60, bold: 45 };
    const cvd = colorVision(1, 2, ["protanopia"]);
    const rendered = buildEnglishAnnouncement(
      editTransaction(
        {
          rows: {},
          comparisons: {
            contrast: {
              [comparison.key]: {
                key: comparison.key,
                after: comparison,
                support: { before: true, after: false },
                wcagKey: { before: 1, after: 0 },
              },
            },
            colorVision: {
              [cvd.key]: {
                key: cvd.key,
                after: cvd,
                warningsAdded: ["protanopia"],
                warningsResolved: [],
              },
            },
          },
        },
        { lightness: 0.68 },
      ),
    );
    expect(rendered.spoken).toBe(
      "L 68. Checks updated. APCA: row 1 is no longer readable on background row 2. WCAG: 1 failure added; 0 remain. Color vision: conflict between row 1 and row 2 detected; 0 remain.",
    );
  });

  it("orders lost support before restored support and omits unchanged sections", () => {
    const lost = contrast(1);
    const restored = contrast(2);
    const transaction = editTransaction({
      rows: {},
      comparisons: {
        contrast: {
          [restored.key]: {
            key: restored.key,
            after: restored,
            support: { before: false, after: true },
          },
          [lost.key]: { key: lost.key, after: lost, support: { before: true, after: false } },
        },
        colorVision: {},
      },
    });
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
    const largerOne = contrast(1);
    const largerThree = contrast(3);
    const largerFour = contrast(4);
    const lostSix = contrast(6);
    const lostSeven = contrast(7);
    const lostEight = contrast(8);
    const lostNine = contrast(9);
    const lostTen = contrast(10);
    const transaction = editTransaction(
      {
        rows: {},
        comparisons: {
          contrast: {
            [largerOne.key]: {
              key: largerOne.key,
              after: largerOne,
              recommendationKey: { before: 2, after: 1 },
            },
            [largerThree.key]: {
              key: largerThree.key,
              after: largerThree,
              recommendationKey: { before: 2, after: 1 },
            },
            [largerFour.key]: {
              key: largerFour.key,
              after: largerFour,
              recommendationKey: { before: 2, after: 1 },
            },
            [lostSix.key]: {
              key: lostSix.key,
              after: lostSix,
              support: { before: true, after: false },
            },
            [lostSeven.key]: {
              key: lostSeven.key,
              after: lostSeven,
              support: { before: true, after: false },
            },
            [lostEight.key]: {
              key: lostEight.key,
              after: lostEight,
              support: { before: true, after: false },
            },
            [lostNine.key]: {
              key: lostNine.key,
              after: lostNine,
              support: { before: true, after: false },
            },
            [lostTen.key]: {
              key: lostTen.key,
              after: lostTen,
              support: { before: true, after: false },
            },
          },
          colorVision: {},
        },
      },
      { afterComparisons: { contrast: {}, colorVision: {} } },
    );

    expect(buildEnglishAnnouncement(transaction).visible.apca).toBe(
      "APCA: 5 rows are no longer readable on background row 9. APCA: rows 1, 3, 4 now require larger text on background row 9.",
    );
  });

  it("renders WCAG tier changes and aggregates sorted CVD pairs with the remaining count", () => {
    const largeOne = contrast(1, 9, 1);
    const largeTwo = contrast(2, 9, 1);
    const normal = contrast(3, 9, 2);
    const failed = contrast(8, 9, 0);
    const later = colorVision(4, 5, ["protanopia"]);
    const first = colorVision(1, 2, ["deuteranopia"]);
    const transaction = editTransaction(
      {
        rows: {},
        comparisons: {
          contrast: {
            [largeOne.key]: {
              key: largeOne.key,
              after: largeOne,
              wcagKey: { before: 2, after: 1 },
            },
            [largeTwo.key]: {
              key: largeTwo.key,
              after: largeTwo,
              wcagKey: { before: 2, after: 1 },
            },
            [normal.key]: { key: normal.key, after: normal, wcagKey: { before: 1, after: 2 } },
          },
          colorVision: {
            [later.key]: {
              key: later.key,
              after: later,
              warningsAdded: ["protanopia"],
              warningsResolved: [],
            },
            [first.key]: {
              key: first.key,
              after: first,
              warningsAdded: ["deuteranopia"],
              warningsResolved: [],
            },
          },
        },
      },
      {
        afterComparisons: {
          contrast: {
            [failed.key]: failed,
            [largeOne.key]: largeOne,
            [largeTwo.key]: largeTwo,
            [normal.key]: normal,
          },
          colorVision: {
            [later.key]: later,
            [first.key]: first,
          },
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
