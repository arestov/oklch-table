<script lang="ts">
import type { ValidCandidate } from "../core/workspace/draft.ts";
import { buildContrastRows, buildCvdRows } from "../domain/presentation.ts";
import type { AnalysisTree, ColorId } from "../domain/types.ts";

let {
  candidate,
  colorId,
  row,
  trigger,
}: {
  candidate: ValidCandidate<AnalysisTree>;
  colorId: ColorId;
  row: number;
  trigger: HTMLButtonElement | undefined;
} = $props();
let hidePass = $state(true);
let popover: HTMLElement;
const manageFocus = () => {
  if (popover.matches(":popover-open")) popover.querySelector<HTMLElement>("h2")?.focus();
  else trigger?.focus();
};
const rows = $derived(
  buildCvdRows(candidate, colorId).filter((item) => !hidePass || item.hasWarning),
);
const contrastIssues = $derived(
  buildContrastRows(candidate, colorId, "all").filter((item) => item.className === "status-fail"),
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
  </div>
</section>
