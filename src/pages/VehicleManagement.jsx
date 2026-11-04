import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  exportVehiclesCsv,
  vehicleService,
} from "../services/vehicleService";
import { forceCloseSessionAndReleaseSlot } from "../services/parkingSessionService";
import { customerService } from "../services/customerService";
import useVehicleData from "../hooks/useVehicleData";
import usePagination from "../hooks/usePagination";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useToast } from "../context/ToastContext";
import { ROUTES } from "../config/navigation";
import { VEHICLE_DELETE_MESSAGES } from "../constants/vehicleConstants";

import {
  ScanPlateModal,
  PageSectionHeader,
  EditVehicleModal,
  DeleteVehicleModal,
  VehicleTable,
  VehicleStatsCards,
  VehicleDetailCards,
  VehicleFilters,
  TicketDetailModal,
} from "../components/VehicleManagement";

import {
  Pagination,
  StatusBadge,
  Button,
} from "../components/common";

// Helper chuẩn hoá chuỗi tìm kiếm tiếng Việt (hỗ trợ cả có dấu và không dấu)
function normalizeSearchText(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export default function VehicleManagement() {
  const toast = useToast();
  const navigate = useNavigate();
  const { role } = useCurrentUser();
  const isManager = useMemo(() => {
    const cleanRole = String(role || "").toLowerCase().trim();
    return cleanRole === "manager" || cleanRole === "quản lý" || cleanRole === "admin";
  }, [role]);

  const {
    vehicles,
    setVehicles,
    vehicleStats,
    isLoading,
    backendError,
    refreshStats,
    reload: reloadVehicles,
  } = useVehicleData();

  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [newVehicleDraft, setNewVehicleDraft] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Safe delete modal state
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    vehicle: null,
    isParked: false,
    hasActiveTicket: false,
    loading: false,
  });

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    ticketType: "",
    status: "",
    ticketStatus: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Active selected vehicle for detail bottom panels
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  // Filtered vehicles list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((item) => {
      if (filters.search) {
        const rawSearch = filters.search.trim().toLowerCase();
        const normSearch = normalizeSearchText(filters.search);

        const plate = (item.licensePlate || "").toLowerCase();
        const customerName = (item.customer?.name || "").toLowerCase();
        const phone = (item.customer?.phone || "").toLowerCase();

        const matchesRaw =
          plate.includes(rawSearch) ||
          customerName.includes(rawSearch) ||
          phone.includes(rawSearch);

        const matchesNormalized =
          normalizeSearchText(item.licensePlate).includes(normSearch) ||
          normalizeSearchText(item.customer?.name).includes(normSearch) ||
          normalizeSearchText(item.customer?.phone).includes(normSearch);

        if (!matchesRaw && !matchesNormalized) {
          return false;
        }
      }
      if (filters.ticketType && item.ticket?.type !== filters.ticketType) {
        return false;
      }
      if (filters.status) {
        const matchesStatus =
          item.status === filters.status ||
          (filters.status === "parked" && item.status === "parking") ||
          (filters.status === "left" && item.status === "inactive");
        if (!matchesStatus) return false;
      }
      if (filters.ticketStatus && item.ticket?.status !== filters.ticketStatus) {
        return false;
      }
      return true;
    });
  }, [vehicles, filters]);

  // Paginated vehicles
  const { totalPages, paginatedList: paginatedVehicles } = usePagination(
    filteredVehicles,
    currentPage,
    itemsPerPage,
  );

  const handleResetFilters = () => {
    setFilters({
      search: "",
      ticketType: "",
      status: "",
      ticketStatus: "",
    });
    setCurrentPage(1);
  };

  const handleVehicleMatchedFromScan = (matchedVehicle) => {
    setSelectedVehicleId(matchedVehicle.id);
    const detailSection = document.getElementById("vehicle-detail-section");
    if (detailSection) {
      detailSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const editingVehicle = useMemo(() => {
    if (newVehicleDraft) return newVehicleDraft;
    return vehicles.find((vehicle) => vehicle.id === editingVehicleId) || null;
  }, [vehicles, editingVehicleId, newVehicleDraft]);

  const handleOpenEditModal = (vehicleId) => {
    setNewVehicleDraft(null);
    setEditingVehicleId(vehicleId);
    setIsEditModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingVehicleId(null);
    setNewVehicleDraft({
      id: "NEW",
      licensePlate: "",
      vehicleType: "Ô tô",
      brand: "",
      model: "",
      customer: { id: "", name: "", phone: "", email: "", totalVehicles: 1 },
      ticket: { type: "Vé tháng", expiresAt: "", registeredAt: "", remainingDays: 0, status: "active", note: "" },
      parkingSlot: { display: "", zone: "", floor: "", slot: "", type: "car" },
      status: "active",
      note: "",
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingVehicleId(null);
    setNewVehicleDraft(null);
  };

  const handleSaveEditedVehicle = async (updatedVehicle) => {
    try {
      if (updatedVehicle.id === "NEW") {
        const finalVehicle = { ...updatedVehicle };
        let custId =
          finalVehicle.customerId ??
          finalVehicle.customer_id ??
          finalVehicle.customer?.id ??
          finalVehicle.customer?.backendId;

        if ((!custId || isNaN(Number(custId))) && (finalVehicle.customerName || finalVehicle.customer?.name)) {
          const custName = (finalVehicle.customerName || finalVehicle.customer?.name || "").trim().toLowerCase();
          const custPhone = (finalVehicle.customerPhone || finalVehicle.customer?.phone || "").trim();

          const allCustomers = await customerService.getCustomers();
          if (Array.isArray(allCustomers)) {
            const found = allCustomers.find((c) => {
              const nameMatch = (c.name || "").trim().toLowerCase() === custName;
              const phoneMatch = custPhone && (c.phone || "").trim() === custPhone;
              return nameMatch || phoneMatch;
            });
            if (found) custId = found.id;
          }

          if (!custId) {
            const createdCust = await customerService.createCustomer({
              name: finalVehicle.customerName || finalVehicle.customer?.name || "Khách mới",
              phone: finalVehicle.customerPhone || finalVehicle.customer?.phone || "",
              email: finalVehicle.customerEmail || finalVehicle.customer?.email || "",
              status: "active",
            });
            if (createdCust && createdCust.id) {
              custId = createdCust.id;
            }
          }
        }

        finalVehicle.customerId = custId;
        finalVehicle.customer_id = custId;

        await vehicleService.create(finalVehicle);
        await reloadVehicles();
        refreshStats();
        toast.success(`Thêm phương tiện ${finalVehicle.licensePlate} thành công!`);
      } else {
        const targetId = updatedVehicle.backendId || updatedVehicle.id;
        await vehicleService.update(targetId, updatedVehicle);
        await reloadVehicles();
        refreshStats();
        toast.success(`Cập nhật phương tiện ${updatedVehicle.licensePlate} thành công!`);
      }
      handleCloseEditModal();
    } catch (err) {
      console.error("Save vehicle error:", err);
      toast.error(err?.message || "Không thể lưu dữ liệu phương tiện.");
    }
  };

  const handleDeleteVehicle = (vehicle) => {
    if (!vehicle) return;

    if (!isManager) {
      setDeleteModalState({
        isOpen: true,
        vehicle,
        isParked: false,
        hasActiveTicket: false,
        loading: false,
      });
      return;
    }

    const rawTicketState = String(
      vehicle.ticketState ||
      vehicle.ticket?.status ||
      vehicle.ticket?.state ||
      ""
    ).toLowerCase();

    const hasActiveTicket =
      rawTicketState === "active" ||
      rawTicketState === "valid" ||
      rawTicketState === "warning" ||
      rawTicketState === "expiring_soon" ||
      Boolean(vehicle.ticket?.is_valid);

    const isParked =
      vehicle.status === "parked" ||
      Boolean(vehicle.entryTime && !vehicle.exitTime);

    setDeleteModalState({
      isOpen: true,
      vehicle,
      isParked: Boolean(isParked),
      hasActiveTicket: Boolean(hasActiveTicket),
      loading: false,
    });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalState({
      isOpen: false,
      vehicle: null,
      isParked: false,
      hasActiveTicket: false,
      loading: false,
    });
  };

  const handleConfirmDelete = async () => {
    const vehicle = deleteModalState.vehicle;
    if (!vehicle) return;

    setDeleteModalState((prev) => ({ ...prev, loading: true }));
    try {
      const targetId = vehicle.backendId || vehicle.id;
      if (typeof targetId === "number" || !String(targetId).startsWith("XE")) {
        await vehicleService.remove(targetId);
      }

      setVehicles((prev) => prev.filter((item) => item.id !== vehicle.id));
      if (vehicle.id === selectedVehicleId) {
        setSelectedVehicleId(null);
      }
      toast.success(VEHICLE_DELETE_MESSAGES.DELETE_SUCCESS);
      setCurrentPage((page) =>
        Math.min(page, Math.max(1, Math.ceil((filteredVehicles.length - 1) / itemsPerPage)))
      );
      refreshStats();
      handleCloseDeleteModal();
    } catch (err) {
      console.error("Delete vehicle error:", err);
      toast.error(err?.message || VEHICLE_DELETE_MESSAGES.DELETE_ERROR_DEFAULT);
      setDeleteModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleForceCloseAndConfirmDelete = async (reason) => {
    const vehicle = deleteModalState.vehicle;
    if (!vehicle) return;

    setDeleteModalState((prev) => ({ ...prev, loading: true }));
    try {
      // Bước 1: Gọi Check-out đóng phiên đỗ khẩn cấp để giải phóng slot và kết thúc log ra/vào
      await forceCloseSessionAndReleaseSlot({
        licensePlate: vehicle.licensePlate,
        notes: reason || "Cưỡng chế đóng phiên đỗ khẩn cấp bởi Quản lý",
      });

      // Bước 2: Thực hiện xóa mềm phương tiện (CSDL đã cho phép vì không còn exit_time IS NULL)
      const targetId = vehicle.backendId || vehicle.id;
      if (typeof targetId === "number" || !String(targetId).startsWith("XE")) {
        await vehicleService.remove(targetId);
      }

      setVehicles((prev) => prev.filter((item) => item.id !== vehicle.id));
      if (vehicle.id === selectedVehicleId) {
        setSelectedVehicleId(null);
      }
      toast.success(VEHICLE_DELETE_MESSAGES.EMERGENCY_SUCCESS);
      setCurrentPage((page) =>
        Math.min(page, Math.max(1, Math.ceil((filteredVehicles.length - 1) / itemsPerPage)))
      );
      refreshStats();
      handleCloseDeleteModal();
    } catch (err) {
      console.error("Emergency force close & delete error:", err);
      toast.error(err?.message || VEHICLE_DELETE_MESSAGES.DELETE_ERROR_DEFAULT);
      setDeleteModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleNavigateToHistory = () => {
    handleCloseDeleteModal();
    navigate(ROUTES.HISTORY);
  };

  const handleNavigateToTickets = () => {
    handleCloseDeleteModal();
    if (deleteModalState.vehicle) {
      setSelectedTicket({
        vehicle: deleteModalState.vehicle,
        ...(deleteModalState.vehicle.ticket || {}),
      });
    }
  };

  const handleExportCsv = async () => {
    try {
      await exportVehiclesCsv({
        search: filters.search,
        ticketType: filters.ticketType,
        status: filters.status,
        ticketState: filters.ticketStatus,
      });
    } catch (err) {
      console.warn("Could not export CSV directly:", err);
      const headers = ["STT,Bien so,Khach hang,SDT,Loai ve,Ngay het han,Vi tri do,Trang thai"];
      const rows = filteredVehicles.map((v, i) => [
        i + 1,
        `"${v.licensePlate || ""}"`,
        `"${v.customer?.name || ""}"`,
        `"${v.customer?.phone || ""}"`,
        `"${v.ticket?.type || ""}"`,
        `"${v.ticket?.expiresAt || ""}"`,
        `"${v.parkingSlot?.display || ""}"`,
        `"${v.statusDisplay || ""}"`,
      ].join(","));
      const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `danh_sach_phuong_tien_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const renderStatusBadge = (status, label) => <StatusBadge status={status} label={label} />;

  const renderTicketBadge = (ticket) => {
    if (!ticket || !ticket.expiresAt || ticket.expiresAt === "—") {
      return <span className="text-xs text-slate-400 font-normal">—</span>;
    }
    const colorMap = {
      warning: { text: "text-amber-600", dot: "bg-amber-500", label: "Sắp hết hạn" },
      expired: { text: "text-rose-600", dot: "bg-rose-500", label: "Đã hết hạn" },
      default: { text: "text-emerald-600", dot: "bg-emerald-500", label: "Còn hạn" },
    };
    const c = colorMap[ticket.status] || colorMap.default;
    return (
      <div className="flex flex-col">
        <span className="text-xs text-slate-800 font-medium">{ticket.expiresAt}</span>
        <span className={`inline-flex items-center gap-1 text-2xs font-medium ${c.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
          {c.label}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      <PageSectionHeader
        title="Quản lý xe"
        description="Quản lý phương tiện, chủ xe và tình trạng sử dụng vé"
        onOpenAddModal={handleOpenAddModal}
        onAdd={handleOpenAddModal}
        addButtonLabel="Thêm xe"
        onOpenScanModal={() => setIsScanModalOpen(true)}
      />

      {/* Banner cảnh báo lỗi backend nếu có */}
      {backendError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{backendError}</span>
          <Button variant="ghost" size="xs" onClick={reloadVehicles}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Toolbar lọc và tìm kiếm dữ liệu */}
      <VehicleFilters
        filters={filters}
        onFilterChange={(key, val) => {
          setFilters((prev) => ({ ...prev, [key]: val }));
          setCurrentPage(1);
        }}
        onSearch={() => setCurrentPage(1)}
        onReset={handleResetFilters}
      />

      {/* 4 Stat KPI Cards */}
      <VehicleStatsCards stats={vehicleStats} />

      {/* Card Bảng dữ liệu */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Danh sách phương tiện</h2>
            <p className="text-2xs text-slate-500 mt-0.5">
              Hiển thị {filteredVehicles.length} phương tiện trong hệ thống
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleExportCsv}>
              Xuất CSV
            </Button>
            <span className="text-xs text-slate-400 font-medium">
              {filteredVehicles.length} phương tiện
            </span>
          </div>
        </div>

        <VehicleTable
          paginatedVehicles={paginatedVehicles}
          selectedVehicleId={selectedVehicleId}
          setSelectedVehicleId={setSelectedVehicleId}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          handleOpenEditModal={handleOpenEditModal}
          handleDeleteVehicle={handleDeleteVehicle}
          renderTicketBadge={renderTicketBadge}
          renderStatusBadge={renderStatusBadge}
          isManager={isManager}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredVehicles.length}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(num) => {
            setItemsPerPage(num);
            setCurrentPage(1);
          }}
          itemsPerPageOptions={[5, 10, 20]}
        />
      </div>

      {/* 3 Detail Panels at Bottom */}
      <VehicleDetailCards
        selectedVehicle={selectedVehicle}
        handleOpenEditModal={handleOpenEditModal}
        handleViewTicket={(v) => setSelectedTicket({ vehicle: v, ...(v.ticket || {}) })}
        renderStatusBadge={renderStatusBadge}
      />

      {/* Modals */}
      <ScanPlateModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        vehicles={vehicles}
        onVehicleMatched={handleVehicleMatchedFromScan}
      />

      <EditVehicleModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        vehicle={editingVehicle}
        onSave={handleSaveEditedVehicle}
      />

      <TicketDetailModal
        selectedTicket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />

      <DeleteVehicleModal
        isOpen={deleteModalState.isOpen}
        onClose={handleCloseDeleteModal}
        vehicle={deleteModalState.vehicle}
        isManager={isManager}
        isParked={deleteModalState.isParked}
        hasActiveTicket={deleteModalState.hasActiveTicket}
        onConfirmDelete={handleConfirmDelete}
        onForceCloseAndConfirmDelete={handleForceCloseAndConfirmDelete}
        onNavigateHistory={handleNavigateToHistory}
        onNavigateTickets={handleNavigateToTickets}
        loading={deleteModalState.loading}
      />
    </div>
  );
}
