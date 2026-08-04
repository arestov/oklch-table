<script lang="ts">
import type { ContrastRowView } from "../domain/presentation";

export let caption: string;
export let rows: ContrastRowView[];
</script>

{#if rows.length}
  <table>
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
        <th scope="col">WCAG 2</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as comparison (comparison.key)}
        <tr>
          <th scope="row">Color {comparison.textRow}</th>
          <td class={comparison.className}>Color {comparison.backgroundRow}</td>
          <td class={comparison.className}>{comparison.recommendation}</td>
          <td class={comparison.className}>{comparison.regular}</td>
          <td class={comparison.className}>{comparison.bold}</td>
          <td class={comparison.className}>{comparison.apca}</td>
          <td class={comparison.className}>{comparison.wcag}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{:else}
  <p class="empty-state">
    No comparison is available. Add another color and select the intended contrast background.
  </p>
{/if}
