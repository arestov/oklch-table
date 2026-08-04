import { preview } from "vite";

/** Starts the built preview in Playwright's process and returns its owned teardown. */
export default async function startPreview(): Promise<() => Promise<void>> {
  const server = await preview({
    logLevel: "error",
    preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  });
  return async () => server.close();
}
