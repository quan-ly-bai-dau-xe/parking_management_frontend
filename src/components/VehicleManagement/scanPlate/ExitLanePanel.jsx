import VehicleMatchedInfoCard from "./VehicleMatchedInfoCard";

const UNKNOWN_ENTRY_TIME_LABEL = "Chưa rõ giờ vào";

/**
 * ExitLanePanel
 * Component điều khiển Làn Ra (Check-out):
 * - Đối soát phiên đỗ, thời gian vào/ra, tổng thời lượng (dựa trên backend fee preview)
 * - Hiển thị cước phí thực tế từ Backend (Single Source of Truth)
 * - Miễn cước đặc cách (bắt buộc lý do, phân quyền Quản lý / MANAGER)
 * - Lựa chọn thanh toán tiền mặt / VietQR Napas 247
 * - Nút bấm xác nhận thanh toán & mở barrier ra bãi
 */
export default function ExitLanePanel({
  detectedPlate,
  matchedVehicle,
  rawLookup,
  scanDetails,
  calculatedDurationMinutes,
  backendFeePreview = null,
  isLoadingFeePreview = false,
  isFeeExempt = false,
  setIsFeeExempt,
  waiverReason = "",
  setWaiverReason,
  currentUserRole = null,
  paymentMethod = "CASH",
  setPaymentMethod,
  isActionPending = false,
  onConfirmExit,
  hasValidTicket = false,
}) {
  const isManager = Boolean(
    currentUserRole &&
      (String(currentUserRole).toUpperCase().includes("MANAGER") ||
        String(currentUserRole).toLowerCase().includes("quản lý") ||
        currentUserRole === "ADMIN")
  );

  const isTicketActive = Boolean(
    backendFeePreview?.has_active_ticket ||
    backendFeePreview?.is_exempt ||
    hasValidTicket
  );

  // Cước phí và nhãn hiển thị dựa hoàn toàn trên Backend Fee Preview (Single Source of Truth per Rule 12)
  let displayFeeText = "—";
  let displayFeeAmount = 0;
  let isZeroFee = false;

  if (isFeeExempt) {
    displayFeeText = "0đ (Miễn cước đặc cách)";
    displayFeeAmount = 0;
    isZeroFee = true;
  } else if (isTicketActive) {
    displayFeeText = "0đ (Vé tháng có hiệu lực)";
    displayFeeAmount = 0;
    isZeroFee = true;
  } else if (backendFeePreview?.fee_amount !== undefined) {
    displayFeeAmount = Number(backendFeePreview.fee_amount);
    displayFeeText = `${new Intl.NumberFormat("vi-VN").format(displayFeeAmount)}đ`;
    isZeroFee = displayFeeAmount === 0;
  } else if (isLoadingFeePreview) {
    displayFeeText = "Đang tải cước...";
  }

  // Thời lượng đỗ
  const displayDuration = backendFeePreview?.duration_text
    ? backendFeePreview.duration_text
    : rawLookup?.open_session?.entry_time && calculatedDurationMinutes > 0
    ? Math.floor(calculatedDurationMinutes / 60) > 0
      ? `${Math.floor(calculatedDurationMinutes / 60)}h ${calculatedDurationMinutes % 60}m`
      : `${calculatedDurationMinutes % 60}m`
    : "—";

  // Breakdown cước phí
  const displayBreakdown = isFeeExempt
    ? `Miễn cước đặc cách: ${waiverReason.trim() || "Chưa nhập lý do"}`
    : isTicketActive
    ? "Được đài thọ bởi vé tháng hiệu lực"
    : backendFeePreview
    ? `Thời lượng: ${displayDuration} • Đơn giá: ${backendFeePreview.hourly_rate ? `${new Intl.NumberFormat("vi-VN").format(backendFeePreview.hourly_rate)}đ/giờ` : "—"}`
    : isLoadingFeePreview
    ? "Đang đối soát cước phí với hệ thống..."
    : "—";

  const isWaiverInvalid = isFeeExempt && (!isManager || !waiverReason.trim());
  const isConfirmDisabled =
    isActionPending ||
    !detectedPlate ||
    isWaiverInvalid;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Thông tin phương tiện đối soát (5 trường chuẩn hóa) */}
      <VehicleMatchedInfoCard
        matchedVehicle={matchedVehicle}
        scanDetails={scanDetails}
        hasValidTicket={hasValidTicket}
        title="Thông tin phương tiện ra"
      />

      {/* Cảnh báo Ghost Exit khi không tìm thấy phiên đỗ đang mở */}
      {detectedPlate && !rawLookup?.open_session && !isLoadingFeePreview && (
        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2 text-2xs text-amber-900 shadow-2xs">
          <span className="text-base leading-none">⚠️</span>
          <div>
            <span className="font-bold block">Cảnh báo Ghost Exit (Không tìm thấy phiên vào)</span>
            <span className="text-3xs text-amber-800 leading-relaxed block">
              Phương tiện này không có phiên đỗ đang mở trong bãi. Kiểm tra lại biển số hoặc xác minh thẻ trước khi xử lý ra bãi.
            </span>
          </div>
        </div>
      )}

      {/* Thời gian đỗ & Thông tin phiên */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block">
            Thông tin phiên gửi đối soát
          </span>
          {isLoadingFeePreview && (
            <span className="text-3xs text-blue-600 font-semibold animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              Đang tính cước...
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-2xs bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div>
            <span className="text-slate-400 block text-3xs">Giờ vào</span>
            <span className="font-mono font-bold text-slate-800">
              {backendFeePreview?.entry_time
                ? new Date(backendFeePreview.entry_time).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : rawLookup?.open_session?.entry_time
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
              {displayDuration}
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
                {displayBreakdown}
              </span>
            </div>
            <span
              className={`text-base sm:text-lg font-bold font-mono ${
                isZeroFee ? "text-emerald-700" : "text-blue-700"
              }`}
            >
              {displayFeeText}
            </span>
          </div>

          {/* Checkbox Miễn cước đặc cách */}
          <div className="pt-1.5 border-t border-blue-100 space-y-2">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-3xs text-slate-600 hover:text-slate-900 font-semibold">
              <input
                type="checkbox"
                checked={isFeeExempt}
                onChange={(e) => {
                  if (setIsFeeExempt) setIsFeeExempt(e.target.checked);
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
              />
              <span>Miễn cước đặc cách (Sự cố camera / Xe vé tháng)</span>
            </label>

            {isFeeExempt && (
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-3xs">
                  <span className="font-bold text-amber-900">
                    Lý do miễn cước đặc cách <span className="text-rose-500">*</span>:
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-3xs font-semibold ${
                      isManager
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {isManager ? "Quyền Quản lý (Được duyệt)" : "Nhân viên (Không có quyền)"}
                  </span>
                </div>

                <input
                  type="text"
                  value={waiverReason}
                  onChange={(e) => {
                    if (setWaiverReason) setWaiverReason(e.target.value);
                  }}
                  placeholder="Nhập lý do miễn cước bắt buộc (VD: Lỗi OCR thẻ tháng, khách VIP)..."
                  className="w-full text-2xs bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />

                {!isManager && (
                  <div className="text-3xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 flex items-center gap-1.5">
                    <span>⛔</span>
                    <span>Chỉ Quản lý (Manager) mới có quyền miễn cước phí đỗ xe (PROP-4.5.1-P18). Vui lòng nhờ Quản lý phê duyệt.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lựa chọn hình thức thanh toán khi có phí */}
        {!isZeroFee && (
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
                  src={`https://img.vietqr.io/image/970422-0987654321-compact2.png?amount=${displayFeeAmount}&addInfo=${encodeURIComponent(`PK ${detectedPlate || matchedVehicle?.licensePlate || "OTO"}`)}&accountName=${encodeURIComponent("BAI XE SMART MOBILITY")}`}
                  alt="Mã VietQR"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-md bg-white border border-indigo-200 shrink-0"
                  loading="lazy"
                />
                <div className="text-3xs text-slate-600 space-y-0.5">
                  <div className="font-bold text-indigo-900 text-2xs">VietQR Napas 247</div>
                  <div>
                    Số tiền:{" "}
                    <span className="font-bold font-mono text-indigo-700">{displayFeeText}</span>
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
          {isFeeExempt
            ? isManager
              ? waiverReason.trim()
                ? "Đủ điều kiện miễn cước"
                : "Vui lòng nhập lý do miễn cước"
              : "Yêu cầu quyền Quản lý"
            : isZeroFee
            ? "Đủ điều kiện mở barrier"
            : paymentMethod === "VIETQR"
              ? "Xác nhận đã nhận QR"
              : "Thu tiền mặt & mở barrier"}
        </span>
        <button
          type="button"
          disabled={isConfirmDisabled}
          onClick={onConfirmExit}
          className={`px-4 py-2 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 ${
            isFeeExempt
              ? isManager && waiverReason.trim()
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-slate-400 cursor-not-allowed"
              : isZeroFee
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
          ) : isFeeExempt ? (
            <span>
              {isManager
                ? "✓ Xác nhận Miễn Phí & Mở Barrier"
                : "⛔ Cần Quản lý để Miễn Phí"}
            </span>
          ) : isZeroFee ? (
            <span>✓ Xác nhận Mở Barrier (0đ)</span>
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
