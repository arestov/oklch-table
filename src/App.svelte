<script lang="ts">
import { onMount, tick } from "svelte";
import ColorRow from "./components/ColorRow.svelte";
import { buildRows } from "./domain/presentation";
import {
  addColorFromDraft,
  announceShortcut,
  finishActiveEdit,
  setCurrentRow,
  setJumpActive,
  setNewColorDraft,
} from "./state/controller";
import {
  announcementStore,
  candidateStore,
  navigationStore,
  newColorDraftStore,
  visibleFeedbackStore,
} from "./state/stores";

const JUMP_TIMEOUT_MS = 4000;
const columnFields: Record<string, string> = {
  "1": "actions",
  "2": "css",
  "3": "l",
  "4": "c",
  "5": "h",
  "6": "background",
  "7": "text-contrast",
  "8": "checks",
};

let jumpTimer: ReturnType<typeof setTimeout> | null = null;
let draftInput: HTMLInputElement;
let helpHeading: HTMLHeadingElement;
let helpButton: HTMLButtonElement;

$: rows = buildRows($candidateStore);

onMount(() => {
  draftInput?.focus();
});

function cancelColumnJump(announce = false): void {
  if (jumpTimer !== null) clearTimeout(jumpTimer);
  jumpTimer = null;
  setJumpActive(false);
  if (announce) announceShortcut("Column jump cancelled.");
}

function startColumnJump(): void {
  if (jumpTimer !== null) clearTimeout(jumpTimer);
  setJumpActive(true);
  announceShortcut("Column jump. Press 1 through 8. Escape cancels.");
  jumpTimer = setTimeout(() => cancelColumnJump(false), JUMP_TIMEOUT_MS);
}

function rowSelector(): string {
  const id = $navigationStore.currentRowId;
  return id ? `[data-row-id="${id}"]` : '[data-draft="true"]';
}

function jumpToColumn(digit: string): void {
  const field = columnFields[digit];
  if (!field) return;
  if (!finishActiveEdit("navigation")) return;
  const currentId = $navigationStore.currentRowId;
  if (!currentId && field !== "css") {
    announceShortcut("The empty draft row only has a CSS color field.");
    return;
  }
  const selector = currentId
    ? `${rowSelector()} [data-field="${field}"]`
    : '[data-draft="true"] [data-field="draft"]';
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) {
    announceShortcut("That column is not available in the current row.");
    return;
  }
  if (field === "text-contrast" || field === "checks") {
    (target as HTMLButtonElement).click();
  } else {
    target.focus();
  }
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && !event.altKey && !event.metaKey && event.key === ".") {
    event.preventDefault();
    startColumnJump();
    return;
  }
  if (!$navigationStore.jumpActive) return;
  if (event.key === "Escape") {
    event.preventDefault();
    cancelColumnJump(true);
    return;
  }
  if (columnFields[event.key]) {
    event.preventDefault();
    const digit = event.key;
    cancelColumnJump(false);
    jumpToColumn(digit);
    return;
  }
  cancelColumnJump(false);
}

function handleFocusIn(event: FocusEvent): void {
  const element = event.target as HTMLElement;
  const row = element.closest<HTMLElement>("[data-row-id]");
  if (row?.dataset.rowId) {
    setCurrentRow(row.dataset.rowId as `color-${number}`);
  } else if (element.closest('[data-draft="true"]')) {
    setCurrentRow(null);
  }
}

async function promoteDraft(): Promise<void> {
  const id = addColorFromDraft();
  if (!id) return;
  await tick();
  draftInput?.focus();
}

function onDraftKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter") {
    event.preventDefault();
    promoteDraft();
  }
}

function onHelpToggle(event: Event): void {
  const toggle = event as ToggleEvent;
  helpButton?.setAttribute("aria-expanded", String(toggle.newState === "open"));
  if (toggle.newState === "open") requestAnimationFrame(() => helpHeading?.focus());
  else if (!document.activeElement || document.activeElement === document.body) helpButton?.focus();
}
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<main
  id="workspace"
  data-column-jump-active={$navigationStore.jumpActive}
  aria-labelledby="page-title"
  aria-describedby="workspace-instructions"
  on:focusin={handleFocusIn}
