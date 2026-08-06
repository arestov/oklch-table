import { describe, expect, it } from "vitest";
import { beginTableJump, reduceTableJump } from "./table-jump.ts";

const origin = { row: 4, column: "hue" } as const;
const key = (value: string, code = value): Pick<KeyboardEvent, "code" | "key" | "shiftKey"> => ({
  code,
  key: value,
  shiftKey: false,
});

describe("table jump", () => {
  it("jumps to a column in the selected row", () => {
    expect(reduceTableJump(beginTableJump(origin), key("3", "Digit3"))).toEqual({
      state: { status: "idle" },
      type: "navigate",
      coordinate: { row: 4, column: "lightness" },
    });
  });

  it("accepts a digit from event.key when no physical key code is available", () => {
    expect(reduceTableJump(beginTableJump(origin), key("4", ""))).toMatchObject({
      type: "navigate",
      coordinate: { row: 4, column: "chroma" },
    });
  });

  it("uses a shifted physical digit key to select a row", () => {
    expect(
      reduceTableJump(beginTableJump(origin), { code: "Digit2", key: "@", shiftKey: true }),
    ).toEqual({
      state: { status: "idle" },
      type: "navigate",
      coordinate: { row: 2, column: "hue" },
    });
  });

  it("maps Shift+0 to row 10", () => {
    expect(
      reduceTableJump(beginTableJump(origin), { code: "Digit0", key: ")", shiftKey: true }),
    ).toMatchObject({ type: "navigate", coordinate: { row: 10, column: "hue" } });
  });

  it("keeps the sequence active while a modifier key is released", () => {
    const state = beginTableJump(origin);
    expect(reduceTableJump(state, key("Shift", "ShiftLeft"))).toEqual({ state, type: "none" });
  });

  it("cancels on Escape and consumes unsupported digit shortcuts", () => {
    expect(reduceTableJump(beginTableJump(origin), key("Escape"))).toEqual({
      state: { status: "idle" },
      type: "cancel",
    });
    expect(reduceTableJump(beginTableJump(origin), key("9", "Digit9"))).toEqual({
      state: { status: "idle" },
      type: "consume",
    });
  });
});
