<script lang="ts">
import type { ValidCandidate } from "../core/workspace/draft.ts";
import { buildCvdRows } from "../domain/presentation.ts";
import type { AnalysisTree, ColorId } from "../domain/types.ts";

let {
  candidate,
  colorId,
  row,
  triggerId,
}: { candidate: ValidCandidate<AnalysisTree>; colorId: ColorId; row: number; triggerId: string } =
  $props();
let hidePass = $state(true);
let popover: HTMLElement;
const manageFocus = () => {
  if (popover.matches(":popover-open")) popover.querySelector<HTMLElement>("h2")?.focus();
  else document.getElementById(triggerId)?.focus();
};
const rows = $derived(
  buildCvdRows(candidate, colorId).filter((item) => !hidePass || item.hasWarning),
);
</script>

<section
  id={`checks-${colorId}`}
  popover="auto"
  aria-labelledby={`checks-${colorId}-title`}
  bind:this={popover}
  ontoggle={manageFocus}
>
  <div class="popover-head">
    <h2 id={`checks-${colorId}-title`} tabindex="-1">Checks — color {row}</h2>
    <button type="button" popovertarget={`checks-${colorId}`} popovertargetaction="hide">
      Close
    </button>
  </div>
  <div class="popover-body">
    <label><input type="checkbox" bind:checked={hidePass}> Hide all-pass comparisons</label>
    {#if rows.length}
      <ul>
        {#each rows as item (item.key)}
          <li>Color {item.otherRow}: {item.hasWarning ? "Possible conflict" : "Pass"}</li>
        {/each}
      </ul>
    {:else}
      <p class="empty-state">No possible color-vision conflicts are visible.</p>
    {/if}
  </div>
</section>
