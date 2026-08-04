<script lang="ts">
let { id = "shortcut-help" }: { id?: string } = $props();
</script>

<section {id} class="help-dialog" popover="auto" aria-labelledby={`${id}-title`}>
  <div class="popover-head">
    <h2 id={`${id}-title`} tabindex="-1">Column shortcuts</h2>
    <button type="button" popovertarget={id} popovertargetaction="hide">Close</button>
  </div>
  <div class="popover-body">
    <p>Press <kbd>Control</kbd>+<kbd>.</kbd>, then press 1 through 8 to select a table column.</p>
    <p><kbd>Escape</kbd> closes an open popover or cancels the sequence.</p>
  </div>
</section>
