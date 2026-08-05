import type { ValidCandidate as CandidateRevision } from "../core/workspace/draft.ts";
import { formatLightnessPercent } from "../core/workspace/numeric-fields.ts";
import { CVD_MODES } from "./analysis.ts";
import { round } from "./color.ts";
import type {
  ColorId,
  ColorVisionKey,
  ContrastComparison,
  ContrastKey,
  CvdComparison,
} from "./types.ts";

type Candidate = CandidateRevision<import("./types.ts").AnalysisTree>;

export interface ResultSummary {
  text: string;
  detail: string;
  className: string;
}

export interface RowView {
  id: ColorId;
  row: number;
  css: string;
  lPercent: number;
  c: number;
  h: number;
  background: boolean;
  textContrast: ResultSummary;
  checks: ResultSummary;
}

export interface ContrastRowView {
  key: ContrastKey;
  textRow: number;
  backgroundRow: number;
  recommendation: string;
  regular: string;
  bold: string;
  apca: string;
  wcag: string;
  className: string;
}

export interface CvdRowView {
  key: ColorVisionKey;
  otherRow: number;
  modes: Record<string, { label: string; className: string }>;
  hasWarning: boolean;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function rowNumber(candidate: Candidate, id: ColorId): number {
  return candidate.document.colors.order.indexOf(id) + 1;
}

export function contrastClass(comparison: ContrastComparison): string {
  if (comparison.recommendation.key === 0 || comparison.wcag.key === 0) return "status-fail";
  if (comparison.recommendation.key <= 1 || comparison.wcag.key === 1) return "status-warning";
  return "status-pass";
}

export function comparisonsForColor(
  candidate: Candidate,
  id: ColorId,
): {
  asBackground: ContrastComparison[];
  asText: ContrastComparison[];
} {
  const asBackground: ContrastComparison[] = [];
  const asText: ContrastComparison[] = [];
  for (const comparison of Object.values(candidate.analysis.comparisons.contrast)) {
    if (comparison.rightId === id) asBackground.push(comparison);
    if (comparison.leftId === id) asText.push(comparison);
  }
  return { asBackground, asText };
}

export function summarizeTextContrast(candidate: Candidate, id: ColorId): ResultSummary {
  const color = candidate.document.colors.byId[id];
  const comparisons = comparisonsForColor(candidate, id);
  const list = color.roles.contrastBackground ? comparisons.asBackground : comparisons.asText;
  if (!list.length) {
    return {
      text: "Not checked",
      detail: color.roles.contrastBackground
        ? "Add another color to use as text"
        : "Select a contrast background",
      className: "note",
    };
  }
  const readable = list.filter((item) => item.readableTextSupported).length;
  const unreadable = list.length - readable;
  const worst = [...list].sort((a, b) => a.recommendation.key - b.recommendation.key)[0];
  const worstMinimum = worst.recommendation.regular
    ? `worst: ${worst.recommendation.regular}px/400`
    : "worst: not readable";
  return {
    text:
      unreadable === 0
        ? `All ${readable} usable`
        : readable === 0
          ? plural(unreadable, "not readable", "not readable")
          : `${plural(unreadable, "not readable", "not readable")} · ${plural(readable, "usable")}`,
    detail: `${plural(list.length, "comparison")} · ${worstMinimum}`,
    className: contrastClass(worst),
  };
}

export function cvdComparisonsForColor(candidate: Candidate, id: ColorId): CvdComparison[] {
  return Object.values(candidate.analysis.comparisons.colorVision).filter(
    (item) => item.leftId === id || item.rightId === id,
  );
}

export function summarizeChecks(candidate: Candidate, id: ColorId): ResultSummary {
  const comparisons = comparisonsForColor(candidate, id);
  const contrastIssues = [...comparisons.asBackground, ...comparisons.asText].filter(
    (item) => !item.readableTextSupported || item.wcag.key === 0,
  ).length;
  const cvdWarnings = cvdComparisonsForColor(candidate, id).filter((item) =>
    Object.values(item.modes).some((mode) => mode.warning),
  ).length;
  if (!contrastIssues && !cvdWarnings) {
    const hasAny =
      comparisons.asBackground.length ||
      comparisons.asText.length ||
      candidate.document.colors.order.length > 1;
    return {
      text: hasAny ? "No issues" : "Not checked",
      detail: hasAny ? "All available signals pass" : "Add more colors",
      className: hasAny ? "status-pass" : "note",
    };
  }
  const parts: string[] = [];
  if (contrastIssues) parts.push(plural(contrastIssues, "contrast issue"));
  if (cvdWarnings) parts.push(plural(cvdWarnings, "CVD warning"));
  return {
    text: parts.join(", "),
    detail: "Open for details",
    className: contrastIssues ? "status-fail" : "status-warning",
  };
}

export function buildRows(candidate: Candidate): RowView[] {
  return candidate.document.colors.order.map((id, index) => {
    const color = candidate.document.colors.byId[id];
    const analysis = candidate.analysis.colors[id];
    return {
      id,
      row: index + 1,
      css: analysis.css,
      lPercent: formatLightnessPercent(color.value.l),
      c: round(color.value.c, 3),
      h: round(color.value.h, 1),
      background: color.roles.contrastBackground,
      textContrast: summarizeTextContrast(candidate, id),
      checks: summarizeChecks(candidate, id),
    };
  });
}

export function buildContrastRows(
  candidate: Candidate,
  id: ColorId,
  mode: "background" | "text" | "all",
): ContrastRowView[] {
  const comparisons = comparisonsForColor(candidate, id);
  const list =
    mode === "background"
      ? comparisons.asBackground
      : mode === "text"
        ? comparisons.asText
        : [...comparisons.asBackground, ...comparisons.asText];
  return list.map((comparison) => ({
    key: comparison.key,
    textRow: rowNumber(candidate, comparison.leftId),
    backgroundRow: rowNumber(candidate, comparison.rightId),
    recommendation: comparison.recommendation.label,
    regular: comparison.recommendation.regular
      ? `${comparison.recommendation.regular}px`
      : "Not supported",
    bold: comparison.recommendation.bold ? `${comparison.recommendation.bold}px` : "Not supported",
    apca: `${round(comparison.apca, 1)} Lc`,
    wcag: `${round(comparison.ratio, 2)}:1 · ${comparison.wcag.label}`,
    className: contrastClass(comparison),
  }));
}

export function buildCvdRows(candidate: Candidate, id: ColorId): CvdRowView[] {
  return cvdComparisonsForColor(candidate, id).map((comparison) => {
    const otherId = comparison.leftId === id ? comparison.rightId : comparison.leftId;
    const modes = Object.fromEntries(
      CVD_MODES.map((mode) => {
        const warning = comparison.modes[mode].warning;
        return [
          mode,
          {
            label: warning ? "Possible conflict" : "Pass",
            className: warning ? "status-warning" : "status-pass",
          },
        ];
      }),
    );
    return {
      key: comparison.key,
      otherRow: rowNumber(candidate, otherId),
      modes,
      hasWarning: Object.values(comparison.modes).some((mode) => mode.warning),
    };
  });
}
