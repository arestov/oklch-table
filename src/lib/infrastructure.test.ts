import { describe, expect, it } from "vitest";

import { infrastructureStatus } from "./infrastructure.ts";

describe("infrastructure", () => {
  it("loads TypeScript modules in Vitest", () => {
    expect(infrastructureStatus).toBe("Infrastructure is ready");
  });
});
