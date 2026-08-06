<script lang="ts">
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
  onEdit,
  onDuplicate,
  onDelete,
  onSetBackground,
  onFinishEdit = () => undefined,
}: {
  row: RowView;
  index: PresentationIndex;
  invalidColorId: ColorId | null;
  invalidField?: "css" | "l" | "c" | "h" | null;
  fieldError?: string;
  onEdit: (colorId: ColorId, field: "css" | "l" | "c" | "h", raw: string) => void;
  onDuplicate: (colorId: ColorId) => void | Promise<void>;
  onDelete: (colorId: ColorId) => void | Promise<void>;
  onSetBackground: (colorId: ColorId, enabled: boolean) => void | Promise<void>;
  onFinishEdit?: (reason: "enter" | "blur") => void;
} = $props();
let textContrastTrigger = $state<HTMLButtonElement>();
let checksTrigger = $state<HTMLButtonElement>();
const edit = (field: "css" | "l" | "c" | "h", raw: string) => {
  onEdit(row.id, field, raw);
};
const finishOnEnter = (event: KeyboardEvent) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  finish("enter");
};
const finish = (reason: "enter" | "blur") => onFinishEdit(reason);
const duplicate = () => onDuplicate(row.id);
const remove = () => onDelete(row.id);
const setBackground = (enabled: boolean) => onSetBackground(row.id, enabled);
</script>

<tr class="workspace-row" data-row-id={row.id}>
  <th class="workspace-row-number" scope="row">{row.row}</th>
  <td class="actions">
    <button
      class="row-action"
      type="button"
      aria-label={`Duplicate color ${row.row}`}
      onclick={duplicate}
    >
      Duplicate
    </button>
    <button
      class="row-action"
      type="button"
      aria-label={`Delete color ${row.row}`}
      onclick={remove}
    >
      Delete
    </button>
  </td>
  <td>
    <input
      type="text"
      class="css-color"
      value={row.css}
      data-field="css"
      aria-label={`CSS color for row ${row.row}`}
      aria-invalid={invalidColorId === row.id && invalidField === "css" ? "true" : undefined}
      aria-describedby={invalidColorId === row.id && invalidField === "css"
        ? `field-error-${row.id}`
        : undefined}
      oninput={(event) => edit("css", event.currentTarget.value)}
      onkeydown={finishOnEnter}
      onblur={() => finish("blur")}
    >
    {#if invalidColorId === row.id && invalidField === "css"}
      <p id={`field-error-${row.id}`} class="visually-hidden">{fieldError}</p>
    {/if}
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
  <td style:anchor-name={`--text-contrast-${row.id}`}>
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
  <td style:anchor-name={`--checks-${row.id}`}>
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

<style>
.workspace-row > * {
  padding: 10px 9px;
  border: 0;
  vertical-align: top;
  white-space: nowrap;
}

.workspace-row-number {
  padding-block-start: calc(10px + var(--control-text-inset));
  color: var(--muted);
  line-height: 1.25rem;
  text-align: right;
}

.actions {
  display: flex;
  gap: 6px;
}

:is(.row-action, .result-button) {
  min-block-size: 2.125rem;
  border-color: transparent;
  background: transparent;
  padding: 6px 7px;
  line-height: 1.25rem;

  &:hover {
    border-color: transparent;
    background: var(--surface-2);
  }
}

.checkbox-cell {
  text-align: center;

  & input {
    inline-size: 1.2rem;
    block-size: 1.2rem;
    margin: calc(7px + (1.25rem - 1.2rem) / 2) 0 0;
  }
}

input[type="text"],
input[type="number"] {
  width: 100%;
  min-width: 5.25rem;
  min-block-size: 2.125rem;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: var(--text);
  padding: 6px 7px;
  font-variant-numeric: tabular-nums;
  line-height: 1.25rem;

  &:hover {
    border-color: var(--border);
    background: var(--surface-2);
  }

  &:focus-visible {
    border-color: transparent;
    background: var(--surface);
    outline: 3px solid var(--focus);
    outline-offset: 1px;
  }

  &[aria-invalid="true"] {
    border-color: var(--danger);
  }
}

input[type="number"] {
  text-align: right;
}

input.css-color {
  min-width: 13rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.result-button {
  width: 100%;
  min-width: 10rem;
  text-align: left;
  white-space: normal;

  & small {
    display: block;
    margin-block-start: 3px;
    color: var(--muted);
    font-weight: 400;
  }
}
</style>
