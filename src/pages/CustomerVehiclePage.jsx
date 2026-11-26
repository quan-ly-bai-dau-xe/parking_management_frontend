import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppTopHeader from "../components/layout/AppTopHeader";
import CustomerVehicleModal from "../components/CustomerManagement/CustomerVehicleModal";
import { ROUTES } from "../config/navigation";
import { formatDateVN } from "../utils/formatDateTime";
import { useToast } from "../context/ToastContext";
import {
  walletService,
  extractApiErrorInfo,
} from "../services/walletService";
import useModalA11y from "../hooks/useModalA11y";

function isVehicleParked(vehicle) {
  const rawStatus = String(vehicle?.status || "").toUpperCase();
  return (
    Boolean(vehicle?.is_parked) ||
    rawStatus === "PARKED" ||
    rawStatus === "IN_LOT" ||
    Boolean(vehicle?.active_session && !vehicle.active_session.exit_time)
  );
}

function getSafeHttpImageUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "";
}

export default function CustomerVehiclePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [vehicles, setVehicles] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deletingVehicle, setDeletingVehicle] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let isSubscribed = true;
    Promise.all([walletService.getMyVehicles(), walletService.getMyVehicleTypes()])
      .then(([vehiclesRes, typesRes]) => {
        if (!isSubscribed) return;
        setVehicles(vehiclesRes);
        setVehicleTypes(typesRes);
        setLoadError("");
      })
      .catch((err) => {
        if (!isSubscribed) return;
        const info = extractApiErrorInfo(err, "Không thể tải danh sách phương tiện.");
        setLoadError(info.message);
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [refreshNonce]);

  const {
    titleId: deleteTitleId,
    descriptionId: deleteDescId,
    dialogProps: deleteDialogProps,
  } = useModalA11y({
    isOpen: Boolean(deletingVehicle),
    onClose: () => setDeletingVehicle(null),
    isBusy: isDeleting,
    role: "alertdialog",
    hasDescription: true,
  });

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshNonce((n) => n + 1);
  };

  const parkedCount = useMemo(() => vehicles.filter(isVehicleParked).length, [vehicles]);
  const outsideCount = vehicles.length - parkedCount;

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vehicles.filter((v) => {
      const parked = isVehicleParked(v);
      if (statusFilter === "PARKED" && !parked) return false;
      if (statusFilter === "OUTSIDE" && parked) return false;

      if (q) {
        const plate = String(v.license_plate || "").toLowerCase();
        const model = String(v.model_name || "").toLowerCase();
        const brand = String(v.brand || "").toLowerCase();
        const code = String(v.code || "").toLowerCase();
        return (
          plate.includes(q) ||
          model.includes(q) ||
          brand.includes(q) ||
          code.includes(q)
        );
      }
      return true;
    });
  }, [vehicles, searchQuery, statusFilter]);

  const handleSubmitVehicle = async (payload, targetVehicle) => {
    setActionError("");
    if (targetVehicle) {
      const lookup = targetVehicle.code || targetVehicle.id;
      await walletService.updateMyVehicle(lookup, payload);
      toast.success("Cập nhật thông tin phương tiện thành công.");
    } else {
      await walletService.createMyVehicle(payload);
      toast.success("Đăng ký phương tiện mới thành công.");
    }
    setRefreshNonce((n) => n + 1);
  };

  const handleConfirmDelete = async () => {
    if (!deletingVehicle) return;
    setIsDeleting(true);
    setActionError("");
    try {
      const lookup = deletingVehicle.code || deletingVehicle.id;
      await walletService.deleteMyVehicle(lookup);
      toast.success(`Đã xóa phương tiện ${deletingVehicle.license_plate}.`);
      setDeletingVehicle(null);
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      const info = extractApiErrorInfo(
        err,
        "Không thể xóa phương tiện do còn ràng buộc vé hoặc phiên đỗ.",
      );
      setActionError(info.message);
      toast.error(info.message);
      setDeletingVehicle(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      <AppTopHeader
        variant="customer"
        activePath={ROUTES.CUSTOMER_VEHICLE}
        showHelp={true}
        showCamera={false}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tiêu đề & Nút Thêm xe */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Xe của tôi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Quản lý danh sách xe đã đăng ký, trạng thái đỗ và gói vé đi kèm.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingVehicle(null);
              setIsFormModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all inline-flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>Thêm xe ô tô</span>
          </button>
        </div>

        {actionError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError("")}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-amber-700 font-semibold hover:underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Thanh tìm kiếm & Bộ lọc trạng thái đỗ */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl gap-1 overflow-x-auto">
            {[
              { key: "ALL", label: `Tất cả (${vehicles.length})` },
              { key: "PARKED", label: `Đang đỗ (${parkedCount})` },
              { key: "OUTSIDE", label: `Ngoài bãi (${outsideCount})` },
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

        {/* Lưới danh sách xe */}
        {isLoading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center text-xs text-slate-500 shadow-2xs">
            Đang tải danh sách phương tiện...
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-3xl border border-rose-200 p-6 text-center space-y-3 shadow-2xs">
            <p className="text-xs text-rose-600">{loadError}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14V8a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0h2m-18 0H3m4 4h.01M17 18h.01" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy phương tiện phù hợp</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc bấm &quot;Thêm xe ô tô&quot; để đăng ký phương tiện mới vào tài khoản.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVehicles.map((v) => {
              const parked = isVehicleParked(v);
              const safeImageUrl = getSafeHttpImageUrl(v.image_url);
              const vTypeName =
                v.vehicle_type?.name || v.vehicle_type_name || v.vehicle_type_code || "Ô tô";
              const slotText =
                v.current_slot ||
                v.parking_slot_code ||
                v.active_session?.slot_code ||
                v.current_ticket?.slot_code ||
                "";
              const ticket = v.current_ticket || null;
              const hasTicket =
                Boolean(ticket) &&
                String(ticket.status || "").toUpperCase() !== "CANCELLED" &&
                String(ticket.status || "").toUpperCase() !== "EXPIRED";

              return (
                <div
                  key={v.id || v.code}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    {safeImageUrl ? (
                      <div className="relative h-40 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                        <img
                          src={safeImageUrl}
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
                          {vTypeName}
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
                              {[v.brand, v.model_name].filter(Boolean).join(" ") || "—"}
                              {v.color ? ` · ${v.color}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div>
                          {parked ? (
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
                          {slotText ? `Vị trí: ${slotText}` : "Chưa ghi nhận vị trí đỗ"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {hasTicket ? ticket.ticket_type_name || "Vé định kỳ" : "Chưa đăng ký vé"}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {hasTicket && ticket.effective_to
                              ? `Hết hạn ${formatDateVN(ticket.effective_to, "—")}`
                              : "Thanh toán theo lượt gửi"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(ROUTES.CUSTOMER_TICKET, {
                              state: { preselectedVehicleCode: v.code },
                            })
                          }
                          className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                        >
                          {hasTicket ? "Xem vé" : "Mua vé"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Thanh thao tác Mua vé / Chỉnh sửa / Xóa */}
                  <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(ROUTES.CUSTOMER_TICKET, {
                          state: { preselectedVehicleCode: v.code },
                        })
                      }
                      className="min-h-[44px] py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      Mua vé
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingVehicle(v);
                        setIsFormModalOpen(true);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Chỉnh sửa</span>
                    </button>

                    <button
                      type="button"
                      disabled={parked}
                      onClick={() => setDeletingVehicle(v)}
                      title={
                        parked
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

      <CustomerVehicleModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingVehicle(null);
        }}
        onSubmitVehicle={handleSubmitVehicle}
        initialVehicle={editingVehicle}
        vehicleTypes={vehicleTypes}
      />

      {deletingVehicle && (
        <div
          {...deleteDialogProps}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 id={deleteTitleId} className="text-base font-bold text-slate-900">
                Xác nhận xóa xe ô tô?
              </h3>
              <p id={deleteDescId} className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bạn có chắc muốn xóa xe{" "}
                <strong className="font-mono text-slate-800">
                  {deletingVehicle.license_plate}
                </strong>{" "}
                ({[deletingVehicle.brand, deletingVehicle.model_name].filter(Boolean).join(" ") || deletingVehicle.code}) khỏi hồ sơ không? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingVehicle(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Đang xóa..." : "Xóa xe"}
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
