import { tick } from "svelte";
import type { UiEffect } from "../core/workspace/transactions.ts";

/** Executes the application-core focus contract within the mounted workspace only. */
export async function executeUiEffects(
  root: HTMLElement,
  effects: readonly UiEffect[],
): Promise<void> {
  await tick();
  for (const effect of effects) {
    const target =
      effect.type === "focus-new-color"
        ? root.querySelector<HTMLElement>('[data-draft="true"] input')
        : effect.type === "focus-field"
          ? root.querySelector<HTMLElement>(
              `[data-row-id="${effect.colorId}"] input[data-field="${effect.field}"]`,
            )
          : effect.type === "focus-action"
            ? root.querySelector<HTMLElement>(`[data-row-id="${effect.colorId}"] button`)
            : root.querySelector<HTMLElement>(`#${effect.popover}-trigger-${effect.colorId}`);
    target?.focus();
    if (effect.type === "open-popover") target?.click();
  }
}
