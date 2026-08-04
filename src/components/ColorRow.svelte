<script lang="ts">
import { tick } from "svelte";
import type { RowView } from "../domain/presentation";
import { buildContrastRows, buildCvdRows } from "../domain/presentation";
import type { CandidateRevision, ColorField } from "../domain/types";
import {
  beginEdit,
  deleteColor,
  duplicateColor,
  finishActiveEdit,
  setContrastBackground,
  setCurrentRow,
  updateColorField,
} from "../state/controller";
import { fieldDraftKey, fieldDraftsStore } from "../state/stores";
import ContrastTable from "./ContrastTable.svelte";

export let candidate: CandidateRevision;
export let row: RowView;

let hidePass = true;
let contrastTrigger: HTMLButtonElement;
let checksTrigger: HTMLButtonElement;
let contrastHeading: HTMLHeadingElement;
let checksHeading: HTMLHeadingElement;

$: asBackground = buildContrastRows(candidate, row.id, "background");
$: asText = buildContrastRows(candidate, row.id, "text");
$: allContrast = buildContrastRows(candidate, row.id, "all");
$: cvdRows = buildCvdRows(candidate, row.id);
$: visibleCvdRows = hidePass ? cvdRows.filter((item) => item.hasWarning) : cvdRows;

function raw(field: ColorField, fallback: string | number): string {
  return $fieldDraftsStore[fieldDraftKey(row.id, field)]?.raw ?? String(fallback);
}

function invalid(field: ColorField): boolean {
  return $fieldDraftsStore[fieldDraftKey(row.id, field)]?.valid === false;
}

function onInput(event: Event, field: ColorField): void {
  updateColorField(row.id, field, (event.currentTarget as HTMLInputElement).value);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter") {
    event.preventDefault();
    finishActiveEdit("enter");
  }
}

async function duplicate(): Promise<void> {
  const id = duplicateColor(row.id);
  if (!id) return;
  await tick();
  document.querySelector<HTMLElement>(`[data-row-id="${id}"] [data-field="l"]`)?.focus();
}

async function remove(): Promise<void> {
  const target = deleteColor(row.id);
  await tick();
  if (target)
    document.querySelector<HTMLElement>(`[data-row-id="${target}"] [data-field="css"]`)?.focus();
  else document.querySelector<HTMLElement>('[data-draft="true"] [data-field="draft"]')?.focus();
}

function onPopoverToggle(
  event: Event,
  trigger: HTMLButtonElement,
  heading: HTMLHeadingElement,
): void {
  const toggle = event as ToggleEvent;
  trigger.setAttribute("aria-expanded", String(toggle.newState === "open"));
  if (toggle.newState === "open") {
    requestAnimationFrame(() => heading?.focus());
  } else if (!document.activeElement || document.activeElement === document.body) {
    trigger.focus();
  }
}
</script>

