import type { AnalysisTree, SemanticChanges, SemanticSnapshot } from "../../domain/types.ts";
import type { WorkspaceTransaction } from "../workspace/transactions.ts";

type Transaction = WorkspaceTransaction<AnalysisTree, SemanticSnapshot, SemanticChanges>;
export interface AnnouncementPlan {
  spoken: string;
  visible: { edited: string; apca: string; cvd: string };
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
  const apca = Object.values(changes.comparisons.contrast).flatMap((change) => {
    if (!change.support) return [];
    const comparison = change.after ?? change.before;
    return comparison
      ? [
          `Row ${comparison.leftRow} ${change.support.after ? "now supports" : "no longer supports"} the configured text on row ${comparison.rightRow}.`,
        ]
      : [];
  });
  const cvd = Object.values(changes.comparisons.colorVision).flatMap((change) => {
    const comparison = change.after ?? change.before;
    return comparison && change.warningsAdded.length
      ? [`New color-vision warning between rows ${comparison.leftRow} and ${comparison.rightRow}.`]
      : [];
  });
  return {
    spoken: [edited, ...apca, ...cvd].join(" "),
    visible: { edited, apca: apca.join(" "), cvd: cvd.join(" ") },
  };
}
