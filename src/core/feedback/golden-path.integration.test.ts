import { afterEach, describe, expect, it } from "vitest";
import type { ColorId } from "../identity/ids.ts";
import { resetCoreForTest } from "../testing/reset-core.ts";
import { createSequenceIds } from "../testing/sequence-ids.ts";
import {
  addColorFromDraft,
  duplicateColor,
  finishEdit,
  setContrastBackground,
  setNewColorDraft,
  updateColorDraft,
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

function addColor(ids: ReturnType<typeof createSequenceIds>, raw: string): void {
  setNewColorDraft(raw);
  expect(addColorFromDraft(ids)).toMatchObject({ status: "accepted" });
}

function prepareGoldenPath(ids: ReturnType<typeof createSequenceIds>): ColorId {
  addColor(ids, "oklch(0.5 0.15 260)");
  addColor(ids, "oklch(0.6 0.15 260)");
  addColor(ids, "#ffffff");
  addColor(ids, "oklch(0.5 0.2 25)");
  const backgroundId = acceptedRevisionStore.get().document.colors.order[3];
  expect(setContrastBackground(backgroundId, true, ids)).toMatchObject({ status: "accepted" });
  expect(duplicateColor(backgroundId, ids)).toMatchObject({ status: "accepted" });
  return acceptedRevisionStore.get().document.colors.order[4];
}

function commitLightness(
  ids: ReturnType<typeof createSequenceIds>,
  colorId: ColorId,
  value: string,
): void {
  updateColorDraft(colorId, "l", value);
  expect(finishEdit("enter", ids)).toMatchObject({ status: "accepted" });
}

function expectSpokenSections(): void {
  const visible = visibleFeedbackStore.get();
  expect(announcementStore.get().result.text).toBe(
    [visible.edited, visible.apca, visible.wcag, visible.cvd].filter(Boolean).join(" "),
  );
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

    updateColorDraft(colorId, "l", "60");

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

  it("publishes APCA loss and restoration from production semantic analysis", () => {
    const ids = createSequenceIds();
    const derivedId = prepareGoldenPath(ids);
    commitLightness(ids, derivedId, "60");

    const beforeLoss = announcementStore.get().result.id;
    commitLightness(ids, derivedId, "90");
    expect(announcementStore.get().result.id).toBe(beforeLoss + 1);
    expect(visibleFeedbackStore.get()).toMatchObject({
      edited: "L 90. Checks updated.",
      apca: "APCA: row 3 is no longer readable on background row 5.",
    });
    expect(visibleFeedbackStore.get().wcag).toContain("WCAG:");
    expectSpokenSections();

    const beforeRestored = announcementStore.get().result.id;
    commitLightness(ids, derivedId, "60");
    expect(announcementStore.get().result.id).toBe(beforeRestored + 1);
    expect(visibleFeedbackStore.get()).toMatchObject({
      edited: "L 60. Checks updated.",
      apca: "APCA: row 3 is now readable on background row 5.",
    });
    expectSpokenSections();
  });

  it("suppresses metric feedback when a numeric edit stays in the same category", () => {
    const ids = createSequenceIds();
    const derivedId = prepareGoldenPath(ids);
    commitLightness(ids, derivedId, "60");
    const before = announcementStore.get().result.id;

    commitLightness(ids, derivedId, "59.9");

    expect(announcementStore.get().result).toEqual({
      id: before + 1,
      text: "L 59.9. Checks updated.",
    });
    expect(visibleFeedbackStore.get()).toEqual({
      edited: "L 59.9. Checks updated.",
      apca: "",
      wcag: "",
      cvd: "",
    });
  });

  it("keeps color-vision changes separate from contrast feedback", () => {
    const ids = createSequenceIds();
    addColor(ids, "#ffffff");
    addColor(ids, "#000000");
    const colorId = acceptedRevisionStore.get().document.colors.order[1];

    updateColorDraft(colorId, "css", "#fefefe");
    expect(finishEdit("enter", ids)).toMatchObject({ status: "accepted" });
    expect(visibleFeedbackStore.get()).toMatchObject({
      edited: "CSS color #fefefe. Checks updated.",
      apca: "",
      wcag: "",
      cvd: "Color vision: conflict between row 1 and row 2 detected; 1 remain.",
    });
    expectSpokenSections();

    updateColorDraft(colorId, "css", "#000000");
    expect(finishEdit("enter", ids)).toMatchObject({ status: "accepted" });
    expect(visibleFeedbackStore.get()).toMatchObject({
      apca: "",
      wcag: "",
      cvd: "Color vision: conflict between row 1 and row 2 resolved; 0 remain.",
    });
    expectSpokenSections();
  });
});
