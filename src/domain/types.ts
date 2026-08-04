export type ColorId = `color-${number}`;
export type ColorModel = "hex" | "rgb" | "oklch";
export type ColorField = "css" | "l" | "c" | "h";
export type CommitReason = "idle" | "enter" | "blur" | "navigation" | "action";
export type ComparisonKey = `${ColorId}-${ColorId}`;
export type CvdMode = "protanopia" | "deuteranopia" | "tritanopia";

export interface Lch {
  L: number;
  C: number;
  H: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface ColorNode {
  id: ColorId;
  model: ColorModel;
  lPercent: boolean;
  lch: Lch;
  background: boolean;
  duplicatedFrom?: ColorId;
}

export interface DocumentTree {
  order: ColorId[];
  byId: Record<ColorId, ColorNode>;
  nextId: number;
}

export interface ColorAnalysis {
  id: ColorId;
  css: string;
  rgb: Rgb;
}

export interface ApcaRecommendation {
  min: number;
  key: number;
  label: string;
  regular: number | null;
  bold: number | null;
}

export interface WcagLevel {
  key: number;
  label: string;
}

export interface ContrastComparison {
  key: ComparisonKey;
  leftId: ColorId;
  rightId: ColorId;
  apca: number;
  recommendation: ApcaRecommendation;
  configuredTextSupported: boolean;
  ratio: number;
  wcag: WcagLevel;
}

export interface CvdSignal {
  distance: number;
  warning: boolean;
}

export interface CvdComparison {
  key: ComparisonKey;
  leftId: ColorId;
  rightId: ColorId;
  modes: Record<CvdMode, CvdSignal>;
}

export interface AnalysisTree {
  colors: Record<ColorId, ColorAnalysis>;
  contrast: Record<ComparisonKey, ContrastComparison>;
  cvd: Record<ComparisonKey, CvdComparison>;
}

export interface CandidateRevision {
  document: DocumentTree;
  analysis: AnalysisTree;
}

export interface FieldDraft {
  raw: string;
  valid: boolean;
}

export interface ActiveEdit {
  colorId: ColorId;
  field: ColorField;
}

export interface NavigationState {
  currentRowId: ColorId | null;
  jumpActive: boolean;
}

export interface SemanticRow {
  id: ColorId;
  row: number;
  css: string;
  l: number;
  c: number;
  h: number;
  background: boolean;
}

export interface SemanticContrast {
  key: ComparisonKey;
  leftId: ColorId;
  rightId: ColorId;
  leftRow: number;
  rightRow: number;
  apca: number;
  recommendationKey: number;
  regular: number | null;
  bold: number | null;
  configuredTextSupported: boolean;
  wcagKey: number;
}

export interface SemanticCvd {
  key: ComparisonKey;
  leftId: ColorId;
  rightId: ColorId;
  leftRow: number;
  rightRow: number;
  warnings: CvdMode[];
}

export interface SemanticSnapshot {
  rows: Record<ColorId, SemanticRow>;
  contrast: Record<ComparisonKey, SemanticContrast>;
  cvd: Record<ComparisonKey, SemanticCvd>;
}

export interface ValueChange<T> {
  before: T;
  after: T;
}

export interface RowChange {
  id: ColorId;
  before?: SemanticRow;
  after?: SemanticRow;
  fields: Partial<
    Record<"css" | "l" | "c" | "h" | "background", ValueChange<string | number | boolean>>
  >;
}

export interface ContrastChange {
  key: ComparisonKey;
  before?: SemanticContrast;
  after?: SemanticContrast;
  support?: ValueChange<boolean>;
  recommendationKey?: ValueChange<number>;
  regular?: ValueChange<number | null>;
  bold?: ValueChange<number | null>;
  wcagKey?: ValueChange<number>;
}

export interface CvdChange {
  key: ComparisonKey;
  before?: SemanticCvd;
  after?: SemanticCvd;
  warningsAdded: CvdMode[];
  warningsResolved: CvdMode[];
}

export interface SemanticChangesTree {
  rows: Record<ColorId, RowChange>;
  contrast: Record<ComparisonKey, ContrastChange>;
  cvd: Record<ComparisonKey, CvdChange>;
}

export interface CommitTransaction {
  id: string;
  reason: CommitReason;
  before: SemanticSnapshot;
  after: SemanticSnapshot;
  changes: SemanticChangesTree;
  context: ActiveEdit | null;
}

export interface AnnouncementChannel {
  id: number;
  text: string;
}

export interface AnnouncementState {
  shortcut: AnnouncementChannel;
  result: AnnouncementChannel;
  alert: AnnouncementChannel;
}

export interface VisibleFeedback {
  edited: string;
  apca: string;
  cvd: string;
}
