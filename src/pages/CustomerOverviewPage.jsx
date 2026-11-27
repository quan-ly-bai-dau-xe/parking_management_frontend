import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppTopHeader from "../components/layout/AppTopHeader";
import { ROUTES } from "../config/navigation";
import { formatCurrencyVND } from "../constants/paymentConstants";
import { formatIsoDateToDisplay, formatDateVN } from "../utils/formatDateTime";
import {
  walletService,
  extractApiErrorInfo,
} from "../services/walletService";
import { getMyNotifications } from "../services/notificationService";

function getRemainingDays(effectiveTo) {
  if (!effectiveTo) return null;
  const end = new Date(effectiveTo);
  if (Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function isVehicleParked(v) {
  const st = String(v?.status || "").toUpperCase();
  return (
    Boolean(v?.is_parked) ||
    st === "PARKED" ||
    st === "IN_LOT" ||
    Boolean(v?.active_session && !v.active_session.exit_time)
  );
}

export default function CustomerOverviewPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [paymentAlerts, setPaymentAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let isSubscribed = true;
    Promise.all([
      walletService.getMyProfile(),
      walletService.getMyWallet(),
      walletService.getMyVehicles(),
      walletService.getMyTickets(),
      getMyNotifications({ pageSize: 5, isRead: false, notificationType: "PAYMENT" }).catch(
        () => ({ results: [] }),
      ),
    ])
      .then(([profileRes, walletRes, vehiclesRes, ticketsRes, notifRes]) => {
        if (!isSubscribed) return;
        setProfile(profileRes);
        setWallet(walletRes);
        setVehicles(vehiclesRes);
        setTickets(ticketsRes);
        setPaymentAlerts(
          (notifRes?.results || []).filter((item) => Number(item?.missingAmount) > 0),
        );
        setLoadError("");
      })
      .catch((err) => {
        if (!isSubscribed) return;
        const info = extractApiErrorInfo(err, "Không thể tải tổng quan tài khoản khách hàng.");
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

  const firstName = profile?.full_name
    ? profile.full_name.trim().split(" ").slice(-1)[0]
    : "Bạn";

  const parkedVehicles = useMemo(() => vehicles.filter(isVehicleParked), [vehicles]);

  const activeTickets = useMemo(
    () =>
      tickets.filter((t) => {
        const st = String(t?.status || "").toUpperCase();
        return st === "ACTIVE" || st === "RENEWING";
      }),
    [tickets],
  );

  const expiringSoonTicket = (() => {
    for (const t of activeTickets) {
      const st = String(t?.status || "").toUpperCase();
      const days = getRemainingDays(t?.effective_to);
      if (st === "RENEWING" || (days !== null && days <= 7)) {
        return { ...t, remainingDays: days ?? 0 };
      }
    }
    return null;
  })();

  const vehicleBreakdownText = useMemo(() => {
    if (vehicles.length === 0) return "Chưa có xe đăng ký";
    const counts = {};
    vehicles.forEach((v) => {
      const typeName = v.vehicle_type?.name || v.vehicle_type_name || "Xe";
      counts[typeName] = (counts[typeName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => `${count} ${name.toLowerCase()}`)
      .join(" · ");
  }, [vehicles]);

  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
  }, []);

  const activeTicketByVehicle = useMemo(() => {
    const map = new Map();
    for (const t of activeTickets) {
      if (t.vehicle_code && !map.has(t.vehicle_code)) {
        map.set(t.vehicle_code, t);
      }
      if (t.license_plate && !map.has(t.license_plate)) {
        map.set(t.license_plate, t);
      }
    }
    return map;
  }, [activeTickets]);

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Header variant Customer tự lấy thông tin tài khoản */}
      <AppTopHeader
        variant="customer"
        activePath={ROUTES.CUSTOMER_OVERVIEW}
        showHelp={true}
        showCamera={false}
      />

      {/* 2. Khối nội dung chính */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Lời chào & Nút mua vé */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Xin chào, {firstName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Mọi thông tin về xe và vé đỗ xe của bạn, trong một nơi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
              {todayLabel}
            </span>
            <button
              type="button"
              onClick={() =>
                navigate(`${ROUTES.CUSTOMER_PROFILE}?topup=vnpay`, {
                  state: { openTopup: true, topupMethod: "vnpay" },
                })
              }
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
            >
              Nạp tiền ví
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.CUSTOMER_TICKET)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all cursor-pointer"
            >
              Mua vé đỗ xe
            </button>
          </div>
        </div>

        {/* Banner cảnh báo thiếu số dư ví khi ra cổng */}
        {paymentAlerts.length > 0 && (() => {
          const alertItem = paymentAlerts[0];
          const missingInt = Math.ceil(Number(alertItem.missingAmount));
          return (
            <div
              data-testid="blocked-exit-topup-banner"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-bold text-rose-800">{alertItem.title}</p>
                <p className="text-xs text-rose-700">{alertItem.content}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `${ROUTES.CUSTOMER_PROFILE}?topup=vnpay&amount=${missingInt}`,
                    {
                      state: {
                        openTopup: true,
                        topupMethod: "vnpay",
                        topupAmount: missingInt,
                        source: "WALLET_INSUFFICIENT",
                        notificationId: alertItem.id,
                      },
                    },
                  )
                }
                className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer shrink-0"
              >
                Nạp bù {formatCurrencyVND(missingInt)} qua VNPAY
              </button>
            </div>
          );
        })()}

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-xs text-slate-500 shadow-2xs">
            Đang tải dữ liệu tổng quan...
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3 shadow-2xs">
            <p className="text-xs text-rose-600">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setRefreshNonce((n) => n + 1);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            {/* 4 Thẻ chỉ số KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Phương tiện của tôi */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 block">
                    Phương tiện của tôi
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono block">
                    {String(vehicles.length).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] text-slate-400 block font-medium truncate max-w-[150px]">
                    {vehicleBreakdownText}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14V8a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0h2m-18 0H3m4 4h.01M17 18h.01" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Xe đang đỗ */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 block">
                    Xe đang đỗ
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono block">
                    {String(parkedVehicles.length).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] text-slate-400 block font-medium truncate max-w-[150px]">
                    {parkedVehicles[0]?.current_slot ||
                      parkedVehicles[0]?.parking_slot_code ||
                      parkedVehicles[0]?.active_session?.slot_code ||
                      "Không có xe trong bãi"}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <span className="w-5 h-5 font-bold border-2 border-emerald-500 rounded flex items-center justify-center text-[11px]">
                    P
                  </span>
                </div>
              </div>

              {/* Card 3: Vé đang sử dụng */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 block">
                    Vé đang sử dụng
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono block">
                    {String(activeTickets.length).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    {expiringSoonTicket ? "Có vé sắp hết hạn" : "Tất cả đã thanh toán"}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
              </div>

              {/* Card 4: Số dư Ví Smart Parking (tích hợp từ R88-93 theo chuẩn GitHub card) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-500 block">
                    Số dư Ví Smart Parking
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-blue-700 tracking-tight font-mono block truncate">
                    {formatCurrencyVND(wallet?.balance ?? 0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.CUSTOMER_PROFILE)}
                    className="min-h-[44px] inline-flex items-center text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Nạp tiền / Lịch sử ví →
                  </button>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Cảnh báo vé sắp hết hạn */}
            {expiringSoonTicket && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      Vé xe {expiringSoonTicket.license_plate} sẽ hết hạn sau {expiringSoonTicket.remainingDays} ngày
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gia hạn trước {formatDateVN(expiringSoonTicket.effective_to, "—")} để tiếp tục ra/vào bãi thuận tiện.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.CUSTOMER_TICKET)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
                >
                  Gia hạn ngay
                </button>
              </div>
            )}

            {/* Khối danh sách "Xe của tôi" */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Xe của tôi
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {vehicles.length} phương tiện
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.CUSTOMER_VEHICLE)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  Thêm xe
                </button>
              </div>

              {vehicles.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs text-slate-500 shadow-2xs">
                  Bạn chưa đăng ký phương tiện nào.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {vehicles.map((v) => {
                    const parked = isVehicleParked(v);
                    const matchedTicket =
                      activeTicketByVehicle.get(v.code) ||
                      activeTicketByVehicle.get(v.license_plate) ||
                      null;
                    const remDays = matchedTicket ? getRemainingDays(matchedTicket.effective_to) : null;
                    const isExpiring =
                      Boolean(matchedTicket) &&
                      (String(matchedTicket.status || "").toUpperCase() === "RENEWING" ||
                        (remDays !== null && remDays <= 7));
                    const typeCode = String(
                      v.vehicle_type?.code || v.vehicle_type_code || "",
                    ).toUpperCase();
                    const typeName =
                      v.vehicle_type?.name || v.vehicle_type_name || "Ô tô";
                    const slotLabel =
                      v.current_slot ||
                      v.parking_slot_code ||
                      v.active_session?.slot_code ||
                      matchedTicket?.slot_location ||
                      matchedTicket?.slot_code ||
                      "Chưa vào bãi";

                    return (
                      <div
                        key={v.id || v.code}
                        className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between gap-4 hover:shadow-xs transition-shadow"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                {typeCode === "BIKE" ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14V8a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0h2m-18 0H3m4 4h.01M17 18h.01" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <h3 className="font-extrabold text-base text-slate-900 font-mono tracking-wide">
                                  {v.license_plate}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {[v.brand, v.model_name, typeName, v.color].filter(Boolean).join(" · ")}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => navigate(ROUTES.CUSTOMER_VEHICLE)}
                              className="text-slate-400 hover:text-slate-600 p-1 text-sm leading-none cursor-pointer"
                            >
                              •••
                            </button>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <div>
                              {parked ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Đang đỗ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Ngoài bãi
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {slotLabel ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`${ROUTES.PARKING_LOT}?slot=${encodeURIComponent(slotLabel)}`)}
                                  className="truncate font-semibold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                                  title="Xem vị trí trên sơ đồ bãi đỗ"
                                >
                                  {slotLabel}
                                </button>
                              ) : (
                                <span className="truncate">—</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {matchedTicket ? matchedTicket.ticket_type_name : "Không có vé"}
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${isExpiring ? "text-amber-600 font-medium" : "text-slate-400"}`}>
                              {matchedTicket
                                ? `Hết hạn ${formatDateVN(matchedTicket.effective_to, "—")}${isExpiring ? ` · Còn ${remDays ?? 0} ngày` : ""}`
                                : "Gửi xe tính theo lượt"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(ROUTES.CUSTOMER_VEHICLE)}
                            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                          >
                            Chi tiết →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Khối "Vé đang sử dụng" */}
            <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Vé đang sử dụng
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Theo dõi thời hạn và gia hạn vé cho từng phương tiện.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.CUSTOMER_TICKET)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Lịch sử mua vé →
                </button>
              </div>

              {activeTickets.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Bạn chưa có vé dài hạn nào đang hiệu lực.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                        <th className="py-3 px-3">Loại vé / Mã vé</th>
                        <th className="py-3 px-3">Phương tiện</th>
                        <th className="py-3 px-3">Khu vực sử dụng</th>
                        <th className="py-3 px-3">Thời hạn sử dụng</th>
                        <th className="py-3 px-3">Giá vé</th>
                        <th className="py-3 px-3 text-center">Trạng thái</th>
                        <th className="py-3 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {activeTickets.map((t) => {
                        const remDays = getRemainingDays(t.effective_to);
                        const isExpiring =
                          String(t.status || "").toUpperCase() === "RENEWING" ||
                          (remDays !== null && remDays <= 7);

                        return (
                          <tr key={t.id || t.code} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-3">
                              <p className="font-semibold text-slate-900">{t.ticket_type_name}</p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {t.code}
                              </p>
                            </td>
                            <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                              {t.license_plate}
                            </td>
                            <td className="py-3.5 px-3 text-slate-600">
                              {t.slot_location || t.slot_code || "—"}
                            </td>
                            <td className="py-3.5 px-3">
                              <p className="font-medium text-slate-800">
                                {formatIsoDateToDisplay(t.effective_from) || "—"} –{" "}
                                {formatIsoDateToDisplay(t.effective_to) || "—"}
                              </p>
                              <p className={`text-[11px] mt-0.5 ${isExpiring ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                                Còn {remDays ?? 0} ngày
                              </p>
                            </td>
                            <td className="py-3.5 px-3">
                              <p className="font-mono font-bold text-slate-900">
                                {formatCurrencyVND(t.price)}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Đã thanh toán</p>
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              {isExpiring ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Sắp hết hạn
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Còn hiệu lực
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => navigate(ROUTES.CUSTOMER_TICKET)}
                                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                              >
                                {isExpiring ? "Gia hạn →" : "Xem vé →"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                <span>Hiển thị {activeTickets.length} vé đang có hiệu lực</span>
                <span>Vé có hiệu lực đến 23:59 ngày hết hạn.</span>
              </div>
            </section>

            {/* Thanh ghi nhận xe đang đỗ */}
            {parkedVehicles.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {parkedVehicles[0].license_plate} đang đỗ trong bãi
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {parkedVehicles[0].current_slot ||
                        parkedVehicles[0].parking_slot_code ||
                        parkedVehicles[0].active_session?.slot_code ||
                        "Đang đỗ tại bãi xe"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.PARKING_LOT)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline self-start sm:self-auto cursor-pointer"
                >
                  Xem sơ đồ bãi →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* 3. Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 px-4 sm:px-6 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 mt-6">
        <div>© 2026 Smart Mobility · Smart Parking</div>
        <div className="flex items-center gap-6">
          <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-slate-600 transition-colors">
            Chính sách bảo mật
          </a>
          <span>Hỗ trợ: <strong className="text-slate-700 font-normal">1900 1234</strong></span>
        </div>
      </footer>
    </div>
  );
}
