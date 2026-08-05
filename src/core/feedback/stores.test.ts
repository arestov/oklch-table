import { afterEach, describe, expect, it } from "vitest";
import { resetCoreForTest } from "../testing/reset-core.ts";
import {
  announceAlert,
  announcementStore,
  announceResult,
  announceShortcut,
  visibleFeedbackStore,
} from "./stores.ts";

afterEach(resetCoreForTest);

describe("announcement stores", () => {
  it("keeps result and alert publications in independent channels", () => {
    announceResult("Saved.");
    const result = announcementStore.get().result;

    announceAlert("Invalid value.");

    expect(announcementStore.get()).toEqual({
      result,
      alert: { id: 1, text: "Invalid value." },
    });
    expect(visibleFeedbackStore.get()).toEqual({
      edited: "Saved.",
      apca: "",
      wcag: "",
      cvd: "",
    });
  });

  it("clears an alert when a result or shortcut is published", () => {
    announceAlert("Invalid value.");
    announceResult("Saved.");
    expect(announcementStore.get()).toEqual({
      result: { id: 1, text: "Saved." },
      alert: { id: 1, text: "" },
    });

    announceAlert("Still invalid.");
    announceShortcut("Column jump canceled.");
    expect(announcementStore.get()).toEqual({
      result: { id: 2, text: "Column jump canceled." },
      alert: { id: 2, text: "" },
    });
  });

  it("increments channel identity when identical text is republished", () => {
    announceAlert("Invalid value.");
    announceAlert("Invalid value.");
    expect(announcementStore.get().alert).toEqual({ id: 2, text: "Invalid value." });

    announceResult("Saved.");
    announceResult("Saved.");
    expect(announcementStore.get().result).toEqual({ id: 2, text: "Saved." });
  });
});
