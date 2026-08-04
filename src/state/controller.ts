import { batch } from "nanostores";
import { clamp, colorFromCss, parseCssColor } from "../domain/color";
import { changesAreEmpty, createSemanticSnapshot, diffSemanticSnapshots } from "../domain/semantic";
import type {
  ActiveEdit,
  ColorField,
  ColorId,
  ColorNode,
  CommitReason,
  CommitTransaction,
  DocumentTree,
  FieldDraft,
} from "../domain/types";
import { FeedbackCoordinator } from "../feedback/coordinator";
import {
  activeEditStore,
  announcementStore,
  candidateStore,
  committedRevisionStore,
  documentStore,
  fieldDraftKey,
  fieldDraftsStore,
  lastTransactionStore,
  navigationStore,
  newColorDraftStore,
  visibleFeedbackStore,
} from "./stores";

const output = {
  publishResult(text: string, visible: { edited: string; apca: string; cvd: string }): void {
    const current = announcementStore.get();
    announcementStore.set({
      ...current,
      result: { id: current.result.id + 1, text },
    });
    visibleFeedbackStore.set(visible);
  },
  publishAlert(text: string): void {
    const current = announcementStore.get();
    announcementStore.set({
      ...current,
      alert: { id: current.alert.id + 1, text },
    });
  },
};

export const feedbackCoordinator = new FeedbackCoordinator(candidateStore.get(), output);
candidateStore.listen((candidate) => feedbackCoordinator.receive(candidate));

function nextColorId(document: DocumentTree): ColorId {
  return `color-${document.nextId}`;
}

function replaceColor(document: DocumentTree, color: ColorNode): DocumentTree {
  return {
    ...document,
    byId: { ...document.byId, [color.id]: color },
  };
}

function setFieldDraft(colorId: ColorId, field: ColorField, draft: FieldDraft): void {
  const key = fieldDraftKey(colorId, field);
  fieldDraftsStore.set({ ...fieldDraftsStore.get(), [key]: draft });
}

function clearFieldDraft(colorId: ColorId, field: ColorField): void {
  const key = fieldDraftKey(colorId, field);
  const next = { ...fieldDraftsStore.get() };
  delete next[key];
  fieldDraftsStore.set(next);
}

function durableCommit(reason: CommitReason, context: ActiveEdit | null): CommitTransaction | null {
  const beforeRevision = committedRevisionStore.get();
  const afterRevision = candidateStore.get();
  const before = createSemanticSnapshot(beforeRevision);
  const after = createSemanticSnapshot(afterRevision);
  const changes = diffSemanticSnapshots(before, after);
  if (changesAreEmpty(changes)) return null;
  const transaction: CommitTransaction = {
    id: crypto.randomUUID(),
    reason,
    before,
    after,
    changes,
    context,
  };
  batch(() => {
    committedRevisionStore.set(afterRevision);
    lastTransactionStore.set(transaction);
  });
  return transaction;
}

function commitAction(
  before: ReturnType<typeof createSemanticSnapshot>,
  edited: string,
): CommitTransaction {
  const candidate = candidateStore.get();
  const transaction = feedbackCoordinator.publishImmediate(before, candidate, edited);
  batch(() => {
    committedRevisionStore.set(candidate);
    lastTransactionStore.set(transaction);
  });
  return transaction;
}

export function beginEdit(colorId: ColorId, field: ColorField): void {
  const context = { colorId, field } satisfies ActiveEdit;
  activeEditStore.set(context);
  navigationStore.set({ ...navigationStore.get(), currentRowId: colorId });
  feedbackCoordinator.begin(context);
}

export function updateColorField(colorId: ColorId, field: ColorField, raw: string): boolean {
  const document = documentStore.get();
  const color = document.byId[colorId];
  if (!color) return false;

  if (field === "css") {
    const parsed = parseCssColor(raw);
    if (!parsed) {
      setFieldDraft(colorId, field, { raw, valid: false });
      feedbackCoordinator.cancelTimer();
      return false;
    }
    const nextColor: ColorNode = {
      ...color,
      model: parsed.model,
      lPercent: parsed.lPercent,
      lch: { ...parsed.lch },
    };
    batch(() => {
      setFieldDraft(colorId, field, { raw, valid: true });
      documentStore.set(replaceColor(document, nextColor));
    });
    return true;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    setFieldDraft(colorId, field, { raw, valid: false });
    feedbackCoordinator.cancelTimer();
    return false;
  }
  const lch = { ...color.lch };
  if (field === "l") lch.L = clamp(numeric, 0, 1);
  if (field === "c") lch.C = Math.max(0, numeric);
  if (field === "h") lch.H = ((numeric % 360) + 360) % 360;
  batch(() => {
    setFieldDraft(colorId, field, { raw, valid: true });
    documentStore.set(replaceColor(document, { ...color, lch }));
  });
  return true;
}

