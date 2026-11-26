import VehicleMatchedInfoCard from "./VehicleMatchedInfoCard";
import ParkingSlotPicker from "../../common/parking/ParkingSlotPicker";
import QrCodeSvg from "../../common/QrCodeSvg";

function formatCountdownMMSS(totalSeconds) {
  const safeSec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * EntryLanePanel
 * Component điều khiển Làn Vào (Check-in):
 * - Hiển thị biển số nhận diện, độ tin cậy AI
 * - Thông tin xe đăng ký & khách hàng
 * - Trạng thái chờ khách đăng ký 15 phút kèm đếm ngược MM:SS và mã QR (D7)
 * - Chọn ô đỗ khả dụng / ô đã gán
 * - Cảnh báo xe blacklist / cảnh báo phiên gửi cũ bị treo
 * - Nút bấm xác nhận xe vào & mở barrier
 */
export default function EntryLanePanel({
  detectedPlate,
  matchedVehicle,
  scanDetails,
  availableSlots = [],
  selectedSlotId,
  setSelectedSlotId,
  isLoadingSlots,
  isBlacklisted,
  hasValidTicket,
  hasOpenSession,
  isActionPending,
  onConfirmEntry,
  onForceCloseSession,
  pendingEntryInfo = null,
  pendingRemainingSeconds = 0,
  quickRegisterUrl = "",
}) {
  const progressPercent = Math.min(
    100,
    Math.max(0, (Number(pendingRemainingSeconds || 0) / (15 * 60)) * 100)
  );
  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Blacklist Alert */}
      {isBlacklisted && (
        <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-300 text-rose-900 flex items-start gap-2">
          <span className="text-base">⛔</span>
          <div>
            <p className="font-bold text-xs uppercase tracking-wide">
              CẢNH BÁO: BIỂN SỐ TRONG DANH SÁCH ĐEN!
            </p>
            <p className="text-rose-700 text-3xs mt-0.5">
              Phương tiện bị hạn chế hoặc có báo cáo vi phạm. Không được phép mở barrier cho vào!
            </p>
          </div>
        </div>
      )}

      {/* Thông tin phương tiện & Khách hàng (5 trường chuẩn hóa) */}
      <VehicleMatchedInfoCard
        matchedVehicle={matchedVehicle}
        scanDetails={scanDetails}
        hasValidTicket={hasValidTicket}
        title="Thông tin phương tiện vào"
      />

      {/* D7: Thẻ chờ khách vãng lai đăng ký (15 phút + QR Code) */}
      {pendingEntryInfo && (
        <div
          data-testid="pending-entry-card"
          className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 shadow-2xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-amber-900">
                Chờ khách đăng ký tài khoản & biển số...
              </p>
              <p className="text-3xs text-amber-800">
                Tự động kiểm tra mỗi 5 giây và mở barrier ngay khi hoàn tất.
              </p>
            </div>
            <span
              data-testid="pending-entry-countdown"
              className="font-mono text-sm font-extrabold text-amber-900 bg-white border border-amber-300 px-2.5 py-1 rounded-lg shrink-0"
            >
              {formatCountdownMMSS(pendingRemainingSeconds)}
            </span>
          </div>

          <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {quickRegisterUrl && (
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <div className="p-1.5 bg-white rounded-lg border border-amber-200 shrink-0">
                <QrCodeSvg value={quickRegisterUrl} size={120} />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
                <p className="text-2xs font-semibold text-slate-800">
                  Quét QR để đăng ký nhanh xe{" "}
                  <span className="font-mono text-blue-700">
                    {pendingEntryInfo.plate || pendingEntryInfo.plateMasked || ""}
                  </span>
                </p>
                <p className="text-3xs text-slate-500 break-all font-mono">
                  {quickRegisterUrl}
                </p>
                <a
                  href={quickRegisterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-3xs font-semibold transition"
                >
                  Mở trang đăng ký ↗
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chọn vị trí ô đỗ */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs flex-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700 text-2xs">
            Vị trí đỗ chỉ định (Check-in)
          </span>
          <span className="text-3xs text-slate-400">
            {isLoadingSlots ? "Đang nạp..." : `${availableSlots.length} ô khả dụng`}
          </span>
        </div>

        {matchedVehicle?.parkingSlot?.display && (
          <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-2xs">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span className="text-slate-700">Ô đăng ký cố định:</span>
            </div>
            <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              {matchedVehicle.parkingSlot.display}
            </span>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-3xs font-medium text-slate-600">
            Chọn ô đỗ thực tế khi vào:
          </label>
          <ParkingSlotPicker
            availableSlots={availableSlots}
            selectedSlotId={selectedSlotId}
            onSelectSlot={(id) => setSelectedSlotId(id)}
            isLoading={isLoadingSlots}
            maxHeight="max-h-[140px]"
            columns="grid-cols-4 sm:grid-cols-6"
          />
        </div>

        {/* Warning open session */}
        {hasOpenSession && (
          <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-3xs text-amber-900 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1 text-amber-800">
                <span>⚠️</span> Xe đang có phiên gửi cũ chưa đóng
              </span>
              <button
                type="button"
                disabled={isActionPending}
                onClick={onForceCloseSession}
                className="px-2.5 py-1 bg-white border border-amber-400 text-amber-800 rounded font-semibold hover:bg-amber-100 transition shadow-2xs cursor-pointer flex items-center gap-1 text-3xs"
              >
                <span>🔍</span> Đối soát & Đóng phiên cũ
              </button>
            </div>
            <p className="text-amber-800/90 leading-relaxed">
              Cần đối soát và đóng phiên cũ trước khi cho xe vào lượt mới nhằm đảm bảo doanh thu và tránh lỗi dữ liệu.
            </p>
          </div>
        )}
      </div>

      {/* Footer Action Button */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
        <span className="text-3xs text-slate-500">
          {hasOpenSession ? "Chờ xử lý phiên cũ của xe" : "Mở barrier cho xe vào"}
        </span>
        <button
          type="button"
          disabled={isActionPending || isBlacklisted || !detectedPlate || hasOpenSession || availableSlots.length === 0}
          onClick={onConfirmEntry}
          className="px-4 py-2 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isActionPending ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : hasOpenSession ? (
            <span>⛔ Vui lòng đóng phiên cũ trước</span>
          ) : availableSlots.length === 0 ? (
            <span>⛔ Hết chỗ đỗ khả dụng</span>
          ) : (
            <span>✓ Xác nhận Xe Vào & Mở Barrier</span>
          )}
        </button>
      </div>
    </div>
  );
}
