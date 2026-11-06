import VehicleMatchedInfoCard from "./VehicleMatchedInfoCard";

const UNKNOWN_ENTRY_TIME_LABEL = "Chưa rõ giờ vào";

/**
 * ExitLanePanel
 * Component điều khiển Làn Ra (Check-out):
 * - Đối soát phiên đỗ, thời gian vào/ra, tổng thời lượng
 * - Tính toán biểu phí gửi xe thời gian thực
 * - Lựa chọn thanh toán tiền mặt / VietQR Napas 247
 * - Nút bấm xác nhận thanh toán & mở barrier ra bãi
 */
export default function ExitLanePanel({
  detectedPlate,
  matchedVehicle,
  rawLookup,
  scanDetails,
  exitFeeCalc,
  calculatedDurationMinutes,
  isFeeExempt,
  setIsFeeExempt,
  paymentMethod,
  setPaymentMethod,
  isActionPending,
  onConfirmExit,
  hasValidTicket = false,
}) {
  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Thông tin phương tiện đối soát (5 trường chuẩn hóa) */}
      <VehicleMatchedInfoCard
        matchedVehicle={matchedVehicle}
        scanDetails={scanDetails}
        hasValidTicket={hasValidTicket}
        title="Thông tin phương tiện ra"
      />

      {/* Thời gian đỗ & Thông tin phiên */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
        <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block">
          Thông tin phiên gửi đối soát
        </span>

        <div className="grid grid-cols-3 gap-2 text-2xs bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div>
            <span className="text-slate-400 block text-3xs">Giờ vào</span>
            <span className="font-mono font-bold text-slate-800">
              {rawLookup?.open_session?.entry_time
                ? new Date(rawLookup.open_session.entry_time).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : UNKNOWN_ENTRY_TIME_LABEL}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-3xs">Giờ ra</span>
            <span className="font-mono font-bold text-slate-800">
              {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-3xs">Thời lượng</span>
            <span className="font-bold text-blue-700">
              {rawLookup?.open_session?.entry_time && calculatedDurationMinutes > 0
                ? Math.floor(calculatedDurationMinutes / 60) > 0
                  ? `${Math.floor(calculatedDurationMinutes / 60)}h ${calculatedDurationMinutes % 60}m`
                  : `${calculatedDurationMinutes % 60}m`
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Biểu phí & Thanh toán */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs flex-1">
        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-700 block text-2xs font-semibold">
                Phí gửi xe phải thu
              </span>
              <span className="text-3xs text-slate-500">
                {exitFeeCalc.calculationBreakdown}
              </span>
            </div>
            <span className="text-base sm:text-lg font-bold text-blue-700 font-mono">
              {exitFeeCalc.feeFormatted}
            </span>
          </div>

          <label className="flex items-center gap-1.5 pt-1.5 border-t border-blue-100 cursor-pointer select-none text-3xs text-slate-600 hover:text-slate-900">
            <input
              type="checkbox"
              checked={isFeeExempt}
              onChange={(e) => setIsFeeExempt(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
            />
            <span>Miễn cước đặc cách (Sự cố camera / Xe vé tháng)</span>
          </label>
        </div>

        {/* Lựa chọn hình thức thanh toán khi có phí */}
        {exitFeeCalc.feeAmount > 0 && !isFeeExempt && (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-3xs font-medium text-slate-600">Hình thức thanh toán:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-3xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`px-2.5 py-1 font-semibold rounded-md transition-all ${
                    paymentMethod === "CASH"
                      ? "bg-white text-blue-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  💵 Tiền mặt
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("VIETQR")}
                  className={`px-2.5 py-1 font-semibold rounded-md transition-all ${
                    paymentMethod === "VIETQR"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  📱 VietQR
                </button>
              </div>
            </div>

            {paymentMethod === "VIETQR" && (
              <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-3">
                <img
                  src={`https://img.vietqr.io/image/970422-0987654321-compact2.png?amount=${exitFeeCalc.feeAmount}&addInfo=${encodeURIComponent(`PK ${detectedPlate || matchedVehicle?.licensePlate || "OTO"}`)}&accountName=${encodeURIComponent("BAI XE SMART MOBILITY")}`}
                  alt="Mã VietQR"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-md bg-white border border-indigo-200 shrink-0"
                  loading="lazy"
                />
                <div className="text-3xs text-slate-600 space-y-0.5">
                  <div className="font-bold text-indigo-900 text-2xs">VietQR Napas 247</div>
                  <div>
                    Số tiền:{" "}
                    <span className="font-bold font-mono text-indigo-700">{exitFeeCalc.feeFormatted}</span>
                  </div>
                  <div className="text-slate-400">Tài xế quét qua app ngân hàng để thanh toán</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Action Button */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
        <span className="text-3xs text-slate-500">
          {exitFeeCalc.feeAmount === 0 || isFeeExempt
            ? "Đủ điều kiện mở barrier"
            : paymentMethod === "VIETQR"
              ? "Xác nhận đã nhận QR"
              : "Thu tiền mặt & mở barrier"}
        </span>
        <button
          type="button"
          disabled={isActionPending || !detectedPlate}
          onClick={onConfirmExit}
          className={`px-4 py-2 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 ${
            exitFeeCalc.feeAmount === 0 || isFeeExempt
              ? "bg-emerald-600 hover:bg-emerald-700"
              : paymentMethod === "VIETQR"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-blue-600 hover:bg-blue-700"
          } disabled:opacity-50`}
        >
          {isActionPending ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : exitFeeCalc.feeAmount === 0 || isFeeExempt ? (
            <span>✓ Xác nhận Miễn Phí & Mở Barrier</span>
          ) : paymentMethod === "VIETQR" ? (
            <span>✓ Đã Nhận QR & Mở Barrier</span>
          ) : (
            <span>✓ Đã Thu Tiền & Mở Barrier</span>
          )}
        </button>
      </div>
    </div>
  );
}
