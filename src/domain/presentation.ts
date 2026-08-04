import { CVD_MODES } from "./analysis.ts";
import { round } from "./color.ts";
import type {
  CandidateRevision,
  ColorId,
  ComparisonKey,
  ContrastComparison,
  CvdComparison,
} from "./types.ts";

export interface ResultSummary {
  text: string;
  detail: string;
  className: string;
}

export interface RowView {
  id: ColorId;
  row: number;
  css: string;
  l: number;
  c: number;
  h: number;
  background: boolean;
  textContrast: ResultSummary;
  checks: ResultSummary;
}

export interface ContrastRowView {
  key: ComparisonKey;
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
  key: ComparisonKey;
  otherRow: number;
  modes: Record<string, { label: string; className: string }>;
  hasWarning: boolean;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function rowNumber(candidate: CandidateRevision, id: ColorId): number {
  return candidate.document.order.indexOf(id) + 1;
}

export function contrastClass(comparison: ContrastComparison): string {
  if (comparison.recommendation.key === 0 || comparison.wcag.key === 0) return "status-fail";
  if (comparison.recommendation.key <= 1 || comparison.wcag.key === 1) return "status-warning";
  return "status-pass";
}

function recommendationText(comparison: ContrastComparison): string {
  const recommendation = comparison.recommendation;
  if (!recommendation.regular) return "Not suitable for readable text";
  return `From ${recommendation.regular}px/400 or ${recommendation.bold}px/700`;
}

export function comparisonsForColor(
  candidate: CandidateRevision,
  id: ColorId,
): {
  asBackground: ContrastComparison[];
  asText: ContrastComparison[];
} {
  const asBackground: ContrastComparison[] = [];
  const asText: ContrastComparison[] = [];
  for (const comparison of Object.values(candidate.analysis.contrast)) {
    if (comparison.rightId === id) asBackground.push(comparison);
    if (comparison.leftId === id) asText.push(comparison);
  }
  return { asBackground, asText };
}

export function summarizeTextContrast(candidate: CandidateRevision, id: ColorId): ResultSummary {
  const color = candidate.document.byId[id];
  const comparisons = comparisonsForColor(candidate, id);
  const list = color.background ? comparisons.asBackground : comparisons.asText;
  if (!list.length) {
    return {
      text: "Not checked",
      detail: color.background
        ? "Add another color to use as text"
        : "Select a contrast background",
      className: "note",
    };
  }
  const worst = [...list].sort(
    (a, b) => a.recommendation.key - b.recommendation.key || a.wcag.key - b.wcag.key,
  )[0];
  const failures = list.filter((item) => contrastClass(item) === "status-fail").length;
  return {
    text: recommendationText(worst),
    detail: failures ? plural(failures, "failure") : plural(list.length, "comparison"),
    className: contrastClass(worst),
  };
}

export function cvdComparisonsForColor(candidate: CandidateRevision, id: ColorId): CvdComparison[] {
  return Object.values(candidate.analysis.cvd).filter(
    (item) => item.leftId === id || item.rightId === id,
  );
}

export function summarizeChecks(candidate: CandidateRevision, id: ColorId): ResultSummary {
  const comparisons = comparisonsForColor(candidate, id);
  const contrastIssues = [...comparisons.asBackground, ...comparisons.asText].filter(
    (item) => contrastClass(item) === "status-fail",
  ).length;
  const cvdWarnings = cvdComparisonsForColor(candidate, id).filter((item) =>
    Object.values(item.modes).some((mode) => mode.warning),
  ).length;
  if (!contrastIssues && !cvdWarnings) {
    const hasAny =
      comparisons.asBackground.length ||
      comparisons.asText.length ||
      candidate.document.order.length > 1;
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

export function buildRows(candidate: CandidateRevision): RowView[] {
  return candidate.document.order.map((id, index) => {
    const color = candidate.document.byId[id];
    const analysis = candidate.analysis.colors[id];
    return {
      id,
      row: index + 1,
      css: analysis.css,
      l: round(color.lch.L, 3),
      c: round(color.lch.C, 3),
      h: round(color.lch.H, 1),
      background: color.background,
      textContrast: summarizeTextContrast(candidate, id),
      checks: summarizeChecks(candidate, id),
    };
  });
}

export function buildContrastRows(
  candidate: CandidateRevision,
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

export function buildCvdRows(candidate: CandidateRevision, id: ColorId): CvdRowView[] {
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
