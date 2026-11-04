import { useState } from "react";
import { PageHeader, Button, Pagination } from "../components/common";
import {
  TicketFilters,
  TicketTable,
  CreateTicketModal,
  RenewTicketModal,
  TicketDetailModal,
  DeleteTicketModal,
} from "../components/TicketManagement";
import useTicketData from "../hooks/useTicketData";

export default function TicketManagement() {
  const {
    filteredTickets,
    paginatedTickets,
    filters,
    currentPage,
    totalPages,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    handleFilterChange,
    handleResetFilters,
    handleItemsPerPageChange,
    handleCreateTicket,
    handleRenewTicket,
    handleDeleteTicket,
  } = useTicketData();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const handleOpenDetail = (ticket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  };

  const handleOpenRenew = (ticket) => {
    setSelectedTicket(ticket);
    setIsRenewOpen(true);
  };

  const handleOpenDelete = (ticket) => {
    setSelectedTicket(ticket);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = (ticket) => {
    handleDeleteTicket(ticket);
    setIsDeleteOpen(false);
    setSelectedTicket(null);
  };

  const handleExportCsv = () => {
    const headers = [
      "STT",
      "Mã vé",
      "Khách hàng",
      "Mã KH",
      "Biển số xe",
      "Loại vé",
      "Hiệu lực từ",
      "Hết hạn",
      "Giá vé",
      "Vị trí",
      "Trạng thái",
    ];

    const rows = filteredTickets.map((t, idx) => [
      idx + 1,
      `"${t.ticketCode || ""}"`,
      `"${t.customerName || ""}"`,
      `"${t.customerCode || ""}"`,
      `"${t.licensePlate || ""}"`,
      `"${t.ticketType || ""}"`,
      `"${t.startDate || ""}"`,
      `"${t.endDate || ""}"`,
      `"${t.price || ""}"`,
      `"${t.slotLocation || ""}"`,
      `"${t.statusText || t.status || ""}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `danh_sach_ve_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header trang chuẩn hóa qua Common PageHeader */}
      <PageHeader
        title="Quản lý vé"
        description="Quản lý thông tin vé, tra cứu, thêm mới, gia hạn và hủy/xóa vé đỗ xe."
        breadcrumb={
          <span>
            Smart Mobility /{" "}
            <span className="text-slate-600 font-medium">Quản lý vé</span>
          </span>
        }
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="cursor-pointer"
          >
            + Thêm vé mới
          </Button>
        }
      />

      {/* 2. Bộ lọc tìm kiếm vé */}
      <TicketFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* 3. Card Bảng dữ liệu chuẩn đồng nhất với VehicleManagement */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Danh sách vé</h2>
            <p className="text-2xs text-slate-500 mt-0.5">
              Hiển thị {filteredTickets.length} vé trong hệ thống
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleExportCsv}>
              Xuất CSV
            </Button>
            <span className="text-xs text-slate-400 font-medium">
              {filteredTickets.length} vé
            </span>
          </div>
        </div>

        <TicketTable
          tickets={paginatedTickets}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onOpenDetail={handleOpenDetail}
          onOpenRenew={handleOpenRenew}
          onOpenDelete={handleOpenDelete}
        />

        <div className="p-4 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredTickets.length}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(num) => {
              setItemsPerPage(num);
              setCurrentPage(1);
            }}
            itemsPerPageOptions={[5, 10, 20]}
          />
        </div>
      </div>

      {/* 4. Các Modals nghiệp vụ vé */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleCreateTicket}
      />

      <RenewTicketModal
        isOpen={isRenewOpen}
        ticket={selectedTicket}
        onClose={() => setIsRenewOpen(false)}
        onConfirm={handleRenewTicket}
      />

      <TicketDetailModal
        isOpen={isDetailOpen}
        ticket={selectedTicket}
        onClose={() => setIsDetailOpen(false)}
      />

      <DeleteTicketModal
        isOpen={isDeleteOpen}
        ticket={selectedTicket}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedTicket(null);
        }}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
