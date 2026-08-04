<script lang="ts">
import { onMount, tick } from "svelte";
import ColorRow from "./components/ColorRow.svelte";
import ShortcutHelpPopover from "./components/ShortcutHelpPopover.svelte";
import {
  announceAlert,
  announcementStore,
  announceShortcut,
  createFeedbackCoordinator,
  visibleFeedbackStore,
} from "./core/feedback/index.ts";
import {
  addColorFromDraft,
  candidateStore,
  draftStore,
  finishEdit,
  previewStore,
  setNewColorDraft,
} from "./core/workspace/index.ts";
import { buildRows } from "./domain/presentation.ts";
import type { ColorId } from "./domain/types.ts";

let draftInput: HTMLInputElement;
let draftError = $state("");
let columnJumpPending = $state(false);
const feedbackCoordinator = createFeedbackCoordinator(() => {
  finishEdit("idle");
});
const requestFocus = async (selector: string) => {
  await tick();
  document.querySelector<HTMLElement>(selector)?.focus();
};
const add = async () => {
  const result = addColorFromDraft();
  draftError = result.status === "invalid" ? result.message : "";
  if (result.status === "invalid") announceAlert(result.message);
  if (result.status === "accepted") await requestFocus('[data-draft="true"] input');
};
const onDraftKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void add();
  }
};
const onAction = async (action: {
  type: "duplicate" | "delete";
  row: number;
  createdId?: ColorId;
  focusColorId?: ColorId;
}) => {
  if (action.type === "duplicate" && action.createdId)
    await requestFocus(`[data-row-id="${action.createdId}"] input[data-field="l"]`);
  if (action.type === "delete") {
    if (action.focusColorId) await requestFocus(`[data-row-id="${action.focusColorId}"] button`);
    else await requestFocus('[data-draft="true"] input');
  }
};
const columnTargets: Record<string, string> = {
  "1": "button",
  "2": 'input[data-field="css"]',
  "3": 'input[data-field="l"]',
  "4": 'input[data-field="c"]',
  "5": 'input[data-field="h"]',
  "6": 'input[type="checkbox"]',
  "7": 'button[aria-label^="Text contrast"]',
  "8": 'button[aria-label^="Checks"]',
};
const columnNames: Record<string, string> = {
  "1": "Actions",
  "2": "CSS color",
  "3": "Lightness",
  "4": "Chroma",
  "5": "Hue",
  "6": "Contrast background",
  "7": "Text contrast",
  "8": "Checks",
};
const onWorkspaceKeydown = (event: KeyboardEvent) => {
  if (
    !(event.target instanceof Node) ||
    !document.getElementById("workspace")?.contains(event.target)
  )
    return;
  if (event.ctrlKey && event.key === ".") {
    event.preventDefault();
    columnJumpPending = true;
    announceShortcut("Column jump. Press 1 through 8. Escape cancels.");
    return;
  }
  if (!columnJumpPending) return;
  if (event.key === "Escape") {
    event.preventDefault();
    columnJumpPending = false;
    announceShortcut("Column jump canceled.");
    return;
  }
  const target = event.target instanceof HTMLElement ? event.target : null;
  const row = target?.closest<HTMLTableRowElement>("tr");
  const selector = columnTargets[event.key];
  columnJumpPending = false;
  if (!selector) return;
  if (row?.dataset.draft === "true") {
    event.preventDefault();
    announceAlert(`${columnNames[event.key]} is unavailable until a valid color is entered.`);
    return;
  }
  const control = row?.querySelector<HTMLElement>(selector);
  if (!control) return;
  event.preventDefault();
  control.focus();
  if (event.key === "7" || event.key === "8") control.click();
};
onMount(() => {
  draftInput?.focus();
  window.addEventListener("keydown", onWorkspaceKeydown);
  return () => {
    window.removeEventListener("keydown", onWorkspaceKeydown);
    feedbackCoordinator.destroy();
  };
});
</script>

<main
  id="workspace"
  aria-labelledby="page-title"
  data-column-jump-active={columnJumpPending ? "true" : "false"}
>
  <h1 id="page-title">Accessible OKLCH color workspace</h1>
  <p class="intro">Edit a color table with immediate, non-visual feedback.</p>
  <button type="button" popovertarget="shortcut-help">Keyboard shortcuts</button>
  <ShortcutHelpPopover />
  <p class="jump-prompt">Column jump is active. Press 1 through 8, or Escape to cancel.</p>
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
          <ColorRow
            candidate={$previewStore}
            colorId={row.id}
            invalidField={$candidateStore.status === "invalid" && $candidateStore.issue.field !== "new-color"
              ? $candidateStore.issue.field
              : null}
            {onAction}
            onDraftChanged={() => feedbackCoordinator.schedule()}
          />
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
              aria-label={`CSS color for new row ${$previewStore.document.colors.order.length + 1}`}
              autocomplete="off"
              spellcheck="false"
              aria-invalid={draftError ? "true" : undefined}
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
  {#if draftError}
    <p class="error-message">{draftError}</p>
  {/if}
  <section class="feedback-panel" aria-labelledby="last-update-heading">
    <h2 id="last-update-heading">Last feedback checkpoint</h2>
    <p>{$visibleFeedbackStore.edited}</p>
  </section>
  <aside class="announcement-stack" aria-label="Live announcement demonstration">
    <div class="announcement-card" data-channel="Status" role="status" aria-atomic="true">
      {$announcementStore.result.text}
    </div>
    <div
      class="announcement-card"
      data-channel="Alert"
      data-kind="alert"
      role="alert"
      aria-atomic="true"
    >
      {$announcementStore.alert.text}
    </div>
  </aside>
</main>
