import { spawn } from "node:child_process";

const server = spawn(
  process.execPath,
  ["./node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4173"],
  { stdio: "inherit", windowsHide: true },
);

let stopping = false;
const stop = (code) => {
  if (stopping) return;
  stopping = true;
  server.kill();
  server.once("exit", () => process.exit(code));
};

process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));
server.once("exit", (code) => process.exit(code ?? 1));
