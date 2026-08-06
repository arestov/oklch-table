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
const supportsAnchorPositioning =
  globalThis.CSS?.supports("position-anchor: --popover-anchor") === true &&
  globalThis.CSS?.supports("top: anchor(bottom)") === true;
const titleId = $derived(`${id}-title`);
const arrowId = $derived(`${id}-arrow`);

const manageFocus = () => {
  open = popover.matches(":popover-open");
  if (open) {
    if (supportsAnchorPositioning) arrow.showPopover();
    popover.querySelector<HTMLElement>("h2")?.focus();
  } else {
    if (arrow.matches(":popover-open")) arrow.hidePopover();
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
  class="popover-root anchored-popover"
  class:wide-popover={wide}
  aria-labelledby={titleId}
  style:position-anchor={anchorName}
  bind:this={popover}
  ontoggle={manageFocus}
>
  <div class="popover-surface">
    <div class="popover-head">
      <h2 id={titleId} tabindex="-1">{title}</h2>
      <button class="popover-close" type="button" popovertarget={id} popovertargetaction="hide">
        Close
      </button>
    </div>
    {#if open}
      <div class="popover-body">
        {@render children()}
      </div>
    {/if}
  </div>
</section>

<style>
.anchored-popover {
  width: min(880px, calc(100vw - 28px));
  max-height: min(82vh, 820px);
  overflow: auto;
  margin: auto;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 20px 60px oklch(0 0 0 / 25%);

  &.wide-popover {
    --popover-gutter: clamp(12px, 2vw, 24px);

    width: calc(100dvw - var(--popover-gutter) - var(--popover-gutter));
  }

  &::backdrop {
    background: oklch(0 0 0 / 15%);
  }
}

.popover-head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 18px;
  padding: 17px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);

  & h2 {
    margin: 0;
    font-size: 1.22rem;
  }
}

.popover-body {
  padding: 17px;
}

@supports (position-anchor: --popover-anchor) and (top: anchor(bottom)) {
  .anchored-popover {
    position: absolute;
    inset: auto;
    top: calc(anchor(bottom) + 0.75rem);
    right: anchor(right);
    max-height: none;
    margin: 0;
    overflow: visible;
    border: 0;
    background: transparent;
    box-shadow: none;

    &.wide-popover {
      right: var(--popover-gutter);
      left: var(--popover-gutter);
      width: auto;
    }
  }

  .anchored-popover-arrow {
    position: absolute;
    inset: auto;
    top: calc(anchor(bottom) + 0.2rem + 1px);
    left: calc(anchor(left) + anchor-size(width) / 2);
    margin: 0;
    padding: 0;
    border: 0;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
    transform: translateX(-50%);
    width: 1.1rem;
    height: 0.55rem;
    background: var(--border);
    box-shadow: none;

    &::before {
      position: absolute;
      top: 0.08rem;
      left: 0.08rem;
      width: 0.94rem;
      height: 0.47rem;
      content: "";
      clip-path: inherit;
      background: var(--surface);
    }

    &::backdrop {
      background: transparent;
    }
  }

  .popover-surface {
    position: relative;
    z-index: 2;
    max-height: min(82vh, 820px);
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    box-shadow: 0 20px 60px oklch(0 0 0 / 25%);
  }
}

@media (forced-colors: active) {
  .anchored-popover {
    forced-color-adjust: auto;
  }
}
</style>
