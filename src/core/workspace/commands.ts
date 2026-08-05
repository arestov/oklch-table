import { batch } from "nanostores";
import {
  changesAreEmpty,
  createSemanticSnapshot,
  diffSemanticSnapshots,
} from "../../domain/semantic.ts";
import type { AnalysisTree, SemanticChanges, SemanticSnapshot } from "../../domain/types.ts";
import { type ColorId, type IdGenerator, nanoIdGenerator } from "../identity/ids.ts";
import type { DraftEdit } from "./draft.ts";
import type { DocumentTree } from "./model.ts";
import { parseNumericField } from "./numeric-fields.ts";
import {
  acceptedRevisionStore,
  activeEditStore,
  candidateDependencies,
  candidateStore,
  lastTransactionStore,
  newColorDraftStore,
} from "./stores.ts";
import {
  createActionTransaction,
  createEditTransaction,
  type FinishEditResult,
  type FinishReason,
  type TransactionCause,
  type WorkspaceTransaction,
} from "./transactions.ts";

type Result = FinishEditResult<AnalysisTree, SemanticSnapshot, SemanticChanges>;

function actionDocument(): DocumentTree | Result {
  const candidate = candidateStore.get();
  return candidate.status === "valid"
    ? candidate.document
    : { status: "invalid", message: candidate.issue.message };
}

function applyTransaction(
  transaction: WorkspaceTransaction<AnalysisTree, SemanticSnapshot, SemanticChanges>,
): void {
  batch(() => {
    acceptedRevisionStore.set(transaction.after);
    activeEditStore.set(null);
    newColorDraftStore.set("");
    lastTransactionStore.set(transaction);
  });
}

function accept(
  cause: TransactionCause,
  document: ReturnType<typeof acceptedRevisionStore.get>["document"],
  ids: IdGenerator,
): Result {
  const before = acceptedRevisionStore.get();
  const analysis = candidateDependencies.analyze(document);
  const after = {
    document,
    analysis,
    semantic: createSemanticSnapshot({ document, analysis }),
  };
  const input = {
    ids,
    cause,
    before,
    after,
    changes: diffSemanticSnapshots(before.semantic, after.semantic),
    isEmpty: changesAreEmpty,
  };
  const result =
    cause.type === "edit-field"
      ? createEditTransaction({ ...input, cause })
      : createActionTransaction({ ...input, cause });
  if (result.status === "accepted") applyTransaction(result.transaction);
  return result;
}

export function updateColorDraft(colorId: ColorId, field: DraftEdit["field"], raw: string): void {
  const active = activeEditStore.get();
  const edit =
    active?.colorId === colorId && active.field === field
      ? { ...active, raw }
      : { colorId, field, raw, lastValidPatch: null };
  activeEditStore.set(buildCandidate(edit));
}
function buildCandidate(edit: DraftEdit): DraftEdit {
  if (edit.field === "css") {
    const parsed = candidateDependencies.parseCss(edit.raw);
    return {
      ...edit,
      lastValidPatch: parsed
        ? { field: "css", value: parsed.value, serialization: parsed.serialization }
        : edit.lastValidPatch,
    };
  }
  const value = parseNumericField(edit.field, edit.raw);
  return {
    ...edit,
    lastValidPatch: value === null ? edit.lastValidPatch : { field: edit.field, value },
  };
}
export function finishEdit(reason: FinishReason, ids: IdGenerator = nanoIdGenerator): Result {
  const candidate = candidateStore.get();
  if (candidate.status === "invalid")
    return { status: "invalid", message: candidate.issue.message };
  const active = activeEditStore.get();
  if (!active) return { status: "unchanged" };
  return accept({ type: "edit-field", edit: active, reason }, candidate.document, ids);
}
export function addColorFromDraft(ids: IdGenerator = nanoIdGenerator): Result {
  const raw = newColorDraftStore.get();
  const parsed = candidateDependencies.parseCss(raw);
  if (!parsed)
    return { status: "invalid", message: "Invalid CSS color. Enter HEX, RGB, or OKLCH." };
  const id = ids.color();
  const current = actionDocument();
  if ("status" in current) return current;
  return accept(
    { type: "add-color", createdId: id },
    {
      colors: {
        order: [...current.colors.order, id],
        byId: {
          ...current.colors.byId,
          [id]: { id, ...parsed, roles: { contrastBackground: false } },
        },
      },
    },
    ids,
  );
}
export function setNewColorDraft(raw: string): void {
  newColorDraftStore.set(raw);
}
export function duplicateColor(sourceId: ColorId, ids: IdGenerator = nanoIdGenerator): Result {
  const current = actionDocument();
  if ("status" in current) return current;
  const source = current.colors.byId[sourceId];
  if (!source) return { status: "unchanged" };
  const id = ids.color();
  const order = [...current.colors.order];
  order.splice(order.indexOf(sourceId) + 1, 0, id);
  return accept(
    { type: "duplicate-color", sourceId, createdId: id },
    {
      colors: {
        order,
        byId: {
          ...current.colors.byId,
          [id]: {
            ...source,
            id,
            value: { ...source.value },
            provenance: { duplicatedFrom: sourceId },
          },
        },
      },
    },
    ids,
  );
}
export function deleteColor(deletedId: ColorId, ids: IdGenerator = nanoIdGenerator): Result {
  const current = actionDocument();
  if ("status" in current) return current;
  if (!current.colors.byId[deletedId]) return { status: "unchanged" };
  const byId = { ...current.colors.byId };
  delete byId[deletedId];
  return accept(
    { type: "delete-color", deletedId },
    { colors: { order: current.colors.order.filter((id) => id !== deletedId), byId } },
    ids,
  );
}
export function setContrastBackground(
  colorId: ColorId,
  enabled: boolean,
  ids: IdGenerator = nanoIdGenerator,
): Result {
  const current = actionDocument();
  if ("status" in current) return current;
  const color = current.colors.byId[colorId];
  if (!color || color.roles.contrastBackground === enabled) return { status: "unchanged" };
  return accept(
    { type: "set-background-role", colorId, enabled },
    {
      colors: {
        ...current.colors,
        byId: {
          ...current.colors.byId,
          [colorId]: { ...color, roles: { contrastBackground: enabled } },
        },
      },
    },
    ids,
  );
}
