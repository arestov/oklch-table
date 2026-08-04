import { round } from "./color.ts";
import type {
  ActiveEdit,
  CandidateRevision,
  ColorId,
  ComparisonKey,
  ContrastChange,
  CvdChange,
  SemanticChangesTree,
  SemanticSnapshot,
  ValueChange,
} from "./types.ts";

function changed<T>(before: T, after: T): ValueChange<T> | undefined {
  return Object.is(before, after) ? undefined : { before, after };
}

export function createSemanticSnapshot(candidate: CandidateRevision): SemanticSnapshot {
  const rows = {} as SemanticSnapshot["rows"];
  candidate.document.order.forEach((id, index) => {
    const color = candidate.document.byId[id];
    const analysis = candidate.analysis.colors[id];
    rows[id] = {
      id,
      row: index + 1,
      css: analysis.css,
      l: round(color.lch.L, 3),
      c: round(color.lch.C, 3),
      h: round(color.lch.H, 1),
      background: color.background,
    };
  });

  const contrast = {} as SemanticSnapshot["contrast"];
  for (const [key, comparison] of Object.entries(candidate.analysis.contrast) as [
    ComparisonKey,
    CandidateRevision["analysis"]["contrast"][ComparisonKey],
  ][]) {
    contrast[key] = {
      key,
      leftId: comparison.leftId,
      rightId: comparison.rightId,
      leftRow: rows[comparison.leftId].row,
      rightRow: rows[comparison.rightId].row,
      apca: round(comparison.apca, 1),
      recommendationKey: comparison.recommendation.key,
      regular: comparison.recommendation.regular,
      bold: comparison.recommendation.bold,
      configuredTextSupported: comparison.configuredTextSupported,
      wcagKey: comparison.wcag.key,
    };
  }

  const cvd = {} as SemanticSnapshot["cvd"];
  for (const [key, comparison] of Object.entries(candidate.analysis.cvd) as [
    ComparisonKey,
    CandidateRevision["analysis"]["cvd"][ComparisonKey],
  ][]) {
    cvd[key] = {
      key,
      leftId: comparison.leftId,
      rightId: comparison.rightId,
      leftRow: rows[comparison.leftId].row,
      rightRow: rows[comparison.rightId].row,
      warnings: Object.entries(comparison.modes)
        .filter(([, signal]) => signal.warning)
        .map(([mode]) => mode as keyof typeof comparison.modes),
    };
  }

  return { rows, contrast, cvd };
}

export function diffSemanticSnapshots(
  before: SemanticSnapshot,
  after: SemanticSnapshot,
): SemanticChangesTree {
  const rows = {} as SemanticChangesTree["rows"];
  const rowIds = new Set<ColorId>([
    ...(Object.keys(before.rows) as ColorId[]),
    ...(Object.keys(after.rows) as ColorId[]),
  ]);
  for (const id of rowIds) {
    const oldRow = before.rows[id];
    const nextRow = after.rows[id];
    if (!oldRow || !nextRow) {
      rows[id] = { id, before: oldRow, after: nextRow, fields: {} };
      continue;
    }
    const fields = {
      css: changed(oldRow.css, nextRow.css),
      l: changed(oldRow.l, nextRow.l),
      c: changed(oldRow.c, nextRow.c),
      h: changed(oldRow.h, nextRow.h),
      background: changed(oldRow.background, nextRow.background),
    };
    const compact = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(compact).length)
      rows[id] = { id, before: oldRow, after: nextRow, fields: compact };
  }

  const contrast = {} as SemanticChangesTree["contrast"];
  const contrastKeys = new Set<ComparisonKey>([
    ...(Object.keys(before.contrast) as ComparisonKey[]),
    ...(Object.keys(after.contrast) as ComparisonKey[]),
  ]);
  for (const key of contrastKeys) {
    const oldValue = before.contrast[key];
    const nextValue = after.contrast[key];
    if (!oldValue || !nextValue) {
      contrast[key] = { key, before: oldValue, after: nextValue };
      continue;
    }
    const item: ContrastChange = {
      key,
      before: oldValue,
      after: nextValue,
      support: changed(oldValue.configuredTextSupported, nextValue.configuredTextSupported),
      recommendationKey: changed(oldValue.recommendationKey, nextValue.recommendationKey),
      regular: changed(oldValue.regular, nextValue.regular),
      bold: changed(oldValue.bold, nextValue.bold),
      wcagKey: changed(oldValue.wcagKey, nextValue.wcagKey),
    };
    if (item.support || item.recommendationKey || item.regular || item.bold || item.wcagKey)
      contrast[key] = item;
  }

  const cvd = {} as SemanticChangesTree["cvd"];
  const cvdKeys = new Set<ComparisonKey>([
    ...(Object.keys(before.cvd) as ComparisonKey[]),
    ...(Object.keys(after.cvd) as ComparisonKey[]),
  ]);
  for (const key of cvdKeys) {
    const oldValue = before.cvd[key];
    const nextValue = after.cvd[key];
    if (!oldValue || !nextValue) {
      cvd[key] = {
        key,
        before: oldValue,
        after: nextValue,
        warningsAdded: nextValue?.warnings ?? [],
        warningsResolved: oldValue?.warnings ?? [],
      };
      continue;
    }
    const warningsAdded = nextValue.warnings.filter((mode) => !oldValue.warnings.includes(mode));
    const warningsResolved = oldValue.warnings.filter((mode) => !nextValue.warnings.includes(mode));
    if (warningsAdded.length || warningsResolved.length) {
      const item: CvdChange = {
        key,
        before: oldValue,
        after: nextValue,
        warningsAdded,
        warningsResolved,
      };
      cvd[key] = item;
    }
  }

  return { rows, contrast, cvd };
}

export function changesAreEmpty(changes: SemanticChangesTree): boolean {
  return (
    !Object.keys(changes.rows).length &&
    !Object.keys(changes.contrast).length &&
    !Object.keys(changes.cvd).length
  );
}

export function fieldChanged(changes: SemanticChangesTree, context: ActiveEdit | null): boolean {
  if (!context) return Object.keys(changes.rows).length > 0;
  const row = changes.rows[context.colorId];
  if (!row) return false;
  return Boolean(row.fields[context.field]);
}
