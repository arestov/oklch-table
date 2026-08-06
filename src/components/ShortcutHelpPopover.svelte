<script lang="ts">
let { id = "shortcut-help", trigger }: { id?: string; trigger: HTMLButtonElement | undefined } =
  $props();
let popover: HTMLElement;
const manageFocus = () => {
  if (popover.matches(":popover-open")) popover.querySelector<HTMLElement>("h2")?.focus();
  else trigger?.focus();
};
</script>

<section
  {id}
  class="popover-root help-dialog"
  popover="auto"
  aria-labelledby={`${id}-title`}
  bind:this={popover}
  ontoggle={manageFocus}
>
  <div class="popover-head">
    <h2 id={`${id}-title`} tabindex="-1">Column shortcuts</h2>
    <button class="popover-close" type="button" popovertarget={id} popovertargetaction="hide">
      Close
    </button>
  </div>
  <div class="popover-body">
    <p>Press <kbd>Control</kbd>+<kbd>.</kbd>, then press 1 through 8 to select a table column.</p>
    <p><kbd>Escape</kbd> closes an open popover or cancels the sequence.</p>
  </div>
</section>
