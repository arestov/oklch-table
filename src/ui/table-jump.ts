import { columnForShortcut, type TableCoordinate } from "./table-navigation.ts";

export type TableJumpState = { status: "idle" } | { status: "pending"; origin: TableCoordinate };

export type TableJumpTransition =
  | { state: TableJumpState; type: "none" | "pass" | "consume" | "cancel" }
  | { state: TableJumpState; type: "navigate"; coordinate: TableCoordinate };

type KeyboardInput = Pick<KeyboardEvent, "code" | "key" | "shiftKey">;

const modifierKeys = new Set(["Alt", "Control", "Meta", "Shift"]);

export function beginTableJump(origin: TableCoordinate): TableJumpState {
  return { status: "pending", origin };
}

function digitFromInput(event: KeyboardInput): string | null {
  if (/^Digit\d$/.test(event.code)) return event.code.slice(-1);
  return /^\d$/.test(event.key) ? event.key : null;
}

export function reduceTableJump(state: TableJumpState, event: KeyboardInput): TableJumpTransition {
  if (state.status === "idle") return { state, type: "none" };
  if (modifierKeys.has(event.key)) return { state, type: "none" };
  if (event.key === "Escape") return { state: { status: "idle" }, type: "cancel" };

  const digit = digitFromInput(event);
  if (!digit) return { state: { status: "idle" }, type: "pass" };

  if (event.shiftKey) {
    return {
      state: { status: "idle" },
      type: "navigate",
      coordinate: { row: digit === "0" ? 10 : Number(digit), column: state.origin.column },
    };
  }

  const column = columnForShortcut(digit);
  return column
    ? {
        state: { status: "idle" },
        type: "navigate",
        coordinate: { row: state.origin.row, column },
      }
    : { state: { status: "idle" }, type: "consume" };
}
