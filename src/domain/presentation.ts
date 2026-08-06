import { requireValue } from "../core/safety/required.ts";
import { CVD_MODES } from "./analysis.ts";
import { formatLightnessPercent, round } from "./color.ts";
import type {
  AnalysisTree,
  ColorId,
  ColorVisionKey,
  ContrastComparison,
  ContrastKey,
  CvdComparison,
  CvdMode,
  DocumentTree,
} from "./types.ts";

type Candidate = { document: DocumentTree; analysis: AnalysisTree };

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
  polarity: string;
  wcag: string;
  apcaClassName: string;
  wcagClassName: string;
  wcagKey: number;
}

export interface CvdRowView {
  key: ColorVisionKey;
  otherRow: number;
  modes: Record<CvdMode, { label: string; className: string }>;
  hasWarning: boolean;
}

export interface PresentationIndex {
  rowById: Record<ColorId, number>;
  contrastByText: Record<ColorId, ContrastComparison[]>;
  contrastByBackground: Record<ColorId, ContrastComparison[]>;
  cvdByColor: Record<ColorId, CvdComparison[]>;
}

export interface WorkspacePresentation {
  index: PresentationIndex;
  rows: readonly RowView[];
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function apcaClass(comparison: ContrastComparison): string {
  if (comparison.recommendation.key === 0) return "status-fail";
  if (comparison.recommendation.key === 1) return "status-warning";
  return "status-pass";
}

export function wcagClass(comparison: ContrastComparison): string {
  if (comparison.wcag.key === 0) return "status-fail";
  if (comparison.wcag.key === 1) return "status-warning";
  return "status-pass";
}

export function createPresentationIndex(candidate: Candidate): PresentationIndex {
  const rowById = {} as PresentationIndex["rowById"];
  const contrastByText = {} as PresentationIndex["contrastByText"];
  const contrastByBackground = {} as PresentationIndex["contrastByBackground"];
  const cvdByColor = {} as PresentationIndex["cvdByColor"];
  for (const [offset, id] of candidate.document.colors.order.entries()) {
    rowById[id] = offset + 1;
    contrastByText[id] = [];
    contrastByBackground[id] = [];
    cvdByColor[id] = [];
  }
  for (const comparison of Object.values(candidate.analysis.comparisons.contrast)) {
    requireValue(
      contrastByText[comparison.leftId],
      `Missing text index for ${comparison.leftId}`,
    ).push(comparison);
    requireValue(
      contrastByBackground[comparison.rightId],
      `Missing background index for ${comparison.rightId}`,
    ).push(comparison);
  }
  for (const comparison of Object.values(candidate.analysis.comparisons.colorVision)) {
    requireValue(cvdByColor[comparison.leftId], `Missing CVD index for ${comparison.leftId}`).push(
      comparison,
    );
    requireValue(
      cvdByColor[comparison.rightId],
      `Missing CVD index for ${comparison.rightId}`,
    ).push(comparison);
  }
  return { rowById, contrastByText, contrastByBackground, cvdByColor };
}

export function summarizeTextContrast(
  candidate: Candidate,
  index: PresentationIndex,
  id: ColorId,
): ResultSummary {
  const color = requireValue(candidate.document.colors.byId[id], `Missing color ${id}`);
  const list = requireValue(
    color.roles.contrastBackground ? index.contrastByBackground[id] : index.contrastByText[id],
    `Missing contrast index for ${id}`,
  );
  if (!list.length) {
    return {
      text: "Not checked",
      detail: color.roles.contrastBackground
        ? "Add another color to use as text"
        : "Select a contrast background",
      className: "note",
    };
  }
  let readable = 0;
  let worst = requireValue(list[0], "A non-empty comparison list must have a first item");
  for (const comparison of list) {
    if (comparison.readableTextSupported) readable += 1;
    if (comparison.recommendation.key < worst.recommendation.key) worst = comparison;
  }
  const unreadable = list.length - readable;
  const worstMinimum = worst.recommendation.regular
    ? `worst: ${worst.recommendation.regular}px/400`
    : "worst: not readable";
  return {
    text:
      unreadable === 0
        ? `All ${readable} supported`
        : readable === 0
          ? plural(unreadable, "not readable", "not readable")
          : `${plural(unreadable, "not readable", "not readable")} · ${plural(readable, "supported")}`,
    detail: `${plural(list.length, "comparison")} · ${worstMinimum}`,
    className: apcaClass(worst),
  };
}

export function summarizeChecks(
  candidate: Candidate,
  index: PresentationIndex,
  id: ColorId,
): ResultSummary {
  let wcagIssues = 0;
  const textComparisons = requireValue(index.contrastByText[id], `Missing text index for ${id}`);
  const backgroundComparisons = requireValue(
    index.contrastByBackground[id],
    `Missing background index for ${id}`,
  );
  const cvdComparisons = requireValue(index.cvdByColor[id], `Missing CVD index for ${id}`);
  for (const comparison of textComparisons) if (comparison.wcag.key === 0) wcagIssues += 1;
  for (const comparison of backgroundComparisons) if (comparison.wcag.key === 0) wcagIssues += 1;
  let cvdWarnings = 0;
  for (const comparison of cvdComparisons) {
    if (CVD_MODES.some((mode) => comparison.modes[mode].warning)) cvdWarnings += 1;
  }
  if (!wcagIssues && !cvdWarnings) {
    const hasAny =
      backgroundComparisons.length ||
      textComparisons.length ||
      candidate.document.colors.order.length > 1;
    return {
      text: hasAny ? "No issues" : "Not checked",
      detail: hasAny ? "All available signals pass" : "Add more colors",
      className: hasAny ? "status-pass" : "note",
    };
  }
  const parts: string[] = [];
  if (wcagIssues) parts.push(plural(wcagIssues, "WCAG issue"));
  if (cvdWarnings) parts.push(plural(cvdWarnings, "CVD warning"));
  return {
    text: parts.join(", "),
    detail: "Open for details",
    className: wcagIssues ? "status-fail" : "status-warning",
  };
}

function buildRows(candidate: Candidate, index: PresentationIndex): readonly RowView[] {
  return candidate.document.colors.order.map((id, offset) => {
    const color = requireValue(candidate.document.colors.byId[id], `Missing color ${id}`);
    const analysis = requireValue(candidate.analysis.colors[id], `Missing analysis for ${id}`);
    return {
      id,
      row: offset + 1,
      css: analysis.css,
      lPercent: formatLightnessPercent(color.value.l),
      c: round(color.value.c, 3),
      h: round(color.value.h, 1),
      background: color.roles.contrastBackground,
      textContrast: summarizeTextContrast(candidate, index, id),
      checks: summarizeChecks(candidate, index, id),
    };
  });
}

export function buildWorkspacePresentation(candidate: Candidate): WorkspacePresentation {
  const index = createPresentationIndex(candidate);
  return { index, rows: buildRows(candidate, index) };
}

export function buildContrastRows(
  index: PresentationIndex,
  id: ColorId,
  mode: "background" | "text" | "all",
): ContrastRowView[] {
  const list = requireValue(
    mode === "background"
      ? index.contrastByBackground[id]
      : mode === "text"
        ? index.contrastByText[id]
        : [
            ...requireValue(index.contrastByBackground[id], `Missing background index for ${id}`),
            ...requireValue(index.contrastByText[id], `Missing text index for ${id}`),
          ],
    `Missing contrast index for ${id}`,
  );
  return list.map((comparison) => ({
    key: comparison.key,
    textRow: requireValue(index.rowById[comparison.leftId], `Missing row for ${comparison.leftId}`),
    backgroundRow: requireValue(
      index.rowById[comparison.rightId],
      `Missing row for ${comparison.rightId}`,
    ),
    recommendation: comparison.recommendation.label,
    regular: comparison.recommendation.regular
      ? `${comparison.recommendation.regular}px`
      : "Not supported",
    bold: comparison.recommendation.bold ? `${comparison.recommendation.bold}px` : "Not supported",
    apca: `${round(comparison.apca, 1)} Lc`,
    polarity:
      comparison.apca < 0
        ? "Light text on dark background"
        : comparison.apca > 0
          ? "Dark text on light background"
          : "No polarity",
    wcag: `${round(comparison.ratio, 2)}:1 · ${comparison.wcag.label}`,
    apcaClassName: apcaClass(comparison),
    wcagClassName: wcagClass(comparison),
    wcagKey: comparison.wcag.key,
  }));
}

export function buildCvdRows(index: PresentationIndex, id: ColorId): CvdRowView[] {
  return requireValue(index.cvdByColor[id], `Missing CVD index for ${id}`).map((comparison) => {
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
    ) as CvdRowView["modes"];
    return {
      key: comparison.key,
      otherRow: requireValue(index.rowById[otherId], `Missing row for ${otherId}`),
      modes,
      hasWarning: CVD_MODES.some((mode) => comparison.modes[mode].warning),
    };
  });
}
