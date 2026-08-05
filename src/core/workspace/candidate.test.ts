import { describe, expect, it } from "vitest";
import { buildCandidateRevision } from "./candidate.ts";
import type { DraftEdit } from "./draft.ts";
import type { DocumentTree } from "./model.ts";

const id = "color_test" as const;
const document: DocumentTree = {
  colors: {
    order: [id],
    byId: {
      [id]: {
        id,
        value: { l: 0.58, c: 0.2, h: 25, alpha: 1 },
        serialization: { format: "oklch", lightnessUnit: "number" },
        roles: { contrastBackground: false },
      },
    },
  },
};
const dependencies = {
  parseCss: () => null,
  analyze: (value: DocumentTree) => value.colors.order.length,
};

describe("candidate revisions", () => {
  it("keeps the last valid patch visible while raw input becomes invalid", () => {
    const edit: DraftEdit = {
      colorId: id,
      field: "l",
      raw: "0.",
      lastValidPatch: { field: "l", value: 0.6 },
    };
    const candidate = buildCandidateRevision(document, edit, dependencies);
    expect(candidate.status).toBe("invalid");
    if (candidate.status === "invalid")
      expect(candidate.lastValid.document.colors.byId[id].value.l).toBe(0.6);
  });
});
