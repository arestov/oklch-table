import type { ColorId } from "../identity/ids.ts";
import type { ColorNode, DocumentTree, OklchValue } from "./model.ts";

export type EditableField = "css" | "l" | "c" | "h";
export type ColorPatch =
  | { field: "l" | "c" | "h"; value: number }
  | { field: "css"; value: OklchValue; serialization: ColorNode["serialization"] };
export interface DraftEdit {
  colorId: ColorId;
  field: EditableField;
  raw: string;
  lastValidPatch: ColorPatch | null;
}
export interface ValidCandidate<TAnalysis> {
  status: "valid";
  document: DocumentTree;
  analysis: TAnalysis;
}
export interface InvalidCandidate<TAnalysis> {
  status: "invalid";
  issue: { field: EditableField | "new-color"; raw: string; message: string };
  lastValid: ValidCandidate<TAnalysis>;
}
export type CandidateRevision<TAnalysis> = ValidCandidate<TAnalysis> | InvalidCandidate<TAnalysis>;
