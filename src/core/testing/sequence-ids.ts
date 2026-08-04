import type { ColorId, IdGenerator, TransactionId } from "../identity/ids.ts";

export function createSequenceIds(): IdGenerator {
  let color = 0;
  let transaction = 0;
  return {
    color: () => `color_test_${++color}` as ColorId,
    transaction: () => `tx_test_${++transaction}` as TransactionId,
  };
}
