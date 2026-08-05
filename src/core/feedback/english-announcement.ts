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
    return `APCA: ${rows(textRows)} ${message} on background row ${backgroundRow}.`;
  });
  const wcag = plan.wcag.map(({ direction, count, remaining }) =>
    direction === "failed"
      ? `WCAG: ${count} failure${count === 1 ? "" : "s"} added; ${remaining} remain.`
      : direction === "resolved"
        ? `WCAG: ${count} failure${count === 1 ? "" : "s"} resolved; ${remaining} remain.`
        : direction === "large-only"
          ? `WCAG: ${count} comparison${count === 1 ? "" : "s"} now support${count === 1 ? "s" : ""} large text only.`
          : `WCAG: ${count} comparison${count === 1 ? "" : "s"} now support${count === 1 ? "s" : ""} normal text.`,
  );
  const cvd = plan.cvd.map(({ direction, pairs, remaining }) => {
    const outcome = direction === "added" ? "detected" : "resolved";
    return pairs.length === 1
      ? `Color vision: conflict between row ${pairs[0][0]} and row ${pairs[0][1]} ${outcome}; ${remaining} remain.`
      : `Color vision: ${pairs.length} possible conflicts ${outcome}; ${remaining} remain.`;
  });
  return {
    spoken: [edited, ...apca, ...wcag, ...cvd].join(" "),
    visible: { edited, apca: apca.join(" "), wcag: wcag.join(" "), cvd: cvd.join(" ") },
  };
}
