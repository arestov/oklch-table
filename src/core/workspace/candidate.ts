import type { ColorId } from "../identity/ids.ts";
import type {
  CandidateRevision,
  ColorPatch,
  DraftEdit,
  DraftState,
  InvalidCandidate,
  ValidCandidate,
} from "./draft.ts";
import type { ColorNode, DocumentTree, OklchValue } from "./model.ts";

export type CandidateIssue = InvalidCandidate<unknown>["issue"];

export interface CandidateDependencies<TAnalysis> {
  parseCss(raw: string): { value: OklchValue; serialization: ColorNode["serialization"] } | null;
  analyze(document: DocumentTree): TAnalysis;
}

function applyPatch(document: DocumentTree, edit: DraftEdit, patch: ColorPatch): DocumentTree {
  const color = document.colors.byId[edit.colorId];
  if (!color) return document;
  const next =
    patch.field === "css"
      ? { ...color, value: patch.value, serialization: patch.serialization }
      : {
          ...color,
          value: { ...color.value, [patch.field]: patch.value },
        };
  return {
    colors: { ...document.colors, byId: { ...document.colors.byId, [color.id]: next } },
  };
}

function parsePatch<TAnalysis>(
  edit: DraftEdit,
  parseCss: CandidateDependencies<TAnalysis>["parseCss"],
): ColorPatch | CandidateIssue {
  if (edit.field === "css") {
    const parsed = parseCss(edit.raw);
    return parsed
      ? { field: "css", ...parsed }
      : { field: "css", raw: edit.raw, message: "Invalid CSS color. Enter HEX, RGB, or OKLCH." };
  }
  const value = Number(edit.raw);
  if (!/^[+-]?(?:\d+\.\d+|\d+|\.\d+)$/.test(edit.raw.trim()) || !Number.isFinite(value)) {
    return {
      field: edit.field,
      raw: edit.raw,
      message: "Enter a valid number before leaving this field.",
    };
  }
  return { field: edit.field, value };
}

export function buildCandidateRevision<TAnalysis>(
  document: DocumentTree,
  draft: DraftState,
  dependencies: CandidateDependencies<TAnalysis>,
): CandidateRevision<TAnalysis> {
  const valid = (value: DocumentTree): ValidCandidate<TAnalysis> => ({
    status: "valid",
    document: value,
    analysis: dependencies.analyze(value),
  });
  const edit = draft.active;
  if (!edit) return valid(document);
  const parsed = parsePatch(edit, dependencies.parseCss);
  if ("message" in parsed) {
    const lastValid = edit.lastValidPatch
      ? applyPatch(document, edit, edit.lastValidPatch)
      : document;
    return { status: "invalid", issue: parsed, lastValid: valid(lastValid) };
  }
  return valid(applyPatch(document, edit, parsed));
}

export function updateDraft(
  state: DraftState,
  colorId: ColorId,
  field: DraftEdit["field"],
  raw: string,
  parseCss: CandidateDependencies<unknown>["parseCss"],
): DraftState {
  const edit: DraftEdit = { colorId, field, raw, lastValidPatch: null };
  const parsed = parsePatch(edit, parseCss);
  if (!("message" in parsed)) edit.lastValidPatch = parsed;
  return { ...state, active: edit };
}
