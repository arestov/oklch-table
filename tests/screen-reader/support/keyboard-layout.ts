import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./keyboard-layout.ps1", import.meta.url));

export async function setForegroundKeyboardLayout(layout: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-Layout",
      layout,
    ],
    { windowsHide: true },
  );

  return stdout.trim();
}
