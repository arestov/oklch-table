import { afterEach, describe, expect, it, vi } from "vitest";
import { createFeedbackCoordinator } from "./coordinator.ts";

afterEach(() => {
  vi.useRealTimers();
});

describe("feedback coordinator", () => {
  it("debounces to one checkpoint and cleans up its timer", () => {
    vi.useFakeTimers();
    const checkpoint = vi.fn();
    const coordinator = createFeedbackCoordinator(checkpoint);

    coordinator.schedule();
    coordinator.schedule();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(700);
    expect(checkpoint).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);

    coordinator.schedule();
    coordinator.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
