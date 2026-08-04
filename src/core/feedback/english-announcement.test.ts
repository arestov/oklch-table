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
});
