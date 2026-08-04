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
  <div class="announcement-card" data-channel="Status" role="status" aria-atomic="true">
    {status}
  </div>
  <div
    class="announcement-card"
    data-channel="Alert"
    data-kind="alert"
    role="alert"
    aria-atomic="true"
  >
    {alert}
  </div>
</aside>
