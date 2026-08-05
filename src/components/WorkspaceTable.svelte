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
  draftInput?: HTMLInputElement;
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
  <table>
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
      <tr data-draft="true">
        <th scope="row">{candidate.document.colors.order.length + 1}</th>
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
