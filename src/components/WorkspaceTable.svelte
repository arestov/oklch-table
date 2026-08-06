<script lang="ts">
import type { ValidCandidate } from "../core/workspace/draft.ts";
import { buildWorkspacePresentation } from "../domain/presentation.ts";
import type { AnalysisTree, ColorId } from "../domain/types.ts";
import ColorRow from "./ColorRow.svelte";

let {
  candidate,
  invalidColorId,
  invalidField,
  fieldError,
  draftRaw,
  draftError,
  draftInput = $bindable(),
  onEdit,
  onDuplicate,
  onDelete,
  onSetBackground,
  onFinishEdit,
  onNewColorInput,
  onNewColorPaste,
  onNewColorKeydown,
}: {
  candidate: ValidCandidate<AnalysisTree>;
  invalidColorId: ColorId | null;
  invalidField: "css" | "l" | "c" | "h" | null;
  fieldError: string;
  draftRaw: string;
  draftError: string;
  draftInput?: HTMLInputElement | undefined;
  onEdit: (colorId: ColorId, field: "css" | "l" | "c" | "h", raw: string) => void;
  onDuplicate: (colorId: ColorId) => void | Promise<void>;
  onDelete: (colorId: ColorId) => void | Promise<void>;
  onSetBackground: (colorId: ColorId, enabled: boolean) => void | Promise<void>;
  onFinishEdit: (reason: "enter" | "blur") => void;
  onNewColorInput: (raw: string) => void;
  onNewColorPaste: (raw: string) => void;
  onNewColorKeydown: (event: KeyboardEvent) => void;
} = $props();
const presentation = $derived(buildWorkspacePresentation(candidate));
</script>

<div class="table-shell">
  <table class="workspace-table">
    <caption>
      Colors in the current workspace
    </caption>
    <colgroup>
      <col class="row-number-column">
      <col class="actions-column">
      <col class="css-color-column">
      <col class="numeric-column">
      <col class="numeric-column">
      <col class="numeric-column">
      <col class="contrast-background-column">
      <col class="result-column">
      <col class="result-column">
    </colgroup>
    <thead>
      <tr>
        <th scope="col" class="numeric-heading">#</th>
        <th scope="col">Actions</th>
        <th scope="col">CSS color</th>
        <th scope="col" class="numeric-heading">L, %</th>
        <th scope="col" class="numeric-heading">C</th>
        <th scope="col" class="numeric-heading">H, °</th>
        <th scope="col">Contrast<br>background</th>
        <th scope="col">Text contrast</th>
        <th scope="col">Checks</th>
      </tr>
    </thead>
    <tbody>
      {#each presentation.rows as row (row.id)}
        <ColorRow
          {row}
          index={presentation.index}
          {invalidColorId}
          {invalidField}
          {fieldError}
          {onEdit}
          {onDuplicate}
          {onDelete}
          {onSetBackground}
          {onFinishEdit}
        />
      {/each}
      <tr class="workspace-row workspace-draft-row" data-draft="true">
        <th class="workspace-row-number" scope="row">
          {candidate.document.colors.order.length + 1}
        </th>
        <td class="actions"></td>
        <td class="draft-input-cell">
          <input
            bind:this={draftInput}
            class="css-color"
            type="text"
            value={draftRaw}
            placeholder="fill color"
            aria-label={`CSS color for new row ${candidate.document.colors.order.length + 1}`}
            autocomplete="off"
            spellcheck="false"
            aria-invalid={draftError ? "true" : undefined}
            aria-describedby={draftError ? "draft-help draft-error" : "draft-help"}
            oninput={(event) => onNewColorInput(event.currentTarget.value)}
            onpaste={(event) => {
              const raw = event.clipboardData?.getData("text/plain");
              if (raw === undefined) return;
              event.preventDefault();
              onNewColorPaste(raw);
            }}
            onkeydown={onNewColorKeydown}
          >
        </td>
        <td class="row-text-cell" colspan="6">New color</td>
      </tr>
    </tbody>
  </table>
</div>

<style>
.table-shell {
  overflow-x: auto;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.workspace-table {
  --control-text-inset: 7px;

  width: 100%;
  min-width: 69rem;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums lining-nums;

  & caption {
    padding: 0 0 12px;
    font-size: 1.05rem;
    font-weight: 760;
    text-align: left;
  }

  & > thead > tr > th,
  & .workspace-draft-row > * {
    padding: 10px 9px;
    border: 0;
    vertical-align: top;
    white-space: nowrap;
  }

  & > thead > tr > th {
    border-bottom: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: normal;
    text-align: left;
    text-transform: none;
  }

  & .numeric-heading {
    text-align: right;
  }
}

.workspace-table :global(.workspace-row + .workspace-row > *) {
  border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
}

.workspace-draft-row {
  background: color-mix(in srgb, var(--surface-2) 74%, transparent);

  & :where(td:not(.draft-input-cell), th) {
    color: var(--muted);
  }
}

.workspace-draft-row input[type="text"] {
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
}

.workspace-draft-row input[type="text"]:hover {
  border-color: var(--border);
  background: var(--surface-2);
}

.workspace-draft-row input[type="text"]:focus-visible {
  border-color: transparent;
  background: var(--surface);
  outline: 3px solid var(--focus);
  outline-offset: 1px;
}

.workspace-draft-row input[type="text"][aria-invalid="true"] {
  border-color: var(--danger);
}

.workspace-draft-row input.css-color {
  min-width: 13rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.row-number-column {
  width: 3rem;
}

.actions-column {
  width: 10.5rem;
}

.css-color-column {
  width: 15rem;
}

.numeric-column {
  width: 6.5rem;
}

.contrast-background-column {
  width: 7rem;
}

.result-column {
  width: auto;
}

.workspace-row-number {
  padding-block-start: calc(10px + var(--control-text-inset));
  color: var(--muted);
  line-height: 1.25rem;
  text-align: right;
}

.row-text-cell {
  padding-block-start: calc(10px + var(--control-text-inset));
  line-height: 1.25rem;
}
</style>
