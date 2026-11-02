// import React from "react"; // Not needed with automatic JSX runtime
import DataTable from "../common/table/DataTable";
import EmptyState from "@/components/EmptyState";

/**
 * VehicleTable – wrapper that configures DataTable for vehicle data.
 * Props:
 *  - paginatedVehicles: array of vehicle objects for the current page.
 *  - filteredVehiclesLength: total count after filters (displayed in header).
 *  - selectedVehicleId, setSelectedVehicleId: row selection handling.
 *  - currentPage, itemsPerPage: used for STT calculation.
 *  - handleOpenEditModal, handleDeleteVehicle: actions per row.
 *  - renderTicketBadge, renderStatusBadge: helper renderers supplied by parent.
 */
export default function VehicleTable({
  paginatedVehicles,
  filteredVehiclesLength,
  setSelectedVehicleId,
  currentPage,
  itemsPerPage,
  handleOpenEditModal,
  handleDeleteVehicle,
  renderTicketBadge,
  renderStatusBadge,
}) {
  const columns = [
    {
      header: "STT",
      accessor: (row, idx) => (currentPage - 1) * itemsPerPage + idx + 1,
      align: "center",
    },
    { header: "Biển số xe", accessor: "licensePlate" },
    {
      header: "Khách hàng",
      accessor: (row) => (
        <>\n          <div className="font-medium text-slate-900">{row.customer.name}</div>\n          <div className="text-2xs text-slate-400">{row.customer.id}</div>\n        </>
      ),
    },
    { header: "SĐT", accessor: (row) => row.customer.phone },
    { header: "Loại vé", accessor: (row) => row.ticket.type },
    { header: "Ngày hết hạn vé", accessor: (row) => renderTicketBadge(row.ticket) },
    { header: "Vị trí đỗ", accessor: (row) => row.parkingSlot.display },
    { header: "Trạng thái", accessor: (row) => renderStatusBadge(row.status, row.statusDisplay) },
    {
      header: "Thao tác",
      accessor: (row) => (
        <div
          className="flex items-center justify-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => handleOpenEditModal(row.id)}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span>Sửa</span>
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => handleDeleteVehicle(row)}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>Xóa</span>
          </button>
        </div>
      ),
      align: "center",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Danh sách phương tiện</h2>
          <p className="text-2xs text-slate-500">Thông tin xe và tình trạng sử dụng</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Xuất CSV</span>
          </button>
          <span className="text-xs text-slate-400 font-medium">
            {filteredVehiclesLength} phương tiện
          </span>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={paginatedVehicles}
        rowKey="id"
        onRowClick={(row) => setSelectedVehicleId(row.id)}
        emptyMessage={<EmptyState title="Không tìm thấy phương tiện nào phù hợp với bộ lọc." className="py-10" />}
      />
    </div>
  );
}
