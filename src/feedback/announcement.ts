import { round } from "../domain/color.ts";
import type {
  ActiveEdit,
  AnnouncementState,
  CandidateRevision,
  ContrastChange,
  SemanticChangesTree,
  SemanticSnapshot,
  VisibleFeedback,
} from "../domain/types.ts";

export interface AnnouncementPlan {
  spoken: string;
  visible: VisibleFeedback;
}

function formatRows(rows: number[]): { text: string; plural: boolean } {
  const unique = [...new Set(rows)].sort((a, b) => a - b);
  if (unique.length === 1) return { text: `row ${unique[0]}`, plural: false };
  if (unique.length === 2) return { text: `rows ${unique[0]} and ${unique[1]}`, plural: true };
  return { text: `rows ${unique.slice(0, -1).join(", ")}, and ${unique.at(-1)}`, plural: true };
}

function editedValue(candidate: CandidateRevision, context: ActiveEdit | null): string {
  if (!context) return "Value updated. Checks updated.";
  const color = candidate.document.byId[context.colorId];
  const analysis = candidate.analysis.colors[context.colorId];
  if (!color || !analysis) return "Value updated. Checks updated.";
  const value = {
    css: `CSS color ${analysis.css}.`,
    l: `Lightness ${round(color.lch.L, 3)}.`,
    c: `Chroma ${round(color.lch.C, 3)}.`,
    h: `Hue ${round(color.lch.H, 1)} degrees.`,
  }[context.field];
  return `${value} Checks updated.`;
}

function counterpartRow(change: ContrastChange, context: ActiveEdit | null): number | null {
  const current = change.after ?? change.before;
  if (!current) return null;
  if (!context) return current.leftRow;
  if (current.rightId === context.colorId) return current.leftRow;
  if (current.leftId === context.colorId) return current.rightRow;
  return current.leftRow;
}

function currentCvdConflictCount(snapshot: SemanticSnapshot): number {
  return Object.values(snapshot.cvd).filter((item) => item.warnings.length > 0).length;
}

export function buildAnnouncementPlan(
  candidate: CandidateRevision,
  changes: SemanticChangesTree,
  snapshot: SemanticSnapshot,
  context: ActiveEdit | null,
  editedOverride?: string,
): AnnouncementPlan {
  const edited = editedOverride ?? editedValue(candidate, context);
  const lost: number[] = [];
  const gained: number[] = [];
  const stricter: number[] = [];
  const easier: number[] = [];

  for (const change of Object.values(changes.contrast)) {
    if (!change.before || !change.after) continue;
    const row = counterpartRow(change, context);
    if (row === null) continue;
    if (change.support) {
      if (change.support.before && !change.support.after) lost.push(row);
      if (!change.support.before && change.support.after) gained.push(row);
      continue;
    }
    if (change.recommendationKey) {
      if (change.recommendationKey.after < change.recommendationKey.before) stricter.push(row);
      if (change.recommendationKey.after > change.recommendationKey.before) easier.push(row);
    }
  }

  const apcaParts: string[] = [];
  if (lost.length) {
    const rows = formatRows(lost);
    apcaParts.push(
      `${rows.text} no longer ${rows.plural ? "support" : "supports"} the configured text`,
    );
  }
  if (gained.length) {
    const rows = formatRows(gained);
    apcaParts.push(`${rows.text} now ${rows.plural ? "support" : "supports"} it`);
  }
  if (stricter.length)
    apcaParts.push(`recommendations became stricter for ${formatRows(stricter).text}`);
  if (easier.length) apcaParts.push(`recommendations became easier for ${formatRows(easier).text}`);
  const apca = apcaParts.length ? `${apcaParts.join("; ")}.` : "";

  let added = 0;
  let resolved = 0;
  for (const change of Object.values(changes.cvd)) {
    if (!change.before || !change.after) continue;
    if (!change.before.warnings.length && change.after.warnings.length) added += 1;
    if (change.before.warnings.length && !change.after.warnings.length) resolved += 1;
  }
  const cvdParts: string[] = [];
  if (added) cvdParts.push(`${added} possible ${added === 1 ? "conflict" : "conflicts"} added`);
  if (resolved)
    cvdParts.push(`${resolved} possible ${resolved === 1 ? "conflict" : "conflicts"} resolved`);
  const remaining = currentCvdConflictCount(snapshot);
  const cvd = cvdParts.length
    ? `${cvdParts.join("; ")}; ${remaining} ${remaining === 1 ? "remains" : "remain"}.`
    : "";

  const spoken = [edited, apca ? `APCA: ${apca}` : "", cvd ? `Color vision: ${cvd}` : ""]
    .filter(Boolean)
    .join(" ");
  return { spoken, visible: { edited, apca, cvd } };
}

export function emptyAnnouncements(): AnnouncementState {
  return {
    shortcut: { id: 0, text: "" },
    result: { id: 0, text: "" },
    alert: { id: 0, text: "" },
  };
}
