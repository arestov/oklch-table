import { afterEach, describe, expect, it, vi } from "vitest";
import { createFeedbackCoordinator } from "./coordinator.ts";

afterEach(() => {
  vi.useRealTimers();
});

describe("feedback coordinator", () => {
  it("runs one checkpoint at 700 ms after the final input", () => {
    vi.useFakeTimers();
    const checkpoint = vi.fn();
    const coordinator = createFeedbackCoordinator(checkpoint);

    coordinator.schedule();
    vi.advanceTimersByTime(699);
    expect(checkpoint).not.toHaveBeenCalled();
    coordinator.schedule();
    vi.advanceTimersByTime(699);
    expect(checkpoint).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(checkpoint).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels a pending checkpoint during an explicit boundary or teardown", () => {
    vi.useFakeTimers();
    const checkpoint = vi.fn();
    const coordinator = createFeedbackCoordinator(checkpoint);

    coordinator.schedule();
    coordinator.cancel();
    vi.advanceTimersByTime(700);
    expect(checkpoint).not.toHaveBeenCalled();

    coordinator.schedule();
    coordinator.destroy();
    vi.advanceTimersByTime(700);
    expect(checkpoint).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
