import { formatLightnessPercent } from "../../domain/color.ts";
import type { AnalysisTree, SemanticChanges, SemanticSnapshot } from "../../domain/types.ts";
import { requireValue } from "../safety/required.ts";
import type { WorkspaceTransaction } from "../workspace/transactions.ts";

type Transaction = WorkspaceTransaction<AnalysisTree, SemanticSnapshot, SemanticChanges>;
type ApcaDirection = "lost" | "restored" | "stricter" | "easier";

export interface AnnouncementPlan {
  edit:
    | { type: "add"; row: number }
    | { type: "duplicate"; sourceRow: number; destinationRow: number; inheritsBackground: boolean }
    | { type: "delete"; row: number }
    | { type: "background"; row: number; enabled: boolean }
    | { type: "edit"; field: "CSS color" | "L" | "C" | "H"; value: string | number };
  apca: readonly { direction: ApcaDirection; textRows: readonly number[]; backgroundRow: number }[];
  wcag: readonly {
    direction: "failed" | "resolved" | "large-only" | "normal";
    count: number;
    remaining: number;
  }[];
  cvd: readonly {
    direction: "added" | "resolved";
    pairs: readonly [number, number][];
    remaining: number;
  }[];
}

const rowOf = (order: readonly string[], id: string): number => order.indexOf(id) + 1;
const topologyCause = (type: Transaction["cause"]["type"]): boolean =>
  type === "add-color" ||
  type === "duplicate-color" ||
  type === "delete-color" ||
  type === "set-background-role";

function editFor(transaction: Transaction): AnnouncementPlan["edit"] {
  const { cause, before, after } = transaction;
  if (cause.type === "add-color")
    return { type: "add", row: rowOf(after.document.colors.order, cause.createdId) };
  if (cause.type === "duplicate-color")
    return {
      type: "duplicate",
      sourceRow: rowOf(before.document.colors.order, cause.sourceId),
      destinationRow: rowOf(after.document.colors.order, cause.createdId),
      inheritsBackground: requireValue(
        after.document.colors.byId[cause.createdId],
        `Missing duplicated color ${cause.createdId}`,
      ).roles.contrastBackground,
    };
  if (cause.type === "delete-color")
    return { type: "delete", row: rowOf(before.document.colors.order, cause.deletedId) };
  if (cause.type === "set-background-role")
    return {
      type: "background",
      row: rowOf(after.document.colors.order, cause.colorId),
      enabled: cause.enabled,
    };
  const row = requireValue(
    after.semantic.rows[cause.edit.colorId],
    `Missing edited row ${cause.edit.colorId}`,
  );
  const field =
    cause.edit.field === "css"
      ? "CSS color"
      : cause.edit.field === "l"
        ? "L"
        : cause.edit.field === "c"
          ? "C"
          : "H";
  const value =
    cause.edit.field === "css"
      ? row.css
      : cause.edit.field === "l"
        ? formatLightnessPercent(row.l)
        : cause.edit.field === "h"
          ? row.h
          : row.c;
  return { type: "edit", field, value };
}

/** Produces bounded language-neutral facts from one accepted transaction. */
export function buildAnnouncementPlan(transaction: Transaction): AnnouncementPlan {
  const edit = editFor(transaction);
  if (topologyCause(transaction.cause.type)) return { edit, apca: [], wcag: [], cvd: [] };

  const apcaFacts = new Map<
    string,
    { direction: ApcaDirection; textRows: number[]; backgroundRow: number }
  >();
  const wcagFailed: number[] = [];
  const wcagResolved: number[] = [];
  const wcagLargeOnly: number[] = [];
  const wcagNormal: number[] = [];
  for (const change of Object.values(transaction.changes.comparisons.contrast)) {
    const comparison = change.after ?? change.before;
    if (!comparison) continue;
    let direction: ApcaDirection | undefined;
    if (change.support) direction = change.support.after ? "restored" : "lost";
    else if (change.recommendationKey)
      direction =
        change.recommendationKey.after < change.recommendationKey.before ? "stricter" : "easier";
    if (direction) {
      const key = `${direction}:${comparison.rightRow}`;
      const group = apcaFacts.get(key) ?? {
        direction,
        textRows: [],
        backgroundRow: comparison.rightRow,
      };
      group.textRows.push(comparison.leftRow);
      apcaFacts.set(key, group);
    }
    if (change.wcagKey) {
      const { before, after } = change.wcagKey;
      if (after === 0) wcagFailed.push(comparison.wcagKey);
      else if (before === 0) wcagResolved.push(comparison.wcagKey);
      else if (after === 1) wcagLargeOnly.push(comparison.wcagKey);
      else wcagNormal.push(comparison.wcagKey);
    }
  }
  const remaining = Object.values(transaction.after.semantic.comparisons?.contrast ?? {}).filter(
    (item) => item.wcagKey === 0,
  ).length;
  const wcag = [
    ...(wcagFailed.length
      ? [{ direction: "failed" as const, count: wcagFailed.length, remaining }]
      : []),
    ...(wcagResolved.length
      ? [{ direction: "resolved" as const, count: wcagResolved.length, remaining }]
      : []),
    ...(wcagLargeOnly.length
      ? [{ direction: "large-only" as const, count: wcagLargeOnly.length, remaining }]
      : []),
    ...(wcagNormal.length
      ? [{ direction: "normal" as const, count: wcagNormal.length, remaining }]
      : []),
  ];
  const pairs = { added: [] as [number, number][], resolved: [] as [number, number][] };
  for (const change of Object.values(transaction.changes.comparisons.colorVision)) {
    const comparison = change.after ?? change.before;
    if (!comparison) continue;
    if (change.warningsAdded.length) pairs.added.push([comparison.leftRow, comparison.rightRow]);
    if (change.warningsResolved.length)
      pairs.resolved.push([comparison.leftRow, comparison.rightRow]);
  }
  const remainingCvd = Object.values(
    transaction.after.semantic.comparisons?.colorVision ?? {},
  ).filter((item) => item.warnings.length > 0).length;
  const byRows = (a: [number, number], b: [number, number]) => a[0] - b[0] || a[1] - b[1];
  const cvd = [
    ...(pairs.added.length
      ? [{ direction: "added" as const, pairs: pairs.added.sort(byRows), remaining: remainingCvd }]
      : []),
    ...(pairs.resolved.length
      ? [
          {
            direction: "resolved" as const,
            pairs: pairs.resolved.sort(byRows),
            remaining: remainingCvd,
          },
        ]
      : []),
  ];
  const order = { lost: 0, stricter: 1, restored: 2, easier: 3 };
  return {
    edit,
    apca: [...apcaFacts.values()]
      .map((group) => ({ ...group, textRows: group.textRows.sort((a, b) => a - b) }))
      .sort((a, b) => order[a.direction] - order[b.direction] || a.backgroundRow - b.backgroundRow),
    wcag,
    cvd,
  };
}
