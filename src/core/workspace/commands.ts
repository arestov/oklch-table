import { batch } from "nanostores";
import {
  changesAreEmpty,
  createSemanticSnapshot,
  diffSemanticSnapshots,
} from "../../domain/semantic.ts";
import type { AnalysisTree, SemanticChanges, SemanticSnapshot } from "../../domain/types.ts";
import { announceResult } from "../feedback/stores.ts";
import { type ColorId, type IdGenerator, nanoIdGenerator } from "../identity/ids.ts";
import type { DraftEdit } from "./draft.ts";
import {
  acceptedRevisionStore,
  candidateDependencies,
  candidateStore,
  draftStore,
  lastTransactionStore,
} from "./stores.ts";
import {
  createTransaction,
  type FinishEditResult,
  type FinishReason,
  type TransactionCause,
  type WorkspaceTransaction,
} from "./transactions.ts";

type Result = FinishEditResult<AnalysisTree, SemanticSnapshot, SemanticChanges>;

function applyTransaction(
  transaction: WorkspaceTransaction<AnalysisTree, SemanticSnapshot, SemanticChanges>,
): void {
  batch(() => {
    acceptedRevisionStore.set(transaction.after);
    draftStore.set({ active: null, newColor: { raw: "" } });
    lastTransactionStore.set(transaction);
  });
  announceResult(
    transaction.cause.type === "add-color"
      ? `Color added as row ${transaction.after.document.colors.order.length}.`
      : "Value updated. Checks updated.",
  );
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
    semantic: createSemanticSnapshot({ status: "valid", document, analysis }),
  };
  const result = createTransaction({
    ids,
    cause,
    before,
    after,
    changes: diffSemanticSnapshots(before.semantic, after.semantic),
    isEmpty: changesAreEmpty,
  });
  if (result.status === "accepted") applyTransaction(result.transaction);
  return result;
}

export function beginEdit(colorId: ColorId, field: DraftEdit["field"]): void {
  draftStore.set({
    ...draftStore.get(),
    active: { colorId, field, raw: "", lastValidPatch: null },
  });
}
export function updateDraft(raw: string): void {
  const active = draftStore.get().active;
  if (!active) return;
  const probe = { ...active, raw };
  const candidate = buildCandidate(probe);
  draftStore.set({ ...draftStore.get(), active: candidate });
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
  const value = /^[+-]?(?:\d+\.\d+|\d+|\.\d+)$/.test(edit.raw.trim()) ? Number(edit.raw) : null;
  return {
    ...edit,
    lastValidPatch: value === null ? edit.lastValidPatch : { field: edit.field, value },
  };
}
export function finishEdit(reason: FinishReason, ids: IdGenerator = nanoIdGenerator): Result {
  const candidate = candidateStore.get();
  if (candidate.status === "invalid")
    return { status: "invalid", message: candidate.issue.message };
  const active = draftStore.get().active;
  if (!active) return { status: "unchanged" };
  return accept({ type: "edit-field", edit: active, reason }, candidate.document, ids);
}
export function addColorFromDraft(ids: IdGenerator = nanoIdGenerator): Result {
  const raw = draftStore.get().newColor.raw;
  const parsed = candidateDependencies.parseCss(raw);
  if (!parsed)
    return { status: "invalid", message: "Invalid CSS color. Enter HEX, RGB, or OKLCH." };
  const id = ids.color();
  const current = acceptedRevisionStore.get().document;
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
  draftStore.set({ ...draftStore.get(), newColor: { raw } });
}
export function duplicateColor(sourceId: ColorId, ids: IdGenerator = nanoIdGenerator): Result {
  const current = acceptedRevisionStore.get().document;
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
  const current = acceptedRevisionStore.get().document;
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
  const current = acceptedRevisionStore.get().document;
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
