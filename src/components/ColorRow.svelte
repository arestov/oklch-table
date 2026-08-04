<script lang="ts">
import { announceAlert } from "../core/feedback/index.ts";
import type { ValidCandidate } from "../core/workspace/draft.ts";
import {
  beginEdit,
  deleteColor,
  duplicateColor,
  finishEdit,
  setContrastBackground,
  updateDraft,
} from "../core/workspace/index.ts";
import type { UiEffect } from "../core/workspace/transactions.ts";
import { buildRows } from "../domain/presentation.ts";
import type { AnalysisTree, ColorId } from "../domain/types.ts";
import ChecksPopover from "./ChecksPopover.svelte";
import TextContrastPopover from "./TextContrastPopover.svelte";

let {
  candidate,
  colorId,
  invalidField = null,
  onAction = () => {},
  onFinishEdit = () => undefined,
  onDraftChanged = () => {},
}: {
  candidate: ValidCandidate<AnalysisTree>;
  colorId: ColorId;
  invalidField?: "css" | "l" | "c" | "h" | null;
  onAction?: (effects: readonly UiEffect[]) => void | Promise<void>;
  onFinishEdit?: (reason: "enter" | "blur") => void;
  onDraftChanged?: () => void;
} = $props();
const row = $derived.by(() => {
  const value = buildRows(candidate).find((item) => item.id === colorId);
  if (!value) throw new Error(`Unknown color ${colorId}`);
  return value;
});
let textContrastTrigger = $state<HTMLButtonElement>();
let checksTrigger = $state<HTMLButtonElement>();
const edit = (field: "css" | "l" | "c" | "h", raw: string) => {
  beginEdit(colorId, field);
  updateDraft(raw);
  onDraftChanged();
};
const finishOnEnter = (event: KeyboardEvent) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  finish("enter");
};
const finish = (reason: "enter" | "blur") => onFinishEdit(reason);
const duplicate = async () => {
  const result = duplicateColor(colorId);
  if (result.status === "invalid") {
    announceAlert(result.message);
    return;
  }
  if (result.status === "accepted") await onAction(result.effects);
};
const remove = async () => {
  const result = deleteColor(colorId);
  if (result.status === "invalid") {
    announceAlert(result.message);
    return;
  }
  if (result.status === "accepted") await onAction(result.effects);
};
const setBackground = (enabled: boolean) => {
  const result = setContrastBackground(colorId, enabled);
  if (result.status === "invalid") announceAlert(result.message);
};
</script>

<tr data-row-id={colorId}>
  <th scope="row">{row.row}</th>
  <td>
    <button type="button" aria-label={`Duplicate color ${row.row}`} onclick={duplicate}>
      Duplicate
    </button>
    <button type="button" aria-label={`Delete color ${row.row}`} onclick={remove}>Delete</button>
  </td>
  <td>
    <input
      class="css-color"
      value={row.css}
      data-field="css"
      aria-label={`CSS color for row ${row.row}`}
      aria-invalid={invalidField === "css" ? "true" : undefined}
      oninput={(event) => edit("css", event.currentTarget.value)}
      onkeydown={finishOnEnter}
      onblur={() => finish("blur")}
    >
  </td>
  <td>
    <input
      type="number"
      value={row.l}
      data-field="l"
      aria-label={`Lightness for row ${row.row}`}
      aria-invalid={invalidField === "l" ? "true" : undefined}
      oninput={(event) => edit("l", event.currentTarget.value)}
      onkeydown={finishOnEnter}
      onblur={() => finish("blur")}
    >
  </td>
  <td>
    <input
      type="number"
      value={row.c}
      data-field="c"
      aria-label={`Chroma for row ${row.row}`}
      aria-invalid={invalidField === "c" ? "true" : undefined}
      oninput={(event) => edit("c", event.currentTarget.value)}
      onkeydown={finishOnEnter}
      onblur={() => finish("blur")}
    >
  </td>
  <td>
    <input
      type="number"
      value={row.h}
      data-field="h"
      aria-label={`Hue for row ${row.row}`}
      aria-invalid={invalidField === "h" ? "true" : undefined}
      oninput={(event) => edit("h", event.currentTarget.value)}
      onkeydown={finishOnEnter}
      onblur={() => finish("blur")}
    >
  </td>
  <td>
    <input
      type="checkbox"
      checked={row.background}
      aria-label={`Contrast background for row ${row.row}`}
      onchange={(event) => setBackground(event.currentTarget.checked)}
    >
  </td>
  <td>
    <button
      id={`text-contrast-trigger-${colorId}`}
      bind:this={textContrastTrigger}
      type="button"
      aria-label={`Text contrast for row ${row.row}`}
      popovertarget={`text-contrast-${colorId}`}
    >
      Text contrast
    </button>
    <TextContrastPopover {candidate} {colorId} row={row.row} trigger={textContrastTrigger} />
  </td>
  <td>
    <button
      id={`checks-trigger-${colorId}`}
      bind:this={checksTrigger}
      type="button"
      aria-label={`Checks for row ${row.row}`}
      popovertarget={`checks-${colorId}`}
    >
      Checks
    </button>
    <ChecksPopover {candidate} {colorId} row={row.row} trigger={checksTrigger} />
  </td>
</tr>
