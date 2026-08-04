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

export type UiEffect =
  | { type: "focus-field"; colorId: ColorId; field: DraftEdit["field"] }
  | { type: "focus-action"; colorId: ColorId }
  | { type: "focus-new-color" }
  | { type: "open-popover"; colorId: ColorId; popover: "text-contrast" | "checks" };

export type FinishEditResult<TAnalysis, TSemantic, TChanges> =
  | {
      status: "accepted";
      transaction: WorkspaceTransaction<TAnalysis, TSemantic, TChanges>;
      effects: readonly UiEffect[];
    }
  | { status: "unchanged" }
  | { status: "invalid"; message: string };

interface TransactionInput<TAnalysis, TSemantic, TChanges> {
  ids: IdGenerator;
  cause: TransactionCause;
  before: AcceptedRevision<TAnalysis, TSemantic>;
  after: AcceptedRevision<TAnalysis, TSemantic>;
  changes: TChanges;
  isEmpty: (changes: TChanges) => boolean;
}

function createTransaction<TAnalysis, TSemantic, TChanges>(
  input: TransactionInput<TAnalysis, TSemantic, TChanges>,
  effects: readonly UiEffect[],
): FinishEditResult<TAnalysis, TSemantic, TChanges> {
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
    effects,
  };
}

/** Creates the transaction for an accepted field candidate without reading stores. */
export function createEditTransaction<TAnalysis, TSemantic, TChanges>(
  input: TransactionInput<TAnalysis, TSemantic, TChanges> & {
    cause: Extract<TransactionCause, { type: "edit-field" }>;
  },
): FinishEditResult<TAnalysis, TSemantic, TChanges> {
  return createTransaction(input, []);
}

/** Creates the transaction and stable-ID focus outcome for an accepted action. */
export function createActionTransaction<TAnalysis, TSemantic, TChanges>(
  input: TransactionInput<TAnalysis, TSemantic, TChanges> & {
    cause: Exclude<TransactionCause, { type: "edit-field" }>;
  },
): FinishEditResult<TAnalysis, TSemantic, TChanges> {
  const { cause, after } = input;
  const effects: readonly UiEffect[] =
    cause.type === "add-color"
      ? [{ type: "focus-new-color" }]
      : cause.type === "duplicate-color"
        ? [{ type: "focus-field", colorId: cause.createdId, field: "l" }]
        : cause.type === "delete-color"
          ? (() => {
              const index = input.before.document.colors.order.indexOf(cause.deletedId);
              const next =
                after.document.colors.order[index] ?? after.document.colors.order[index - 1];
              return next
                ? [{ type: "focus-action", colorId: next } satisfies UiEffect]
                : [{ type: "focus-new-color" }];
            })()
          : [];
  return createTransaction(input, effects);
}
