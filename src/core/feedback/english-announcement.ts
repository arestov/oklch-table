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
  const rows = (items: readonly number[]) =>
    items.length === 1
      ? `row ${items[0]}`
      : items.length <= 4
        ? `rows ${items.join(", ")}`
        : `${items.length} rows`;
  const apca = plan.apca.map(({ textRows, backgroundRow, direction }) => {
    const singular = textRows.length === 1;
    const message =
      direction === "lost"
        ? singular
          ? "is no longer readable"
          : "are no longer readable"
        : direction === "restored"
          ? singular
            ? "is now readable"
            : "are now readable"
          : direction === "stricter"
            ? singular
              ? "now requires larger text"
              : "now require larger text"
            : singular
              ? "now allows smaller text"
              : "now allow smaller text";
    return `APCA: Text ${rows(textRows)} ${message} on background row ${backgroundRow}.`;
  });
  const wcag = plan.wcag.map(({ direction, count, remaining }) =>
    direction === "added"
      ? `WCAG: ${count} issue${count === 1 ? "" : "s"} added; ${remaining} remain.`
      : `WCAG: ${count} issue${count === 1 ? "" : "s"} resolved; ${remaining} remain.`,
  );
  const cvd = plan.cvd.map(({ direction, pairs }) => {
    const details =
      pairs.length === 1
        ? `row ${pairs[0][0]} and row ${pairs[0][1]}`
        : `${pairs.length} color pairs`;
    return `Color vision: conflict${pairs.length === 1 ? "" : "s"} with ${details} ${direction === "added" ? "detected" : "resolved"}.`;
  });
  return {
    spoken: [edited, ...apca, ...wcag, ...cvd].join(" "),
    visible: { edited, apca: apca.join(" "), wcag: wcag.join(" "), cvd: cvd.join(" ") },
  };
}
