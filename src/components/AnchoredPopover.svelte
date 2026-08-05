<script lang="ts">
import type { Snippet } from "svelte";

let {
  id,
  title,
  trigger,
  anchorName,
  children,
}: {
  id: string;
  title: string;
  trigger: HTMLButtonElement | undefined;
  anchorName: string;
  children: Snippet;
} = $props();

let popover: HTMLElement;
let open = $state(false);
const titleId = $derived(`${id}-title`);

const manageFocus = () => {
  open = popover.matches(":popover-open");
  if (open) popover.querySelector<HTMLElement>("h2")?.focus();
  else trigger?.focus();
};
</script>

<section
  {id}
  popover="auto"
  class="anchored-popover"
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
