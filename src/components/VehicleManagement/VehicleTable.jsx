import React from "react";
import DataTable from "../common/table/DataTable";
import TableActions from "../common/table/TableActions";
import VehicleTicketTypeBadge from "./VehicleTicketTypeBadge";
import { DEFAULT_UNASSIGNED_SLOT_LABEL } from "../../constants/vehicleConstants";

export default function VehicleTable({
  paginatedVehicles,
  selectedVehicleId,
  setSelectedVehicleId,
  currentPage,
  itemsPerPage,
  handleOpenEditModal,
  handleDeleteVehicle,
  handleOpenAssignSlot,
  renderTicketBadge,
  renderStatusBadge,
  isManager = false,
}) {
  const columns = [
    {
      header: "STT",
      accessor: (row, idx) => (currentPage - 1) * itemsPerPage + idx + 1,
      align: "center",
      headerAlign: "center",
      className: "w-12 text-slate-400 font-medium text-center",
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
      header: "Khách hàng",
      accessor: (row) => (
        <>
          <div className="font-medium text-slate-900">{row.customer?.name || "—"}</div>
          <div className="text-2xs text-slate-400 font-mono">
            {row.customer?.code && row.customer.code !== "—"
              ? row.customer.code
              : row.customer?.id && !isNaN(Number(row.customer.id))
              ? `KH${String(row.customer.id).padStart(4, "0")}`
              : row.customer?.id || "—"}
          </div>
        </>
      ),
    },
    {
      header: "SĐT",
      accessor: (row) =>
        row.customer?.phone && row.customer.phone !== "—" ? (
          <a
            href={`tel:${row.customer.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline font-mono"
            title="Bấm để gọi"
          >
            {row.customer.phone}
          </a>
        ) : (
          <span className="text-slate-400 font-normal">Chưa có SĐT</span>
        ),
    },
    {
      header: "Loại vé",
      accessor: (row) => (
        <VehicleTicketTypeBadge ticketType={row.ticket?.type || row.ticketType} />
      ),
    },
    {
      header: "Ngày hết hạn vé",
      accessor: (row) => renderTicketBadge(row.ticket),
    },
    {
      header: "Vị trí đỗ",
      accessor: (row) => {
        const isParked = row.status === "parked";
        const slotDisplay = row.parkingSlot?.display || row.parkingSlot?.slot;
        const hasSlot =
          slotDisplay &&
          slotDisplay !== DEFAULT_UNASSIGNED_SLOT_LABEL &&
          slotDisplay !== "Chưa có vị trí" &&
          slotDisplay !== "—";

        if (isParked) {
          if (hasSlot) {
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAssignSlot?.(row);
                }}
                className="font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 hover:border-emerald-300 text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                title="Nhấn để đổi vị trí ô đỗ"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {slotDisplay}
              </button>
            );
          }
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAssignSlot?.(row);
              }}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-amber-200 hover:border-amber-300 shadow-2xs cursor-pointer transition-colors"
              title="Xe đang đỗ trong bãi nhưng chưa được chỉ định ô đỗ. Nhấn để gán ô."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Chờ xếp ô (Đang đỗ)
              <span className="text-2xs opacity-70 group-hover:opacity-100 font-bold ml-0.5">✏️</span>
            </button>
          );
        }

        return (
          <span className="font-medium text-slate-500 text-xs">
            {hasSlot ? slotDisplay : "—"}
          </span>
        );
      },
    },
    {
      header: "Trạng thái",
      accessor: (row) => renderStatusBadge(row.status, row.statusDisplay),
    },
    {
      header: "Thao tác",
      accessor: (row) => {
        const isParked = row.status === "parked";
        const slotDisplay = row.parkingSlot?.display || row.parkingSlot?.slot;
        const hasSlot =
          slotDisplay &&
          slotDisplay !== DEFAULT_UNASSIGNED_SLOT_LABEL &&
          slotDisplay !== "Chưa có vị trí" &&
          slotDisplay !== "—";

        return (
          <TableActions
            actions={[
              ...(isParked
                ? [
                    {
                      label: hasSlot ? "Đổi ô" : "Gán ô",
                      icon: "view",
                      onClick: () => handleOpenAssignSlot?.(row),
                      className: "text-emerald-600 hover:text-emerald-800",
                      title: hasSlot ? "Đổi vị trí ô đỗ" : "Chỉ định ô đỗ cho xe",
                    },
                  ]
                : []),
              {
                label: "Sửa",
                icon: "edit",
                onClick: () => handleOpenEditModal(row.id),
                className: "text-blue-600 hover:text-blue-800",
              },
              {
                label: "Xóa",
                icon: "delete",
                disabled: !isManager,
                title: !isManager
                  ? "Chỉ Quản lý mới có quyền xóa phương tiện"
                  : row.status === "parked"
                  ? "Phương tiện đang đỗ trong bãi (Cảnh báo Safe Delete)"
                  : "Xóa phương tiện",
                onClick: () => handleDeleteVehicle(row),
                className: isManager
                  ? "text-rose-600 hover:text-rose-800"
                  : "text-slate-300 cursor-not-allowed opacity-50",
              },
            ]}
          />
        );
      },
      align: "center",
      headerAlign: "center",
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={paginatedVehicles || []}
      rowKey="id"
      selectedId={selectedVehicleId}
      onRowClick={(row) => setSelectedVehicleId(row.id)}
      emptyMessage="Không tìm thấy phương tiện nào phù hợp với bộ lọc."
    />
  );
}
