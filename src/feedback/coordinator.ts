import {
  changesAreEmpty,
  createSemanticSnapshot,
  diffSemanticSnapshots,
  fieldChanged,
} from "../domain/semantic.ts";
import type {
  ActiveEdit,
  CandidateRevision,
  CommitReason,
  CommitTransaction,
  SemanticSnapshot,
} from "../domain/types.ts";
import { buildAnnouncementPlan } from "./announcement.ts";

export interface FeedbackOutput {
  publishResult(text: string, visible: { edited: string; apca: string; cvd: string }): void;
  publishAlert(text: string): void;
}

export class FeedbackCoordinator {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private latest: CandidateRevision;
  private baseline: SemanticSnapshot;
  private context: ActiveEdit | null = null;
  private readonly output: FeedbackOutput;
  private readonly idleMs: number;

  constructor(initial: CandidateRevision, output: FeedbackOutput, idleMs = 700) {
    this.latest = initial;
    this.baseline = createSemanticSnapshot(initial);
    this.output = output;
    this.idleMs = idleMs;
  }

  receive(candidate: CandidateRevision): void {
    this.latest = candidate;
    if (this.context) this.schedule();
  }

  begin(context: ActiveEdit): void {
    this.context = context;
    this.cancelTimer();
  }

  cancelTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  schedule(): void {
    this.cancelTimer();
    this.timer = setTimeout(() => this.flush("idle"), this.idleMs);
  }

  flush(reason: CommitReason): CommitTransaction | null {
    this.cancelTimer();
    const after = createSemanticSnapshot(this.latest);
    const changes = diffSemanticSnapshots(this.baseline, after);
    if (changesAreEmpty(changes) || (this.context && !fieldChanged(changes, this.context))) {
      return null;
    }
    const transaction: CommitTransaction = {
      id: crypto.randomUUID(),
      reason,
      before: this.baseline,
      after,
      changes,
      context: this.context,
    };
    const plan = buildAnnouncementPlan(this.latest, changes, after, this.context);
    this.output.publishResult(plan.spoken, plan.visible);
    this.baseline = after;
    return transaction;
  }

  publishImmediate(
    before: SemanticSnapshot,
    candidate: CandidateRevision,
    edited: string,
  ): CommitTransaction {
    this.cancelTimer();
    const after = createSemanticSnapshot(candidate);
    const changes = diffSemanticSnapshots(before, after);
    const transaction: CommitTransaction = {
      id: crypto.randomUUID(),
      reason: "action",
      before,
      after,
      changes,
      context: null,
    };
    const plan = buildAnnouncementPlan(candidate, changes, after, null, edited);
    this.output.publishResult(plan.spoken, plan.visible);
    this.baseline = after;
    return transaction;
  }

  syncBaseline(candidate: CandidateRevision): void {
    this.latest = candidate;
    this.baseline = createSemanticSnapshot(candidate);
  }

  end(): void {
    this.cancelTimer();
    this.context = null;
  }

  alert(message: string): void {
    this.output.publishAlert(message);
  }
}
