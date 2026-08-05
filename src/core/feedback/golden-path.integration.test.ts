import { afterEach, describe, expect, it } from "vitest";
import { resetCoreForTest } from "../testing/reset-core.ts";
import { createSequenceIds } from "../testing/sequence-ids.ts";
import {
  addColorFromDraft,
  duplicateColor,
  setContrastBackground,
  setNewColorDraft,
} from "../workspace/commands.ts";
import { acceptedRevisionStore } from "../workspace/stores.ts";
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
});
