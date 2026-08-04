import type { ColorId, IdGenerator, TransactionId } from "../identity/ids.ts";
import type { DraftEdit } from "./draft.ts";
import type { DocumentTree } from "./model.ts";

export type FinishReason = "idle" | "enter" | "blur" | "navigation";
export type TransactionCause =
  | { type: "edit-field"; edit: DraftEdit; reason: FinishReason }
  | { type: "add-color"; createdId: ColorId }
  | { type: "duplicate-color"; sourceId: ColorId; createdId: ColorId }
  | { type: "delete-color"; deletedId: ColorId }
  | { type: "set-background-role"; colorId: ColorId; enabled: boolean };

export interface AcceptedRevision<TAnalysis, TSemantic> {
  document: DocumentTree;
  analysis: TAnalysis;
  semantic: TSemantic;
}

export interface WorkspaceTransaction<TAnalysis, TSemantic, TChanges> {
  id: TransactionId;
  cause: TransactionCause;
  before: AcceptedRevision<TAnalysis, TSemantic>;
  after: AcceptedRevision<TAnalysis, TSemantic>;
  changes: TChanges;
}

export type FinishEditResult<TAnalysis, TSemantic, TChanges> =
  | { status: "accepted"; transaction: WorkspaceTransaction<TAnalysis, TSemantic, TChanges> }
  | { status: "unchanged" }
  | { status: "invalid"; message: string };

export function createTransaction<TAnalysis, TSemantic, TChanges>(input: {
  ids: IdGenerator;
  cause: TransactionCause;
  before: AcceptedRevision<TAnalysis, TSemantic>;
  after: AcceptedRevision<TAnalysis, TSemantic>;
  changes: TChanges;
  isEmpty: (changes: TChanges) => boolean;
}): FinishEditResult<TAnalysis, TSemantic, TChanges> {
  if (input.isEmpty(input.changes)) return { status: "unchanged" };
  return {
    status: "accepted",
    transaction: {
      id: input.ids.transaction(),
      cause: input.cause,
      before: input.before,
      after: input.after,
      changes: input.changes,
    },
  };
}
