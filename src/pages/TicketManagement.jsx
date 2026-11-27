import { useState } from "react";
import { PageHeader, Button, Pagination } from "../components/common";
import {
  TicketFilters,
  TicketTable,
  CreateTicketModal,
  EditTicketModal,
  RenewTicketModal,
  TicketDetailModal,
  DeleteTicketModal,
} from "../components/TicketManagement";
import useTicketData from "../hooks/useTicketData";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useToast } from "../context/ToastContext";

export default function TicketManagement() {
  const {
    tickets,
    filteredTickets,
    totalCount,
    filters,
    loading,
    error,
    refreshTickets,
    currentPage,
    totalPages,
    itemsPerPage,
    isLoading,
    ticketTypes,
    setCurrentPage,
    handleItemsPerPageChange,
    handleFilterChange,
    handleResetFilters,
    handleCreateTicket,
    handleUpdateTicket,
    handleRenewTicket,
    handleDeleteTicket,
  } = useTicketData();

  const { isManager } = useCurrentUser();
  const toast = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOpenDetail = (ticket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (ticket) => {
    setSelectedTicket(ticket);
    setIsEditOpen(true);
  };

  const handleOpenRenew = (ticket) => {
    setSelectedTicket(ticket);
    setIsRenewOpen(true);
  };

  const handleOpenDelete = (ticket) => {
    setSelectedTicket(ticket);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async (ticket) => {
    if (!isManager) {
      toast.error("Chỉ Quản lý (Manager) mới có quyền xóa vé đỗ xe.");
      setIsDeleteOpen(false);
      return;
    }

    setDeleteLoading(true);
    try {
      const target = ticket.code || ticket.ticketCode || ticket.id;
      const res = await handleDeleteTicket(target);
      toast.success(res?.message || "Xóa thành công");
      setIsDeleteOpen(false);
      setSelectedTicket(null);
    } catch (err) {
      console.error("Delete ticket error:", err);
      toast.error(err?.data?.message || err?.message || "Xóa vé thất bại.");
    } finally {
      setDeleteLoading(false);
    }
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
      `"${t.ticketCode || t.code || ""}"`,
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
        description="Quản lý thông tin vé, tra cứu, thêm mới, chỉnh sửa, gia hạn và hủy/xóa vé đỗ xe."
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

      {/* Banner cảnh báo lỗi backend nếu có */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Lỗi tải dữ liệu vé:</span>
            <span>{error}</span>
          </div>
          {refreshTickets && (
            <Button variant="ghost" size="xs" onClick={refreshTickets}>
              Thử lại
            </Button>
          )}
        </div>
      )}

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
              Hiển thị {filteredTickets.length} / {totalCount} vé trong hệ thống
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleExportCsv}>
              Xuất CSV
            </Button>
            <span className="text-xs text-slate-400 font-medium">
              {totalCount} vé
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Đang tải dữ liệu danh sách vé...
          </div>
        ) : (
          <TicketTable
            tickets={tickets}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onOpenDetail={handleOpenDetail}
            onOpenEdit={handleOpenEdit}
            onOpenRenew={handleOpenRenew}
            onOpenDelete={handleOpenDelete}
            isManager={isManager}
          />
        )}

        <div className="p-4 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
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

      <EditTicketModal
        isOpen={isEditOpen}
        ticket={selectedTicket}
        ticketTypes={ticketTypes}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedTicket(null);
        }}
        onConfirmUpdate={handleUpdateTicket}
      />

      <RenewTicketModal
        isOpen={isRenewOpen}
        ticket={selectedTicket}
        onClose={() => {
          setIsRenewOpen(false);
          setSelectedTicket(null);
        }}
        onConfirm={(renewData) => {
          const target = selectedTicket?.code || selectedTicket?.id;
          handleRenewTicket(target, renewData);
        }}
      />

      <TicketDetailModal
        isOpen={isDetailOpen}
        ticket={selectedTicket}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTicket(null);
        }}
      />

      <DeleteTicketModal
        isOpen={isDeleteOpen}
        ticket={selectedTicket}
        loading={deleteLoading}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedTicket(null);
        }}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
