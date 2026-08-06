import { describe, expect, it, vi } from "vitest";
import {
  closeOpenPopovers,
  columnForShortcut,
  coordinateFromTarget,
  defaultTableCoordinate,
  resolveNavigationTarget,
  tableColumnLabel,
} from "./table-navigation.ts";

const element = (dataset: Record<string, string> = {}) =>
  ({ dataset, querySelector: vi.fn() }) as unknown as HTMLElement;

describe("table navigation DOM contract", () => {
  it("maps shortcuts and labels through the shared column definition", () => {
    expect(columnForShortcut("3")).toBe("lightness");
    expect(columnForShortcut("9")).toBeNull();
    expect(tableColumnLabel("checks")).toBe("Checks");
    expect(tableColumnLabel("missing" as never)).toBe("missing");
  });

  it("derives a coordinate only from navigation metadata inside the workspace", () => {
    const row = element({ navigationRow: "4" });
    const column = element({ navigationColumn: "hue" });
    const root = {
      contains: (item: unknown) => item === row || item === column,
    } as unknown as HTMLElement;
    const target = {
      closest: (selector: string) =>
        selector === "[data-navigation-row]"
          ? row
          : selector === "[data-navigation-column]"
            ? column
            : null,
    } as unknown as HTMLElement;

    expect(coordinateFromTarget(root, target)).toEqual({ row: 4, column: "hue" });
    expect(coordinateFromTarget(root, null)).toEqual(defaultTableCoordinate);
  });

  it("falls back to the default coordinate for invalid or external metadata", () => {
    const row = element({ navigationRow: "0" });
    const column = element({ navigationColumn: "not-a-column" });
    const root = { contains: () => true } as unknown as HTMLElement;
    const target = {
      closest: (selector: string) =>
        selector === "[data-navigation-row]"
          ? row
          : selector === "[data-navigation-column]"
            ? column
            : null,
    } as unknown as HTMLElement;
    const externalRoot = { contains: () => false } as unknown as HTMLElement;

    expect(coordinateFromTarget(root, target)).toEqual(defaultTableCoordinate);
    expect(coordinateFromTarget(externalRoot, target)).toEqual(defaultTableCoordinate);
  });

  it("resolves the explicit target in a row and reports unavailable rows or columns", () => {
    const target = element();
    const row = element();
    vi.mocked(row.querySelector).mockReturnValue(target);
    const root = { querySelector: vi.fn(() => row) } as unknown as HTMLElement;

    expect(resolveNavigationTarget(root, { row: 2, column: "css" })).toEqual({ row, target });

    vi.mocked(row.querySelector).mockReturnValue(null);
    expect(resolveNavigationTarget(root, { row: 2, column: "css" })).toEqual({ row, target: null });

    vi.mocked(root.querySelector).mockReturnValue(null);
    expect(resolveNavigationTarget(root, { row: 9, column: "css" })).toEqual({
      row: null,
      target: null,
    });
  });

  it("closes every open popover in the workspace", () => {
    const first = { hidePopover: vi.fn() } as unknown as HTMLElement;
    const second = { hidePopover: vi.fn() } as unknown as HTMLElement;
    const root = { querySelectorAll: vi.fn(() => [first, second]) } as unknown as HTMLElement;

    closeOpenPopovers(root);

    expect(first.hidePopover).toHaveBeenCalledOnce();
    expect(second.hidePopover).toHaveBeenCalledOnce();
  });
});
