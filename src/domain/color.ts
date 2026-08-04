import type { ColorModel, ColorNode, Lch, Rgb } from "./types.ts";

export const APCA_LEVELS = [
  { min: 90, key: 4, label: "preferred body text", regular: 14, bold: 12 },
  { min: 75, key: 3, label: "body text", regular: 18, bold: 14 },
  { min: 60, key: 2, label: "UI and non-body text", regular: 24, bold: 16 },
  { min: 45, key: 1, label: "large display text only", regular: 32, bold: 24 },
  { min: 0, key: 0, label: "not suitable for readable text", regular: null, bold: null },
] as const;

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;
export const CVD_WARNING_THRESHOLD = 0.055;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 3): number {
  const p = 10 ** digits;
  return Math.round((value + Number.EPSILON) * p) / p;
}

export function srgbToLinear(channel255: number): number {
  const channel = channel255 / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(channel: number): number {
  const value = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
  return clamp(value * 255, 0, 255);
}

export function rgbToOklab({ r, g, b }: Rgb): { L: number; a: number; b: number } {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

export function oklabToRgb({ L, a, b }: { L: number; a: number; b: number }): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return {
    r: linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function oklabToOklch({ L, a, b }: { L: number; a: number; b: number }): Lch {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  if (C < 0.000001) H = 0;
  return { L, C, H };
}

export function oklchToOklab({ L, C, H }: Lch): { L: number; a: number; b: number } {
  const radians = (H * Math.PI) / 180;
  return { L, a: C * Math.cos(radians), b: C * Math.sin(radians) };
}

interface ParsedColor {
  model: ColorModel;
  lPercent: boolean;
  lch: Lch;
}

function parseHex(value: string): ParsedColor | null {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const raw = match[1];
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;
  const rgb = {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
  return { model: "hex", lPercent: false, lch: oklabToOklch(rgbToOklab(rgb)) };
}

function parseRgb(value: string): ParsedColor | null {
  const match = value
    .trim()
    .match(
      /^rgba?\(\s*([+-]?[\d.]+)(%)?[,\s]+([+-]?[\d.]+)(%)?[,\s]+([+-]?[\d.]+)(%)?(?:\s*\/\s*[\d.]+%?)?\s*\)$/i,
    );
  if (!match) return null;
  const values = [Number(match[1]), Number(match[3]), Number(match[5])];
  const percents = [match[2], match[4], match[6]];
  const rgb = {
    r: clamp(percents[0] ? values[0] * 2.55 : values[0], 0, 255),
    g: clamp(percents[1] ? values[1] * 2.55 : values[1], 0, 255),
    b: clamp(percents[2] ? values[2] * 2.55 : values[2], 0, 255),
  };
  return { model: "rgb", lPercent: false, lch: oklabToOklch(rgbToOklab(rgb)) };
}

function parseOklch(value: string): ParsedColor | null {
  const match = value
    .trim()
    .match(
      /^oklch\(\s*([+-]?[\d.]+)(%)?\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)(?:deg)?(?:\s*\/\s*[\d.]+%?)?\s*\)$/i,
    );
  if (!match) return null;
  const L = match[2] ? Number(match[1]) / 100 : Number(match[1]);
  const C = Number(match[3]);
  const H = ((Number(match[4]) % 360) + 360) % 360;
  if (![L, C, H].every(Number.isFinite)) return null;
  return {
    model: "oklch",
    lPercent: Boolean(match[2]),
    lch: { L: clamp(L, 0, 1), C: Math.max(0, C), H },
  };
}

export function parseCssColor(value: string): ParsedColor | null {
  return parseHex(value) ?? parseRgb(value) ?? parseOklch(value);
}

export function rgbForColor(color: ColorNode): Rgb {
  return oklabToRgb(oklchToOklab(color.lch));
}

export function serializeColor(color: ColorNode): string {
  const rgb = rgbForColor(color);
  if (color.model === "hex") {
    const toHex = (channel: number) => Math.round(channel).toString(16).padStart(2, "0");
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }
  if (color.model === "rgb") {
    return `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)})`;
  }
  const lightness = color.lPercent ? `${round(color.lch.L * 100, 1)}%` : round(color.lch.L, 3);
  return `oklch(${lightness} ${round(color.lch.C, 3)} ${round(color.lch.H, 1)})`;
}

export function colorFromCss(
  id: ColorNode["id"],
  css: string,
  background = false,
): ColorNode | null {
  const parsed = parseCssColor(css);
  if (!parsed) return null;
  return {
    id,
    model: parsed.model,
    lPercent: parsed.lPercent,
    lch: { ...parsed.lch },
    background,
  };
}
