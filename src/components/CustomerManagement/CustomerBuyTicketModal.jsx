import React, { useState, useEffect, useMemo } from "react";

// Bảng giá gói vé theo loại phương tiện (VND / tháng cơ sở)
const BASE_MONTHLY_RATES = {
  CAR: 1200000,  // Ô tô: 1.200.000đ/tháng
  EV: 1100000,   // Xe điện: 1.100.000đ/tháng (ưu đãi xe xanh)
  BIKE: 150000,  // Xe máy: 150.000đ/tháng
};

const TICKET_PLANS = [
  {
    id: "MONTHLY",
    name: "Vé tháng",
    durationDays: 30,
    months: 1,
    discount: 0,
    badge: null,
    desc: "Linh hoạt theo tháng, phù hợp nhu cầu ngắn hạn.",
  },
  {
    id: "QUARTERLY",
    name: "Vé quý (3 tháng)",
    durationDays: 90,
    months: 3,
    discount: 0.08, // Giảm 8%
    badge: "Tiết kiệm 8%",
    desc: "Ổn định 90 ngày, ưu tiên giữ cố định vị trí đỗ.",
  },
  {
    id: "YEARLY",
    name: "Vé năm (12 tháng)",
    durationDays: 365,
    months: 12,
    discount: 0.16, // Giảm 16%
    badge: "Tiết kiệm 16%",
    desc: "Trọn gói 1 năm với mức chiết khấu cao nhất.",
  },
];

