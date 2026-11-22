import { useMemo } from "react";
import DataTable from "../common/table/DataTable";
import TableActions from "../common/table/TableActions";
import EmptyState from "../common/EmptyState";
import LoadingSpinner from "../common/LoadingSpinner";
import Button from "../common/button";
import VehicleTicketTypeBadge from "../VehicleManagement/VehicleTicketTypeBadge";

export default function TicketTable({
  tickets,
  currentPage,
  itemsPerPage,
  isLoading,
  error,
  onRetry,
  onOpenDetail,
  onOpenRenew,
  onOpenDelete,
}) {
  const columns = useMemo(
    () => [
      {
        header: "STT",
        accessor: (row, idx) => (currentPage - 1) * itemsPerPage + idx + 1,
        align: "center",
        headerAlign: "center",
        className: "w-12 text-slate-400 font-medium text-center",
      },
      {
        header: "Mã vé",
        accessor: (row) => (
          <span className="font-bold text-slate-900 font-mono tracking-wider">
            {row.ticketCode}
          </span>
        ),
      },
      {
        header: "Khách hàng",
        accessor: (row) => (
          <div>
            <div className="font-medium text-slate-900">
              {row.customerName || "—"}
            </div>
            <div className="text-2xs text-slate-400 font-mono">
              {row.customerCode || "—"}
            </div>
          </div>
        ),
      },
      {
        header: "Biển số xe",
        accessor: (row) => (
          <span className="font-bold font-mono text-slate-900 tracking-wider">
            {row.licensePlate}
          </span>
        ),
      },
      {
        header: "Loại vé",
        accessor: (row) => (
          <VehicleTicketTypeBadge ticketType={row.ticketType} />
        ),
      },
      {
        header: "Hiệu lực từ",
        accessor: (row) => (
          <span className="font-mono text-slate-600 text-xs">
            {row.startDate}
          </span>
        ),
      },
      {
        header: "Hết hạn",
        accessor: (row) => (
          <span className="font-mono text-slate-600 text-xs">
            {row.endDate}
          </span>
        ),
      },
      {
        header: "Giá vé",
        accessor: (row) => (
          <span className="font-semibold text-slate-900 font-mono text-xs">
            {row.price}
          </span>
        ),
      },
      {
        header: "Vị trí đỗ",
        accessor: (row) => (
          <span className="font-medium text-slate-800 text-xs">
            {row.slotLocation || "—"}
          </span>
        ),
      },
      {
        header: "Trạng thái",
        accessor: (row) => {
          const status = row.status;
          if (status === "active") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {row.statusText || "Đang hoạt động"}
              </span>
            );
          }
          if (status === "expiring" || status === "renewing") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {row.statusText || "Đang gia hạn"}
              </span>
            );
          }
          if (status === "expired" || status === "cancelled") {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-rose-50 text-rose-700 border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {row.statusText || "Đã hết hạn"}
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {row.statusText || status}
            </span>
          );
        },
      },
      {
        header: "Thao tác",
        align: "center",
        headerAlign: "center",
        accessor: (row) => (
          <TableActions
            actions={[
              {
                label: "Xem",
                icon: "view",
                onClick: () => onOpenDetail(row),
                className: "text-blue-600 hover:text-blue-800",
                title: "Xem chi tiết vé",
              },
              {
                label: "Gia hạn",
                icon: "renew",
                onClick: () => onOpenRenew(row),
                className: "text-emerald-600 hover:text-emerald-800",
                title: "Gia hạn vé",
              },
              {
                label: "Xóa",
                icon: "delete",
                onClick: () => onOpenDelete(row),
                className: "text-rose-600 hover:text-rose-800",
                title: "Xóa vé",
              },
            ]}
          />
        ),
      },
    ],
    [currentPage, itemsPerPage, onOpenDetail, onOpenRenew, onOpenDelete],
  );

  const emptyContent = isLoading ? (
    <div className="py-12 flex flex-col items-center justify-center">
      <LoadingSpinner />
      <span className="mt-2 text-xs text-slate-500">Đang tải dữ liệu vé...</span>
    </div>
  ) : error ? (
    <EmptyState
      title="Không thể tải dữ liệu vé"
      description={error}
      icon={
        <svg
          className="w-10 h-10 text-rose-500 stroke-[1.5]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      }
      action={
        onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        ) : null
      }
    />
  ) : (
    <EmptyState
      title="Không tìm thấy vé nào"
      description="Không tìm thấy vé nào phù hợp với điều kiện tìm kiếm hoặc chưa có vé trong hệ thống."
    />
  );

  return (
    <DataTable
      columns={columns}
      rows={tickets || []}
      rowKey="ticketCode"
      emptyMessage={emptyContent}
    />
  );
}
