import { spawnSync } from "node:child_process";

const nativeFull = process.argv.includes("--native");
const isWindows = process.platform === "win32";
const pnpmCli = process.env.npm_execpath;

if (!pnpmCli) {
  console.error("Run this command through pnpm so npm_execpath identifies the pnpm CLI.");
  process.exit(1);
}

if (nativeFull && !isWindows) {
  console.error("verify:full:native requires Windows with Guidepup and NVDA installed.");
  process.exit(1);
}

function run(script, env = process.env) {
  const nativePnpm = pnpmCli.toLocaleLowerCase().endsWith(".exe");
  const command = nativePnpm ? pnpmCli : process.execPath;
  const args = nativePnpm ? ["run", script] : [pnpmCli, "run", script];
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit",
    windowsHide: false,
  });
  if (result.error) throw result.error;
  if (result.signal) {
    console.error(`${script} was terminated by ${result.signal}.`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("check");
run("build");
run("test:size");
run("test:e2e:run", { ...process.env, PLAYWRIGHT_ALL_BROWSERS: "1" });

if (isWindows) {
  run(nativeFull ? "test:screen-reader:full:run" : "test:screen-reader:smoke:run");
} else {
  console.log("Native NVDA coverage is Windows-only; the cross-platform full gate is complete.");
}
