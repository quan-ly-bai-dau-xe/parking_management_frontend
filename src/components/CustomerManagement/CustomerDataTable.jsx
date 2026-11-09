import React from "react";
import { DataTable, EmptyState, Pagination, Button } from "../common";
import CustomerVehicleExpandedList from "./CustomerVehicleExpandedList";

export default function CustomerDataTable({
  columns,
  paginatedList,
  expandedRowId,
  onRowClick,
  onCloseExpanded,
  isLoading,
  errorMessage,
  onRetry,
  totalItems,
  totalPages,
  currentPage,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          rows={paginatedList}
          rowKey="id"
          onRowClick={onRowClick}
          renderCell={(row, col) =>
            col.renderCell
              ? col.renderCell(row)
              : typeof col.accessor === "function"
                ? col.accessor(row)
                : row[col.accessor]
          }
          emptyMessage={
            <div className="flex min-h-[180px] items-center justify-center">
              <EmptyState
                title={
                  isLoading
                    ? "Đang tải dữ liệu..."
                    : errorMessage
                      ? "Không thể tải dữ liệu"
                      : "Không tìm thấy khách hàng nào"
                }
                description={
                  isLoading
                    ? "Vui lòng đợi giây lát."
                    : errorMessage || "Thử thay đổi bộ lọc hoặc thêm khách hàng mới."
                }
                action={
                  errorMessage ? (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      Tải lại dữ liệu
                    </Button>
                  ) : null
                }
              />
            </div>
          }
        />
      </div>

      {totalItems > 0 && (
        <div className="p-4 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onItemsPerPageChange={onItemsPerPageChange}
          />
        </div>
      )}

      {paginatedList.map((row) =>
        expandedRowId === row.id ? (
          <CustomerVehicleExpandedList
            key={`expanded-${row.id}`}
            customer={row}
            onClose={onCloseExpanded}
          />
        ) : null,
      )}
    </div>
  );
}
