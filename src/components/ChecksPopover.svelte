<script lang="ts">
import { buildContrastRows, buildCvdRows, type PresentationIndex } from "../domain/presentation.ts";
import type { ColorId } from "../domain/types.ts";
import AnchoredPopover from "./AnchoredPopover.svelte";

let {
  index,
  colorId,
  row,
  trigger,
}: {
  index: PresentationIndex;
  colorId: ColorId;
  row: number;
  trigger: HTMLButtonElement | undefined;
} = $props();
let hidePass = $state(true);
const rows = $derived(buildCvdRows(index, colorId).filter((item) => !hidePass || item.hasWarning));
const contrastIssues = $derived(
  buildContrastRows(index, colorId, "all").filter((item) => item.wcagKey === 0),
);
</script>

<AnchoredPopover
  id={`checks-${colorId}`}
  title={`Checks — color ${row}`}
  {trigger}
  anchorName={`--checks-${colorId}`}
>
  {#if contrastIssues.length}
    <h3>WCAG issues</h3>
    <ul>
      {#each contrastIssues as item (item.key)}
        <li>Text row {item.textRow} on background row {item.backgroundRow}: {item.wcag}</li>
      {/each}
    </ul>
  {/if}
  <h3>Color vision</h3>
  <label><input type="checkbox" bind:checked={hidePass}> Hide all-pass comparisons</label>
  {#if rows.length}
    <ul>
      {#each rows as item (item.key)}
        <li>
          Color {item.otherRow}:
          {#each Object.entries(item.modes) as [mode, signal]}
            {mode} {signal.label}{" "}
          {/each}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty-state">No possible color-vision conflicts are visible.</p>
  {/if}
</AnchoredPopover>
