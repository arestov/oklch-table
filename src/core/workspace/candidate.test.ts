import { describe, expect, it } from "vitest";
import { requireValue } from "../safety/required.ts";
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
    const candidate = buildCandidateRevision(document, edit, 1, dependencies);
    expect(candidate.status).toBe("invalid");
    if (candidate.status === "invalid")
      expect(
        requireValue(candidate.lastValid.document.colors.byId[id], "Expected fixture color").value
          .l,
      ).toBe(0.6);
  });

  it("reuses the accepted analysis when no edit changes the document", () => {
    let analyzeCalls = 0;
    const candidate = buildCandidateRevision(document, null, 42, {
      parseCss: () => null,
      analyze: () => {
        analyzeCalls += 1;
        return 1;
      },
    });

    expect(candidate).toEqual({ status: "valid", document, analysis: 42 });
    expect(analyzeCalls).toBe(0);
  });
});
