import { round } from "./color.ts";
import type {
  ColorVisionKey,
  ContrastKey,
  CvdComparison,
  CvdMode,
  SemanticInput,
  SemanticSnapshot,
} from "./types.ts";

/** Projects an accepted document into the stable semantic surface used by feedback. */
export function createSemanticSnapshot(candidate: SemanticInput): SemanticSnapshot {
  const rows = {} as SemanticSnapshot["rows"];
  candidate.document.colors.order.forEach((id, index) => {
    const color = candidate.document.colors.byId[id];
    rows[id] = {
      id,
      row: index + 1,
      css: candidate.analysis.colors[id].css,
      l: round(color.value.l),
      c: round(color.value.c),
      h: round(color.value.h, 1),
      background: color.roles.contrastBackground,
    };
  });
  const contrast = {} as SemanticSnapshot["comparisons"]["contrast"];
  for (const [key, value] of Object.entries(candidate.analysis.comparisons.contrast) as [
    ContrastKey,
    (typeof candidate.analysis.comparisons.contrast)[ContrastKey],
  ][])
    contrast[key] = {
      key,
      leftId: value.leftId,
      rightId: value.rightId,
      leftRow: rows[value.leftId].row,
      rightRow: rows[value.rightId].row,
      apca: round(value.apca, 1),
      recommendationKey: value.recommendation.key,
      regular: value.recommendation.regular,
      bold: value.recommendation.bold,
      readableTextSupported: value.readableTextSupported,
      wcagKey: value.wcag.key,
    };
  const colorVision = {} as SemanticSnapshot["comparisons"]["colorVision"];
  for (const [key, value] of Object.entries(candidate.analysis.comparisons.colorVision) as [
    ColorVisionKey,
    CvdComparison,
  ][])
    colorVision[key] = {
      key,
      leftId: value.leftId,
      rightId: value.rightId,
      leftRow: rows[value.leftId].row,
      rightRow: rows[value.rightId].row,
      warnings: Object.entries(value.modes)
        .filter(([, signal]) => signal.warning)
        .map(([mode]) => mode as CvdMode),
    };
  return { rows, comparisons: { contrast, colorVision } };
}
