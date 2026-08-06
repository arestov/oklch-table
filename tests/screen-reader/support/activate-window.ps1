param(
  [Parameter(Mandatory = $true)]
  [string]$ExecutablePath,

  [Parameter(Mandatory = $true)]
  [string]$WindowTitle
)

$process = Get-CimInstance Win32_Process -Filter "Name = 'firefox.exe'" |
  Where-Object { $_.ExecutablePath -eq $ExecutablePath } |
  ForEach-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue } |
  Where-Object { $_.MainWindowTitle -like "*$WindowTitle*" } |
  Select-Object -First 1

if (-not $process) {
  throw "No window titled '$WindowTitle' was found for '$ExecutablePath'."
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class NativeWindow {
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

[NativeWindow]::ShowWindow($process.MainWindowHandle, 9) | Out-Null
$shell = New-Object -ComObject WScript.Shell
$shell.SendKeys("%")
Start-Sleep -Milliseconds 50
if (-not [NativeWindow]::SetForegroundWindow($process.MainWindowHandle)) {
  throw "Unable to focus '$($process.MainWindowTitle)'."
}
