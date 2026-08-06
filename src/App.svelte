<script lang="ts">
import { onMount } from "svelte";
import LiveRegions from "./components/LiveRegions.svelte";
import ShortcutHelpPopover from "./components/ShortcutHelpPopover.svelte";
import WorkspaceTable from "./components/WorkspaceTable.svelte";
import {
  announceAlert,
  announcementStore,
  announceShortcut,
  createFeedbackCoordinator,
} from "./core/feedback/index.ts";
import {
  activeEditStore,
  addColorFromDraft,
  candidateStore,
  deleteColor,
  duplicateColor,
  finishEdit,
  newColorDraftStore,
  previewStore,
  setContrastBackground,
  setNewColorDraft,
  updateColorDraft,
} from "./core/workspace/index.ts";
import { executeUiEffects } from "./ui/focus-effects.ts";

let draftInput = $state<HTMLInputElement>();
let workspace = $state<HTMLElement>();
let shortcutHelpTrigger = $state<HTMLButtonElement>();
let draftError = $state("");
let columnJumpPending = $state(false);
let columnJumpNeedsRow = $state(false);
let columnJumpRow: HTMLTableRowElement | null = null;
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
const onDraftPaste = (raw: string) => {
  setNewColorDraft(raw);
  void add();
};
const onAction = async (effects: readonly import("./core/workspace/transactions.ts").UiEffect[]) =>
  executeUiEffects(mountedWorkspace(), effects);
const onActionResult = async (result: ReturnType<typeof duplicateColor>) => {
  if (result.status === "invalid") {
    announceAlert(result.message);
    return;
  }
  if (result.status === "accepted") await onAction(result.effects);
};
const onEdit = (
  colorId: import("./domain/types.ts").ColorId,
  field: "css" | "l" | "c" | "h",
  raw: string,
) => {
  updateColorDraft(colorId, field, raw);
  feedbackCoordinator.schedule();
};
const onDuplicate = (colorId: import("./domain/types.ts").ColorId) =>
  onActionResult(duplicateColor(colorId));
const onDelete = (colorId: import("./domain/types.ts").ColorId) =>
  onActionResult(deleteColor(colorId));
const onSetBackground = (colorId: import("./domain/types.ts").ColorId, enabled: boolean) =>
  onActionResult(setContrastBackground(colorId, enabled));
const focusInvalidField = (
  colorId: import("./domain/types.ts").ColorId,
  field: "css" | "l" | "c" | "h",
) => {
  requestAnimationFrame(() => {
    const row = Array.from(
      mountedWorkspace().querySelectorAll<HTMLTableRowElement>("tr[data-row-id]"),
    ).find((item) => item.dataset.rowId === colorId);
    row?.querySelector<HTMLInputElement>(`input[data-field="${field}"]`)?.focus();
  });
};
const onFinishEdit = (reason: "enter" | "blur") => {
  feedbackCoordinator.cancel();
  const result = finishEdit(reason);
  if (result.status === "invalid") {
    announceAlert(result.message);
    const active = $activeEditStore;
    const field = $candidateStore.status === "invalid" ? $candidateStore.issue.field : null;
    if (active && field && field !== "new-color") focusInvalidField(active.colorId, field);
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
    const target = event.target instanceof HTMLElement ? event.target : null;
    const row = target?.closest<HTMLTableRowElement>("tr[data-row-id]");
    if (!row) {
      columnJumpPending = false;
      columnJumpNeedsRow = true;
      columnJumpRow = null;
      announceShortcut("Select a color row before using column jump.");
      return;
    }
    row.querySelector<HTMLElement>(".anchored-popover:popover-open")?.hidePopover();
    columnJumpRow = row;
    columnJumpPending = true;
    columnJumpNeedsRow = false;
    announceShortcut("Column jump. Press 1 through 8. Escape cancels.");
    return;
  }
  if (!columnJumpPending) return;
  if (["Alt", "Control", "Meta", "Shift"].includes(event.key)) return;
  if (event.key === "Escape") {
    event.preventDefault();
    columnJumpPending = false;
    columnJumpNeedsRow = false;
    columnJumpRow = null;
    announceShortcut("Column jump canceled.");
    return;
  }
  const row = columnJumpRow;
  const selector = columnTargets[event.key];
  columnJumpPending = false;
  columnJumpRow = null;
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
  class="workspace"
  id="workspace"
  aria-labelledby="page-title"
  data-column-jump-active={columnJumpPending ? "true" : "false"}
  data-column-jump-needs-row={columnJumpNeedsRow ? "true" : "false"}
>
  <h1 id="page-title">OKLCH color checks</h1>
  <button
    bind:this={shortcutHelpTrigger}
    class="shortcut-help-trigger"
    type="button"
    popovertarget="shortcut-help"
  >
    Keyboard shortcuts
  </button>
  <ShortcutHelpPopover trigger={shortcutHelpTrigger} />
  <LiveRegions status={$announcementStore.result} alert={$announcementStore.alert} />
  <p class="jump-prompt">
    {columnJumpNeedsRow
      ? "Select a color row before using column jump."
      : "Column jump is active. Press 1 through 8, or Escape to cancel."}
  </p>
  <WorkspaceTable
    candidate={$previewStore}
    invalidColorId={$candidateStore.status === "invalid" && $candidateStore.issue.field !== "new-color"
      ? $activeEditStore?.colorId ?? null
      : null}
    invalidField={$candidateStore.status === "invalid" && $candidateStore.issue.field !== "new-color"
      ? $candidateStore.issue.field
      : null}
    fieldError={$candidateStore.status === "invalid" && $candidateStore.issue.field !== "new-color"
      ? $candidateStore.issue.message
      : ""}
    draftRaw={$newColorDraftStore}
    {draftError}
    bind:draftInput
    {onEdit}
    {onDuplicate}
    {onDelete}
    {onSetBackground}
    {onFinishEdit}
    onNewColorInput={setNewColorDraft}
    onNewColorPaste={onDraftPaste}
    onNewColorKeydown={onDraftKeydown}
  />
  <p id="draft-help" class="visually-hidden">
    Paste a HEX, RGB, or OKLCH color to add it, or type a color and press Enter.
  </p>
  {#if draftError}
    <p id="draft-error" class="error-message">{draftError}</p>
  {/if}
</main>

<style>
.workspace {
  position: relative;
  width: min(1500px, calc(100% - 28px));
  margin: 28px auto 72px;
}

.shortcut-help-trigger {
  position: absolute;
  top: 0;
  right: 0;
}

.workspace > h1 {
  margin-block-end: 8px;
  font-size: clamp(1.75rem, 3vw, 2.55rem);
}

.jump-prompt {
  visibility: hidden;
  margin-block: 0 14px;
  padding: 10px 14px;
  border: 2px solid var(--accent);
  border-radius: 10px;
  background: var(--surface);
  font-weight: 720;
}

.workspace:is([data-column-jump-active="true"], [data-column-jump-needs-row="true"]) .jump-prompt {
  visibility: visible;
}
</style>
