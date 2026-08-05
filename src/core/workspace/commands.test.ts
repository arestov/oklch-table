import { afterEach, describe, expect, it } from "vitest";
import { resetCoreForTest } from "../testing/reset-core.ts";
import { createSequenceIds } from "../testing/sequence-ids.ts";
import {
  addColorFromDraft,
  beginEdit,
  deleteColor,
  duplicateColor,
  finishEdit,
  setNewColorDraft,
  updateDraft,
} from "./commands.ts";
import {
  acceptedRevisionStore,
  activeEditStore,
  candidateStore,
  lastTransactionStore,
  newColorDraftStore,
} from "./stores.ts";

afterEach(resetCoreForTest);

describe("workspace commands", () => {
  it("adds a valid CSS draft with a generated stable ID and resets the next draft", () => {
    const ids = createSequenceIds();
    setNewColorDraft("oklch(0.6 0.15 260)");
    const result = addColorFromDraft(ids);
    expect(result).toMatchObject({
      status: "accepted",
      effects: [{ type: "focus-new-color" }],
    });
    expect(acceptedRevisionStore.get().document.colors.order).toEqual(["color_test_1"]);
    expect(newColorDraftStore.get()).toBe("");
  });

  it("rejects an invalid new-color draft without allocating an ID or transaction", () => {
    const ids = createSequenceIds();
    const before = acceptedRevisionStore.get();
    const transaction = lastTransactionStore.get();
    setNewColorDraft("invalid");
    expect(addColorFromDraft(ids)).toMatchObject({ status: "invalid" });
    expect(acceptedRevisionStore.get()).toBe(before);
    expect(lastTransactionStore.get()).toBe(transaction);
    expect(ids.color()).toBe("color_test_1");
  });

  it("accepts one edit once, then leaves the already accepted edit unchanged", () => {
    const ids = createSequenceIds();
    setNewColorDraft("#ffffff");
    const added = addColorFromDraft(ids);
    if (added.status !== "accepted") throw new Error("Expected color to be added");
    const colorId = acceptedRevisionStore.get().document.colors.order[0];

    beginEdit(colorId, "l");
    updateDraft("80");
    const accepted = finishEdit("idle", ids);
    expect(accepted.status).toBe("accepted");
    expect(finishEdit("enter", ids)).toEqual({ status: "unchanged" });
    expect(lastTransactionStore.get()).toBe(
      accepted.status === "accepted" ? accepted.transaction : null,
    );
  });

  it.each(["idle", "enter", "blur", "navigation"] as const)(
    "accepts the %s boundary as exactly one transaction",
    (reason) => {
      const ids = createSequenceIds();
      setNewColorDraft("#ffffff");
      const added = addColorFromDraft(ids);
      if (added.status !== "accepted") throw new Error("Expected color to be added");
      const colorId = acceptedRevisionStore.get().document.colors.order[0];
      beginEdit(colorId, "l");
      updateDraft("80");
      const result = finishEdit(reason, ids);
      expect(result).toMatchObject({ status: "accepted" });
      expect(finishEdit(reason, ids)).toEqual({ status: "unchanged" });
    },
  );

  it("keeps the last valid preview when a draft becomes invalid", () => {
    const ids = createSequenceIds();
    setNewColorDraft("#ffffff");
    const added = addColorFromDraft(ids);
    if (added.status !== "accepted") throw new Error("Expected color to be added");
    const colorId = acceptedRevisionStore.get().document.colors.order[0];

    beginEdit(colorId, "l");
    updateDraft("60");
    updateDraft("0.");
    const candidate = candidateStore.get();
    expect(candidate.status).toBe("invalid");
    if (candidate.status === "invalid")
      expect(candidate.lastValid.document.colors.byId[colorId].value.l).toBe(0.6);
    expect(finishEdit("blur", ids)).toMatchObject({ status: "invalid" });
    expect(acceptedRevisionStore.get().document.colors.byId[colorId].value.l).toBeCloseTo(1);
  });

  it("preserves stable identity and background role through duplicate and delete", () => {
    const ids = createSequenceIds();
    setNewColorDraft("#ffffff");
    const added = addColorFromDraft(ids);
    if (added.status !== "accepted") throw new Error("Expected color to be added");
    const sourceId = acceptedRevisionStore.get().document.colors.order[0];
    const source = acceptedRevisionStore.get().document.colors.byId[sourceId];
    const duplicated = duplicateColor(sourceId, ids);
    if (duplicated.status !== "accepted" || duplicated.transaction.cause.type !== "duplicate-color")
      throw new Error("Expected duplicate");
    const duplicateId = duplicated.transaction.cause.createdId;

    expect(acceptedRevisionStore.get().document.colors.byId[duplicateId].provenance).toEqual({
      duplicatedFrom: sourceId,
    });
    expect(deleteColor(sourceId, ids).status).toBe("accepted");
    expect(acceptedRevisionStore.get().document.colors.order).toEqual([duplicateId]);
    expect(activeEditStore.get()).toBeNull();
    expect(source.id).toBe(sourceId);
  });

  it("includes a valid pending edit when an action accepts a transaction", () => {
    const ids = createSequenceIds();
    setNewColorDraft("#ffffff");
    const added = addColorFromDraft(ids);
    if (added.status !== "accepted") throw new Error("Expected color to be added");
    const sourceId = acceptedRevisionStore.get().document.colors.order[0];

    beginEdit(sourceId, "l");
    updateDraft("80");
    const duplicated = duplicateColor(sourceId, ids);
    if (duplicated.status !== "accepted" || duplicated.transaction.cause.type !== "duplicate-color")
      throw new Error("Expected duplicate");

    expect(duplicated.transaction.after.document.colors.byId[sourceId].value.l).toBe(0.8);
    expect(
      duplicated.transaction.after.document.colors.byId[duplicated.transaction.cause.createdId]
        .value.l,
    ).toBe(0.8);
  });

  it("publishes the accepted revision and its transaction without an intermediate pair", () => {
    const pairs: Array<{ colors: number; transaction: string | null }> = [];
    const capture = () =>
      pairs.push({
        colors: acceptedRevisionStore.get().document.colors.order.length,
        transaction: lastTransactionStore.get()?.id ?? null,
      });
    const stopRevision = acceptedRevisionStore.listen(capture);
    const stopTransaction = lastTransactionStore.listen(capture);
    pairs.length = 0;
    setNewColorDraft("#fff");
    addColorFromDraft(createSequenceIds());
    stopRevision();
    stopTransaction();
    expect(pairs).toEqual([{ colors: 1, transaction: "tx_test_1" }]);
  });

  it("does not invalidate the candidate when only the new-color draft changes", () => {
    const candidate = candidateStore.get();

    setNewColorDraft("#ffffff");

    expect(candidateStore.get()).toBe(candidate);
  });
});
