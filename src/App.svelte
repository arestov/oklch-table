<script lang="ts">
import { onMount } from "svelte";
import FeedbackPanel from "./components/FeedbackPanel.svelte";
import LiveRegions from "./components/LiveRegions.svelte";
import ShortcutHelpPopover from "./components/ShortcutHelpPopover.svelte";
import WorkspaceTable from "./components/WorkspaceTable.svelte";
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
import { executeUiEffects } from "./ui/focus-effects.ts";

let draftInput = $state<HTMLInputElement>();
let workspace = $state<HTMLElement>();
let shortcutHelpTrigger = $state<HTMLButtonElement>();
let draftError = $state("");
let columnJumpPending = $state(false);
const feedbackCoordinator = createFeedbackCoordinator(() => {
  finishEdit("idle");
});
const mountedWorkspace = (): HTMLElement => {
  if (!workspace) throw new Error("Workspace focus effect ran before mount.");
  return workspace;
};
const add = async () => {
  const result = addColorFromDraft();
  draftError = result.status === "invalid" ? result.message : "";
  if (result.status === "invalid") announceAlert(result.message);
  if (result.status === "accepted") await executeUiEffects(mountedWorkspace(), result.effects);
};
const onDraftKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void add();
  }
};
const onAction = async (effects: readonly import("./core/workspace/transactions.ts").UiEffect[]) =>
  executeUiEffects(mountedWorkspace(), effects);
const onFinishEdit = (reason: "enter" | "blur") => {
  feedbackCoordinator.cancel();
  const result = finishEdit(reason);
  if (result.status === "invalid") {
    announceAlert(result.message);
    const field = $candidateStore.status === "invalid" ? $candidateStore.issue.field : null;
    if (field && field !== "new-color")
      requestAnimationFrame(() =>
        mountedWorkspace().querySelector<HTMLInputElement>(`input[data-field="${field}"]`)?.focus(),
      );
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
  if (!(event.target instanceof Node) || !workspace?.contains(event.target)) return;
  if (event.ctrlKey && event.key === ".") {
    event.preventDefault();
    columnJumpPending = true;
    announceShortcut("Column jump. Press 1 through 8. Escape cancels.");
    return;
  }
  if (!columnJumpPending) return;
  if (["Alt", "Control", "Meta", "Shift"].includes(event.key)) return;
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
  feedbackCoordinator.cancel();
  const boundary = finishEdit("navigation");
  if (boundary.status === "invalid") {
    announceAlert(boundary.message);
    return;
  }
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
  bind:this={workspace}
  id="workspace"
  aria-labelledby="page-title"
  data-column-jump-active={columnJumpPending ? "true" : "false"}
>
  <h1 id="page-title">Accessible OKLCH color workspace</h1>
  <p class="intro">Edit a color table with immediate, non-visual feedback.</p>
  <button bind:this={shortcutHelpTrigger} type="button" popovertarget="shortcut-help">
    Keyboard shortcuts
  </button>
  <ShortcutHelpPopover trigger={shortcutHelpTrigger} />
  <p class="jump-prompt">Column jump is active. Press 1 through 8, or Escape to cancel.</p>
  <WorkspaceTable
    candidate={$previewStore}
    invalidField={$candidateStore.status === "invalid" && $candidateStore.issue.field !== "new-color"
      ? $candidateStore.issue.field
      : null}
    fieldError={$candidateStore.status === "invalid" && $candidateStore.issue.field !== "new-color"
      ? $candidateStore.issue.message
      : ""}
    draftRaw={$draftStore.newColor.raw}
    {draftError}
    bind:draftInput
    {onAction}
    onDraftChanged={() => feedbackCoordinator.schedule()}
    {onFinishEdit}
    onNewColorInput={setNewColorDraft}
    onNewColorKeydown={onDraftKeydown}
  />
  <p id="draft-help" class="visually-hidden">Paste a HEX, RGB, or OKLCH color and press Enter.</p>
  {#if draftError}
    <p class="error-message">{draftError}</p>
  {/if}
  <FeedbackPanel edited={$visibleFeedbackStore.edited} />
  <LiveRegions status={$announcementStore.result.text} alert={$announcementStore.alert.text} />
</main>
