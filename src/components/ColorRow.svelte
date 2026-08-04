<script lang="ts">
import type { ValidCandidate } from "../core/workspace/draft.ts";
import {
  beginEdit,
  deleteColor,
  duplicateColor,
  finishEdit,
  setContrastBackground,
  updateDraft,
} from "../core/workspace/index.ts";
import { buildRows } from "../domain/presentation.ts";
import type { AnalysisTree, ColorId } from "../domain/types.ts";
import ChecksPopover from "./ChecksPopover.svelte";
import TextContrastPopover from "./TextContrastPopover.svelte";

let { candidate, colorId }: { candidate: ValidCandidate<AnalysisTree>; colorId: ColorId } =
  $props();
const row = $derived.by(() => {
  const value = buildRows(candidate).find((item) => item.id === colorId);
  if (!value) throw new Error(`Unknown color ${colorId}`);
  return value;
});
const edit = (field: "css" | "l" | "c" | "h", raw: string) => {
  beginEdit(colorId, field);
  updateDraft(raw);
};
</script>

<tr data-row-id={colorId}>
  <th scope="row">{row.row}</th>
  <td>
    <button type="button" onclick={() => duplicateColor(colorId)}>Duplicate</button
    ><button type="button" onclick={() => deleteColor(colorId)}>Delete</button>
  </td>
  <td>
    <input
      class="css-color"
      value={row.css}
      data-field="css"
      oninput={(event) => edit("css", event.currentTarget.value)}
      onblur={() => finishEdit("blur")}
    >
  </td>
  <td>
    <input
      type="number"
      value={row.l}
      data-field="l"
      oninput={(event) => edit("l", event.currentTarget.value)}
      onblur={() => finishEdit("blur")}
    >
  </td>
  <td>
    <input
      type="number"
      value={row.c}
      data-field="c"
      oninput={(event) => edit("c", event.currentTarget.value)}
      onblur={() => finishEdit("blur")}
    >
  </td>
  <td>
    <input
      type="number"
      value={row.h}
      data-field="h"
      oninput={(event) => edit("h", event.currentTarget.value)}
      onblur={() => finishEdit("blur")}
    >
  </td>
  <td>
    <input
      type="checkbox"
      checked={row.background}
      onchange={(event) => setContrastBackground(colorId, event.currentTarget.checked)}
    >
  </td>
  <td>
    <button type="button" popovertarget={`text-contrast-${colorId}`}>Text contrast</button>
    <TextContrastPopover {candidate} {colorId} row={row.row} />
  </td>
  <td>
    <button type="button" popovertarget={`checks-${colorId}`}>Checks</button>
    <ChecksPopover {candidate} {colorId} row={row.row} />
  </td>
</tr>
