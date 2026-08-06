<script lang="ts">
import type { ContrastRowView } from "../domain/presentation";

let { caption, rows }: { caption: string; rows: ContrastRowView[] } = $props();
</script>

{#if rows.length}
  <div class="contrast-table-scroll">
    <table class="contrast-table">
      <caption>
        {caption}
      </caption>
      <thead>
        <tr>
          <th scope="col">Text</th>
          <th scope="col">Background</th>
          <th scope="col">Recommended use</th>
          <th scope="col">Regular 400</th>
          <th scope="col">Bold 700</th>
          <th scope="col">APCA</th>
          <th scope="col">Polarity</th>
          <th scope="col">WCAG 2</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as comparison (comparison.key)}
          <tr>
            <th scope="row">Color {comparison.textRow}</th>
            <td>Color {comparison.backgroundRow}</td>
            <td data-tone={comparison.apcaTone}>{comparison.recommendation}</td>
            <td data-tone={comparison.apcaTone}>{comparison.regular}</td>
            <td data-tone={comparison.apcaTone}>{comparison.bold}</td>
            <td data-tone={comparison.apcaTone}>{comparison.apca}</td>
            <td>{comparison.polarity}</td>
            <td data-tone={comparison.wcagTone}>{comparison.wcag}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p class="empty-state">
    No comparison is available. Add another color and select the intended contrast background.
  </p>
{/if}

<style>
.contrast-table-scroll {
  max-inline-size: 100%;
  overflow-x: auto;
}

.contrast-table {
  width: 100%;
  min-width: 69rem;
  margin-inline: auto;
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
    text-align: left;
    text-transform: none;
  }

  & th,
  & td {
    padding: 10px 9px;
    border: 0;
    vertical-align: top;
    white-space: normal;
  }

  & tbody tr + tr > * {
    border-top: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
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

[data-tone="fail"] {
  color: var(--danger);
  font-weight: 720;
}
</style>
