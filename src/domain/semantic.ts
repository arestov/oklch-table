import { round } from "./color.ts";
import type {
  ColorId,
  ColorVisionKey,
  ContrastChange,
  ContrastKey,
  CvdChange,
  SemanticChanges,
  SemanticInput,
  SemanticSnapshot,
  ValueChange,
} from "./types.ts";

const changed = <T>(before: T, after: T): ValueChange<T> | undefined =>
  Object.is(before, after) ? undefined : { before, after };

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
    import("./types.ts").ContrastComparison,
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
      configuredTextSupported: value.configuredTextSupported,
      wcagKey: value.wcag.key,
    };
  const colorVision = {} as SemanticSnapshot["comparisons"]["colorVision"];
  for (const [key, value] of Object.entries(candidate.analysis.comparisons.colorVision) as [
    ColorVisionKey,
    import("./types.ts").CvdComparison,
  ][])
    colorVision[key] = {
      key,
      leftId: value.leftId,
      rightId: value.rightId,
      leftRow: rows[value.leftId].row,
      rightRow: rows[value.rightId].row,
      warnings: Object.entries(value.modes)
        .filter(([, signal]) => signal.warning)
        .map(([mode]) => mode as import("./types.ts").CvdMode),
    };
  return { rows, comparisons: { contrast, colorVision } };
}

export function diffSemanticSnapshots(
  before: SemanticSnapshot,
  after: SemanticSnapshot,
): SemanticChanges {
  const rows = {} as SemanticChanges["rows"];
  for (const id of new Set<ColorId>([
    ...(Object.keys(before.rows) as ColorId[]),
    ...(Object.keys(after.rows) as ColorId[]),
  ])) {
    const previous = before.rows[id];
    const next = after.rows[id];
    if (!previous || !next) {
      rows[id] = { id, before: previous, after: next, fields: {} };
      continue;
    }
    const fields = {
      css: changed(previous.css, next.css),
      l: changed(previous.l, next.l),
      c: changed(previous.c, next.c),
      h: changed(previous.h, next.h),
      background: changed(previous.background, next.background),
    };
    const compact = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    ) as typeof fields;
    if (Object.keys(compact).length)
      rows[id] = { id, before: previous, after: next, fields: compact };
  }
  const contrast = {} as SemanticChanges["comparisons"]["contrast"];
  for (const key of new Set<ContrastKey>([
    ...(Object.keys(before.comparisons.contrast) as ContrastKey[]),
    ...(Object.keys(after.comparisons.contrast) as ContrastKey[]),
  ])) {
    const previous = before.comparisons.contrast[key];
    const next = after.comparisons.contrast[key];
    if (!previous || !next) {
      contrast[key] = { key, before: previous, after: next };
      continue;
    }
    const item: ContrastChange = {
      key,
      before: previous,
      after: next,
      support: changed(previous.configuredTextSupported, next.configuredTextSupported),
      recommendationKey: changed(previous.recommendationKey, next.recommendationKey),
      regular: changed(previous.regular, next.regular),
      bold: changed(previous.bold, next.bold),
      wcagKey: changed(previous.wcagKey, next.wcagKey),
    };
    if (item.support || item.recommendationKey || item.regular || item.bold || item.wcagKey)
      contrast[key] = item;
  }
  const colorVision = {} as SemanticChanges["comparisons"]["colorVision"];
  for (const key of new Set<ColorVisionKey>([
    ...(Object.keys(before.comparisons.colorVision) as ColorVisionKey[]),
    ...(Object.keys(after.comparisons.colorVision) as ColorVisionKey[]),
  ])) {
    const previous = before.comparisons.colorVision[key];
    const next = after.comparisons.colorVision[key];
    if (!previous || !next) {
      colorVision[key] = {
        key,
        before: previous,
        after: next,
        warningsAdded: next?.warnings ?? [],
        warningsResolved: previous?.warnings ?? [],
      };
      continue;
    }
    const added = next.warnings.filter((mode) => !previous.warnings.includes(mode));
    const resolved = previous.warnings.filter((mode) => !next.warnings.includes(mode));
    if (added.length || resolved.length)
      colorVision[key] = {
        key,
        before: previous,
        after: next,
        warningsAdded: added,
        warningsResolved: resolved,
      } as CvdChange;
  }
  return { rows, comparisons: { contrast, colorVision } };
}
export const changesAreEmpty = (changes: SemanticChanges): boolean =>
  !Object.keys(changes.rows).length &&
  !Object.keys(changes.comparisons.contrast).length &&
  !Object.keys(changes.comparisons.colorVision).length;
