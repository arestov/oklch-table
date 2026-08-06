import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./activate-window.ps1", import.meta.url));

export async function activateWindow(executablePath: string, windowTitle: string): Promise<void> {
  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-ExecutablePath",
      executablePath,
      "-WindowTitle",
      windowTitle,
    ],
    { windowsHide: true },
  );
}