<tr data-row-id={row.id} on:focusin={() => setCurrentRow(row.id)}>
  <th scope="row" id={`row-${row.id}-header`}>{row.row}</th>
  <td>
    <div class="actions">
      <button type="button" data-field="actions" on:click={duplicate}>Duplicate</button>
      <button type="button" class="danger-action" on:click={remove}>Delete</button>
    </div>
  </td>
  <td>
    <input
      class="css-color"
      type="text"
      value={raw('css', row.css)}
      data-field="css"
      autocomplete="off"
      spellcheck="false"
      aria-labelledby={`row-${row.id}-header heading-css`}
      aria-invalid={invalid('css') ? 'true' : undefined}
      on:focus={() => beginEdit(row.id, 'css')}
      on:input={(event) => onInput(event, 'css')}
      on:keydown={onKeydown}
      on:blur={() => finishActiveEdit('blur')}
    >
  </td>
  <td class="numeric">
    <input
      type="number"
      value={raw('l', row.l)}
      min="0"
      max="1"
      step="0.01"
      inputmode="decimal"
      data-field="l"
      aria-labelledby={`row-${row.id}-header heading-l`}
      aria-invalid={invalid('l') ? 'true' : undefined}
      on:focus={() => beginEdit(row.id, 'l')}
      on:input={(event) => onInput(event, 'l')}
      on:keydown={onKeydown}
      on:blur={() => finishActiveEdit('blur')}
    >
  </td>
  <td class="numeric">
    <input
      type="number"
      value={raw('c', row.c)}
      min="0"
      step="0.01"
      inputmode="decimal"
      data-field="c"
      aria-labelledby={`row-${row.id}-header heading-c`}
      aria-invalid={invalid('c') ? 'true' : undefined}
      on:focus={() => beginEdit(row.id, 'c')}
      on:input={(event) => onInput(event, 'c')}
      on:keydown={onKeydown}
      on:blur={() => finishActiveEdit('blur')}
    >
  </td>
  <td class="numeric">
    <input
      type="number"
      value={raw('h', row.h)}
      min="0"
      max="360"
      step="1"
      inputmode="decimal"
      data-field="h"
      aria-labelledby={`row-${row.id}-header heading-h`}
      aria-invalid={invalid('h') ? 'true' : undefined}
      on:focus={() => beginEdit(row.id, 'h')}
      on:input={(event) => onInput(event, 'h')}
      on:keydown={onKeydown}
      on:blur={() => finishActiveEdit('blur')}
    >
  </td>
  <td class="checkbox-cell">
    <input
      type="checkbox"
      checked={row.background}
      data-field="background"
      aria-labelledby={`row-${row.id}-header heading-background`}
      on:change={(event) => setContrastBackground(row.id, event.currentTarget.checked)}
    >
  </td>
  <td>
    <button
      bind:this={contrastTrigger}
      type="button"
      data-field="text-contrast"
      class={`result-button ${row.textContrast.className}`}
      popovertarget={`text-contrast-${row.id}`}
      aria-controls={`text-contrast-${row.id}`}
      aria-expanded="false"
    >
      {row.textContrast.text}<small>{row.textContrast.detail}</small>
    </button>
    <section
      id={`text-contrast-${row.id}`}
      popover="auto"
      aria-labelledby={`text-contrast-${row.id}-title`}
      on:toggle={(event) => onPopoverToggle(event, contrastTrigger, contrastHeading)}
    >
      <div class="popover-head">
        <h2 bind:this={contrastHeading} id={`text-contrast-${row.id}-title`} tabindex="-1">
          Text contrast — color {row.row}
        </h2>
        <button type="button" popovertarget={`text-contrast-${row.id}`} popovertargetaction="hide">
          Close
        </button>
      </div>
      <div class="popover-body">
        {#if row.background}
          <section>
            <h3>Other colors as text on background color {row.row}</h3>
            <ContrastTable caption={`Background color ${row.row}`} rows={asBackground} />
          </section>
        {/if}
        <section>
          <h3>Color {row.row} as text</h3>
          <ContrastTable
            caption={`Color ${row.row} against selected contrast backgrounds`}
            rows={asText}
          />
        </section>
        <p class="note">
          APCA sizing is a prototype mapping based on Arial/Helvetica-like reference fonts. WCAG 2
          ratios are shown separately.
        </p>
      </div>
    </section>
  </td>
  <td>
    <button
      bind:this={checksTrigger}
      type="button"
      data-field="checks"
      class={`result-button ${row.checks.className}`}
      popovertarget={`checks-${row.id}`}
      aria-controls={`checks-${row.id}`}
      aria-expanded="false"
    >
      {row.checks.text}<small>{row.checks.detail}</small>
    </button>
    <section
      id={`checks-${row.id}`}
      popover="auto"
      aria-labelledby={`checks-${row.id}-title`}
      on:toggle={(event) => onPopoverToggle(event, checksTrigger, checksHeading)}
    >
      <div class="popover-head">
        <h2 bind:this={checksHeading} id={`checks-${row.id}-title`} tabindex="-1">
          Checks — color {row.row}
        </h2>
        <button type="button" popovertarget={`checks-${row.id}`} popovertargetaction="hide">
          Close
        </button>
      </div>
      <div class="popover-body">
        <section>
          <h3>Contrast signals involving this color</h3>
          <ContrastTable
            caption="Available directed text/background comparisons"
            rows={allContrast}
          />
        </section>
        <section>
          <h3>Color-vision distinguishability</h3>
          <div class="filter-row">
            <input id={`checks-${row.id}-hide-pass`} type="checkbox" bind:checked={hidePass}>
            <label for={`checks-${row.id}-hide-pass`}>Hide all-pass comparisons</label>
          </div>
          {#if visibleCvdRows.length}
            <table>
              <thead>
                <tr>
                  <th scope="col">Compared with</th>
                  <th scope="col">Protanopia</th>
                  <th scope="col">Deuteranopia</th>
                  <th scope="col">Tritanopia</th>
                </tr>
              </thead>
              <tbody>
                {#each visibleCvdRows as item (item.key)}
                  <tr>
                    <th scope="row">Color {item.otherRow}</th>
                    <td class={item.modes.protanopia.className}>{item.modes.protanopia.label}</td>
                    <td class={item.modes.deuteranopia.className}>
                      {item.modes.deuteranopia.label}
                    </td>
                    <td class={item.modes.tritanopia.className}>{item.modes.tritanopia.label}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <p class="empty-state">
              {candidate.document.order.length < 2 ? 'Add another color to create a comparison.' : 'No possible color-vision conflicts are visible with the current filter.'}
            </p>
          {/if}
          <p class="note">
            Color-vision results use a prototype simulation and OKLab-distance heuristic, not a
            normative standard.
          </p>
        </section>
      </div>
    </section>
  </td>
</tr>
