<script lang="ts">
import { CVD_MODES } from "../domain/analysis.ts";
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
const cvdResultsId = $derived(`color-vision-results-${colorId}`);
const cvdStatus = $derived(
  rows.length === 1 ? "Showing 1 color comparison." : `Showing ${rows.length} color comparisons.`,
);
const contrastIssues = $derived(
  buildContrastRows(index, colorId, "all").filter((item) => item.wcagKey === 0),
);

const cvdModeLabels = {
  protanopia: "Protanopia",
  deuteranopia: "Deuteranopia",
  tritanopia: "Tritanopia",
} as const;
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
  <label class="filter-row">
    <input type="checkbox" bind:checked={hidePass} aria-controls={cvdResultsId}>
    Hide all-pass comparisons
  </label>
  <div id={cvdResultsId}>
    <p class="visually-hidden" role="status" aria-atomic="true">{cvdStatus}</p>
    {#if rows.length}
      <div class="cvd-table-scroll">
        <table class="cvd-table">
          <caption>
            Color vision comparisons for color {row}
          </caption>
          <thead>
            <tr>
              <th scope="col">Compared color</th>
              {#each CVD_MODES as mode}
                <th scope="col">{cvdModeLabels[mode]}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each rows as item (item.key)}
              <tr>
                <th scope="row">Color {item.otherRow}</th>
                {#each CVD_MODES as mode}
                  {@const signal = item.modes[mode]}
                  <td><span data-tone={signal.tone}>{signal.label}</span></td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="empty-state">No possible color-vision conflicts are visible.</p>
    {/if}
  </div>
</AnchoredPopover>

<style>
.filter-row {
  display: flex;
  gap: 9px;
  align-items: center;
  margin-block: 8px 13px;
}

.cvd-table-scroll {
  max-inline-size: 100%;
  overflow-x: auto;
}

.cvd-table {
  min-width: 34rem;
  border: 0;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums lining-nums;

  & caption {
    padding: 0 0 8px;
    font-size: 1.05rem;
    font-weight: 760;
    text-align: left;
  }

  & thead th {
    border-bottom: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
    font-size: 0.86rem;
    font-weight: 600;
    letter-spacing: normal;
    padding: 10px 9px;
    text-align: left;
    text-transform: none;
    vertical-align: top;
    white-space: normal;
  }

  & tbody th,
  & tbody td {
    padding: 10px 9px;
    border: 0;
    vertical-align: top;
    white-space: normal;
  }

  & tbody tr + tr > * {
    border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
  }

  & thead th:not(:first-child),
  & tbody td {
    text-align: center;
  }
}

.empty-state {
  padding: 12px;
  border: 1px dashed var(--border);
  border-radius: 9px;
  color: var(--muted);
}

[data-tone="pass"] {
  color: var(--success);
}

[data-tone="warning"] {
  color: var(--warning);
}
</style>
