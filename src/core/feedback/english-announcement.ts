import type { AnalysisTree, SemanticChanges, SemanticSnapshot } from "../../domain/types.ts";
import type { WorkspaceTransaction } from "../workspace/transactions.ts";

type Transaction = WorkspaceTransaction<AnalysisTree, SemanticSnapshot, SemanticChanges>;
export interface AnnouncementPlan {
  spoken: string;
  visible: { edited: string; apca: string; cvd: string };
}

function byRows<T extends { leftRow: number; rightRow: number }>(left: T, right: T): number {
  return left.leftRow - right.leftRow || left.rightRow - right.rightRow;
}

export function buildEnglishAnnouncement(transaction: Transaction): AnnouncementPlan {
  const { cause, changes } = transaction;
  const edited =
    cause.type === "add-color"
      ? `Color added as row ${transaction.after.document.colors.order.indexOf(cause.createdId) + 1}.`
      : cause.type === "duplicate-color"
        ? `Color duplicated as row ${transaction.after.document.colors.order.indexOf(cause.createdId) + 1}.`
        : cause.type === "delete-color"
          ? "Color deleted."
          : cause.type === "set-background-role"
            ? cause.enabled
              ? "Color selected as a contrast background."
              : "Color is no longer a contrast background."
            : "Value updated. Checks updated.";
  const apcaChanges = Object.values(changes.comparisons.contrast)
    .flatMap((change) => {
      if (!change.support) return [];
      const comparison = change.after ?? change.before;
      return comparison ? [{ comparison, supports: change.support.after }] : [];
    })
    .sort(
      (left, right) =>
        Number(left.supports) - Number(right.supports) || byRows(left.comparison, right.comparison),
    );
  const apca = apcaChanges.map(
    ({ comparison, supports }) =>
      `Row ${comparison.leftRow} ${supports ? "now supports" : "no longer supports"} the configured text on row ${comparison.rightRow}.`,
  );
  const cvd = Object.values(changes.comparisons.colorVision)
    .flatMap((change) => {
      const comparison = change.after ?? change.before;
      return comparison && change.warningsAdded.length ? [comparison] : [];
    })
    .sort(byRows)
    .map(
      (comparison) =>
        `New color-vision warning between rows ${comparison.leftRow} and ${comparison.rightRow}.`,
    );
  return {
    spoken: [edited, ...apca, ...cvd].join(" "),
    visible: { edited, apca: apca.join(" "), cvd: cvd.join(" ") },
  };
}
