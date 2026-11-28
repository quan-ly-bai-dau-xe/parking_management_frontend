import { useState, useMemo, useRef } from "react";
import { formatCurrencyVND } from "../../constants/paymentConstants";
import { getLocalDateIso, buildEffectiveFromIso } from "../../utils/formatDateTime";
import {
  walletService,
  generateIdempotencyKey,
  extractApiErrorInfo,
} from "../../services/walletService";
import useModalA11y from "../../hooks/useModalA11y";

function BuyTicketForm({
  onClose,
  onSuccess,
  onGoToTopup,
  onBusyChange,
  vehicles,
  ticketTypes,
  walletBalance,
  preselectedVehicleCode,
}) {
  const defaultVehicleCode = useMemo(() => {
    if (preselectedVehicleCode && vehicles.some((v) => v.code === preselectedVehicleCode)) {
      return preselectedVehicleCode;
    }
    return vehicles[0]?.code || "";
  }, [vehicles, preselectedVehicleCode]);

  const [selectedVehicleCode, setSelectedVehicleCode] = useState(defaultVehicleCode);
  const [selectedTicketTypeCode, setSelectedTicketTypeCode] = useState(() => ticketTypes[0]?.code || "");
  const [effectiveFrom, setEffectiveFrom] = useState(() => getLocalDateIso());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState("");

  // Reuse the same idempotency key for identical selection retries so double-clicks cannot double-charge.
  const idempotencyKeyRef = useRef(generateIdempotencyKey("buy-ticket"));

  const activeVehicleCode = selectedVehicleCode || defaultVehicleCode;
  const activeTicketType =
    ticketTypes.find((t) => t.code === selectedTicketTypeCode) || ticketTypes[0] || null;

  const price = Number(activeTicketType?.default_price ?? 0);
  const missingAmount = Math.max(0, Math.ceil(price - Number(walletBalance)));
  const isBalanceSufficient = Number(walletBalance) >= price;
  const remainingBalance = Number(walletBalance) - price;
  const isInsufficientError =
    errorCode === "PROP-WALLET-INSUFFICIENT" || /không đủ/i.test(errorMsg);

  const resetIdempotencyKey = () => {
    idempotencyKeyRef.current = generateIdempotencyKey("buy-ticket");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeVehicleCode) {
      setErrorMsg("Bạn cần đăng ký ít nhất một phương tiện trước khi mua vé.");
      setErrorCode("");
      return;
    }
    if (!activeTicketType) {
      setErrorMsg("Không tìm thấy gói vé khả dụng từ hệ thống.");
      setErrorCode("");
      return;
    }
    if (!isBalanceSufficient) {
      setErrorMsg("Số dư ví không đủ để thanh toán gói vé này. Vui lòng nạp thêm tiền vào ví.");
      setErrorCode("PROP-WALLET-INSUFFICIENT");
      return;
    }

    setIsSubmitting(true);
    onBusyChange?.(true);
    setErrorMsg("");
    setErrorCode("");
    try {
      const result = await walletService.buyMyTicket({
        vehicleCode: activeVehicleCode,
        ticketTypeCode: activeTicketType.code,
        idempotencyKey: idempotencyKeyRef.current,
        effectiveFrom: buildEffectiveFromIso(effectiveFrom),
        notes,
      });
      resetIdempotencyKey();
      await onSuccess(result);
      onClose();
    } catch (err) {
      const info = extractApiErrorInfo(err, "Mua vé thất bại. Vui lòng thử lại.");
      setErrorMsg(info.message);
      setErrorCode(info.code || "");
      if (info.status && info.status >= 400 && info.status < 500) {
        resetIdempotencyKey();
      }
    } finally {
      setIsSubmitting(false);
      onBusyChange?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
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
              const isSelected = v.code === activeVehicleCode;
              const typeName = v.vehicle_type_name || v.vehicle_type?.name || "Ô tô";
              const hasActiveTicket =
                v.current_ticket &&
                String(v.current_ticket.status || "").toUpperCase() === "ACTIVE";
              return (
                <button
                  key={v.code || v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVehicleCode(v.code);
                    resetIdempotencyKey();
                    setErrorMsg("");
                    setErrorCode("");
                  }}
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
                        {typeName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {[v.brand, v.model_name].filter(Boolean).join(" ") || v.code}
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

      {/* Bước 2: Chọn hạn mức gói vé */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          2. Chọn hạn mức gói vé <span className="text-rose-500">*</span>
        </label>
        {ticketTypes.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Hiện chưa có gói vé khả dụng.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ticketTypes.map((plan) => {
              const isSelected = activeTicketType?.code === plan.code;
              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => {
                    setSelectedTicketTypeCode(plan.code);
                    resetIdempotencyKey();
                    setErrorMsg("");
                    setErrorCode("");
                  }}
                  className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className={`block text-xs font-bold ${isSelected ? "text-blue-700" : "text-slate-900"}`}>
                      {plan.name}
                    </span>
                    <span className="block font-mono font-extrabold text-base text-slate-900 mt-1">
                      {formatCurrencyVND(plan.default_price)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Hiệu lực {plan.duration_days} ngày
                    {plan.description ? ` · ${plan.description}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bước 3: Ngày bắt đầu & Ghi chú */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="effectiveFrom" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Ngày bắt đầu hiệu lực
          </label>
          <input
            type="date"
            id="effectiveFrom"
            min={getLocalDateIso()}
            value={effectiveFrom}
            onChange={(e) => {
              setEffectiveFrom(e.target.value);
              resetIdempotencyKey();
              setErrorMsg("");
              setErrorCode("");
            }}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="ticketNotes" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Ghi chú
          </label>
          <input
            type="text"
            id="ticketNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú đơn vé (tùy chọn)..."
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tóm tắt chi phí */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
        <div className="flex justify-between text-slate-500">
          <span>Hình thức thanh toán:</span>
          <span className="font-semibold text-slate-800">Ví Smart Parking (WALLET)</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Số dư ví hiện tại:</span>
          <span className="font-mono font-bold text-slate-800">{formatCurrencyVND(walletBalance)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Số dư dự kiến sau thanh toán:</span>
          <span
            className={`font-mono font-bold ${
              isBalanceSufficient ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {formatCurrencyVND(remainingBalance)}
          </span>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t border-slate-200/70">
          <span className="font-bold text-slate-800">Tổng thanh toán:</span>
          <span className="font-mono text-lg font-extrabold text-blue-600">
            {formatCurrencyVND(price)}
          </span>
        </div>

        {!isBalanceSufficient && activeTicketType && (
          <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-rose-600">
            <span className="text-[11px] font-medium">
              Số dư ví không đủ (thiếu {formatCurrencyVND(price - Number(walletBalance))}).
            </span>
            {onGoToTopup && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToTopup(missingAmount);
                }}
                className="min-h-[44px] inline-flex items-center text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Nạp tiền vào ví ngay
              </button>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
          <span>{errorMsg}</span>
          {isInsufficientError && onGoToTopup && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToTopup(missingAmount);
              }}
              className="min-h-[44px] inline-flex items-center text-xs font-semibold text-blue-600 hover:underline cursor-pointer whitespace-nowrap"
            >
              Nạp tiền vào ví ngay
            </button>
          )}
        </div>
      )}

      {/* Footer Modal */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
        >
          Đóng
        </button>
        <button
          type="submit"
          disabled={
            isSubmitting ||
            !activeVehicleCode ||
            !activeTicketType ||
            !isBalanceSufficient
          }
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          {isSubmitting && (
            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          <span>{isSubmitting ? "Đang thanh toán..." : "Xác nhận mua vé"}</span>
        </button>
      </div>
    </form>
  );
}

export default function CustomerBuyTicketModal({
  isOpen,
  onClose,
  onSuccess,
  onGoToTopup,
  vehicles = [],
  ticketTypes = [],
  walletBalance = 0,
  preselectedVehicleCode = "",
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose?.();
  };

  const { titleId, dialogProps } = useModalA11y({
    isOpen,
    onClose: handleClose,
    isBusy: isSubmitting,
  });

  if (!isOpen) return null;

  return (
    <div
      {...dialogProps}
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
              <h3 id={titleId} className="text-base font-bold text-slate-900">Đăng ký &amp; Mua vé đỗ xe</h3>
              <p className="text-xs text-slate-500">Chọn phương tiện và gói thời hạn phù hợp</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <BuyTicketForm
          key={`${preselectedVehicleCode || "auto"}-${vehicles.length}-${ticketTypes.length}`}
          onClose={onClose}
          onSuccess={onSuccess}
          onGoToTopup={onGoToTopup}
          onBusyChange={setIsSubmitting}
          vehicles={vehicles}
          ticketTypes={ticketTypes}
          walletBalance={walletBalance}
          preselectedVehicleCode={preselectedVehicleCode}
        />
      </div>
    </div>
  );
}
