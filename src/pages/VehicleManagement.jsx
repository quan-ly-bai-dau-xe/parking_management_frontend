import { useState, useMemo, useEffect } from "react";
import {
  fetchVehicles,
  fetchVehicleSummary,
  mapVehicleSearchItem,
} from "../features/vehicleService";
import usePagination from "../hooks/usePagination";
import ScanPlateModal from "../components/VehicleManagement/ScanPlateModal";
import PageSectionHeader from "../components/VehicleManagement/PageSectionHeader";
import EditVehicleModal from "../components/VehicleManagement/EditVehicleModal";
import {
  StatusBadge,
  PageToolbar,
  FilterSelect,
  EmptyState,
  Pagination,
  LoadingSpinner,
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
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [newVehicleDraft, setNewVehicleDraft] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isUsingBackendData, setIsUsingBackendData] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleStats, setVehicleStats] = useState(null);

  // Filter and form state
  const [filters, setFilters] = useState({
    search: "",
    vehicleType: "",
    ticketType: "",
    status: "",
    ticketStatus: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Fetch KPI summary cards from backend
  useEffect(() => {
    let cancelled = false;
    fetchVehicleSummary()
      .then((data) => {
        if (!cancelled && data) {
          setVehicleStats(data);
        }
      })
      .catch((err) => {
        console.warn("Could not load vehicle summary KPI:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchVehicles({ page_size: 100 })
      .then((payload) => {
        if (!isMounted) return;
        const results = Array.isArray(payload) ? payload : payload?.results || [];
        const mapped = results.filter(Boolean).map(mapVehicleSearchItem);
        setVehicles(mapped);
        setIsUsingBackendData(true);
        setSelectedVehicleId((prev) => (prev || (mapped.length > 0 ? mapped[0].id : null)));
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Could not load vehicles from backend:", err);
        setBackendError("Không thể tải danh sách phương tiện từ máy chủ.");
        setIsUsingBackendData(false);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Active selected vehicle for detail bottom panels
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
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
      if (filters.vehicleType && item.vehicleType !== filters.vehicleType) {
        return false;
      }
      if (filters.ticketType && item.ticket.type !== filters.ticketType) {
        return false;
      }
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      if (filters.ticketStatus && item.ticket.status !== filters.ticketStatus) {
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
      vehicleType: "",
      ticketType: "",
      status: "",
      ticketStatus: "",
    });
    setCurrentPage(1);
  };

  const handleVehicleMatchedFromScan = (matchedVehicle) => {
    setSelectedVehicleId(matchedVehicle.id);
    // Also scroll smoothly to bottom detail panels
    const detailSection = document.getElementById("vehicle-detail-section");
    if (detailSection) {
      detailSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const editingVehicle = useMemo(() => {
    if (newVehicleDraft) return newVehicleDraft;
    if (!editingVehicleId) return null;
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
      customer: { id: "KH-MOI", name: "", phone: "", email: "", totalVehicles: 1 },
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

  const handleSaveEditedVehicle = (updatedVehicle) => {
    if (newVehicleDraft) {
      const newVehicle = {
        ...updatedVehicle,
        id: `XE${String(vehicles.length + 1).padStart(4, "0")}`,
      };
      setVehicles((prevVehicles) => [...prevVehicles, newVehicle]);
      setSelectedVehicleId(newVehicle.id);
    } else {
      setVehicles((prevVehicles) =>
        prevVehicles.map((vehicle) =>
          vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle,
        ),
      );
      setSelectedVehicleId(updatedVehicle.id);
    }
    handleCloseEditModal();
  };

  const handleDeleteVehicle = (vehicle) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa phương tiện ${vehicle.licensePlate} không?`,
    );
    if (!confirmed) return;

    setVehicles((prevVehicles) => {
      const nextVehicles = prevVehicles.filter(
        (item) => item.id !== vehicle.id,
      );

      if (vehicle.id === selectedVehicleId) {
        setSelectedVehicleId(nextVehicles[0]?.id || null);
      }

      return nextVehicles;
    });

    setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil((filteredVehicles.length - 1) / itemsPerPage))));
  };

  const handleViewTicket = (vehicle) => {
    setSelectedTicket({ vehicle, ...vehicle.ticket });
  };

  // Helper for status badge rendering
  const renderStatusBadge = (status, label) => <StatusBadge status={status} label={label} />;

  const renderTicketBadge = (ticket) => {
    if (ticket.status === "warning") {
      return (
        <div className="flex flex-col">
          <span className="text-xs text-slate-800 font-medium">
            {ticket.expiresAt}
          </span>
          <span className="inline-flex items-center gap-1 text-2xs text-amber-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Sắp hết hạn
          </span>
        </div>
      );
    }
    if (ticket.status === "expired") {
      return (
        <div className="flex flex-col">
          <span className="text-xs text-slate-800 font-medium">
            {ticket.expiresAt}
          </span>
          <span className="inline-flex items-center gap-1 text-2xs text-rose-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Đã hết hạn
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <span className="text-xs text-slate-800 font-medium">
          {ticket.expiresAt}
        </span>
        <span className="inline-flex items-center gap-1 text-2xs text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Còn hạn
        </span>
      </div>
    );
  };

  return (
    <>
      <PageSectionHeader
          title="Quản lý xe"
          description="Quản lý phương tiện, chủ xe và tình trạng sử dụng vé"
          onOpenScanModal={() => setIsScanModalOpen(true)}
          onAdd={handleOpenAddModal}
          addButtonLabel="Thêm xe"
        />

        {/* Filter Toolbar Card */}
        <PageToolbar
          onSearch={() => setCurrentPage(1)}
          onReset={handleResetFilters}
        >
          {/* Tìm kiếm chung */}
          <div className="md:col-span-4">
            <label className="block text-2xs font-semibold text-slate-500 mb-1">
              Tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Tìm biển số, tên hoặc SĐT khách hàng..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>

          {/* Loại vé */}
          <FilterSelect
            label="Loại vé"
            value={filters.ticketType}
            onChange={(e) => {
              setFilters({ ...filters, ticketType: e.target.value });
              setCurrentPage(1);
            }}
            placeholder="Tất cả loại vé"
            options={["Vé tháng", "Vé ngày", "Vé quý", "Vé năm"]}
          />

          {/* Trạng thái */}
          <FilterSelect
            label="Trạng thái"
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setCurrentPage(1);
            }}
            placeholder="Tất cả trạng thái"
            options={[
              { value: "parked", label: "Đang đỗ" },
              { value: "active", label: "Đang hoạt động" },
              { value: "in_transit", label: "Đang di chuyển" },
              { value: "left", label: "Đã rời bãi" },
            ]}
          />

          {/* Tình trạng vé */}
          <FilterSelect
            label="Tình trạng vé"
            value={filters.ticketStatus}
            onChange={(e) => {
              setFilters({ ...filters, ticketStatus: e.target.value });
              setCurrentPage(1);
            }}
            placeholder="Tất cả"
            options={[
              { value: "active", label: "Còn hạn" },
              { value: "warning", label: "Sắp hết hạn" },
              { value: "expired", label: "Đã hết hạn" },
            ]}
          />
        </PageToolbar>

        {/* 4 Stat KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tổng phương tiện */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xs font-medium text-slate-500 uppercase tracking-wider">
                Tổng phương tiện
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {vehicleStats?.total_vehicles ?? vehicleStats?.totalVehicles ?? 0}
              </p>
            </div>
          </div>

          {/* Đang hoạt động */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xs font-medium text-slate-500 uppercase tracking-wider">
                Đang hoạt động
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {vehicleStats?.active_vehicles ?? vehicleStats?.activeVehicles ?? 0}
              </p>
            </div>
          </div>

          {/* Vé sắp hết hạn */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xs font-medium text-slate-500 uppercase tracking-wider">
                Vé sắp hết hạn
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {vehicleStats?.expiring_soon_tickets ?? vehicleStats?.expiring_tickets ?? vehicleStats?.expiringTickets ?? 0}
              </p>
            </div>
          </div>

          {/* Vé đã hết hạn */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xs font-medium text-slate-500 uppercase tracking-wider">
                Vé đã hết hạn
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {vehicleStats?.expired_tickets ?? vehicleStats?.expiredTickets ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Data Table Card: Danh sách phương tiện */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Card Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Danh sách phương tiện
              </h2>
              <p className="text-2xs text-slate-500">
                Thông tin xe và tình trạng sử dụng
              </p>
              {backendError && <p className="mt-1 text-2xs text-amber-600">{backendError}</p>}
              {isUsingBackendData && <p className="mt-1 text-2xs text-emerald-600">Đang dùng dữ liệu backend</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Xuất CSV</span>
              </button>
              <span className="text-xs text-slate-400 font-medium">
                {filteredVehicles.length} phương tiện
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-2xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 text-center w-12">STT</th>
                  <th className="py-3 px-3.5">Biển số xe</th>
                  <th className="py-3 px-3.5">Khách hàng</th>
                  <th className="py-3 px-3.5">SĐT</th>
                  <th className="py-3 px-3.5">Loại vé</th>
                  <th className="py-3 px-3.5">Ngày hết hạn vé</th>
                  <th className="py-3 px-3.5">Vị trí đỗ</th>
                  <th className="py-3 px-3.5">Trạng thái</th>
                  <th className="py-3 px-3.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {isLoading ? (
                  <tr><td colSpan="11" className="py-10 text-center"><LoadingSpinner label="Đang tải dữ liệu phương tiện..." /></td></tr>
                ) : paginatedVehicles.length > 0 ? (
                  paginatedVehicles.map((vehicle, index) => {
                    const isSelected = vehicle.id === selectedVehicleId;
                    return (
                      <tr
                        key={vehicle.id}
                        onClick={() => setSelectedVehicleId(vehicle.id)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-50/40" : ""
                        }`}
                      >
                        {/* STT */}
                        <td className="py-3.5 px-3.5 text-center text-slate-400 font-medium">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>

                   

                        {/* Biển số xe */}
                        <td className="py-3.5 px-3.5 font-bold font-mono text-slate-900 tracking-wider">
                          {vehicle.licensePlate}
                        </td>

                        {/* Khách hàng */}
                        <td className="py-3.5 px-3.5">
                          <div className="font-medium text-slate-900">
                            {vehicle.customer.name}
                          </div>
                          <div className="text-2xs text-slate-400">
                            {vehicle.customer.id}
                          </div>
                        </td>
                      {/* SĐT */}
                        <td className="py-3.5 px-3.5 font-semibold text-blue-600">
                          {vehicle.customer.phone}
                        </td>
              

                        {/* Loại vé */}
                        <td className="py-3.5 px-3.5 text-slate-700">
                          {vehicle.ticket.type}
                        </td>

                        {/* Ngày hết hạn vé */}
                        <td className="py-3.5 px-3.5">
                          {renderTicketBadge(vehicle.ticket)}
                        </td>

                        {/* Vị trí đỗ */}
                        <td className="py-3.5 px-3.5 font-medium text-slate-800">
                          {vehicle.parkingSlot.display}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-3.5 px-3.5">
                          {renderStatusBadge(vehicle.status, vehicle.statusDisplay)}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-3.5 text-center">
                          <div
                            className="flex items-center justify-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(vehicle.id)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
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
                            <span className="text-blue-300">|</span>

                            <button
                              type="button"
                              onClick={() => handleDeleteVehicle(vehicle)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
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
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="11"
                      className="py-4 text-center text-slate-400 text-xs"
                    >
                      <EmptyState
                        title="Không tìm thấy phương tiện nào phù hợp với bộ lọc."
                        className="py-10"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination */}
          <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <label htmlFor="items-per-page">Số bản ghi/trang</label>
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredVehicles.length}
              itemsPerPage={itemsPerPage}
              size="sm"
              className="!w-auto shrink-0 justify-end"
            />
          </div>
        </div>
  
        {/* 3 Detail Panels at Bottom: Chi tiết xe | Thông tin chủ xe | Trạng thái vé */}
        {selectedVehicle && (
        <div
          id="vehicle-detail-section"
          className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        >
          {/* 1. Chi tiết xe */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chi tiết xe
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Thông tin phương tiện được chọn
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedVehicle.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
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
                  <span>Chỉnh sửa</span>
                </button>
              </div>

              {/* Vehicle Badge & Big Plate */}
              <div className="flex items-center gap-3.5 my-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z" />
                    <circle cx="7.5" cy="14.5" r="1.5" />
                    <circle cx="16.5" cy="14.5" r="1.5" />
                  </svg>
                </div>
                <div>
                  <span className="text-2xs font-semibold text-blue-600 block">
                    {selectedVehicle.id}
                  </span>
                  <span className="text-base font-bold font-mono tracking-wider text-slate-900 block">
                    {selectedVehicle.licensePlate}
                  </span>
                  <div className="mt-0.5">
                    {renderStatusBadge(selectedVehicle.status, selectedVehicle.statusDisplay)}
                  </div>
                </div>
              </div>

              {/* Grid Properties */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-2xs text-slate-400 block">
                    Khách hàng / Chủ xe
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedVehicle.customer.id} —{" "}
                    {selectedVehicle.customer.name}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block">Hãng xe</span>
                  <span className="font-semibold text-slate-800">
                    {selectedVehicle.brand}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block">Model</span>
                  <span className="font-semibold text-slate-800">
                    {selectedVehicle.model}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block">
                    Loại vé đang sử dụng
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedVehicle.ticket.type}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block">
                    Ngày hết hạn vé
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedVehicle.ticket.expiresAt}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block">
                    Vị trí đỗ xe
                  </span>
                  <span className="font-semibold text-emerald-700">
                    {selectedVehicle.parkingSlot.display}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block">
                    Ngày đăng ký
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedVehicle.ticket.registeredAt}
                  </span>
                </div>
              </div>
            </div>

            {/* Note box */}
            <div className="mt-4 p-2.5 bg-slate-50 rounded-lg text-2xs text-slate-500 border border-slate-100">
              {selectedVehicle.note}
            </div>
          </div>

          {/* 2. Thông tin chủ xe */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Thông tin chủ xe
                </h3>
                <p className="text-2xs text-slate-400">
                  Khách hàng liên kết với phương tiện
                </p>
              </div>

              {/* Customer Avatar & Name */}
              <div className="flex items-center gap-3.5 my-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {selectedVehicle.customer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {selectedVehicle.customer.name}
                  </h4>
                  <span className="text-2xs text-slate-400 block">
                    {selectedVehicle.customer.id}
                  </span>
                </div>
              </div>

              {/* Customer Info Fields */}
              <div className="space-y-3.5 text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-2xs text-slate-400 block">
                    Số điện thoại
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {selectedVehicle.customer.phone}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block">Email</span>
                  <span className="font-medium text-slate-700">
                    {selectedVehicle.customer.email}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block">
                    Số xe đã đăng ký
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {selectedVehicle.customer.totalVehicles} xe
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-2xs text-slate-400">
                Tình trạng tài khoản
              </span>
              <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Đã xác minh danh tính
              </span>
            </div>
          </div>

          {/* 3. Trạng thái vé */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Trạng thái vé
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Thông tin chi tiết vé xe
                  </p>
                </div>
                <span className="text-2xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  {selectedVehicle.ticket.type}
                </span>
              </div>

              {/* Big Days Remaining Countdown */}
              <div className="my-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {selectedVehicle.ticket.remainingDays}
                  </span>
                  <span className="text-sm font-semibold text-slate-600">
                    ngày
                  </span>
                </div>
                <span className="text-2xs text-slate-400 block mt-0.5">
                  Thời gian còn lại
                </span>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedVehicle.ticket.status === "warning"
                        ? "bg-amber-500"
                        : selectedVehicle.ticket.status === "expired"
                          ? "bg-rose-500"
                          : "bg-blue-600"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          10,
                          (selectedVehicle.ticket.remainingDays / 60) * 100,
                        ),
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Date Expire Info */}
              <div className="flex items-center justify-between py-2 border-y border-slate-100 text-xs">
                <span className="text-slate-500">Ngày hết hạn</span>
                <span className="font-semibold text-slate-900">
                  {selectedVehicle.ticket.expiresAt}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs">
                {selectedVehicle.ticket.status === "warning" ? (
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Vé sắp hết hạn, vui lòng nhắc khách gia hạn.
                  </span>
                ) : selectedVehicle.ticket.status === "expired" ? (
                  <span className="text-rose-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Vé đã hết hạn! Cần gia hạn ngay.
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Vé còn hiệu lực.
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => handleViewTicket(selectedVehicle)}
                className="w-full py-2 px-3 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg shadow-2xs transition-colors cursor-pointer text-center"
              >
                Xem thông tin vé
              </button>
            </div>
          </div>
        </div>
        )}

      {/* OCR License Plate Scan Modal */}
      <ScanPlateModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        vehicles={vehicles}
        onVehicleMatched={handleVehicleMatchedFromScan}
      />

      {/* Edit Vehicle Modal */}
      <EditVehicleModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        vehicle={editingVehicle}
        onSave={handleSaveEditedVehicle}
      />

      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-detail-title"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h2 id="ticket-detail-title" className="text-base font-bold text-slate-900">
                  Thông tin vé
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedTicket.vehicle.licensePlate} · {selectedTicket.vehicle.customer.name}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng thông tin vé"
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg p-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 p-5 text-xs">
              <div><span className="block text-slate-400">Loại vé</span><strong>{selectedTicket.type}</strong></div>
              <div><span className="block text-slate-400">Trạng thái</span><strong>{selectedTicket.status === "active" ? "Còn hạn" : selectedTicket.status === "warning" ? "Sắp hết hạn" : "Đã hết hạn"}</strong></div>
              <div><span className="block text-slate-400">Ngày đăng ký</span><strong>{selectedTicket.registeredAt}</strong></div>
              <div><span className="block text-slate-400">Ngày hết hạn</span><strong>{selectedTicket.expiresAt}</strong></div>
              <div><span className="block text-slate-400">Thời gian còn lại</span><strong>{selectedTicket.remainingDays} ngày</strong></div>
              <div><span className="block text-slate-400">Vị trí đỗ</span><strong>{selectedTicket.vehicle.parkingSlot.display}</strong></div>
              <div className="col-span-2 rounded-lg bg-slate-50 p-3 text-slate-600">{selectedTicket.note}</div>
            </div>
            <div className="flex justify-end border-t border-slate-100 p-4">
              <button type="button" onClick={() => setSelectedTicket(null)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
