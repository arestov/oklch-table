import type { ColorId } from "../identity/ids.ts";

export type ColorFormat = "hex" | "rgb" | "oklch";
export type LightnessUnit = "number" | "percent";
export interface OklchValue {
  l: number;
  c: number;
  h: number;
  alpha: number;
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
export const createEmptyDocument = (): DocumentTree => ({
  colors: { order: [], byId: {} as Record<ColorId, ColorNode> },
});
export const contrastKey = (textId: ColorId, backgroundId: ColorId): `${ColorId}|${ColorId}` =>
  `${textId}|${backgroundId}`;
export const colorVisionKey = (first: ColorId, second: ColorId): `${ColorId}|${ColorId}` =>
  [first, second].sort().join("|") as `${ColorId}|${ColorId}`;
