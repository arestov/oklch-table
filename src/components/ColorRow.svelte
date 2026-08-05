<script lang="ts">
import { announceAlert } from "../core/feedback/index.ts";
import {
  deleteColor,
  duplicateColor,
  finishEdit,
  setContrastBackground,
  updateColorDraft,
} from "../core/workspace/index.ts";
import type { UiEffect } from "../core/workspace/transactions.ts";
import type { PresentationIndex, RowView } from "../domain/presentation.ts";
import type { ColorId } from "../domain/types.ts";
import ChecksPopover from "./ChecksPopover.svelte";
import TextContrastPopover from "./TextContrastPopover.svelte";

let {
  row,
  index,
  invalidColorId,
  invalidField = null,
  fieldError = "",
  onAction = () => {},
  onDraftChanged = () => {},
  onFinishEdit = () => undefined,
}: {
  row: RowView;
  index: PresentationIndex;
  invalidColorId: ColorId | null;
  invalidField?: "css" | "l" | "c" | "h" | null;
  fieldError?: string;
  onAction?: (effects: readonly UiEffect[]) => void | Promise<void>;
  onDraftChanged?: () => void;
  onFinishEdit?: (reason: "enter" | "blur") => void;
} = $props();
let textContrastTrigger = $state<HTMLButtonElement>();
let checksTrigger = $state<HTMLButtonElement>();
const edit = (field: "css" | "l" | "c" | "h", raw: string) => {
  updateColorDraft(row.id, field, raw);
  onDraftChanged();
};
const finishOnEnter = (event: KeyboardEvent) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  finish("enter");
};
const finish = (reason: "enter" | "blur") => onFinishEdit(reason);
const duplicate = async () => {
  const result = duplicateColor(row.id);
  if (result.status === "invalid") {
    announceAlert(result.message);
    return;
  }
  if (result.status === "accepted") await onAction(result.effects);
};
const remove = async () => {
  const result = deleteColor(row.id);
  if (result.status === "invalid") {
    announceAlert(result.message);
    return;
  }
  if (result.status === "accepted") await onAction(result.effects);
};
const setBackground = (enabled: boolean) => {
  const result = setContrastBackground(row.id, enabled);
  if (result.status === "invalid") announceAlert(result.message);
};
</script>

<tr data-row-id={row.id}>
  <th scope="row">{row.row}</th>
  <td class="actions">
    <button type="button" aria-label={`Duplicate color ${row.row}`} onclick={duplicate}>
      Duplicate
    </button>
    <button type="button" aria-label={`Delete color ${row.row}`} onclick={remove}>Delete</button>
  </td>
  <td>
    <input
      type="text"
      class="css-color"
      value={row.css}
      data-field="css"
      aria-label={`CSS color for row ${row.row}`}
      aria-invalid={invalidColorId === row.id && invalidField === "css" ? "true" : undefined}
      oninput={(event) => edit("css", event.currentTarget.value)}
      onkeydown={finishOnEnter}
      onblur={() => finish("blur")}
    >
  </td>
  <td>
    <input
      type="number"
      value={row.lPercent}
      data-field="l"
      min="0"
      max="100"
      step="0.1"
      inputmode="decimal"
      aria-label={`Lightness percentage for row ${row.row}`}
      aria-invalid={invalidColorId === row.id && invalidField === "l" ? "true" : undefined}
      aria-describedby={invalidColorId === row.id && invalidField === "l" ? `field-error-${row.id}` : undefined}
      oninput={(event) => edit("l", event.currentTarget.value)}
      onkeydown={finishOnEnter}
      onblur={() => finish("blur")}
    >
    {#if invalidColorId === row.id && invalidField === "l"}
      <p id={`field-error-${row.id}`} class="visually-hidden">{fieldError}</p>
    {/if}
  </td>
  <td>
    <input
      type="number"
      value={row.c}
      data-field="c"
      min="0"
      step="0.001"
      inputmode="decimal"
      aria-label={`Chroma for row ${row.row}`}
      aria-invalid={invalidColorId === row.id && invalidField === "c" ? "true" : undefined}
      aria-describedby={invalidColorId === row.id && invalidField === "c" ? `field-error-${row.id}` : undefined}
      oninput={(event) => edit("c", event.currentTarget.value)}
      onkeydown={finishOnEnter}
      onblur={() => finish("blur")}
    >
    {#if invalidColorId === row.id && invalidField === "c"}
      <p id={`field-error-${row.id}`} class="visually-hidden">{fieldError}</p>
    {/if}
  </td>
  <td>
    <input
      type="number"
      value={row.h}
      data-field="h"
      min="0"
      max="360"
      step="0.1"
      inputmode="decimal"
      aria-label={`Hue in degrees for row ${row.row}`}
      aria-invalid={invalidColorId === row.id && invalidField === "h" ? "true" : undefined}
      aria-describedby={invalidColorId === row.id && invalidField === "h" ? `field-error-${row.id}` : undefined}
      oninput={(event) => edit("h", event.currentTarget.value)}
      onkeydown={finishOnEnter}
      onblur={() => finish("blur")}
    >
    {#if invalidColorId === row.id && invalidField === "h"}
      <p id={`field-error-${row.id}`} class="visually-hidden">{fieldError}</p>
    {/if}
  </td>
  <td class="checkbox-cell">
    <input
      type="checkbox"
      checked={row.background}
      aria-label={`Contrast background for row ${row.row}`}
      onchange={(event) => setBackground(event.currentTarget.checked)}
    >
  </td>
  <td>
    <button
      id={`text-contrast-trigger-${row.id}`}
      bind:this={textContrastTrigger}
      type="button"
      class="result-button"
      aria-label={`Text contrast for row ${row.row}: ${row.textContrast.text}. ${row.textContrast.detail}`}
      popovertarget={`text-contrast-${row.id}`}
    >
      <span class={row.textContrast.className}>{row.textContrast.text}</span>
      <small>{row.textContrast.detail}</small>
    </button>
    <TextContrastPopover
      {index}
      colorId={row.id}
      row={row.row}
      background={row.background}
      trigger={textContrastTrigger}
    />
  </td>
  <td>
    <button
      id={`checks-trigger-${row.id}`}
      bind:this={checksTrigger}
      type="button"
      class="result-button"
      aria-label={`Checks for row ${row.row}: ${row.checks.text}. ${row.checks.detail}`}
      popovertarget={`checks-${row.id}`}
    >
      <span class={row.checks.className}>{row.checks.text}</span>
      <small>{row.checks.detail}</small>
    </button>
    <ChecksPopover {index} colorId={row.id} row={row.row} trigger={checksTrigger} />
  </td>
</tr>
