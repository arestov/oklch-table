import type { DocumentTree as WorkspaceDocumentTree } from "../../domain/types.ts";

export type {
  ColorFormat,
  ColorNode,
  DocumentTree,
  LightnessUnit,
  OklchValue,
} from "../../domain/types.ts";

export const createEmptyDocument = (): WorkspaceDocumentTree => ({
  colors: { order: [], byId: {} as WorkspaceDocumentTree["colors"]["byId"] },
});
