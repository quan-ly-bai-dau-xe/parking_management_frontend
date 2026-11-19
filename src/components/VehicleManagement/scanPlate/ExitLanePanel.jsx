import VehicleMatchedInfoCard from "./VehicleMatchedInfoCard";
import {
  PAYMENT_METHODS,
  WALLET_CONFIG,
  formatCurrencyVND,
} from "../../../constants/paymentConstants.js";
import { checkIsManager } from "../../../constants/roleConstants.js";
import { useCurrentUser } from "../../../hooks/useCurrentUser.js";
import { getCustomerWalletBalance } from "../../../services/walletService.js";

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
  exitFeeCalc = null,
  isFeeExempt = false,
  setIsFeeExempt,
  waiverReason = "",
  setWaiverReason,
  currentUserRole = null,
  paymentMethod = PAYMENT_METHODS.VNPAY,
  setPaymentMethod,
  isActionPending = false,
  onConfirmExit,
  hasValidTicket = false,
}) {
  const { role: authUserRole } = useCurrentUser();
  const effectiveRole = currentUserRole ?? authUserRole;
  const isManager = checkIsManager(effectiveRole);

  const isTicketActive = Boolean(
    backendFeePreview?.has_active_ticket ||
    backendFeePreview?.is_exempt ||
    hasValidTicket
  );

  // Cước phí và nhãn hiển thị: Ưu tiên Backend Fee Preview (Single Source of Truth), tự động fallback sang exitFeeCalc
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
  } else if (backendFeePreview?.fee_amount !== undefined && backendFeePreview?.fee_amount !== null) {
    displayFeeAmount = Number(backendFeePreview.fee_amount);
    displayFeeText = formatCurrencyVND(displayFeeAmount);
    isZeroFee = displayFeeAmount === 0;
  } else if (exitFeeCalc?.feeAmount !== undefined && exitFeeCalc?.feeAmount !== null) {
    displayFeeAmount = Number(exitFeeCalc.feeAmount);
    displayFeeText = formatCurrencyVND(displayFeeAmount);
    isZeroFee = displayFeeAmount === 0;
  } else if (isLoadingFeePreview) {
    displayFeeText = "Đang tải cước...";
  }

  // Thời lượng đỗ
  const displayDuration = backendFeePreview?.duration_text
    ? backendFeePreview.duration_text
    : exitFeeCalc?.hoursBilled !== undefined && exitFeeCalc.hoursBilled > 0
    ? `${exitFeeCalc.hoursBilled} giờ`
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
    ? `Thời lượng: ${displayDuration} • Đơn giá: ${backendFeePreview.hourly_rate ? formatCurrencyVND(backendFeePreview.hourly_rate) : "—"}/giờ`
    : exitFeeCalc?.calculationBreakdown
    ? exitFeeCalc.calculationBreakdown
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

        {/* Khung đối soát ảnh vào / ra chống đánh tráo xe/biển số */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-3xs">
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-600 block mb-1">📸 Ảnh lúc Vào (Gốc):</span>
            {rawLookup?.open_session?.entry_image_url || backendFeePreview?.entry_image_url || scanDetails?.imageUrl ? (
              <img
                src={rawLookup?.open_session?.entry_image_url || backendFeePreview?.entry_image_url || scanDetails?.imageUrl}
                alt="Ảnh xe lúc vào"
                className="w-full h-16 object-cover rounded border border-slate-200"
              />
            ) : (
              <div className="w-full h-16 flex items-center justify-center bg-slate-100 text-slate-400 rounded text-4xs">
                Chưa có ảnh vào
              </div>
            )}
          </div>
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-600 block mb-1">📷 Camera lúc Ra (Hiện tại):</span>
            {scanDetails?.imageUrl || (matchedVehicle?.imageUrl?.startsWith("http") ? matchedVehicle.imageUrl : null) ? (
              <img
                src={scanDetails?.imageUrl || matchedVehicle?.imageUrl}
                alt="Ảnh xe lúc ra"
                className="w-full h-16 object-cover rounded border border-slate-200"
              />
            ) : (
              <div className="w-full h-16 flex items-center justify-center bg-emerald-50 text-emerald-700 font-mono rounded text-4xs">
                Camera Live
              </div>
            )}
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
            {/* Phân loại khách hàng: Đã đăng ký App hay Chưa đăng ký App */}
            {(() => {
              const hasAppAccount = Boolean(
                matchedVehicle?.customer?.id ||
                matchedVehicle?.customerId ||
                (matchedVehicle?.customer?.name && matchedVehicle?.customer?.name !== "Khách vãng lai")
              );
              const userWalletBalance = getCustomerWalletBalance({
                customerId: matchedVehicle?.customer?.id || matchedVehicle?.customerId,
                licensePlate: detectedPlate || matchedVehicle?.licensePlate,
              });
              const isWalletSufficient = userWalletBalance >= displayFeeAmount;

              return (
                <div className="space-y-2">
                  {/* Badge phân loại tài khoản App */}
                  <div className={`p-2 rounded-xl border flex items-center justify-between text-3xs ${
                    hasAppAccount
                      ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{hasAppAccount ? "📱" : "👤"}</span>
                      <div>
                        <span className="font-bold block">
                          {hasAppAccount
                            ? `Khách đã đăng ký App: ${matchedVehicle?.customer?.name || "Chủ xe"}`
                            : "Khách vãng lai (Chưa đăng ký App)"}
                        </span>
                        <span className="text-3xs text-slate-500">
                          {hasAppAccount
                            ? `Ví Smart Parking (Mô phỏng): ${formatCurrencyVND(userWalletBalance)}`
                            : "Không có ví trong App • Thanh toán tại quầy"}
                        </span>
                      </div>
                    </div>
                    {hasAppAccount && (
                      <span className={`px-2 py-0.5 rounded-full font-bold text-3xs ${
                        isWalletSufficient
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}>
                        {isWalletSufficient ? "Ví đủ số dư" : "Ví thiếu tiền"}
                      </span>
                    )}
                  </div>

                  {/* Lựa chọn hình thức thanh toán */}
                  <div className="flex items-center justify-between">
                    <span className="text-3xs font-medium text-slate-600">Hình thức thanh toán:</span>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-3xs">
                      {hasAppAccount && (
                        <button
                          type="button"
                          onClick={() => setPaymentMethod(PAYMENT_METHODS.WALLET)}
                          className={`px-2.5 py-1 font-semibold rounded-md transition-all flex items-center gap-1 ${
                            paymentMethod === PAYMENT_METHODS.WALLET
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <span>⚡</span> Trừ Ví App
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod(PAYMENT_METHODS.VNPAY)}
                        className={`px-2.5 py-1 font-semibold rounded-md transition-all flex items-center gap-1 ${
                          paymentMethod === PAYMENT_METHODS.VNPAY || paymentMethod === PAYMENT_METHODS.VIETQR
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span>💳</span> Quẹt Thẻ / VNPAY
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod(PAYMENT_METHODS.CASH)}
                        className={`px-2.5 py-1 font-semibold rounded-md transition-all ${
                          paymentMethod === PAYMENT_METHODS.CASH
                            ? "bg-white text-blue-700 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        💵 Tiền mặt
                      </button>
                    </div>
                  </div>

                  {/* Chi tiết cho từng phương thức */}
                  {paymentMethod === PAYMENT_METHODS.WALLET && hasAppAccount && (
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-3xs space-y-1.5">
                      <div className="flex items-center justify-between font-semibold text-emerald-950">
                        <span>Số dư ví hiện tại:</span>
                        <span className="font-mono">{formatCurrencyVND(userWalletBalance)}</span>
                      </div>
                      <div className="flex items-center justify-between text-rose-700">
                        <span>Trừ cước đỗ xe:</span>
                        <span className="font-mono font-bold">-{displayFeeText}</span>
                      </div>
                      <div className="pt-1 border-t border-emerald-200 flex items-center justify-between font-bold text-emerald-900">
                        <span>Số dư sau khi trừ:</span>
                        <span className="font-mono">
                          {formatCurrencyVND(Math.max(0, userWalletBalance - displayFeeAmount))}
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-700/80 italic">
                        * Lưu ý: Giao dịch trừ ví đang chạy ở chế độ mô phỏng giao diện (Chưa trừ tiền tài khoản ngân hàng thật).
                      </div>
                      {!isWalletSufficient && (
                        <div className="text-amber-900 bg-amber-100 p-2 rounded-lg text-3xs font-medium space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span>⚠️ Số dư ví không đủ trừ toàn bộ:</span>
                            <span>Thiếu {formatCurrencyVND(displayFeeAmount - userWalletBalance)}</span>
                          </div>
                          <div>
                            Hệ thống sẽ trừ hết số dư ví ({formatCurrencyVND(userWalletBalance)}). Phần còn lại ({formatCurrencyVND(displayFeeAmount - userWalletBalance)}) vui lòng thu qua Tiền mặt hoặc VietQR.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(paymentMethod === PAYMENT_METHODS.VNPAY || paymentMethod === PAYMENT_METHODS.VIETQR) && (
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-3">
                      <img
                        src={`https://img.vietqr.io/image/970422-0987654321-compact2.png?amount=${displayFeeAmount}&addInfo=${encodeURIComponent(`PK ${detectedPlate || matchedVehicle?.licensePlate || "OTO"}`)}&accountName=${encodeURIComponent("BAI XE SMART MOBILITY")}`}
                        alt="Mã VNPAY/QR"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-md bg-white border border-indigo-200 shrink-0"
                        loading="lazy"
                      />
                      <div className="text-3xs text-slate-600 space-y-0.5">
                        <div className="font-bold text-indigo-900 text-2xs flex items-center gap-1.5">
                          <span>💳 VNPAY POS / VNPAY-QR</span>
                          <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded text-3xs">Chạm thẻ / Quét mã</span>
                        </div>
                        <div>
                          Số tiền:{" "}
                          <span className="font-bold font-mono text-indigo-700">{displayFeeText}</span>
                        </div>
                        <div className="text-slate-500">Khách chạm thẻ ngân hàng vào máy POS VNPAY hoặc quét mã QR để thanh toán.</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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
            : paymentMethod === PAYMENT_METHODS.WALLET
            ? "Trừ ví app tự động"
            : paymentMethod === PAYMENT_METHODS.VNPAY || paymentMethod === PAYMENT_METHODS.VIETQR
              ? "Quẹt thẻ POS / Quét QR VNPAY"
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
              : paymentMethod === PAYMENT_METHODS.WALLET
              ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
              : paymentMethod === PAYMENT_METHODS.VNPAY || paymentMethod === PAYMENT_METHODS.VIETQR
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
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
          ) : paymentMethod === PAYMENT_METHODS.WALLET ? (
            <span>⚡ Trừ Ví App & Mở Barrier</span>
          ) : paymentMethod === PAYMENT_METHODS.VNPAY || paymentMethod === PAYMENT_METHODS.VIETQR ? (
            <span>💳 Đã Quẹt VNPAY & Mở Barrier</span>
          ) : (
            <span>💵 Đã Thu Tiền Mặt & Mở Barrier</span>
          )}
        </button>
      </div>
    </div>
  );
}
