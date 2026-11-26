import { isVehicleTicketActive } from "../../../utils/parking/plateScanMapper.js";
import { formatDateVN } from "../../../utils/formatDateTime.js";

/**
 * VehicleMatchedInfoCard
 * Card thông tin phương tiện chuẩn hóa hiển thị 6 trường thông tin cốt lõi (Phương án B):
 * 1. Tên xe (model)
 * 2. Hãng xe (brand)
 * 3. Tên khách hàng (customer.name)
 * 4. Số điện thoại (customer.phone)
 * 5. Loại vé (ticketType / ticketExpiration / ticketStatus)
 * 6. Vị trí đỗ (parkingSlot.display / slotCode)
 * Kèm theo huy hiệu loại vé và chỉ số độ tin cậy AI thực tế.
 */
export default function VehicleMatchedInfoCard({
  matchedVehicle,
  scanDetails,
  hasValidTicket = false,
  title = "Thông tin phương tiện",
}) {
  const modelName = matchedVehicle?.model || matchedVehicle?.model_name || "—";
  const brandName = matchedVehicle?.brand || "—";
  const customerName =
    matchedVehicle?.customer?.name || matchedVehicle?.customerName || "Khách vãng lai";
  const customerPhone =
    matchedVehicle?.customer?.phone || matchedVehicle?.customerPhone || "—";
  const slotDisplay =
    matchedVehicle?.parkingSlot?.display ||
    matchedVehicle?.parkingSlot?.slot ||
    matchedVehicle?.slotCode ||
    "Chưa có vị trí";
  const hasAssignedSlot = Boolean(matchedVehicle?.parkingSlot?.display);

  const hasRecognizedPlate = Boolean(
    matchedVehicle &&
    (matchedVehicle.licensePlate || matchedVehicle.license_plate) &&
    matchedVehicle.licensePlate !== "—" &&
    matchedVehicle.license_plate !== "—"
  );

  const isTicketActive = hasRecognizedPlate && isVehicleTicketActive(matchedVehicle, hasValidTicket);

  const rawTicketType =
    matchedVehicle?.ticket?.ticket_type_name ||
    matchedVehicle?.ticketType ||
    matchedVehicle?.ticket?.type ||
    "";

  const displayTicketType = (() => {
    if (!hasRecognizedPlate) {
      return "—";
    }
    if (!rawTicketType || rawTicketType === "—") {
      return isTicketActive ? "Vé tháng" : "Vé lượt";
    }
    const upper = String(rawTicketType).trim().toUpperCase();
    if (upper === "MONTHLY") return "Vé tháng";
    if (upper === "DAILY") return "Vé lượt";
    if (upper === "QUARTERLY") return "Vé quý";
    if (upper === "YEARLY") return "Vé năm";
    return String(rawTicketType).trim();
  })();

  const rawExpiration =
    matchedVehicle?.ticketExpiration ||
    matchedVehicle?.ticket?.effectiveTo ||
    matchedVehicle?.ticket?.effective_to ||
    null;

  const ticketExpiration = rawExpiration
    ? formatDateVN(rawExpiration, "") || null
    : null;

  const isTicketExpired =
    matchedVehicle?.ticketStatus === "expired" ||
    matchedVehicle?.ticket?.status === "expired" ||
    matchedVehicle?.ticket?.is_expired === true;

  const rawConfidence = scanDetails?.confidence;
  const formattedConfidence = (() => {
    if (rawConfidence === null || rawConfidence === undefined || rawConfidence === "") {
      return null;
    }
    const num = Number(rawConfidence);
    if (Number.isNaN(num)) return null;
    const val = num <= 1.0 ? num * 100 : num;
    return `${Math.round(val * 10) / 10}%`;
  })();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs">
      {/* Header card: Tiêu đề + Huy hiệu vé + Độ tin cậy */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          {scanDetails?.source && (
            <span className="px-1.5 py-0.2 rounded text-4xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {scanDetails.source === "image" ? "🖼️ Từ ảnh" : "📷 Từ camera"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {formattedConfidence && (
            <span
              className="px-2 py-0.5 rounded text-3xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono"
              title="Độ tin cậy nhận diện AI"
            >
              AI: {formattedConfidence}
            </span>
          )}
          {hasRecognizedPlate ? (
            isTicketActive ? (
              <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                📱 Xe liên kết Ví App
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                Vé lượt vãng lai
              </span>
            )
          ) : (
            <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
              Chưa nhận diện xe
            </span>
          )}
        </div>
      </div>

      {/* Grid 6 trường thông tin */}
      <div className="grid grid-cols-2 gap-2 text-2xs">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-slate-400 block text-3xs">Tên xe</span>
          <span className="font-semibold text-slate-800 truncate block" title={modelName}>
            {modelName}
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-slate-400 block text-3xs">Hãng xe</span>
          <span className="font-semibold text-slate-800 truncate block" title={brandName}>
            {brandName}
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-slate-400 block text-3xs">Tên khách hàng</span>
          <span className="font-semibold text-slate-800 truncate block" title={customerName}>
            {customerName}
          </span>
        </div>

        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-slate-400 block text-3xs">Số điện thoại</span>
          <span className="font-semibold font-mono text-slate-800 truncate block" title={customerPhone}>
            {customerPhone}
          </span>
        </div>

        {/* Ô 5: Loại vé & Hiệu lực */}
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-slate-400 block text-3xs">Loại vé</span>
            {isTicketExpired ? (
              <span className="px-1.5 py-0.2 rounded text-4xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                Hết hạn
              </span>
            ) : isTicketActive ? (
              <span className="px-1.5 py-0.2 rounded text-4xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Hiệu lực
              </span>
            ) : null}
          </div>
          <div className="mt-0.5">
            <span className="font-semibold text-slate-800 truncate block text-2xs" title={displayTicketType}>
              {displayTicketType}
              {matchedVehicle?.ticket?.code || matchedVehicle?.ticketCode ? (
                <span className="text-3xs font-mono text-emerald-700 font-normal ml-1">
                  ({matchedVehicle?.ticket?.code || matchedVehicle?.ticketCode})
                </span>
              ) : null}
            </span>
            {ticketExpiration && (
              <span className="text-3xs text-slate-500 font-mono block truncate" title={`Hạn dùng: ${ticketExpiration}`}>
                Hạn: {ticketExpiration}
              </span>
            )}
          </div>
        </div>

        {/* Ô 6: Vị trí đỗ */}
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-slate-400 block text-3xs">Vị trí đỗ</span>
            {hasAssignedSlot && (
              <span className="px-1.5 py-0.2 rounded text-4xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Đã gán ô
              </span>
            )}
          </div>
          <div className="mt-0.5">
            <span className="font-semibold text-slate-800 truncate block text-2xs" title={slotDisplay}>
              {slotDisplay}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
