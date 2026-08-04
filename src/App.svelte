<script lang="ts">
import ColorRow from "./components/ColorRow.svelte";
import { announcementStore, visibleFeedbackStore } from "./core/feedback/index.ts";
import {
  addColorFromDraft,
  draftStore,
  previewStore,
  setNewColorDraft,
} from "./core/workspace/index.ts";
import { buildRows } from "./domain/presentation.ts";

let draftInput: HTMLInputElement;
let error = "";
const add = () => {
  const result = addColorFromDraft();
  error = result.status === "invalid" ? result.message : "";
  if (result.status === "accepted") draftInput?.focus();
};
const onDraftKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.preventDefault();
    add();
  }
};
</script>

<main id="workspace" aria-labelledby="page-title">
  <h1 id="page-title">Accessible OKLCH color workspace</h1>
  <p class="intro">Edit a color table with immediate, non-visual feedback.</p>
  <div class="table-shell">
    <table>
      <caption>
        Colors in the current workspace
      </caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Actions</th>
          <th scope="col">CSS color</th>
          <th scope="col">L</th>
          <th scope="col">C</th>
          <th scope="col">H</th>
          <th scope="col">Contrast background</th>
          <th scope="col">Text contrast</th>
          <th scope="col">Checks</th>
        </tr>
      </thead>
      <tbody>
        {#each buildRows($previewStore) as row (row.id)}
          <ColorRow candidate={$previewStore} colorId={row.id} />
        {/each}
        <tr data-draft="true">
          <th scope="row">{$previewStore.document.colors.order.length + 1}</th>
          <td colspan="2">
            <input
              bind:this={draftInput}
              class="css-color"
              type="text"
              value={$draftStore.newColor.raw}
              placeholder="fill color"
              autocomplete="off"
              spellcheck="false"
              aria-invalid={error ? "true" : undefined}
              aria-describedby="draft-help"
              oninput={(event) => setNewColorDraft(event.currentTarget.value)}
              onkeydown={onDraftKeydown}
            >
          </td>
          <td colspan="6">New color</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p id="draft-help" class="visually-hidden">Paste a HEX, RGB, or OKLCH color and press Enter.</p>
  {#if error}
    <p role="alert">{error}</p>
  {/if}
  <section class="feedback-panel" aria-labelledby="last-update-heading">
    <h2 id="last-update-heading">Last feedback checkpoint</h2>
    <p>{$visibleFeedbackStore.edited}</p>
  </section>
  <aside class="announcement-stack" aria-label="Live announcement demonstration">
    <div role="status" aria-atomic="true">{$announcementStore.result.text}</div>
    <div role="alert" aria-atomic="true">{$announcementStore.alert.text}</div>
  </aside>
</main>
