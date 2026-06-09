import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState, type Key, type ReactNode } from "react";

type SortDirection = "ascending" | "descending";
type SortValue = number | string;

interface SortState {
  columnId: string;
  direction: SortDirection;
}

export interface DataTableColumn<Row> {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: Row) => SortValue;
  align?: "left" | "center" | "right";
}

interface DataTableProps<Row> {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => Key;
  ariaLabel?: string;
  emptyMessage?: ReactNode;
  caption?: ReactNode;
  className?: string;
}

function compareValues(left: SortValue, right: SortValue): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), "zh-CN", {
    numeric: true,
    sensitivity: "base",
  });
}

export function DataTable<Row,>({
  columns,
  rows,
  getRowKey,
  ariaLabel = "数据表格",
  emptyMessage = "暂无数据",
  caption,
  className,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedRows = useMemo(() => {
    if (!sort) {
      return rows;
    }

    const column = columns.find(({ id }) => id === sort.columnId);
    if (!column?.sortValue) {
      return rows;
    }

    const direction = sort.direction === "ascending" ? 1 : -1;

    return rows
      .map((row, index) => ({ row, index }))
      .sort(
        (left, right) =>
          compareValues(
            column.sortValue!(left.row),
            column.sortValue!(right.row),
          ) *
            direction || left.index - right.index,
      )
      .map(({ row }) => row);
  }, [columns, rows, sort]);

  const requestSort = (columnId: string) => {
    setSort((current) => ({
      columnId,
      direction:
        current?.columnId === columnId && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  };

  const classes = ["data-table-scroll", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <table className="data-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.columnId === column.id;
              const canSort = Boolean(column.sortable && column.sortValue);
              const SortIcon = !isSorted
                ? ChevronsUpDown
                : sort.direction === "ascending"
                  ? ArrowUp
                  : ArrowDown;

              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={isSorted ? sort.direction : undefined}
                  data-align={column.align ?? "left"}
                >
                  {canSort ? (
                    <button
                      className="data-table-sort"
                      type="button"
                      onClick={() => requestSort(column.id)}
                    >
                      <span>{column.header}</span>
                      <SortIcon aria-hidden="true" />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length > 0 ? (
            sortedRows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.id}
                    data-align={column.align ?? "left"}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="data-table-empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
