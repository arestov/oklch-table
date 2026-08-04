<script lang="ts">
let {
  status,
  alert,
}: {
  status: string;
  alert: string;
} = $props();
</script>

<aside class="announcement-stack" aria-label="Live announcement demonstration">
  <div
    class="announcement-card"
    data-channel="Status"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-relevant="additions text"
  >
    {status}
  </div>
  <div
    class="announcement-card"
    data-channel="Alert"
    data-kind="alert"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    aria-relevant="additions text"
  >
    {alert}
  </div>
</aside>
