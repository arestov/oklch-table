import type { ColorId } from "../core/identity/ids.ts";

export type { ColorId } from "../core/identity/ids.ts";
export type ColorFormat = "hex" | "rgb" | "oklch";
export type LightnessUnit = "number" | "percent";
export type CvdMode = "protanopia" | "deuteranopia" | "tritanopia";
export type ContrastKey = `${ColorId}|${ColorId}`;
export type ColorVisionKey = `${ColorId}|${ColorId}`;
export interface OklchValue {
  l: number;
  c: number;
  h: number;
  alpha: number;
}
export interface Rgb {
  r: number;
  g: number;
  b: number;
}
export interface ColorNode {
  id: ColorId;
  value: OklchValue;
  serialization: { format: ColorFormat; lightnessUnit: LightnessUnit };
  roles: { contrastBackground: boolean };
  provenance?: { duplicatedFrom?: ColorId };
}
export interface DocumentTree {
  colors: { order: ColorId[]; byId: Record<ColorId, ColorNode> };
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
  key: ContrastKey;
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
  key: ColorVisionKey;
  leftId: ColorId;
  rightId: ColorId;
  modes: Record<CvdMode, CvdSignal>;
}
export interface AnalysisTree {
  colors: Record<ColorId, ColorAnalysis>;
  comparisons: {
    contrast: Record<ContrastKey, ContrastComparison>;
    colorVision: Record<ColorVisionKey, CvdComparison>;
  };
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
  key: ContrastKey;
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
  key: ColorVisionKey;
  leftId: ColorId;
  rightId: ColorId;
  leftRow: number;
  rightRow: number;
  warnings: CvdMode[];
}
export interface SemanticSnapshot {
  rows: Record<ColorId, SemanticRow>;
  comparisons: {
    contrast: Record<ContrastKey, SemanticContrast>;
    colorVision: Record<ColorVisionKey, SemanticCvd>;
  };
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
  key: ContrastKey;
  before?: SemanticContrast;
  after?: SemanticContrast;
  support?: ValueChange<boolean>;
  recommendationKey?: ValueChange<number>;
  regular?: ValueChange<number | null>;
  bold?: ValueChange<number | null>;
  wcagKey?: ValueChange<number>;
}
export interface CvdChange {
  key: ColorVisionKey;
  before?: SemanticCvd;
  after?: SemanticCvd;
  warningsAdded: CvdMode[];
  warningsResolved: CvdMode[];
}
export interface SemanticChanges {
  rows: Record<ColorId, RowChange>;
  comparisons: {
    contrast: Record<ContrastKey, ContrastChange>;
    colorVision: Record<ColorVisionKey, CvdChange>;
  };
}
