import { preview } from "vite";

/** NVDA tests own a separate built preview and always close it with the runner. */
export default async function startScreenReaderPreview(): Promise<() => Promise<void>> {
  const server = await preview({
    logLevel: "error",
    preview: { host: "127.0.0.1", port: 4174, strictPort: true },
  });
  return async () => server.close();
}
