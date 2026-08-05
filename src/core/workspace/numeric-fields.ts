import type { EditableField } from "./draft.ts";

type NumericField = Extract<EditableField, "l" | "c" | "h">;

export function parseLightnessPercent(raw: string): number {
  return Number(raw) / 100;
}

export function parseNumericField(field: NumericField, raw: string): number | null {
  if (!/^[+-]?(?:\d+\.\d+|\d+|\.\d+)$/.test(raw.trim())) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (field === "l") return value >= 0 && value <= 100 ? parseLightnessPercent(raw) : null;
  if (field === "c") return value >= 0 ? value : null;
  return value >= 0 && value <= 360 ? value : null;
}

export function numericFieldError(field: NumericField, raw: string): string {
  if (!/^[+-]?(?:\d+\.\d+|\d+|\.\d+)$/.test(raw.trim()) || !Number.isFinite(Number(raw)))
    return "Enter a valid number before leaving this field.";
  if (field === "l") return "Lightness must be between 0 and 100 percent.";
  if (field === "c") return "Chroma must be zero or greater.";
  return "Hue must be between 0 and 360 degrees.";
}
