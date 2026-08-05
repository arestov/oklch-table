import type {
  ColorId,
  ColorVisionKey,
  ContrastChange,
  ContrastKey,
  CvdChange,
  RowChange,
  SemanticChanges,
  SemanticSnapshot,
  ValueChange,
} from "./types.ts";

const changed = <T>(before: T, after: T): ValueChange<T> | undefined =>
  Object.is(before, after) ? undefined : { before, after };

/** Compares two semantic snapshots with no store, DOM, or scheduling dependency. */
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
    const compact: RowChange["fields"] = {};
    if (fields.css) compact.css = fields.css;
    if (fields.l) compact.l = fields.l;
    if (fields.c) compact.c = fields.c;
    if (fields.h) compact.h = fields.h;
    if (fields.background) compact.background = fields.background;
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
    const support = changed(previous.readableTextSupported, next.readableTextSupported);
    const recommendationKey = changed(previous.recommendationKey, next.recommendationKey);
    const regular = changed(previous.regular, next.regular);
    const bold = changed(previous.bold, next.bold);
    const wcagKey = changed(previous.wcagKey, next.wcagKey);
    const item: ContrastChange = {
      key,
      before: previous,
      after: next,
      ...(support ? { support } : {}),
      ...(recommendationKey ? { recommendationKey } : {}),
      ...(regular ? { regular } : {}),
      ...(bold ? { bold } : {}),
      ...(wcagKey ? { wcagKey } : {}),
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
