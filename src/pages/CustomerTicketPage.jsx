import React, { useState, useMemo } from "react";
import AppTopHeader from "../components/layout/AppTopHeader";
import BuyTicketModal from "../components/customerManagement/CustomerBuyTicketModal";
import { MOCK_CUSTOMERS } from "../mocks/customerSideData";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiClient } from "../services/apiClient";

export default function CustomerTicketsPage() {
  const { user } = useCurrentUser();

  // Lấy danh sách phương tiện và vé từ hồ sơ khách hàng hiện tại
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

  const [vehicles, setVehicles] = useState(() => currentCustomerData.vehicles);
  const [statusFilter, setStatusFilter] = useState("ALL"); // 'ALL' | 'ACTIVE' | 'CANCELLED'
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [preselectedVehicleCode, setPreselectedVehicleCode] = useState("");
  const [cancelingItem, setCancelingItem] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Lưu lịch sử các vé đã bị hủy để khách hàng vẫn có thể tra cứu
  const [cancelledHistory, setCancelledHistory] = useState([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Tổng hợp danh sách vé từ các xe + vé đã hủy
  const allTickets = useMemo(() => {
    const activeList = vehicles
      .filter((v) => v.ticket && v.ticket.ticket_type !== "NONE" && v.ticket.status !== "INACTIVE")
      .map((v) => ({
        vehicleCode: v.code,
        licensePlate: v.license_plate || v.licensePlate,
        vehicleInfo: `${v.brand} ${v.model_name} · ${v.vehicle_type_name}`,
        ...v.ticket,
      }));

    return [...activeList, ...cancelledHistory];
  }, [vehicles, cancelledHistory]);

  const filteredTickets = allTickets.filter((t) => {
    if (statusFilter === "ACTIVE") return t.status === "ACTIVE" || t.status === "EXPIRING_SOON";
    if (statusFilter === "CANCELLED") return t.status === "CANCELLED";
    return true;
  });

  // Mở modal mua vé (có thể chọn sẵn 1 xe cụ thể nếu bấm từ nút Gia hạn)
  const handleOpenBuyModal = (vehicleCode = "") => {
    setPreselectedVehicleCode(vehicleCode);
    setIsBuyModalOpen(true);
  };

  // Xử lý lưu vé mới sau khi mua thành công
  const handlePurchaseSuccess = async (vehicleCode, newTicket) => {
    try {
      await apiClient("/api/v1/tickets/", {
        method: "POST",
        data: { vehicle_code: vehicleCode, ...newTicket },
      });
    } catch {
      // Fallback cập nhật cục bộ khi chạy mock
    }

    setVehicles((prev) =>
      prev.map((v) => (v.code === vehicleCode ? { ...v, ticket: newTicket } : v))
    );
    showToast(`Đăng ký thành công ${newTicket.ticket_type_name} (${newTicket.ticket_code})`);
  };

  // Xử lý Hủy vé bất cứ lúc nào khách hàng yêu cầu
  const handleConfirmCancelTicket = async () => {
    if (!cancelingItem) return;

    try {
      await apiClient(`/api/v1/tickets/${cancelingItem.ticket_code}/cancel/`, {
        method: "POST",
      });
    } catch {
      // Fallback cập nhật cục bộ
    }

    // 1. Đưa vé vào danh sách lịch sử đã hủy
    setCancelledHistory((prev) => [
      {
        ...cancelingItem,
        status: "CANCELLED",
        cancelledAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    // 2. Đặt lại trạng thái vé trên phương tiện về NONE
    setVehicles((prev) =>
      prev.map((v) =>
        v.code === cancelingItem.vehicleCode
          ? {
              ...v,
              ticket: {
                ticket_type: "NONE",
                ticket_type_name: "Không có vé",
                ticket_code: null,
                price: "0.00",
                status: "INACTIVE",
              },
            }
          : v
      )
    );

    showToast(`Đã hủy vé ${cancelingItem.ticket_code} cho xe ${cancelingItem.licensePlate}`);
    setCancelingItem(null);
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return "—";
    const d = new Date(isoStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const formatPrice = (val) => `${(Number(val) || 0).toLocaleString("vi-VN")}đ`;

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Header Customer */}
      <AppTopHeader
        variant="customer"
        activePath="/customerTicket"
        showHelp={true}
        showCamera={false}
      />

      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Nội dung chính */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tiêu đề & Nút Mua vé */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Vé của tôi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Đăng ký vé tháng, vé quý, vé năm cho từng phương tiện hoặc hủy vé linh hoạt bất cứ lúc nào.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBuyModal()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all inline-flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>Mua vé mới</span>
          </button>
        </div>

        {/* Thẻ trạng thái gói vé theo từng xe */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vehicles.map((v) => {
            const hasTicket = v.ticket && v.ticket.ticket_type !== "NONE" && v.ticket.status !== "INACTIVE";
            const isExpiring = hasTicket && (v.ticket.status === "EXPIRING_SOON" || v.ticket.remaining_days <= 7);

            return (
              <div
                key={v.code}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-base text-slate-900">
                        {v.license_plate}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {v.vehicle_type_name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {v.brand} {v.model_name}
                    </p>
                  </div>

                  {hasTicket ? (
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

                {hasTicket ? (
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{v.ticket.ticket_type_name}</span>
                      <span className="font-mono text-[11px] text-slate-500">{v.ticket.ticket_code}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Hiệu lực đến: <strong>{formatDate(v.ticket.effective_to)}</strong> (còn {v.ticket.remaining_days} ngày)
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-xs text-slate-400">
                    Phương tiện này hiện chưa đăng ký gói vé định kỳ.
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  {hasTicket ? (
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
                        onClick={() =>
                          setCancelingItem({
                            vehicleCode: v.code,
                            licensePlate: v.license_plate,
                            ...v.ticket,
                          })
                        }
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

        {/* Bảng quản lý chi tiết & Hủy vé */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Danh sách vé đã đăng ký</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Khách hàng có thể chủ động hủy vé đang sử dụng bất kỳ lúc nào.
              </p>
            </div>

            {/* Bộ lọc trạng thái vé */}
            <div className="inline-flex p-1 bg-slate-100/80 rounded-xl gap-1 self-start sm:self-auto">
              {[
                { key: "ALL", label: `Tất cả (${allTickets.length})` },
                { key: "ACTIVE", label: "Đang hiệu lực" },
                { key: "CANCELLED", label: "Đã hủy" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                    const isCancelled = t.status === "CANCELLED";
                    const isExpiring = t.status === "EXPIRING_SOON" || (!isCancelled && t.remaining_days <= 7);

                    return (
                      <tr key={`${t.ticket_code}-${t.status}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-3">
                          <p className="font-semibold text-slate-900">{t.ticket_type_name}</p>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{t.ticket_code}</p>
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-mono font-bold text-slate-800">{t.licensePlate}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{t.vehicleInfo}</p>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600">
                          {t.zone_display || t.assigned_slot}
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-slate-800">
                            {formatDate(t.effective_from)} – {formatDate(t.effective_to)}
                          </p>
                          {!isCancelled && (
                            <p className={`text-[11px] mt-0.5 ${isExpiring ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                              Còn {t.remaining_days} ngày
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                          {formatPrice(t.price)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {isCancelled ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Đã hủy
                            </span>
                          ) : isExpiring ? (
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
                          {isCancelled ? (
                            <button
                              type="button"
                              onClick={() => handleOpenBuyModal(t.vehicleCode)}
                              className="font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              Mua lại →
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCancelingItem(t)}
                              className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 font-semibold transition-colors cursor-pointer"
                            >
                              Hủy vé
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
      </main>

      {/* 3. Modal Mua vé mới */}
      <BuyTicketModal
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        vehicles={vehicles}
        preselectedVehicleCode={preselectedVehicleCode}
        onPurchaseSuccess={handlePurchaseSuccess}
      />

      {/* 4. Modal Xác nhận Hủy vé */}
      {cancelingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Xác nhận hủy vé đỗ xe?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Bạn đang yêu cầu hủy gói{" "}
                <strong className="text-slate-800">{cancelingItem.ticket_type_name}</strong>{" "}
                (Mã vé: <span className="font-mono font-semibold">{cancelingItem.ticket_code}</span>) của xe{" "}
                <strong className="font-mono text-slate-800">{cancelingItem.licensePlate}</strong>.
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-xl p-3 mt-3">
                Sau khi hủy, vé sẽ ngừng hiệu lực ngay lập tức và vị trí đỗ cố định sẽ được giải phóng.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Giữ lại vé
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelTicket}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Xác nhận hủy vé
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