import VehicleMatchedInfoCard from "./VehicleMatchedInfoCard";

/**
 * EntryLanePanel
 * Component điều khiển Làn Vào (Check-in):
 * - Hiển thị biển số nhận diện, độ tin cậy AI
 * - Thông tin xe đăng ký & khách hàng
 * - Chọn ô đỗ khả dụng / ô đã gán
 * - Cảnh báo xe blacklist / cảnh báo phiên gửi cũ bị treo
 * - Nút bấm xác nhận xe vào & mở barrier
 */
export default function EntryLanePanel({
  detectedPlate,
  setDetectedPlate,
  matchedVehicle,
  rawLookup,
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
  onSwitchToExit,
}) {
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
          <label className="block text-3xs text-slate-500">
            Chọn ô đỗ thực tế khi vào:
          </label>
          <select
            value={selectedSlotId || ""}
            onChange={(e) => setSelectedSlotId(e.target.value ? Number(e.target.value) : null)}
            className="w-full text-2xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {availableSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.floor} • {slot.zone} • {slot.code} ({slot.kind || "Xe tiêu chuẩn"})
              </option>
            ))}
          </select>
        </div>

        {/* Warning open session */}
        {hasOpenSession && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-3xs text-amber-900 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold">⚠️ Xe đang có phiên gửi cũ chưa đóng</span>
              <button
                type="button"
                disabled={isActionPending}
                onClick={onForceCloseSession}
                className="px-2 py-0.5 bg-white border border-amber-300 text-amber-800 rounded font-semibold hover:bg-amber-100 transition shadow-2xs"
              >
                Đóng phiên cũ
              </button>
            </div>
            <p className="text-amber-700">
              Có thể bấm nút bên dưới để đóng tự động và mở lượt vào mới.
            </p>
          </div>
        )}
      </div>

      {/* Footer Action Button */}
      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
        <span className="text-3xs text-slate-500">
          {hasOpenSession ? "Đóng phiên cũ & Check-in" : "Mở barrier cho xe vào"}
        </span>
        <button
          type="button"
          disabled={isActionPending || isBlacklisted || !detectedPlate}
          onClick={onConfirmEntry}
          className={`px-4 py-2 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 ${
            hasOpenSession
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          } disabled:opacity-50`}
        >
          {isActionPending ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : hasOpenSession ? (
            <span>⚡ Đóng phiên cũ & Check-in Vào</span>
          ) : (
            <span>✓ Xác nhận Xe Vào & Mở Barrier</span>
          )}
        </button>
      </div>
    </div>
  );
}
