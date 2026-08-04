import { describe, expect, it } from "vitest";
import { createSequenceIds } from "../testing/sequence-ids.ts";
import { createEmptyDocument } from "./model.ts";
import { createActionTransaction, createEditTransaction } from "./transactions.ts";

describe("workspace transactions", () => {
  it("does not allocate an ID for an unchanged semantic diff", () => {
    const ids = createSequenceIds();
    const revision = { document: createEmptyDocument(), analysis: null, semantic: null };
    const result = createActionTransaction({
      ids,
      cause: { type: "add-color", createdId: ids.color() },
      before: revision,
      after: revision,
      changes: [],
      isEmpty: (changes) => changes.length === 0,
    });
    expect(result).toEqual({ status: "unchanged" });
    expect(ids.transaction()).toBe("tx_test_1");
  });

  it("builds edit transactions without stores or focus side effects", () => {
    const ids = createSequenceIds();
    const revision = { document: createEmptyDocument(), analysis: null, semantic: null };
    const result = createEditTransaction({
      ids,
      cause: {
        type: "edit-field",
        edit: { colorId: "color_test_1", field: "l", raw: "0.6", lastValidPatch: null },
        reason: "enter",
      },
      before: revision,
      after: revision,
      changes: ["changed"],
      isEmpty: (changes) => changes.length === 0,
    });
    expect(result).toMatchObject({ status: "accepted", effects: [] });
  });

  it("derives duplicate and delete focus effects from stable IDs and new row order", () => {
    const ids = createSequenceIds();
    const first = "color_test_1" as const;
    const second = "color_test_2" as const;
    const revision = {
      document: {
        colors: {
          order: [first, second],
          byId: {} as never,
        },
      },
      analysis: null,
      semantic: null,
    };
    const duplicate = createActionTransaction({
      ids,
      cause: { type: "duplicate-color", sourceId: first, createdId: second },
      before: revision,
      after: revision,
      changes: ["changed"],
      isEmpty: (changes) => changes.length === 0,
    });
    expect(duplicate).toMatchObject({
      status: "accepted",
      effects: [{ type: "focus-field", colorId: second, field: "l" }],
    });

    const deleted = createActionTransaction({
      ids,
      cause: { type: "delete-color", deletedId: first },
      before: revision,
      after: { ...revision, document: { colors: { order: [second], byId: {} as never } } },
      changes: ["changed"],
      isEmpty: (changes) => changes.length === 0,
    });
    expect(deleted).toMatchObject({
      status: "accepted",
      effects: [{ type: "focus-action", colorId: second }],
    });
  });
});
