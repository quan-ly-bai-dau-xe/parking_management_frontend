import React, { useState, useMemo } from "react";
import { mockVehicles, mockStats } from "../mocks/vehicleData";
import ScanPlateModal from "../components/VehicleManagement/ScanPlateModal";
import AppTopHeader from "../components/AppTopHeader";
import PageSectionHeader from "../components/VehicleManagement/PageSectionHeader";
import EditVehicleModal from "../components/VehicleManagement/EditVehicleModal";

export default function VehicleManagement({ onNavigateTab }) {
  const [vehicles, setVehicles] = useState(mockVehicles);
  const [selectedVehicleId, setSelectedVehicleId] = useState("XE0001");
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);

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

  // Active selected vehicle for detail bottom panels
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  }, [vehicles, selectedVehicleId]);

  // Filtered vehicles list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((item) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (
          !item.licensePlate.toLowerCase().includes(s) &&
          !item.customer.name.toLowerCase().includes(s) &&
          !item.customer.phone.toLowerCase().includes(s)
        ) {
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
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage) || 1;
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVehicles.slice(start, start + itemsPerPage);
  }, [filteredVehicles, currentPage, itemsPerPage]);

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
    if (!editingVehicleId) return null;
    return vehicles.find((vehicle) => vehicle.id === editingVehicleId) || null;
  }, [vehicles, editingVehicleId]);

  const handleOpenEditModal = (vehicleId) => {
    setEditingVehicleId(vehicleId);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingVehicleId(null);
  };

  const handleSaveEditedVehicle = (updatedVehicle) => {
    setVehicles((prevVehicles) =>
      prevVehicles.map((vehicle) =>
        vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle,
      ),
    );
    setSelectedVehicleId(updatedVehicle.id);
    handleCloseEditModal();
  };

  // Helper for status badge rendering
  const renderStatusBadge = (status) => {
    switch (status) {
      case "parked":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Đang đỗ
          </span>
        );
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Đang hoạt động
          </span>
        );
      case "in_transit":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Đang di chuyển
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

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
    <div className="min-h-screen bg-[#FAF8FF] text-[#0F172A] font-sans">
      <AppTopHeader
        onOpenScanModal={() => setIsScanModalOpen(true)}
        activeTabHref="#vehicles"
        onTabClick={onNavigateTab}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <PageSectionHeader
          title="Quản lý xe"
          description="Quản lý phương tiện, chủ xe và tình trạng sử dụng vé"
          onOpenScanModal={() => setIsScanModalOpen(true)}
          addButtonLabel="Thêm xe"
        />

        {/* Filter Toolbar Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Tìm kiếm chung */}
            <div className="md:col-span-4">
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Tìm kiếm
              </label>
              <input
                type="text"
                placeholder="Tìm biển số, tên hoặc SĐT khách hàng..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>

            {/* Loại xe */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Loại xe
              </label>
              <select
                value={filters.vehicleType}
                onChange={(e) =>
                  setFilters({ ...filters, vehicleType: e.target.value })
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
              >
                <option value="">Tất cả loại xe</option>
                <option value="Ô tô">Ô tô</option>
                <option value="Xe máy">Xe máy</option>
                <option value="Xe điện">Xe điện</option>
                <option value="Xe tải">Xe tải</option>
              </select>
            </div>

            {/* Loại vé */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Loại vé
              </label>
              <select
                value={filters.ticketType}
                onChange={(e) =>
                  setFilters({ ...filters, ticketType: e.target.value })
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
              >
                <option value="">Tất cả loại vé</option>
                <option value="Vé tháng">Vé tháng</option>
                <option value="Vé ngày">Vé ngày</option>
                <option value="Vé quý">Vé quý</option>
                <option value="Vé năm">Vé năm</option>
              </select>
            </div>

            {/* Trạng thái */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Trạng thái
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="parked">Đang đỗ</option>
                <option value="active">Đang hoạt động</option>
                <option value="in_transit">Đang di chuyển</option>
              </select>
            </div>

            {/* Tình trạng vé */}
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Tình trạng vé
              </label>
              <select
                value={filters.ticketStatus}
                onChange={(e) =>
                  setFilters({ ...filters, ticketStatus: e.target.value })
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
              >
                <option value="">Tất cả</option>
                <option value="active">Còn hạn</option>
                <option value="warning">Sắp hết hạn</option>
                <option value="expired">Đã hết hạn</option>
              </select>
            </div>

            {/* Action Buttons: Tìm kiếm & Làm mới */}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>Tìm kiếm</span>
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Làm mới</span>
              </button>
            </div>
          </div>
        </div>

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
                {mockStats.totalVehicles}
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
                {mockStats.activeVehicles}
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
                {mockStats.expiringTickets}
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
                {mockStats.expiredTickets}
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
                  <th className="py-3 px-3.5">Loại xe</th>
                  <th className="py-3 px-3.5">Loại vé</th>
                  <th className="py-3 px-3.5">Ngày hết hạn vé</th>
                  <th className="py-3 px-3.5">Vị trí đỗ</th>
                  <th className="py-3 px-3.5">Trạng thái</th>
                  <th className="py-3 px-3.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {paginatedVehicles.length > 0 ? (
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
                        {/* Loại xe */}
                        <td className="py-3.5 px-3.5 text-slate-700">
                          {vehicle.vehicleType}
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
                          {renderStatusBadge(vehicle.status)}
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
                            <span className="text-slate-300">|</span>

                            <button
                              type="button"
                              onClick={() => {}}
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
                      className="py-8 text-center text-slate-400 text-xs"
                    >
                      Không tìm thấy phương tiện nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination */}
          <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Hiển thị:</span>
              <select
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
              <span>/ dòng/trang</span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 flex items-center justify-center rounded font-medium ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* 3 Detail Panels at Bottom: Chi tiết xe | Thông tin chủ xe | Trạng thái vé */}
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
                    {renderStatusBadge(selectedVehicle.status)}
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
                  <span className="text-2xs text-slate-400 block">Loại xe</span>
                  <span className="font-semibold text-slate-800">
                    {selectedVehicle.vehicleType}
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
                className="w-full py-2 px-3 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg shadow-2xs transition-colors cursor-pointer text-center"
              >
                Xem thông tin vé
              </button>
            </div>
          </div>
        </div>
      </main>

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
    </div>
  );
}
