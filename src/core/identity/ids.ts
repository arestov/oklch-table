import { nanoid } from "nanoid";

export type ColorId = `color_${string}`;
export type TransactionId = `tx_${string}`;

export interface IdGenerator {
  color(): ColorId;
  transaction(): TransactionId;
}

export const nanoIdGenerator: IdGenerator = {
  color: () => `color_${nanoid()}`,
  transaction: () => `tx_${nanoid()}`,
};
