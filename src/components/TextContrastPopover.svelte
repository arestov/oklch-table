<script lang="ts">
import { buildContrastRows, type PresentationIndex } from "../domain/presentation.ts";
import type { ColorId } from "../domain/types.ts";
import AnchoredPopover from "./AnchoredPopover.svelte";
import ContrastTable from "./ContrastTable.svelte";

let {
  index,
  colorId,
  row,
  background,
  trigger,
}: {
  index: PresentationIndex;
  colorId: ColorId;
  row: number;
  background: boolean;
  trigger: HTMLButtonElement | undefined;
} = $props();
const asBackground = $derived(buildContrastRows(index, colorId, "background"));
const asText = $derived(buildContrastRows(index, colorId, "text"));
</script>

<AnchoredPopover
  id={`text-contrast-${colorId}`}
  title={`Text contrast — color ${row}`}
  {trigger}
  anchorName={`--text-contrast-${colorId}`}
  wide
>
  {#if background}
    <ContrastTable caption={`Background color ${row}`} rows={asBackground} />
  {/if}
  <ContrastTable caption={`Color ${row} as text`} rows={asText} />
  <p class="font-metrics-note">
    Size guidance is based on Arial/Helvetica-like fonts. Fonts with a smaller x-height may require
    a larger size.
  </p>
</AnchoredPopover>

<style>
.font-metrics-note {
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
