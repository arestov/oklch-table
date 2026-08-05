<script lang="ts">
import { buildContrastRows, type PresentationIndex } from "../domain/presentation.ts";
import type { ColorId } from "../domain/types.ts";
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
let popover: HTMLElement;
const manageFocus = () => {
  if (popover.matches(":popover-open")) popover.querySelector<HTMLElement>("h2")?.focus();
  else trigger?.focus();
};
const asBackground = $derived(buildContrastRows(index, colorId, "background"));
const asText = $derived(buildContrastRows(index, colorId, "text"));
</script>

<section
  id={`text-contrast-${colorId}`}
  popover="auto"
  aria-labelledby={`text-contrast-${colorId}-title`}
  bind:this={popover}
  ontoggle={manageFocus}
>
  <div class="popover-head">
    <h2 id={`text-contrast-${colorId}-title`} tabindex="-1">Text contrast — color {row}</h2>
    <button type="button" popovertarget={`text-contrast-${colorId}`} popovertargetaction="hide">
      Close
    </button>
  </div>
  <div class="popover-body">
    {#if background}
      <ContrastTable caption={`Background color ${row}`} rows={asBackground} />
    {/if}
    <ContrastTable caption={`Color ${row} as text`} rows={asText} />
  </div>
</section>
