import type { ValidCandidate } from "../core/workspace/draft.ts";
import {
  APCA_LEVELS,
  CVD_WARNING_THRESHOLD,
  clamp,
  rgbForColor,
  rgbToOklab,
  serializeColor,
  srgbToLinear,
  WCAG_AA_LARGE,
  WCAG_AA_NORMAL,
} from "./color.ts";
import type {
  AnalysisTree,
  ApcaRecommendation,
  ColorId,
  ColorNode,
  ColorVisionKey,
  ContrastKey,
  CvdMode,
  DocumentTree,
  Rgb,
  WcagLevel,
} from "./types.ts";

const CVD_MATRICES: Record<CvdMode, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export const CVD_MODES = Object.keys(CVD_MATRICES) as CvdMode[];

export function contrastKey(leftId: ColorId, rightId: ColorId): ContrastKey {
  return `${leftId}|${rightId}`;
}

export function colorVisionKey(leftId: ColorId, rightId: ColorId): ColorVisionKey {
  return [leftId, rightId].sort().join("|") as ColorVisionKey;
}

function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b);
}

function wcagContrast(foreground: Rgb, background: Rgb): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= WCAG_AA_NORMAL) return { key: 2, label: "AA pass for normal text" };
  if (ratio >= WCAG_AA_LARGE) return { key: 1, label: "large text only" };
  return { key: 0, label: "fail" };
}

function apcaLuminance(rgb: Rgb): number {
  const r = (rgb.r / 255) ** 2.4;
  const g = (rgb.g / 255) ** 2.4;
  const b = (rgb.b / 255) ** 2.4;
  return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
}

function softClampBlack(y: number): number {
  const threshold = 0.022;
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: This exponent is defined by APCA.
  return y < threshold ? y + (threshold - y) ** 1.414 : y;
}

// APCA-W3-style calculation pinned to the constants below. Its recommendation
// categories, rather than an unavailable user font profile, are the product fact.
function apcaContrast(textRgb: Rgb, backgroundRgb: Rgb): number {
  const txtY = softClampBlack(apcaLuminance(textRgb));
  const bgY = softClampBlack(apcaLuminance(backgroundRgb));
  if (Math.abs(bgY - txtY) < 0.0005) return 0;
  if (bgY > txtY) {
    const sapc = (bgY ** 0.56 - txtY ** 0.57) * 1.14;
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
  }
  const sapc = (bgY ** 0.65 - txtY ** 0.62) * 1.14;
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100;
}

function apcaRecommendation(lc: number): ApcaRecommendation {
  const absolute = Math.abs(lc);
  const level = APCA_LEVELS.find((item) => absolute >= item.min) ?? APCA_LEVELS[4];
  return { ...level };
}

function simulateCvd(rgb: Rgb, matrix: number[][]): Rgb {
  const input = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const output = matrix.map((row) => row[0] * input[0] + row[1] * input[1] + row[2] * input[2]);
  return {
    r: clamp(output[0] * 255, 0, 255),
    g: clamp(output[1] * 255, 0, 255),
    b: clamp(output[2] * 255, 0, 255),
  };
}

function oklabDistance(rgbA: Rgb, rgbB: Rgb): number {
  const a = rgbToOklab(rgbA);
  const b = rgbToOklab(rgbB);
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

export function deriveAnalysis(document: DocumentTree): AnalysisTree {
  const colors = {} as AnalysisTree["colors"];
  for (const id of document.colors.order) {
    const color = document.colors.byId[id];
    colors[id] = { id, css: serializeColor(color), rgb: rgbForColor(color) };
  }

  const contrast = {} as AnalysisTree["comparisons"]["contrast"];
  for (const rightId of document.colors.order) {
    const background = document.colors.byId[rightId];
    if (!background.roles.contrastBackground) continue;
    for (const leftId of document.colors.order) {
      if (leftId === rightId) continue;
      const textAnalysis = colors[leftId];
      const backgroundAnalysis = colors[rightId];
      const apca = apcaContrast(textAnalysis.rgb, backgroundAnalysis.rgb);
      const recommendation = apcaRecommendation(apca);
      const ratio = wcagContrast(textAnalysis.rgb, backgroundAnalysis.rgb);
      const key = contrastKey(leftId, rightId);
      contrast[key] = {
        key,
        leftId,
        rightId,
        apca,
        recommendation,
        readableTextSupported: recommendation.key > 0,
        ratio,
        wcag: wcagLevel(ratio),
      };
    }
  }

  const cvd = {} as AnalysisTree["comparisons"]["colorVision"];
  for (let leftIndex = 0; leftIndex < document.colors.order.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < document.colors.order.length; rightIndex++) {
      const leftId = document.colors.order[leftIndex];
      const rightId = document.colors.order[rightIndex];
      const key = colorVisionKey(leftId, rightId);
      const modes = {} as AnalysisTree["comparisons"]["colorVision"][ColorVisionKey]["modes"];
      for (const mode of CVD_MODES) {
        const distance = oklabDistance(
          simulateCvd(colors[leftId].rgb, CVD_MATRICES[mode]),
          simulateCvd(colors[rightId].rgb, CVD_MATRICES[mode]),
        );
        modes[mode] = { distance, warning: distance < CVD_WARNING_THRESHOLD };
      }
      cvd[key] = { key, leftId, rightId, modes };
    }
  }

  return { colors, comparisons: { contrast, colorVision: cvd } };
}

export function createCandidate(document: DocumentTree): ValidCandidate<AnalysisTree> {
  return { status: "valid", document, analysis: deriveAnalysis(document) };
}

export function createEmptyDocument(): DocumentTree {
  return { colors: { order: [], byId: {} as Record<ColorId, ColorNode> } };
}
