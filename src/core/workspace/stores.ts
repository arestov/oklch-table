import { atom, computed } from "nanostores";
import { deriveAnalysis } from "../../domain/analysis.ts";
import { parseCssColor } from "../../domain/color.ts";
import { createSemanticSnapshot } from "../../domain/semantic.ts";
import type { AnalysisTree, SemanticChanges, SemanticSnapshot } from "../../domain/types.ts";
import { buildCandidateRevision } from "./candidate.ts";
import type { CandidateRevision, DraftEdit } from "./draft.ts";
import { createEmptyDocument, type DocumentTree } from "./model.ts";
import type { AcceptedRevision, WorkspaceTransaction } from "./transactions.ts";

const parseCss = (raw: string) => {
  const parsed = parseCssColor(raw);
  return parsed
    ? {
        value: parsed.value,
        serialization: { format: parsed.format, lightnessUnit: parsed.lightnessUnit },
      }
    : null;
};
const analyze = (document: DocumentTree): AnalysisTree => deriveAnalysis(document);
const document = createEmptyDocument();
const analysis = analyze(document);
const initial: AcceptedRevision<AnalysisTree, SemanticSnapshot> = {
  document,
  analysis,
  semantic: createSemanticSnapshot({ document, analysis }),
};

export const acceptedRevisionStore = atom(initial);
export const activeEditStore = atom<DraftEdit | null>(null);
export const newColorDraftStore = atom("");
export const candidateStore = computed(
  [acceptedRevisionStore, activeEditStore],
  (accepted, activeEdit): CandidateRevision<AnalysisTree> =>
    buildCandidateRevision(accepted.document, activeEdit, accepted.analysis, { parseCss, analyze }),
);
export const previewStore = computed(candidateStore, (candidate) =>
  candidate.status === "valid" ? candidate : candidate.lastValid,
);
export const lastTransactionStore = atom<WorkspaceTransaction<
  AnalysisTree,
  SemanticSnapshot,
  SemanticChanges
> | null>(null);
export const candidateDependencies = { parseCss, analyze };
