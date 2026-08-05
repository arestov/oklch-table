import { expectTypeOf, it } from "vitest";
import type { TransactionId } from "../core/identity/ids.ts";
import { createSequenceIds } from "../core/testing/sequence-ids.ts";
import type { EditableField } from "../core/workspace/draft.ts";
import type { TransactionCause } from "../core/workspace/transactions.ts";
import { colorVisionKey, contrastKey } from "./analysis.ts";
import type { ColorId, ColorVisionKey, ContrastKey } from "./types.ts";

const textId: ColorId = "color_text";
const backgroundId: ColorId = "color_background";

// @ts-expect-error Color and transaction IDs are deliberately incompatible brands.
const invalidTransactionId: TransactionId = textId;
void invalidTransactionId;

it("preserves domain contracts at compile time", () => {
  const ids = createSequenceIds();

  expectTypeOf(ids.color()).toEqualTypeOf<ColorId>();
  expectTypeOf(ids.transaction()).toEqualTypeOf<TransactionId>();
  expectTypeOf(contrastKey(textId, backgroundId)).toEqualTypeOf<ContrastKey>();
  expectTypeOf(colorVisionKey(textId, backgroundId)).toEqualTypeOf<ColorVisionKey>();
  expectTypeOf<
    Extract<TransactionCause, { type: "edit-field" }>["edit"]["field"]
  >().toEqualTypeOf<EditableField>();
  expectTypeOf<Extract<TransactionCause, { type: "duplicate-color" }>>().toMatchTypeOf<{
    sourceId: ColorId;
    createdId: ColorId;
  }>();
});