>
  <h1 id="page-title">Accessible OKLCH color workspace</h1>
  <p class="intro">
    Svelte and Nano Stores prototype for a non-visual feedback loop. Reactive state updates the
    table immediately; semantic snapshots are compared only at feedback checkpoints.
  </p>

  <section class="panel toolbar" aria-label="Workspace instructions and shortcuts">
    <div>
      <strong>Editing contract</strong>
      <p id="workspace-instructions">
        Paste HEX, RGB, or OKLCH into the draft row. Checks update immediately and silently while
        typing. After 700 ms, on Enter, blur, or shortcut navigation, the current semantic snapshot
        is compared with the last announced snapshot. Press Control plus period, release both keys,
        then press a column number.
      </p>
    </div>
    <div class="toolbar-actions">
      <button
        type="button"
        aria-keyshortcuts="Control+."
        aria-describedby="workspace-instructions"
        on:click={startColumnJump}
      >
        Column jump <span aria-hidden="true"><kbd>Ctrl</kbd>+<kbd>.</kbd></span>
      </button>
      <button
        bind:this={helpButton}
        type="button"
        popovertarget="shortcut-help"
        aria-controls="shortcut-help"
        aria-expanded="false"
      >
        Keyboard shortcuts
      </button>
    </div>
  </section>

  <div class="jump-prompt" aria-hidden={!$navigationStore.jumpActive}>
    Column jump: press 1–8 · Escape cancels
  </div>

  <div class="table-shell">
    <table>
      <caption>
        Colors in the current workspace
      </caption>
      <thead>
        <tr>
          <th id="heading-number" scope="col">#</th>
          <th id="heading-actions" scope="col">
            Actions <kbd class="shortcut-badge" aria-hidden="true">1</kbd>
          </th>
          <th id="heading-css" scope="col">
            CSS color <kbd class="shortcut-badge" aria-hidden="true">2</kbd>
          </th>
          <th id="heading-l" scope="col" class="numeric">
            L <kbd class="shortcut-badge" aria-hidden="true">3</kbd>
          </th>
          <th id="heading-c" scope="col" class="numeric">
            C <kbd class="shortcut-badge" aria-hidden="true">4</kbd>
          </th>
          <th id="heading-h" scope="col" class="numeric">
            H <kbd class="shortcut-badge" aria-hidden="true">5</kbd>
          </th>
          <th id="heading-background" scope="col">
            Contrast background <kbd class="shortcut-badge" aria-hidden="true">6</kbd>
          </th>
          <th id="heading-text-contrast" scope="col">
            Text contrast <kbd class="shortcut-badge" aria-hidden="true">7</kbd>
          </th>
          <th id="heading-checks" scope="col">
            Checks <kbd class="shortcut-badge" aria-hidden="true">8</kbd>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <ColorRow candidate={$candidateStore} {row} />
        {/each}
        <tr class="draft-row" data-draft="true">
          <th scope="row" id="draft-row-header">{rows.length + 1}</th>
          <td class="placeholder">—</td>
          <td class="draft-input-cell">
            <input
              bind:this={draftInput}
              class="css-color"
              type="text"
              value={$newColorDraftStore.raw}
              placeholder="fill color"
              autocomplete="off"
              spellcheck="false"
              data-field="draft"
              aria-labelledby="draft-row-header heading-css"
              aria-describedby="draft-help"
              aria-invalid={!$newColorDraftStore.valid ? 'true' : undefined}
              on:input={(event) => setNewColorDraft(event.currentTarget.value)}
              on:keydown={onDraftKeydown}
            >
            <span id="draft-help" class="visually-hidden"
              >Paste a HEX, RGB, or OKLCH color and press Enter. A new empty row remains available.</span
            >
          </td>
          <td class="placeholder">—</td>
          <td class="placeholder">—</td>
          <td class="placeholder">—</td>
          <td class="placeholder">—</td>
          <td class="placeholder">Not checked</td>
          <td class="placeholder">—</td>
        </tr>
      </tbody>
    </table>
  </div>

  <section class="feedback-panel" aria-labelledby="last-update-heading">
    <h2 id="last-update-heading">Last feedback checkpoint</h2>
    <div class="feedback-section">
      <strong>Edited value</strong>
      <p>{$visibleFeedbackStore.edited}</p>
    </div>
    {#if $visibleFeedbackStore.apca}
      <div class="feedback-section">
        <strong>APCA</strong>
        <p>{$visibleFeedbackStore.apca}</p>
      </div>
    {/if}
    {#if $visibleFeedbackStore.cvd}
      <div class="feedback-section">
        <strong>Color vision</strong>
        <p>{$visibleFeedbackStore.cvd}</p>
      </div>
    {/if}
  </section>

  <section
    id="shortcut-help"
    class="help-dialog"
    popover="auto"
    aria-labelledby="shortcut-help-title"
    on:toggle={onHelpToggle}
  >
    <div class="popover-head">
      <h2 bind:this={helpHeading} id="shortcut-help-title" tabindex="-1">Column shortcuts</h2>
      <button type="button" popovertarget="shortcut-help" popovertargetaction="hide">Close</button>
    </div>
    <div class="popover-body">
      <p>Press <kbd>Control</kbd>+<kbd>.</kbd>, release both keys, then press:</p>
      <dl>
        <dt><kbd>1</kbd></dt>
        <dd>Actions in the current row</dd>
        <dt><kbd>2</kbd></dt>
        <dd>CSS color</dd>
        <dt><kbd>3</kbd></dt>
        <dd>Lightness</dd>
        <dt><kbd>4</kbd></dt>
        <dd>Chroma</dd>
        <dt><kbd>5</kbd></dt>
        <dd>Hue</dd>
        <dt><kbd>6</kbd></dt>
        <dd>Contrast background</dd>
        <dt><kbd>7</kbd></dt>
        <dd>Open Text contrast</dd>
        <dt><kbd>8</kbd></dt>
        <dd>Open Checks</dd>
        <dt><kbd>Escape</kbd></dt>
        <dd>Cancel a pending sequence or close an open popover</dd>
      </dl>
      <p class="note">On macOS this prototype uses the physical Control key, not Command.</p>
    </div>
  </section>

  <aside class="announcement-stack" aria-label="Live announcement demonstration">
    {#key $announcementStore.shortcut.id}
      <div class="announcement-card" data-channel="Shortcut" role="status" aria-atomic="true">
        {$announcementStore.shortcut.text}
      </div>
    {/key}
    {#key $announcementStore.result.id}
      <div class="announcement-card" data-channel="Result" role="status" aria-atomic="true">
        {$announcementStore.result.text}
      </div>
    {/key}
    {#key $announcementStore.alert.id}
      <div
        class="announcement-card"
        data-channel="Alert"
        data-kind="alert"
        role="alert"
        aria-atomic="true"
      >
        {$announcementStore.alert.text}
      </div>
    {/key}
  </aside>
</main>
