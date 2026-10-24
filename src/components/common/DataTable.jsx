// import React from "react"; // Not needed with automatic JSX runtime

/**
 * Reusable data table component.
 *
 * Props:
 *   - columns: Array of column definitions:
 *       {
 *          header: string,                // column title
 *          accessor: string | (row, index) => ReactNode,
 *          align?: string,                // e.g. "center", "right"
 *          minWidth?: string | number,
 *       }
 *   - rows: array of data objects.
 *   - rowKey: string | (row) => any – used for React key.
 *   - onRowClick?: (row) => void – click handler for the whole row.
 *   - renderCell?: (row, column) => ReactNode – custom cell renderer (fallback to accessor).
 *   - emptyMessage?: ReactNode – shown when rows.length === 0.
 *   - pagination?: { currentPage: number, itemsPerPage: number } – optional, used by accessor functions that need STT.
 */
export default function DataTable({
  columns,
  rows,
  rowKey,
  onRowClick,
  renderCell,
  emptyMessage = "Không có dữ liệu.",
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-600">
        <thead className="bg-slate-50/75 border-b border-slate-200 text-2xs font-semibold text-slate-700 uppercase tracking-wider">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`py-3 px-3.5 ${col.align ? `text-${col.align}` : ""}`}
                style={{ minWidth: col.minWidth ?? "auto" }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 font-normal">
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => {
              const key =
                typeof rowKey === "function" ? rowKey(row) : row[rowKey];
              const clickable = !!onRowClick;
              return (
                <tr
                  key={key}
                  onClick={() => clickable && onRowClick(row)}
                  className={clickable ? "cursor-pointer hover:bg-slate-50/80" : ""}
                >
                  {columns.map((col, i) => {
                    const content = renderCell
                      ? renderCell(row, col)
                      : typeof col.accessor === "function"
                      ? col.accessor(row, rowIndex)
                      : row[col.accessor];
                    return (
                      <td
                        key={i}
                        className={`py-3.5 px-3.5 ${col.align ? `text-${col.align}` : ""}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="py-4 text-center text-slate-400 text-xs"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
