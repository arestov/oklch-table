<script lang="ts">
import type { ValidCandidate } from "../core/workspace/draft.ts";
import type { UiEffect } from "../core/workspace/transactions.ts";
import { buildRows } from "../domain/presentation.ts";
import type { AnalysisTree, ColorId } from "../domain/types.ts";
import ColorRow from "./ColorRow.svelte";

let {
  candidate,
  invalidField,
  fieldError,
  draftRaw,
  draftError,
  draftInput = $bindable(),
  onAction,
  onDraftChanged,
  onFinishEdit,
  onNewColorInput,
  onNewColorKeydown,
}: {
  candidate: ValidCandidate<AnalysisTree>;
  invalidField: "css" | "l" | "c" | "h" | null;
  fieldError: string;
  draftRaw: string;
  draftError: string;
  draftInput?: HTMLInputElement;
  onAction: (effects: readonly UiEffect[]) => void | Promise<void>;
  onDraftChanged: () => void;
  onFinishEdit: (reason: "enter" | "blur") => void;
  onNewColorInput: (raw: string) => void;
  onNewColorKeydown: (event: KeyboardEvent) => void;
} = $props();
</script>

<div class="table-shell">
  <table>
    <caption>
      Colors in the current workspace
    </caption>
    <thead>
      <tr>
        <th scope="col">#</th>
        <th scope="col">Actions</th>
        <th scope="col">CSS color</th>
        <th scope="col">L, %</th>
        <th scope="col">C</th>
        <th scope="col">H, °</th>
        <th scope="col">Contrast background</th>
        <th scope="col">Text contrast</th>
        <th scope="col">Checks</th>
      </tr>
    </thead>
    <tbody>
      {#each buildRows(candidate) as row (row.id)}
        <ColorRow
          {candidate}
          colorId={row.id}
          {invalidField}
          {fieldError}
          {onAction}
          {onDraftChanged}
          {onFinishEdit}
        />
      {/each}
      <tr data-draft="true">
        <th scope="row">{candidate.document.colors.order.length + 1}</th>
        <td colspan="2">
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
            aria-describedby="draft-help"
            oninput={(event) => onNewColorInput(event.currentTarget.value)}
            onkeydown={onNewColorKeydown}
          >
        </td>
        <td colspan="6">New color</td>
      </tr>
    </tbody>
  </table>
</div>
