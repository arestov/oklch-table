export interface FeedbackCoordinator {
  schedule(): void;
  cancel(): void;
  destroy(): void;
}

/** Schedules one idle checkpoint; it owns timing, while the workspace owns transactions. */
export function createFeedbackCoordinator(
  checkpoint: () => void,
  delay = 700,
): FeedbackCoordinator {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    if (timeout === undefined) return;
    clearTimeout(timeout);
    timeout = undefined;
  };
  return {
    schedule() {
      cancel();
      timeout = setTimeout(() => {
        timeout = undefined;
        checkpoint();
      }, delay);
    },
    cancel,
    destroy: cancel,
  };
}
