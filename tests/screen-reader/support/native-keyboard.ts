import { WindowsKeyCodes } from "@guidepup/guidepup";
import type { NVDAPlaywright } from "@guidepup/playwright";

const numericKeys = {
  "0": WindowsKeyCodes.Digit0,
  "1": WindowsKeyCodes.Digit1,
  "2": WindowsKeyCodes.Digit2,
  "3": WindowsKeyCodes.Digit3,
  "4": WindowsKeyCodes.Digit4,
  "5": WindowsKeyCodes.Digit5,
  "6": WindowsKeyCodes.Digit6,
  "7": WindowsKeyCodes.Digit7,
  "8": WindowsKeyCodes.Digit8,
  "9": WindowsKeyCodes.Digit9,
  ".": WindowsKeyCodes.Period,
} as const;

/** Sends one fast native numeric key sequence without per-character speech capture delays. */
export async function typeNumericFast(nvda: NVDAPlaywright, value: string): Promise<void> {
  const keyCode = [...value].map((character) => {
    const key = numericKeys[character as keyof typeof numericKeys];
    if (!key) throw new Error(`Unsupported native numeric character: ${JSON.stringify(character)}`);
    return key;
  });
  await nvda.perform({ keyCode }, { capture: false });
}
