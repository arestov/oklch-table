import { deriveAnalysis } from "../../domain/analysis.ts";
import { createSemanticSnapshot } from "../../domain/semantic.ts";
import { announcementStore, visibleFeedbackStore } from "../feedback/stores.ts";
import { createEmptyDocument } from "../workspace/model.ts";
import {
  acceptedRevisionStore,
  activeEditStore,
  lastTransactionStore,
  newColorDraftStore,
} from "../workspace/stores.ts";

/** Restores the module-level workspace to its empty in-memory session for node scenarios. */
export function resetCoreForTest(): void {
  const document = createEmptyDocument();
  const analysis = deriveAnalysis(document);
  acceptedRevisionStore.set({
    document,
    analysis,
    semantic: createSemanticSnapshot({ document, analysis }),
  });
  activeEditStore.set(null);
  newColorDraftStore.set("");
  lastTransactionStore.set(null);
  announcementStore.set({
    result: { id: 0, text: "" },
    alert: { id: 0, text: "" },
  });
  visibleFeedbackStore.set({ edited: "No committed changes yet.", apca: "", wcag: "", cvd: "" });
}
