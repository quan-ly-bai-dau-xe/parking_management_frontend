import React, { useMemo } from "react";
import DataTable from "../common/table/DataTable";
import TableActions from "../common/table/TableActions";
import VehicleTicketTypeBadge from "../VehicleManagement/VehicleTicketTypeBadge";

export default function TicketTable({
  tickets,
  currentPage,
  itemsPerPage,
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

  return (
    <DataTable
      columns={columns}
      rows={tickets || []}
      rowKey="ticketCode"
      emptyMessage="Không tìm thấy vé nào phù hợp với điều kiện tìm kiếm."
    />
  );
}
