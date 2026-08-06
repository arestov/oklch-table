export const tableColumns = [
  { id: "actions", shortcut: "1", label: "Actions" },
  { id: "css", shortcut: "2", label: "CSS color" },
  { id: "lightness", shortcut: "3", label: "Lightness" },
  { id: "chroma", shortcut: "4", label: "Chroma" },
  { id: "hue", shortcut: "5", label: "Hue" },
  { id: "background", shortcut: "6", label: "Contrast background" },
  { id: "text-contrast", shortcut: "7", label: "Text contrast" },
  { id: "checks", shortcut: "8", label: "Checks" },
] as const;

export type TableColumn = (typeof tableColumns)[number]["id"];

export interface TableCoordinate {
  row: number;
  column: TableColumn;
}

export const defaultTableCoordinate: TableCoordinate = { row: 1, column: "actions" };

export function columnForShortcut(shortcut: string): TableColumn | null {
  return tableColumns.find((column) => column.shortcut === shortcut)?.id ?? null;
}

export function tableColumnLabel(column: TableColumn): string {
  return tableColumns.find((item) => item.id === column)?.label ?? column;
}

function isTableColumn(value: string | undefined): value is TableColumn {
  return tableColumns.some((column) => column.id === value);
}

export function coordinateFromTarget(
  root: HTMLElement,
  target: HTMLElement | null,
): TableCoordinate {
  const row = target?.closest<HTMLElement>("[data-navigation-row]");
  const column = target?.closest<HTMLElement>("[data-navigation-column]");
  if (!row || !column || !root.contains(row) || !root.contains(column)) {
    return defaultTableCoordinate;
  }
  const rowNumber = Number(row.dataset.navigationRow);
  const columnId = column.dataset.navigationColumn;
  return Number.isInteger(rowNumber) && rowNumber > 0 && isTableColumn(columnId)
    ? { row: rowNumber, column: columnId }
    : defaultTableCoordinate;
}

export function resolveNavigationTarget(
  root: HTMLElement,
  coordinate: TableCoordinate,
): { row: HTMLElement | null; target: HTMLElement | null } {
  const row = root.querySelector<HTMLElement>(`[data-navigation-row="${coordinate.row}"]`);
  return {
    row,
    target:
      row?.querySelector<HTMLElement>(`[data-navigation-target="${coordinate.column}"]`) ?? null,
  };
}

export function closeOpenPopovers(root: HTMLElement): void {
  for (const popover of root.querySelectorAll<HTMLElement>("[popover]:popover-open")) {
    popover.hidePopover();
  }
}
