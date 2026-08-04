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
  candidateStore,
  draftStore,
  lastTransactionStore,
} from "./stores.ts";

afterEach(resetCoreForTest);

describe("workspace commands", () => {
  it("accepts one edit once, then leaves the already accepted edit unchanged", () => {
    const ids = createSequenceIds();
    setNewColorDraft("#ffffff");
    const added = addColorFromDraft(ids);
    if (added.status !== "accepted") throw new Error("Expected color to be added");
    const colorId = acceptedRevisionStore.get().document.colors.order[0];

    beginEdit(colorId, "l");
    updateDraft("0.8");
    const accepted = finishEdit("idle", ids);
    expect(accepted.status).toBe("accepted");
    expect(finishEdit("enter", ids)).toEqual({ status: "unchanged" });
    expect(lastTransactionStore.get()).toBe(
      accepted.status === "accepted" ? accepted.transaction : null,
    );
  });

  it("keeps the last valid preview when a draft becomes invalid", () => {
    const ids = createSequenceIds();
    setNewColorDraft("#ffffff");
    const added = addColorFromDraft(ids);
    if (added.status !== "accepted") throw new Error("Expected color to be added");
    const colorId = acceptedRevisionStore.get().document.colors.order[0];

    beginEdit(colorId, "l");
    updateDraft("0.6");
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
    expect(draftStore.get().active).toBeNull();
    expect(source.id).toBe(sourceId);
  });
});
