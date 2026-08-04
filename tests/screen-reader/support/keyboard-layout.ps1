param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^[0-9A-Fa-f]{8}$")]
  [string]$Layout
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class KeyboardLayout {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr window, IntPtr processId);

    [DllImport("user32.dll")]
    public static extern IntPtr GetKeyboardLayout(uint threadId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr LoadKeyboardLayout(string layoutId, uint flags);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool PostMessage(IntPtr window, uint message, IntPtr word, IntPtr longValue);
}
"@

$window = [KeyboardLayout]::GetForegroundWindow()
if ($window -eq [IntPtr]::Zero) {
  throw "No foreground window is available"
}

$thread = [KeyboardLayout]::GetWindowThreadProcessId($window, [IntPtr]::Zero)
$current = [uint32]([KeyboardLayout]::GetKeyboardLayout($thread).ToInt64() -band 0xffffffff)
$requested = [KeyboardLayout]::LoadKeyboardLayout($Layout, 1)
if ($requested -eq [IntPtr]::Zero) {
  throw "Windows could not load keyboard layout $Layout"
}

if (-not [KeyboardLayout]::PostMessage($window, 0x0050, [IntPtr]::Zero, $requested)) {
  throw "Windows rejected keyboard layout $Layout for the foreground window"
}

Start-Sleep -Milliseconds 100
$actual = [uint32]([KeyboardLayout]::GetKeyboardLayout($thread).ToInt64() -band 0xffffffff)
if (($actual -band 0xffff) -ne ([Convert]::ToUInt32($Layout, 16) -band 0xffff)) {
  throw "Foreground keyboard layout is $($actual.ToString('X8')), expected $Layout"
}

($current -band 0xffff).ToString("X8")
