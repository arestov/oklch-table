import type { StartOptions } from "@guidepup/guidepup/lib/StartOptions";

declare module "@playwright/test" {
  interface PlaywrightTestOptions {
    /**
     * Guidepup passes this object to `nvda.start()`, which accepts all
     * `StartOptions`; the installed adapter declaration exposes only `capture`.
     */
    nvdaStartOptions?: StartOptions;
  }
}
