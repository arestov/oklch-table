import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Page } from "@playwright/test";

const execFileAsync = promisify(execFile);
const originalClipboard = new WeakMap<Page, string>();

function clipboardScript(text: string): string {
  const encoded = Buffer.from(text, "utf8").toString("base64");
  return `Set-Clipboard -Value ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')))`;
}

async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    script,
  ]);
  return stdout;
}

async function readClipboardText(): Promise<string> {
  return runPowerShell(
    "[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false); [Console]::Out.Write((Get-Clipboard -Raw))",
  );
}

/** Places fixture text on the native clipboard while preserving the user's text clipboard. */
export async function setNativeClipboard(page: Page, text: string): Promise<void> {
  if (!originalClipboard.has(page)) originalClipboard.set(page, await readClipboardText());
  await runPowerShell(clipboardScript(text));
}

export async function restoreNativeClipboard(page: Page): Promise<void> {
  const original = originalClipboard.get(page);
  if (original === undefined) return;
  await runPowerShell(clipboardScript(original));
  originalClipboard.delete(page);
}
