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

<style>
.help-dialog {
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

@media (forced-colors: active) {
  .help-dialog {
    forced-color-adjust: auto;
  }
}
</style>
