import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppTopHeader from "../components/layout/AppTopHeader";
import VehicleFormModal from "../components/CustomerManagement/CustomerVehicleModal";
import { mockCustomers } from "../mocks/customerData";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiClient } from "../services/apiClient";

export default function CustomerVehiclesPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const initialVehicles = useMemo(() => {
    if (!user) return mockCustomers[0].vehicles;
    const found = mockCustomers.find(
      (c) =>
        c.customer.email === user.email ||
        c.customer.phone === user.phone ||
        c.customer.identity_card_number === user.identity_card_number
    );
    return found ? found.vehicles : mockCustomers[0].vehicles;
  }, [user]);

  const [vehicles, setVehicles] = useState(initialVehicles);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'PARKED' | 'OUTSIDE'

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deletingVehicle, setDeletingVehicle] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleOpenAddModal = () => {
    setEditingVehicle(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setIsFormModalOpen(true);
  };

  const handleSaveVehicle = async (vehiclePayload) => {
    if (editingVehicle) {
      try {
        await apiClient(`/api/v1/vehicles/${editingVehicle.code}/`, {
          method: "PATCH",
          data: vehiclePayload,
        });
      } catch {
        // Fallback cập nhật state cục bộ
      }

      setVehicles((prev) =>
        prev.map((v) => (v.code === editingVehicle.code ? { ...v, ...vehiclePayload } : v))
      );
      showToast(`Đã cập nhật thông tin xe ${vehiclePayload.license_plate}`);
    } else {
      const isDuplicate = vehicles.some(
        (v) => v.license_plate_norm === vehiclePayload.license_plate_norm
      );
      if (isDuplicate) {
        throw new Error(`Biển số ${vehiclePayload.license_plate} đã tồn tại trong danh sách của bạn.`);
      }

      const newCode = `XE${String(vehicles.length + 1).padStart(4, "0")}`;
      const createdVehicle = {
        ...vehiclePayload,
        code: newCode,
        vehicle_type: "CAR",
        vehicle_type_name: "Ô tô",
        is_parked: false,
        current_location: "Chưa ghi nhận lượt vào bãi",
        ticket: {
          ticket_type: "NONE",
          ticket_type_name: "Không có vé",
          ticket_code: null,
          price: "0.00",
          status: "INACTIVE",
        },
      };

      try {
        await apiClient("/api/v1/vehicles/", {
          method: "POST",
          data: createdVehicle,
        });
      } catch {
        // Fallback cập nhật state cục bộ
      }

      setVehicles((prev) => [createdVehicle, ...prev]);
      showToast(`Đã thêm xe ô tô ${createdVehicle.license_plate}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingVehicle) return;

    try {
      await apiClient(`/api/v1/vehicles/${deletingVehicle.code}/`, {
        method: "DELETE",
      });
    } catch {
      // Fallback xóa cục bộ
    }

    setVehicles((prev) => prev.filter((v) => v.code !== deletingVehicle.code));
    showToast(`Đã xóa xe ${deletingVehicle.license_plate} khỏi hồ sơ`);
    setDeletingVehicle(null);
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PARKED" && v.is_parked) ||
      (statusFilter === "OUTSIDE" && !v.is_parked);

    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      v.licensePlate.toLowerCase().includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.model_name.toLowerCase().includes(q) ||
      v.code.toLowerCase().includes(q);

    return matchesStatus && matchesQuery;
  });

  const formatDate = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      <AppTopHeader
        variant="customer"
        activePath="/customerVehicle"
        showHelp={true}
        showCamera={false}
      />

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tiêu đề & Nút Thêm xe */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Xe của tôi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Quản lý danh sách xe ô tô đã đăng ký, trạng thái đỗ và gói vé đi kèm.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all inline-flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>Thêm xe ô tô</span>
          </button>
        </div>

        {/* Thanh tìm kiếm & Bộ lọc trạng thái đỗ */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl gap-1 overflow-x-auto">
            {[
              { key: "ALL", label: `Tất cả (${vehicles.length})` },
              { key: "PARKED", label: `Đang đỗ (${vehicles.filter((v) => v.is_parked).length})` },
              { key: "OUTSIDE", label: `Ngoài bãi (${vehicles.filter((v) => !v.is_parked).length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
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
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm biển số, hãng xe, mẫu xe..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Lưới danh sách xe ô tô */}
        {filteredVehicles.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14V8a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0h2m-18 0H3m4 4h.01M17 18h.01" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy xe ô tô phù hợp</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc bấm "Thêm xe ô tô" để đăng ký phương tiện mới vào tài khoản.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVehicles.map((v) => {
              const hasTicket = v.ticket && v.ticket.ticket_type !== "NONE";
              const isExpiring =
                hasTicket && (v.ticket.status === "EXPIRING_SOON" || v.ticket.remaining_days <= 7);

              return (
                <div
                  key={v.code}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    {v.image_url ? (
                      <div className="relative h-40 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                        <img
                          src={v.image_url}
                          alt={v.license_plate}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/75 text-white font-mono text-[11px] font-semibold backdrop-blur-xs">
                          {v.code}
                        </span>
                      </div>
                    ) : (
                      <div className="px-5 pt-5 flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono text-[11px] font-semibold">
                          {v.code}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          Xe ô tô
                        </span>
                      </div>
                    )}

                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14V8a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0h2m-18 0H3m4 4h.01M17 18h.01" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-slate-900 font-mono tracking-wide">
                              {v.license_plate}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {v.brand} {v.model_name}
                              {v.color ? ` · ${v.color}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div>
                          {v.is_parked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Đang đỗ trong bãi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Ngoài bãi
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {v.current_location}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {hasTicket ? v.ticket.ticket_type_name : "Chưa đăng ký vé"}
                          </span>
                          <span
                            className={`text-[11px] block mt-0.5 ${
                              isExpiring ? "text-amber-600 font-semibold" : "text-slate-400"
                            }`}
                          >
                            {hasTicket
                              ? `Hết hạn ${formatDate(v.ticket.effective_to)}`
                              : "Thanh toán theo lượt gửi"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate("/customer/tickets")}
                          className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                        >
                          {hasTicket ? "Xem vé" : "Mua vé"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Thanh thao tác Sửa / Xóa */}
                  <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(v)}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Chỉnh sửa</span>
                    </button>

                    <button
                      type="button"
                      disabled={v.is_parked}
                      onClick={() => setDeletingVehicle(v)}
                      title={
                        v.is_parked
                          ? "Không thể xóa xe khi đang đỗ trong bãi"
                          : "Xóa xe này"
                      }
                      className="py-2 px-3 rounded-xl border border-rose-200/80 bg-rose-50/40 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-rose-600 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <VehicleFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialVehicle={editingVehicle}
        onSubmitVehicle={handleSaveVehicle}
      />

      {deletingVehicle && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Xác nhận xóa xe ô tô?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bạn có chắc muốn xóa xe{" "}
                <strong className="font-mono text-slate-800">
                  {deletingVehicle.license_plate}
                </strong>{" "}
                ({deletingVehicle.brand} {deletingVehicle.model_name}) khỏi hồ sơ không? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Xóa xe
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full bg-white border-t border-slate-200/80 px-4 sm:px-6 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 mt-6">
        <div>© 2026 Smart Mobility · Smart Parking</div>
        <div className="flex items-center gap-6">
          <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-slate-600 transition-colors">
            Chính sách bảo mật
          </a>
          <span>
            Hỗ trợ: <strong className="text-slate-700 font-normal">1900 1234</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}