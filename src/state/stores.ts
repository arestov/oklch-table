import { atom, computed } from "nanostores";
import { createCandidate, createEmptyDocument } from "../domain/analysis";
import { createSemanticSnapshot } from "../domain/semantic";
import type {
  ActiveEdit,
  AnnouncementState,
  CandidateRevision,
  CommitTransaction,
  DocumentTree,
  FieldDraft,
  NavigationState,
  VisibleFeedback,
} from "../domain/types";
import { emptyAnnouncements } from "../feedback/announcement";

const initialDocument = createEmptyDocument();
const initialCandidate = createCandidate(initialDocument);

export const documentStore = atom<DocumentTree>(initialDocument);
export const fieldDraftsStore = atom<Record<string, FieldDraft>>({});
export const newColorDraftStore = atom<FieldDraft>({ raw: "", valid: true });
export const activeEditStore = atom<ActiveEdit | null>(null);
export const navigationStore = atom<NavigationState>({ currentRowId: null, jumpActive: false });
export const candidateStore = computed(documentStore, (document) => createCandidate(document));
export const committedRevisionStore = atom<CandidateRevision>(initialCandidate);
export const lastTransactionStore = atom<CommitTransaction | null>(null);
export const announcementStore = atom<AnnouncementState>(emptyAnnouncements());
export const visibleFeedbackStore = atom<VisibleFeedback>({
  edited: "No committed changes yet.",
  apca: "",
  cvd: "",
});
export const initialSemanticSnapshot = createSemanticSnapshot(initialCandidate);

export function fieldDraftKey(colorId: string, field: string): string {
  return `${colorId}:${field}`;
}
