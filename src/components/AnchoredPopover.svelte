<script lang="ts">
import type { Snippet } from "svelte";

let {
  id,
  title,
  trigger,
  anchorName,
  wide = false,
  children,
}: {
  id: string;
  title: string;
  trigger: HTMLButtonElement | undefined;
  anchorName: string;
  wide?: boolean;
  children: Snippet;
} = $props();

let popover: HTMLElement;
let arrow: HTMLElement;
let open = $state(false);
const titleId = $derived(`${id}-title`);
const arrowId = $derived(`${id}-arrow`);

const manageFocus = () => {
  open = popover.matches(":popover-open");
  if (open) {
    arrow.showPopover();
    popover.querySelector<HTMLElement>("h2")?.focus();
  } else {
    arrow.hidePopover();
    trigger?.focus();
  }
};
</script>

<span
  id={arrowId}
  popover="manual"
  class="anchored-popover-arrow"
  aria-hidden="true"
  style:position-anchor={anchorName}
  bind:this={arrow}
></span>

<section
  {id}
  popover="auto"
  class={`anchored-popover${wide ? " wide-popover" : ""}`}
  aria-labelledby={titleId}
  style:position-anchor={anchorName}
  bind:this={popover}
  ontoggle={manageFocus}
>
  <div class="popover-surface">
    <div class="popover-head">
      <h2 id={titleId} tabindex="-1">{title}</h2>
      <button type="button" popovertarget={id} popovertargetaction="hide">Close</button>
    </div>
    {#if open}
      <div class="popover-body">
        {@render children()}
      </div>
    {/if}
  </div>
</section>
