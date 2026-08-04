import { atom } from "nanostores";
import { lastTransactionStore } from "../workspace/stores.ts";
import { buildEnglishAnnouncement } from "./english-announcement.ts";

export interface AnnouncementState {
  shortcut: { id: number; text: string };
  result: { id: number; text: string };
  alert: { id: number; text: string };
}
export const announcementStore = atom<AnnouncementState>({
  shortcut: { id: 0, text: "" },
  result: { id: 0, text: "" },
  alert: { id: 0, text: "" },
});
export const visibleFeedbackStore = atom({
  edited: "No committed changes yet.",
  apca: "",
  wcag: "",
  cvd: "",
});
export function announceResult(text: string): void {
  const current = announcementStore.get();
  announcementStore.set({ ...current, result: { id: current.result.id + 1, text } });
  visibleFeedbackStore.set({ edited: text, apca: "", wcag: "", cvd: "" });
}
export function announceAlert(text: string): void {
  const current = announcementStore.get();
  announcementStore.set({ ...current, alert: { id: current.alert.id + 1, text } });
}
export function announceShortcut(text: string): void {
  const current = announcementStore.get();
  announcementStore.set({ ...current, shortcut: { id: current.shortcut.id + 1, text } });
}

lastTransactionStore.listen((transaction) => {
  if (!transaction) return;
  const plan = buildEnglishAnnouncement(transaction);
  const current = announcementStore.get();
  announcementStore.set({ ...current, result: { id: current.result.id + 1, text: plan.spoken } });
  visibleFeedbackStore.set(plan.visible);
});