export function finishActiveEdit(reason: CommitReason): boolean {
  const context = activeEditStore.get();
  if (!context) return true;
  const key = fieldDraftKey(context.colorId, context.field);
  const draft = fieldDraftsStore.get()[key];
  if (draft && !draft.valid) {
    feedbackCoordinator.alert(
      context.field === "css"
        ? "Invalid CSS color. Enter HEX, RGB, or OKLCH."
        : "Enter a valid number before leaving this field.",
    );
    if (reason !== "navigation") {
      activeEditStore.set(null);
      feedbackCoordinator.end();
    }
    return false;
  }
  feedbackCoordinator.flush(reason);
  durableCommit(reason, context);
  batch(() => {
    clearFieldDraft(context.colorId, context.field);
    activeEditStore.set(null);
  });
  feedbackCoordinator.end();
  return true;
}

export function setNewColorDraft(raw: string): void {
  newColorDraftStore.set({ raw, valid: !raw.trim() || Boolean(parseCssColor(raw)) });
}

export function addColorFromDraft(): ColorId | null {
  const draft = newColorDraftStore.get();
  const value = draft.raw.trim();
  if (!value) return null;
  const document = documentStore.get();
  const id = nextColorId(document);
  const color = colorFromCss(id, value);
  if (!color) {
    newColorDraftStore.set({ raw: draft.raw, valid: false });
    feedbackCoordinator.alert("Invalid CSS color. Enter HEX, RGB, or OKLCH.");
    return null;
  }
  const before = createSemanticSnapshot(candidateStore.get());
  const next: DocumentTree = {
    order: [...document.order, id],
    byId: { ...document.byId, [id]: color },
    nextId: document.nextId + 1,
  };
  batch(() => {
    documentStore.set(next);
    newColorDraftStore.set({ raw: "", valid: true });
    navigationStore.set({ ...navigationStore.get(), currentRowId: null });
  });
  const row = next.order.length;
  commitAction(before, `Color added as row ${row}. Row ${row + 1}, CSS color. Fill color, edit.`);
  return id;
}

export function duplicateColor(id: ColorId): ColorId | null {
  if (!finishActiveEdit("action")) return null;
  const document = documentStore.get();
  const source = document.byId[id];
  if (!source) return null;
  const before = createSemanticSnapshot(candidateStore.get());
  const duplicateId = nextColorId(document);
  const duplicate: ColorNode = {
    ...source,
    id: duplicateId,
    lch: { ...source.lch },
    duplicatedFrom: source.id,
  };
  const index = document.order.indexOf(id);
  const order = [...document.order];
  order.splice(index + 1, 0, duplicateId);
  documentStore.set({
    order,
    byId: { ...document.byId, [duplicateId]: duplicate },
    nextId: document.nextId + 1,
  });
  navigationStore.set({ ...navigationStore.get(), currentRowId: duplicateId });
  commitAction(
    before,
    `Color ${index + 1} duplicated as color ${index + 2}.${duplicate.background ? " It remains a contrast background." : ""}`,
  );
  return duplicateId;
}

export function deleteColor(id: ColorId): ColorId | null {
  if (!finishActiveEdit("action")) return null;
  const document = documentStore.get();
  const index = document.order.indexOf(id);
  if (index < 0) return null;
  const before = createSemanticSnapshot(candidateStore.get());
  const order = document.order.filter((item) => item !== id);
  const byId = { ...document.byId };
  delete byId[id];
  documentStore.set({ ...document, order, byId });
  const targetId = order[Math.min(index, order.length - 1)] ?? null;
  navigationStore.set({ ...navigationStore.get(), currentRowId: targetId });
  commitAction(before, `Color ${index + 1} deleted.`);
  return targetId;
}

export function setContrastBackground(id: ColorId, enabled: boolean): void {
  if (!finishActiveEdit("action")) return;
  const document = documentStore.get();
  const color = document.byId[id];
  if (!color || color.background === enabled) return;
  const before = createSemanticSnapshot(candidateStore.get());
  documentStore.set(replaceColor(document, { ...color, background: enabled }));
  const row = document.order.indexOf(id) + 1;
  commitAction(
    before,
    enabled
      ? `Color ${row} selected as a contrast background.`
      : `Color ${row} is no longer a contrast background.`,
  );
}

export function setCurrentRow(id: ColorId | null): void {
  navigationStore.set({ ...navigationStore.get(), currentRowId: id });
}

export function setJumpActive(active: boolean): void {
  navigationStore.set({ ...navigationStore.get(), jumpActive: active });
}

export function announceShortcut(message: string): void {
  const current = announcementStore.get();
  announcementStore.set({
    ...current,
    shortcut: { id: current.shortcut.id + 1, text: message },
  });
}

export function announceAlert(message: string): void {
  feedbackCoordinator.alert(message);
}
