import { afterEach, describe, expect, it } from "vitest";
import { resetCoreForTest } from "../testing/reset-core.ts";
import { createSequenceIds } from "../testing/sequence-ids.ts";
import {
  addColorFromDraft,
  beginEdit,
  duplicateColor,
  finishEdit,
  setContrastBackground,
  setNewColorDraft,
  updateDraft,
} from "../workspace/commands.ts";
import { acceptedRevisionStore, candidateStore } from "../workspace/stores.ts";
import { announcementStore, visibleFeedbackStore } from "./stores.ts";

afterEach(resetCoreForTest);

function expectOnePublication(action: () => unknown, spoken: string): void {
  const before = announcementStore.get().result.id;
  action();
  expect(announcementStore.get().result).toEqual({ id: before + 1, text: spoken });
  expect(visibleFeedbackStore.get()).toEqual({ edited: spoken, apca: "", wcag: "", cvd: "" });
}

describe("golden-path feedback stores", () => {
  it("publishes topology announcements from public workspace commands", () => {
    const ids = createSequenceIds();

    setNewColorDraft("#ffffff");
    expectOnePublication(() => addColorFromDraft(ids), "Color added as row 1.");
    setNewColorDraft("#000000");
    expectOnePublication(() => addColorFromDraft(ids), "Color added as row 2.");

    const [firstId, backgroundId] = acceptedRevisionStore.get().document.colors.order;
    expectOnePublication(
      () => setContrastBackground(backgroundId, true, ids),
      "Row 2 selected as a contrast background.",
    );
    expectOnePublication(
      () => duplicateColor(backgroundId, ids),
      "Row 2 duplicated as row 3. It inherits the contrast-background role.",
    );

    const document = acceptedRevisionStore.get().document;
    const duplicateId = document.colors.order[2];
    expect(document.colors.order).toEqual([firstId, backgroundId, duplicateId]);
    expect(document.colors.byId[backgroundId].roles.contrastBackground).toBe(true);
    expect(document.colors.byId[duplicateId]).toMatchObject({
      roles: { contrastBackground: true },
      provenance: { duplicatedFrom: backgroundId },
    });
  });

  it("keeps numeric preview silent until one explicit commit boundary", () => {
    const ids = createSequenceIds();
    setNewColorDraft("#ffffff");
    addColorFromDraft(ids);
    const colorId = acceptedRevisionStore.get().document.colors.order[0];
    const before = announcementStore.get().result;

    beginEdit(colorId, "l");
    updateDraft("60");

    const preview = candidateStore.get();
    expect(preview.status).toBe("valid");
    if (preview.status === "valid") {
      expect(preview.document.colors.byId[colorId].value.l).toBe(0.6);
    }
    expect(acceptedRevisionStore.get().document.colors.byId[colorId].value.l).toBeCloseTo(1);
    expect(announcementStore.get().result).toEqual(before);

    expect(finishEdit("enter", ids)).toMatchObject({ status: "accepted" });
    expect(acceptedRevisionStore.get().document.colors.byId[colorId].value.l).toBe(0.6);
    expect(announcementStore.get().result).toEqual({
      id: before.id + 1,
      text: "L 60. Checks updated.",
    });
    expect(visibleFeedbackStore.get()).toEqual({
      edited: "L 60. Checks updated.",
      apca: "",
      wcag: "",
      cvd: "",
    });
    expect(finishEdit("enter", ids)).toEqual({ status: "unchanged" });
    expect(announcementStore.get().result.id).toBe(before.id + 1);
  });
});
