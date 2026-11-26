import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppTopHeader from "../components/layout/AppTopHeader";
import BuyTicketModal from "../components/CustomerManagement/CustomerBuyTicketModal";
import { ROUTES } from "../config/navigation";
import { formatCurrencyVND } from "../constants/paymentConstants";
import { formatIsoDateToDisplay, formatDateVN } from "../utils/formatDateTime";
import { useToast } from "../context/ToastContext";
import {
  walletService,
  extractApiErrorInfo,
} from "../services/walletService";
import useModalA11y from "../hooks/useModalA11y";

const ACTIVE_TICKET_STATUSES = new Set(["ACTIVE", "RENEWING"]);

function getRemainingDays(effectiveTo) {
  if (!effectiveTo) return null;
  const end = new Date(effectiveTo);
  if (Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export default function CustomerTicketPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const initialPreselect = location.state?.preselectedVehicleCode || "";

  const [tickets, setTickets] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [cancelError, setCancelError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(() => Boolean(initialPreselect));
  const [preselectedVehicleCode, setPreselectedVehicleCode] = useState(initialPreselect);
  const [cancelingTicket, setCancelingTicket] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let isSubscribed = true;
    Promise.all([
      walletService.getMyTickets(),
      walletService.getMyVehicles(),
      walletService.getMyWallet(),
      walletService.getMyTicketTypes(),
    ])
      .then(([ticketsRes, vehiclesRes, walletRes, ticketTypesRes]) => {
        if (!isSubscribed) return;
        setTickets(ticketsRes);
        setVehicles(vehiclesRes);
        setWallet(walletRes);
        setTicketTypes(ticketTypesRes);
        setLoadError("");
      })
      .catch((err) => {
        if (!isSubscribed) return;
        const info = extractApiErrorInfo(err, "Không thể tải dữ liệu vé của bạn.");
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
    titleId: cancelTitleId,
    descriptionId: cancelDescId,
    dialogProps: cancelDialogProps,
  } = useModalA11y({
    isOpen: Boolean(cancelingTicket),
    onClose: () => setCancelingTicket(null),
    isBusy: isCanceling,
    role: "alertdialog",
    hasDescription: true,
  });

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshNonce((n) => n + 1);
  };

  const activeTicketByVehicle = useMemo(() => {
    const map = new Map();
    for (const t of tickets) {
      const st = String(t?.status || "").toUpperCase();
      if (!ACTIVE_TICKET_STATUSES.has(st)) continue;
      if (t.vehicle_code && !map.has(t.vehicle_code)) {
        map.set(t.vehicle_code, t);
      }
      if (t.license_plate && !map.has(t.license_plate)) {
        map.set(t.license_plate, t);
      }
    }
    return map;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (statusFilter === "ALL") return tickets;
    if (statusFilter === "ACTIVE") {
      return tickets.filter((t) =>
        ACTIVE_TICKET_STATUSES.has(String(t.status || "").toUpperCase()),
      );
    }
    return tickets.filter((t) => String(t.status || "").toUpperCase() === statusFilter);
  }, [tickets, statusFilter]);

  const handleOpenBuyModal = (vehicleCode = "") => {
    setPreselectedVehicleCode(vehicleCode);
    setIsBuyModalOpen(true);
  };

  const handleBuySuccess = (result) => {
    toast.success(
      result?.replayed
        ? "Giao dịch mua vé đã được ghi nhận trước đó."
        : `Mua vé ${result?.ticket?.code || ""} thành công!`,
    );
    setRefreshNonce((n) => n + 1);
  };

  const handleConfirmCancel = async () => {
    if (!cancelingTicket) return;
    setIsCanceling(true);
    setCancelError("");
    try {
      const lookup = cancelingTicket.code || cancelingTicket.id;
      await walletService.cancelMyTicket(lookup);
      toast.success(`Đã hủy vé ${cancelingTicket.code}.`);
      setCancelingTicket(null);
      setRefreshNonce((n) => n + 1);
    } catch (err) {
      const info = extractApiErrorInfo(
        err,
        "Không thể hủy vé gửi xe. Vui lòng liên hệ quản lý nếu cần hỗ trợ.",
      );
      setCancelError(info.message);
      toast.error(info.message);
      setCancelingTicket(null);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Header Customer */}
      <AppTopHeader
        variant="customer"
        activePath={ROUTES.CUSTOMER_TICKET}
        showHelp={true}
        showCamera={false}
      />

      {/* 2. Nội dung chính */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tiêu đề & Nút Mua vé */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Vé của tôi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Đăng ký vé tháng, vé quý, vé năm cho từng phương tiện bằng số dư Ví Smart Parking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            <div className="px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-xs flex items-center gap-2.5 shadow-2xs">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-slate-500">Số dư ví:</span>
                <span className="font-mono font-bold text-blue-600">
                  {formatCurrencyVND(wallet?.balance ?? 0)}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  navigate(`${ROUTES.CUSTOMER_PROFILE}?topup=vnpay`, {
                    state: { openTopup: true, topupMethod: "vnpay" },
                  })
                }
                className="min-w-[44px] min-h-[44px] px-2 -my-2 inline-flex items-center justify-center font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Nạp tiền
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenBuyModal()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="text-base leading-none font-bold">+</span>
              <span>Mua vé mới</span>
            </button>
          </div>
        </div>

        {cancelError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
            <span>{cancelError}</span>
            <button
              type="button"
              onClick={() => setCancelError("")}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-amber-700 font-semibold hover:underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center text-xs text-slate-500 shadow-xs">
            Đang tải danh sách vé...
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-3xl border border-rose-200 p-6 text-center space-y-3 shadow-xs">
            <p className="text-xs text-rose-600">{loadError}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* Thẻ trạng thái gói vé theo từng xe */}
            {vehicles.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {vehicles.map((v) => {
                  const activeTicket =
                    activeTicketByVehicle.get(v.code) ||
                    activeTicketByVehicle.get(v.license_plate) ||
                    null;
                  const remDays = activeTicket ? getRemainingDays(activeTicket.effective_to) : null;
                  const isExpiring =
                    Boolean(activeTicket) &&
                    (String(activeTicket.status || "").toUpperCase() === "RENEWING" ||
                      (remDays !== null && remDays <= 7));
                  const typeName =
                    v.vehicle_type?.name || v.vehicle_type_name || "Ô tô";

                  return (
                    <div
                      key={v.id || v.code}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-base text-slate-900">
                              {v.license_plate}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {typeName}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {[v.brand, v.model_name].filter(Boolean).join(" ") || v.code}
                          </p>
                        </div>

                        {activeTicket ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isExpiring
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {isExpiring ? "Sắp hết hạn" : "Đang hiệu lực"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                            Chưa có vé
                          </span>
                        )}
                      </div>

                      {activeTicket ? (
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">
                              {activeTicket.ticket_type_name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {activeTicket.code}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Hiệu lực đến: <strong>{formatDateVN(activeTicket.effective_to, "—")}</strong> (còn {remDays ?? 0} ngày)
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-xs text-slate-400">
                          Phương tiện này hiện chưa đăng ký gói vé định kỳ.
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        {activeTicket ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenBuyModal(v.code)}
                              className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Đổi gói / Gia hạn
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancelingTicket(activeTicket)}
                              className="py-2 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Hủy vé
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenBuyModal(v.code)}
                            className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Đăng ký vé cho xe này
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Bảng quản lý chi tiết & Hủy vé */}
            <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Danh sách vé đã đăng ký</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Theo dõi thời hạn sử dụng và quản lý các gói vé đã mua bằng Ví Smart Parking.
                  </p>
                </div>

                {/* Bộ lọc trạng thái vé */}
                <div className="inline-flex flex-wrap items-center max-w-full p-1 bg-slate-100/80 rounded-xl gap-1 self-start sm:self-auto">
                  {[
                    { key: "ALL", label: `Tất cả (${tickets.length})` },
                    { key: "ACTIVE", label: "Đang hiệu lực" },
                    { key: "CANCELLED", label: "Đã hủy" },
                    { key: "EXPIRED", label: "Đã hết hạn" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        tab.key === "EXPIRED" ? "min-h-[44px] sm:min-h-0 " : ""
                      }${
                        statusFilter === tab.key
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTickets.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Không có vé nào trong mục này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                        <th className="py-3 px-3">Mã vé / Loại vé</th>
                        <th className="py-3 px-3">Phương tiện</th>
                        <th className="py-3 px-3">Khu vực / Vị trí</th>
                        <th className="py-3 px-3">Thời hạn</th>
                        <th className="py-3 px-3">Giá gói</th>
                        <th className="py-3 px-3 text-center">Trạng thái</th>
                        <th className="py-3 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredTickets.map((t) => {
                        const statusCode = String(t.status || "").toUpperCase();
                        const isCancelled = statusCode === "CANCELLED";
                        const isExpired = statusCode === "EXPIRED";
                        const isActive = ACTIVE_TICKET_STATUSES.has(statusCode);
                        const remDays = getRemainingDays(t.effective_to);
                        const isExpiring =
                          statusCode === "RENEWING" ||
                          (isActive && remDays !== null && remDays <= 7);

                        return (
                          <tr key={t.id || t.code} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-3">
                              <p className="font-semibold text-slate-900">{t.ticket_type_name}</p>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">{t.code}</p>
                            </td>
                            <td className="py-3.5 px-3">
                              <p className="font-mono font-bold text-slate-800">{t.license_plate}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {t.vehicle_type_name || "Ô tô"}
                              </p>
                            </td>
                            <td className="py-3.5 px-3 text-slate-600">
                              {t.slot_location || t.slot_code || "—"}
                            </td>
                            <td className="py-3.5 px-3">
                              <p className="font-medium text-slate-800">
                                {formatIsoDateToDisplay(t.effective_from) || "—"} –{" "}
                                {formatIsoDateToDisplay(t.effective_to) || "—"}
                              </p>
                              {isActive && (
                                <p className={`text-[11px] mt-0.5 ${isExpiring ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                                  Còn {remDays ?? 0} ngày ({t.duration_days} ngày)
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                              {formatCurrencyVND(t.price)}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              {isCancelled ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Đã hủy
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Đã hết hạn
                                </span>
                              ) : isExpiring ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Sắp hết hạn
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Đang hiệu lực
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              {isActive ? (
                                <button
                                  type="button"
                                  onClick={() => setCancelingTicket(t)}
                                  className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 font-semibold transition-colors cursor-pointer"
                                >
                                  Hủy vé
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenBuyModal(t.vehicle_code || "")}
                                  className="font-semibold text-blue-600 hover:underline cursor-pointer"
                                >
                                  Mua lại →
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* 3. Modal Mua vé mới */}
      <BuyTicketModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        onSuccess={handleBuySuccess}
        onGoToTopup={(missing) => {
          const amountInt = Math.ceil(Number(missing) || 0);
          const url =
            amountInt > 0
              ? `${ROUTES.CUSTOMER_PROFILE}?topup=vnpay&amount=${amountInt}`
              : `${ROUTES.CUSTOMER_PROFILE}?topup=vnpay`;
          navigate(url, {
            state: {
              openTopup: true,
              topupMethod: "vnpay",
              topupAmount: amountInt > 0 ? amountInt : null,
            },
          });
        }}
        vehicles={vehicles}
        ticketTypes={ticketTypes}
        walletBalance={wallet?.balance ?? 0}
        preselectedVehicleCode={preselectedVehicleCode}
      />

      {/* 4. Modal Xác nhận Hủy vé */}
      {cancelingTicket && (
        <div
          {...cancelDialogProps}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div>
              <h3 id={cancelTitleId} className="text-base font-bold text-slate-900">
                Xác nhận hủy vé đỗ xe?
              </h3>
              <p id={cancelDescId} className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Bạn đang yêu cầu hủy gói{" "}
                <strong className="text-slate-800">{cancelingTicket.ticket_type_name}</strong>{" "}
                (Mã vé: <span className="font-mono font-semibold">{cancelingTicket.code}</span>) của xe{" "}
                <strong className="font-mono text-slate-800">{cancelingTicket.license_plate}</strong>.
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-xl p-3 mt-3">
                Lưu ý: Đối với vé đã thanh toán, chính sách hệ thống có thể yêu cầu thực hiện tại quầy cùng quản lý bãi xe.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => setCancelingTicket(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
              >
                Giữ lại vé
              </button>
              <button
                type="button"
                disabled={isCanceling}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isCanceling ? "Đang xử lý..." : "Xác nhận hủy vé"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Footer */}
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
