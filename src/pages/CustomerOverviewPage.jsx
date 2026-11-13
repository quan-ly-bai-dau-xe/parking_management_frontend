import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppTopHeader from "../components/layout/AppTopHeader";
import { MOCK_CUSTOMERS } from "../mocks/customerSideData";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function CustomerOverviewPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  // Khớp dữ liệu khách hàng theo session đăng nhập hoặc lấy khách hàng đầu tiên
  const currentCustomerData = useMemo(() => {
    if (!user) return MOCK_CUSTOMERS[0];
    return (
      MOCK_CUSTOMERS.find(
        (c) =>
          c.customer.email === user.email ||
          c.customer.phone === user.phone ||
          c.customer.identity_card_number === user.identity_card_number
      ) || MOCK_CUSTOMERS[0]
    );
  }, [user]);

  const { customer, vehicles } = currentCustomerData;

  // Tách tên gọi ngắn gọn
  const firstName = customer.full_name
    ? customer.full_name.trim().split(" ").slice(-1)[0]
    : "Bạn";

  // Tính toán chỉ số KPIs
  const totalVehiclesCount = vehicles.length;
  const parkedVehicles = vehicles.filter((v) => v.is_parked);
  const activeTickets = vehicles.filter(
    (v) => v.ticket && v.ticket.ticket_type !== "NONE" && v.ticket.status !== "INACTIVE"
  );
  const expiringSoonTicket = vehicles.find(
    (v) => v.ticket && (v.ticket.status === "EXPIRING_SOON" || v.ticket.remaining_days <= 7)
  );

  // Thống kê loại xe (vd: 2 ô tô · 1 xe máy)
  const vehicleBreakdownText = useMemo(() => {
    const counts = {};
    vehicles.forEach((v) => {
      const typeName = v.vehicle_type_name || "Xe";
      counts[typeName] = (counts[typeName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => `${count} ${name.toLowerCase()}`)
      .join(" · ");
  }, [vehicles]);

  const formatVND = (amountStr) => {
    const val = Number(amountStr) || 0;
    return `${val.toLocaleString("vi-VN")}đ`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Header variant Customer tự lấy thông tin tài khoản */}
      <AppTopHeader
        variant="customer"
        activePath="/overview"
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

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
              Chủ nhật, 01/11/2026
            </span>
            <button
              type="button"
              onClick={() => navigate("/tickets")}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all cursor-pointer"
            >
              Mua vé đỗ xe
            </button>
          </div>
        </div>

        {/* 4 Thẻ chỉ số KPI tính từ mock data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Tổng xe */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 block">
                Phương tiện của tôi
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono block">
                {String(totalVehiclesCount).padStart(2, "0")}
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
                {parkedVehicles[0]?.current_location || "Không có xe trong bãi"}
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
                Tất cả đã thanh toán
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
          </div>

          {/* Card 4: Vé sắp hết hạn */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 block">
                Vé sắp hết hạn
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono block">
                {expiringSoonTicket ? "01" : "00"}
              </span>
              <span className="text-[11px] text-slate-400 block font-medium">
                Trong 7 ngày tới
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Cảnh báo vé sắp hết hạn (nếu có xe sắp hết hạn trong data) */}
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
                  Vé xe {expiringSoonTicket.license_plate} sẽ hết hạn sau {expiringSoonTicket.ticket.remaining_days} ngày
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gia hạn trước {formatDate(expiringSoonTicket.ticket.effective_to)} để tiếp tục ra/vào bãi thuận tiện.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/tickets")}
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
              onClick={() => navigate("/vehicles")}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              Thêm xe
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vehicles.map((v) => {
              const hasTicket = v.ticket && v.ticket.ticket_type !== "NONE";
              const isExpiring = v.ticket?.status === "EXPIRING_SOON" || (v.ticket?.remaining_days <= 7);

              return (
                <div
                  key={v.code}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between gap-4 hover:shadow-xs transition-shadow"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          {v.vehicle_type === "BIKE" ? (
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
                            {[v.brand, v.model_name, v.vehicle_type_name, v.color].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 p-1 text-sm leading-none"
                      >
                        •••
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div>
                        {v.is_parked ? (
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
                        <span className="truncate">{v.current_location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {hasTicket ? v.ticket.ticket_type_name : "Không có vé"}
                      </span>
                      <span className={`text-[11px] block mt-0.5 ${isExpiring ? "text-amber-600 font-medium" : "text-slate-400"}`}>
                        {hasTicket
                          ? `Hết hạn ${formatDate(v.ticket.effective_to)}${isExpiring ? ` · Còn ${v.ticket.remaining_days} ngày` : ""}`
                          : "Gửi xe tính theo lượt"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/vehicles")}
                      className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Chi tiết →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Khối "Vé đã mua" */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Vé đã mua
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi thời hạn và gia hạn vé cho từng phương tiện.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/tickets")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Lịch sử mua vé →
            </button>
          </div>

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
                {vehicles
                  .filter((v) => v.ticket && v.ticket.ticket_type !== "NONE")
                  .map((v) => {
                    const t = v.ticket;
                    const isExpiring = t.status === "EXPIRING_SOON" || t.remaining_days <= 7;

                    return (
                      <tr key={t.ticket_code} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-3">
                          <p className="font-semibold text-slate-900">{t.ticket_type_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {t.ticket_code}
                          </p>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                          {v.license_plate}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600">
                          {t.zone_display || t.assigned_slot}
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-slate-800">
                            {formatDate(t.effective_from)} – {formatDate(t.effective_to)}
                          </p>
                          <p className={`text-[11px] mt-0.5 ${isExpiring ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                            Còn {t.remaining_days} ngày
                          </p>
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-mono font-bold text-slate-900">{formatVND(t.price)}</p>
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
                            onClick={() => navigate("/tickets")}
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            <span>Hiển thị {activeTickets.length} vé đang có hiệu lực</span>
            <span>Vé có hiệu lực đến 23:59 ngày hết hạn.</span>
          </div>
        </section>

        {/* Thanh ghi nhận lượt vào gần nhất */}
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
                  {parkedVehicles[0].license_plate} đã vào bãi lúc 08:30 hôm nay
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cổng A1 · {parkedVehicles[0].current_location}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/history")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline self-start sm:self-auto cursor-pointer"
            >
              Xem lịch sử ra/vào →
            </button>
          </div>
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