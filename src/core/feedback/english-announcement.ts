import type { AnalysisTree, SemanticChanges, SemanticSnapshot } from "../../domain/types.ts";
import type { WorkspaceTransaction } from "../workspace/transactions.ts";
import { buildAnnouncementPlan } from "./announcement-plan.ts";

type Transaction = WorkspaceTransaction<AnalysisTree, SemanticSnapshot, SemanticChanges>;
export interface RenderedAnnouncement {
  spoken: string;
  visible: { edited: string; apca: string; wcag: string; cvd: string };
}

/** English-only rendering of a precomputed, language-neutral plan. */
export function buildEnglishAnnouncement(transaction: Transaction): RenderedAnnouncement {
  const plan = buildAnnouncementPlan(transaction);
  const edited =
    plan.edit.type === "add"
      ? `Color added as row ${plan.edit.row}.`
      : plan.edit.type === "duplicate"
        ? `Row ${plan.edit.sourceRow} duplicated as row ${plan.edit.destinationRow}.${plan.edit.inheritsBackground ? " It inherits the contrast-background role." : ""}`
        : plan.edit.type === "delete"
          ? `Row ${plan.edit.row} deleted.`
          : plan.edit.type === "background"
            ? plan.edit.enabled
              ? `Row ${plan.edit.row} selected as a contrast background.`
              : `Row ${plan.edit.row} is no longer a contrast background.`
            : `${plan.edit.field} ${plan.edit.value}. Checks updated.`;
  const apca = plan.apca.map(
    ({ comparison, direction }) =>
      `APCA: Text row ${comparison.leftRow} ${direction === "lost" ? "is no longer readable" : "is now readable"} on background row ${comparison.rightRow}.`,
  );
  const wcag = plan.wcag.map(({ comparison, before, after }) => {
    const label = (key: number) =>
      key === 0 ? "an issue" : key === 1 ? "large text only" : "AA pass";
    const change = after < before ? "issue added" : "issue resolved";
    return `WCAG: Text row ${comparison.leftRow} on background row ${comparison.rightRow}: ${change} (${label(after)}).`;
  });
  const cvd = plan.cvd.map(
    ({ comparison, direction, modes }) =>
      `Color vision: ${direction === "added" ? "New" : "Resolved"} warning${modes.length === 1 ? "" : "s"} (${modes.join(", ")}) between rows ${comparison.leftRow} and ${comparison.rightRow}.`,
  );
  return {
    spoken: [edited, ...apca, ...wcag, ...cvd].join(" "),
    visible: { edited, apca: apca.join(" "), wcag: wcag.join(" "), cvd: cvd.join(" ") },
  };
}
