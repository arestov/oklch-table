<script lang="ts">
import type { AnnouncementState } from "../core/feedback/stores.ts";

let {
  status,
  alert,
}: {
  status: AnnouncementState["result"];
  alert: AnnouncementState["alert"];
} = $props();
</script>

<section class="announcement-monitor" aria-labelledby="announcement-monitor-heading">
  <h2 id="announcement-monitor-heading">Screen reader feedback</h2>
  <div class="announcement-viewport">
    <div class="announcement-channel">
      <span class="announcement-label" aria-hidden="true">Status</span>
      <div class="announcement-content">
        <p role="status" aria-live="polite" aria-atomic="true" aria-relevant="additions text">
          {#key status.id}
            <span>{status.text}</span>
          {/key}
        </p>
        {#if !status.text}
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
          {#key alert.id}
            <span>{alert.text}</span>
          {/key}
        </p>
        {#if !alert.text}
          <span class="announcement-placeholder" aria-hidden="true"
            >No alert announcement yet.</span
          >
        {/if}
      </div>
    </div>
  </div>
</section>

<style>
/* The actual live regions stay visible so sighted users can observe screen-reader feedback. */
.announcement-monitor {
  margin-block: 14px 18px;

  & h2 {
    margin-block-end: 6px;
    color: var(--muted);
    font-size: 0.8rem;
    font-weight: 650;
  }
}

.announcement-viewport {
  block-size: 7.5rem;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding: 9px 11px;
  border-inline-start: 3px solid var(--border);
  background: color-mix(in srgb, var(--surface-2) 45%, transparent);
}

.announcement-channel {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: 8px;

  & + & {
    margin-block-start: 7px;
  }
}

.announcement-label {
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.alert-label {
  color: var(--danger);
}

.announcement-content p {
  margin: 0;
}

.announcement-placeholder {
  color: var(--muted);
}
</style>