export default function BuyTicketModal({
  isOpen,
  onClose,
  vehicles = [],
  preselectedVehicleCode = "",
  onPurchaseSuccess,
}) {
  const [selectedVehicleCode, setSelectedVehicleCode] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("MONTHLY");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [paymentMethod, setPaymentMethod] = useState("WALLET"); // 'WALLET' | 'VIETQR'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (preselectedVehicleCode) {
      setSelectedVehicleCode(preselectedVehicleCode);
    } else if (vehicles.length > 0) {
      setSelectedVehicleCode(vehicles[0].code);
    }
    setSelectedPlanId("MONTHLY");
    setError("");
    setLoading(false);
  }, [isOpen, preselectedVehicleCode, vehicles]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.code === selectedVehicleCode) || vehicles[0],
    [vehicles, selectedVehicleCode]
  );

  const selectedPlan = useMemo(
    () => TICKET_PLANS.find((p) => p.id === selectedPlanId) || TICKET_PLANS[0],
    [selectedPlanId]
  );

  // Tính toán giá tiền dựa trên loại xe + hạn mức gói vé
  const pricing = useMemo(() => {
    const vehicleType = selectedVehicle?.vehicle_type || "CAR";
    const baseRate = BASE_MONTHLY_RATES[vehicleType] || 1200000;
    const rawTotal = baseRate * selectedPlan.months;
    const discountAmount = Math.round(rawTotal * selectedPlan.discount);
    const finalTotal = rawTotal - discountAmount;

    return {
      baseRate,
      rawTotal,
      discountAmount,
      finalTotal,
    };
  }, [selectedVehicle, selectedPlan]);

  // Tính ngày hết hạn dự kiến
  const calculatedEndDate = useMemo(() => {
    if (!startDate) return "";
    const d = new Date(startDate);
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + selectedPlan.durationDays);
    return d.toISOString();
  }, [startDate, selectedPlan]);

  if (!isOpen) return null;

  const formatDisplayDate = (isoStr) => {
    if (!isoStr) return "—";
    const d = new Date(isoStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const handleConfirmPurchase = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedVehicle) {
      setError("Vui lòng chọn phương tiện cần đăng ký vé.");
      return;
    }

    if (!startDate) {
      setError("Vui lòng chọn ngày bắt đầu hiệu lực.");
      return;
    }

    setLoading(true);
    try {
      const prefix =
        selectedPlan.id === "YEARLY" ? "VN" : selectedPlan.id === "QUARTERLY" ? "VQ" : "VT";
      const ticketCode = `${prefix}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      const newTicket = {
        ticket_type: selectedPlan.id,
        ticket_type_name: `${selectedPlan.name.split(" (")[0]} ${selectedVehicle.vehicle_type_name?.toLowerCase() || "xe"}`,
        ticket_code: ticketCode,
        price: pricing.finalTotal.toFixed(2),
        status: "ACTIVE",
        effective_from: new Date(startDate).toISOString(),
        effective_to: calculatedEndDate,
        zone_display:
          selectedVehicle.vehicle_type === "BIKE"
            ? "Khu B · Bãi xe máy"
            : selectedVehicle.vehicle_type === "EV"
            ? "Khu EV · Tầng B2"
            : "Khu A · Tất cả tầng",
        assigned_slot:
          selectedVehicle.vehicle_type === "BIKE"
            ? "Khu B - Slot M-08"
            : selectedVehicle.vehicle_type === "EV"
            ? "Tầng B2 - Zone EV - E-09"
            : "Tầng B1 - Zone A - A-15",
        remaining_days: selectedPlan.durationDays,
        payment_method: paymentMethod,
      };

      await onPurchaseSuccess(selectedVehicle.code, newTicket);
      onClose();
    } catch (err) {
      setError(err.message || "Không thể hoàn tất giao dịch mua vé.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans antialiased"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Đăng ký & Mua vé đỗ xe</h3>
              <p className="text-xs text-slate-500">Chọn phương tiện và gói thời hạn phù hợp</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Nội dung Form */}
        <form onSubmit={handleConfirmPurchase} className="p-6 overflow-y-auto space-y-5">
          {/* Bước 1: Chọn phương tiện */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              1. Chọn phương tiện sở hữu <span className="text-rose-500">*</span>
            </label>
            {vehicles.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Bạn chưa có phương tiện nào trong hồ sơ. Vui lòng thêm xe trước khi mua vé.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {vehicles.map((v) => {
                  const isSelected = v.code === selectedVehicle?.code;
                  const hasActiveTicket = v.ticket && v.ticket.ticket_type !== "NONE" && v.ticket.status === "ACTIVE";
                  return (
                    <button
                      key={v.code}
                      type="button"
                      onClick={() => setSelectedVehicleCode(v.code)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600/20"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-slate-900">
                            {v.license_plate}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {v.vehicle_type_name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {v.brand} {v.model_name}
                        </p>
                      </div>

                      {hasActiveTicket && (
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đang có vé
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bước 2: Chọn hạn mức gói vé (Tháng / Quý / Năm) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              2. Chọn hạn mức gói vé <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TICKET_PLANS.map((plan) => {
                const isSelected = plan.id === selectedPlanId;
                const baseRate = BASE_MONTHLY_RATES[selectedVehicle?.vehicle_type || "CAR"] || 1200000;
                const planPrice = Math.round(baseRate * plan.months * (1 - plan.discount));

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {plan.badge && (
                      <span className="self-start px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {plan.badge}
                      </span>
                    )}
                    <div>
                      <span className={`block text-xs font-bold ${isSelected ? "text-blue-700" : "text-slate-900"}`}>
                        {plan.name}
                      </span>
                      <span className="block font-mono font-extrabold text-base text-slate-900 mt-1">
                        {planPrice.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {plan.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bước 3: Ngày bắt đầu & Phương thức thanh toán */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ngày bắt đầu hiệu lực
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="block text-[11px] text-slate-400 mt-1">
                Hết hạn dự kiến: <strong className="text-slate-600">{formatDisplayDate(calculatedEndDate)}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hình thức thanh toán
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("WALLET")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    paymentMethod === "WALLET"
                      ? "border-blue-600 bg-blue-50/70 text-blue-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Ví Smart Parking
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("VIETQR")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    paymentMethod === "VIETQR"
                      ? "border-blue-600 bg-blue-50/70 text-blue-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Chuyển khoản QR
                </button>
              </div>
            </div>
          </div>

          {/* Tóm tắt chi phí */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Đơn giá gốc ({selectedPlan.months} tháng):</span>
              <span className="font-mono">{pricing.rawTotal.toLocaleString("vi-VN")} đ</span>
            </div>
            {pricing.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Chiết khấu gói {selectedPlan.name.split(" (")[0].toLowerCase()}:</span>
                <span className="font-mono">-{pricing.discountAmount.toLocaleString("vi-VN")} đ</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200/70">
              <span className="font-bold text-slate-800">Tổng thanh toán:</span>
              <span className="font-mono text-lg font-extrabold text-blue-600">
                {pricing.finalTotal.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs">
              {error}
            </div>
          )}

          {/* Footer Modal */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={loading || vehicles.length === 0}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              {loading && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              <span>Xác nhận mua vé</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}