<script lang="ts">
let {
  status,
  alert,
}: {
  status: string;
  alert: string;
} = $props();
</script>

<section class="announcement-monitor" aria-labelledby="announcement-monitor-heading">
  <h2 id="announcement-monitor-heading">Screen reader feedback</h2>
  <div class="announcement-viewport">
    <div class="announcement-channel">
      <span class="announcement-label" aria-hidden="true">Status</span>
      <div class="announcement-content">
        <p role="status" aria-live="polite" aria-atomic="true" aria-relevant="additions text">
          {status}
        </p>
        {#if !status}
          <span class="announcement-placeholder" aria-hidden="true"
            >No status announcement yet.</span
          >
        {/if}
      </div>
    </div>
    <div class="announcement-channel">
      <span class="announcement-label alert-label" aria-hidden="true">Alert</span>
      <div class="announcement-content">
        <p role="alert" aria-live="assertive" aria-atomic="true" aria-relevant="additions text">
          {alert}
        </p>
        {#if !alert}
          <span class="announcement-placeholder" aria-hidden="true"
            >No alert announcement yet.</span
          >
        {/if}
      </div>
    </div>
  </div>
</section>
