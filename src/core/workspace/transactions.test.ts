import { describe, expect, it } from "vitest";
import { createSequenceIds } from "../testing/sequence-ids.ts";
import { createEmptyDocument } from "./model.ts";
import { createTransaction } from "./transactions.ts";

describe("workspace transactions", () => {
  it("does not allocate an ID for an unchanged semantic diff", () => {
    const ids = createSequenceIds();
    const revision = { document: createEmptyDocument(), analysis: null, semantic: null };
    const result = createTransaction({
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
});
