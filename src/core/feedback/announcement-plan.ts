import type {
  AnalysisTree,
  SemanticChanges,
  SemanticContrast,
  SemanticCvd,
  SemanticSnapshot,
} from "../../domain/types.ts";
import { formatLightnessPercent } from "../workspace/numeric-fields.ts";
import type { WorkspaceTransaction } from "../workspace/transactions.ts";

type Transaction = WorkspaceTransaction<AnalysisTree, SemanticSnapshot, SemanticChanges>;
type Comparison = SemanticContrast;
type CvdComparison = SemanticCvd;

export interface AnnouncementPlan {
  edit:
    | { type: "add"; row: number }
    | { type: "duplicate"; sourceRow: number; destinationRow: number; inheritsBackground: boolean }
    | { type: "delete"; row: number }
    | { type: "background"; row: number; enabled: boolean }
    | { type: "edit"; field: "CSS color" | "Lightness" | "Chroma" | "Hue"; value: string | number };
  apca: readonly { comparison: Comparison; direction: "lost" | "restored" }[];
  wcag: readonly { comparison: Comparison; before: number; after: number }[];
  cvd: readonly {
    comparison: CvdComparison;
    direction: "added" | "removed";
    modes: readonly string[];
  }[];
}

const rowOf = (order: readonly string[], id: string): number => order.indexOf(id) + 1;
const compareRows = <T extends { comparison: { leftRow: number; rightRow: number } }>(
  left: T,
  right: T,
): number =>
  left.comparison.leftRow - right.comparison.leftRow ||
  left.comparison.rightRow - right.comparison.rightRow;

/** Produces language-neutral announcement facts from one accepted transaction. */
export function buildAnnouncementPlan(transaction: Transaction): AnnouncementPlan {
  const { cause, changes, before, after } = transaction;
  const edit =
    cause.type === "add-color"
      ? { type: "add" as const, row: rowOf(after.document.colors.order, cause.createdId) }
      : cause.type === "duplicate-color"
        ? {
            type: "duplicate" as const,
            sourceRow: rowOf(before.document.colors.order, cause.sourceId),
            destinationRow: rowOf(after.document.colors.order, cause.createdId),
            inheritsBackground:
              after.document.colors.byId[cause.createdId].roles.contrastBackground,
          }
        : cause.type === "delete-color"
          ? { type: "delete" as const, row: rowOf(before.document.colors.order, cause.deletedId) }
          : cause.type === "set-background-role"
            ? {
                type: "background" as const,
                row: rowOf(after.document.colors.order, cause.colorId),
                enabled: cause.enabled,
              }
            : (() => {
                const row = after.semantic.rows[cause.edit.colorId];
                const field: "CSS color" | "Lightness" | "Chroma" | "Hue" =
                  cause.edit.field === "css"
                    ? "CSS color"
                    : cause.edit.field === "l"
                      ? "Lightness"
                      : cause.edit.field === "c"
                        ? "Chroma"
                        : "Hue";
                const value =
                  cause.edit.field === "css"
                    ? row.css
                    : cause.edit.field === "l"
                      ? `${formatLightnessPercent(row.l)} percent`
                      : cause.edit.field === "h"
                        ? `${row.h} degrees`
                        : row.c;
                return { type: "edit" as const, field, value };
              })();
  const apca = Object.values(changes.comparisons.contrast)
    .flatMap((change) => {
      if (!change.support) return [];
      const comparison = change.after ?? change.before;
      return comparison
        ? [
            {
              comparison,
              direction: change.support.after ? ("restored" as const) : ("lost" as const),
            },
          ]
        : [];
    })
    .sort(
      (left, right) =>
        Number(left.direction === "restored") - Number(right.direction === "restored") ||
        compareRows(left, right),
    );
  const wcag = Object.values(changes.comparisons.contrast)
    .flatMap((change) => {
      const comparison = change.after ?? change.before;
      return comparison && change.wcagKey
        ? [{ comparison, before: change.wcagKey.before, after: change.wcagKey.after }]
        : [];
    })
    .sort(compareRows);
  const cvd = Object.values(changes.comparisons.colorVision)
    .flatMap((change) => {
      const comparison = change.after ?? change.before;
      if (!comparison) return [];
      const added = change.warningsAdded.length
        ? [{ comparison, direction: "added" as const, modes: change.warningsAdded }]
        : [];
      const removed = change.warningsResolved.length
        ? [{ comparison, direction: "removed" as const, modes: change.warningsResolved }]
        : [];
      return [...added, ...removed];
    })
    .sort(
      (left, right) => compareRows(left, right) || left.direction.localeCompare(right.direction),
    );
  return { edit, apca, wcag, cvd };
}
