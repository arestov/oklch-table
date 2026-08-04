<script lang="ts">
import type { ValidCandidate } from "../core/workspace/draft.ts";
import { buildContrastRows } from "../domain/presentation.ts";
import type { AnalysisTree, ColorId } from "../domain/types.ts";
import ContrastTable from "./ContrastTable.svelte";

let {
  candidate,
  colorId,
  row,
}: { candidate: ValidCandidate<AnalysisTree>; colorId: ColorId; row: number } = $props();
const asBackground = $derived(buildContrastRows(candidate, colorId, "background"));
const asText = $derived(buildContrastRows(candidate, colorId, "text"));
</script>

<section
  id={`text-contrast-${colorId}`}
  popover="auto"
  aria-labelledby={`text-contrast-${colorId}-title`}
>
  <div class="popover-head">
    <h2 id={`text-contrast-${colorId}-title`} tabindex="-1">Text contrast — color {row}</h2>
    <button type="button" popovertarget={`text-contrast-${colorId}`} popovertargetaction="hide">
      Close
    </button>
  </div>
  <div class="popover-body">
    {#if candidate.document.colors.byId[colorId].roles.contrastBackground}
      <ContrastTable caption={`Background color ${row}`} rows={asBackground} />
    {/if}
    <ContrastTable caption={`Color ${row} as text`} rows={asText} />
  </div>
</section>
