import { LoadingSpinner, EmptyState } from "../common";
import {
  PARKING_HISTORY_MESSAGES,
  PARKING_HISTORY_DEFAULTS,
  getParkingSessionStatus,
} from "../../constants/parkingHistoryConstants";
import { parseAuditNotes } from "../../constants/abnormalSessionConstants";
import ParkingSessionThumbnail from "./ParkingSessionThumbnail";
import VehicleTicketTypeBadge from "../VehicleManagement/VehicleTicketTypeBadge";
import { formatLicensePlateForDisplay } from "../../utils/plateFormatter";
import { formatCurrencyVND } from "../../constants/paymentConstants";
import { formatDateTimeVN } from "../../utils/formatDateTime";

function getDisplayTicketType(item) {
  const raw = item?.ticketType || item?.ticket_type_name || item?.ticket_type;
  if (!raw || raw === "—") {
    return item?.hasActiveTicket ? "Vé tháng" : "Vé lượt";
  }
  const upper = String(raw).trim().toUpperCase();
  if (upper === "DAILY") return "Vé lượt";
  if (upper === "MONTHLY") return "Vé tháng";
  if (upper === "QUARTERLY") return "Vé quý";
  if (upper === "YEARLY") return "Vé năm";
  return String(raw).trim();
}

export default function ParkingHistoryTable({
  items,
  isLoading,
  loadError,
  onOpenCloseSessionModal,
  onPreviewImage,
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1240px]">
        {/* Table Header */}
        <div className="bg-[#F1F5F9]/80 rounded-xl px-4 py-3 grid grid-cols-12 gap-3 text-xs font-semibold text-slate-600 items-center">
          <div className="col-span-1">Mã phiên</div>
          <div className="col-span-1">Biển số xe</div>
          <div className="col-span-1">Loại vé</div>
          <div className="col-span-2">Thời gian vào</div>
          <div className="col-span-2">Thời gian ra</div>
          <div className="col-span-1">Thời gian đỗ</div>
          <div className="col-span-1">Tình trạng</div>
          <div className="col-span-1">Cước phí</div>
          <div className="col-span-1 flex justify-center">Hình ảnh</div>
          <div className="col-span-1">Ghi chú</div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <LoadingSpinner label={PARKING_HISTORY_MESSAGES.LOADING_TEXT} />
          </div>
        ) : loadError ? (
          <div className="rounded-xl bg-red-50 px-4 py-8 text-center text-sm text-red-700">
            {loadError}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={PARKING_HISTORY_MESSAGES.EMPTY_TITLE}
            description={PARKING_HISTORY_MESSAGES.EMPTY_DESC}
          />
        ) : (
          <div className="divide-y divide-slate-100 mt-1">
            {items.map((item) => {
              const statusInfo = getParkingSessionStatus(item);
              const isOngoing = statusInfo.key === "in_progress";
              const formattedExitTime =
                item.exitTime && item.exitTime !== PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT
                  ? item.exitTime
                  : PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT;
              const displayTicketType = getDisplayTicketType(item);
              const auditInfo = parseAuditNotes(item.notes || item.feeBreakdown || "");

              return (
                <div
                  key={item.id}
                  className="px-4 py-3.5 grid grid-cols-12 gap-3 items-center text-xs text-slate-700 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="col-span-1 font-medium text-slate-900 truncate" title={item.sessionCode || item.session_code}>
                    {item.sessionCode || item.session_code}
                  </div>
                  <div className="col-span-1 font-semibold text-blue-600 font-mono tracking-wide">
                    {formatLicensePlateForDisplay(item.licensePlate || item.license_plate)}
                  </div>
                  <div className="col-span-1">
                    <VehicleTicketTypeBadge ticketType={displayTicketType} />
                  </div>
                  <div className="col-span-1 text-slate-600">
                    {item.entryTime ||
                      (item.entry_time
                        ? formatDateTimeVN(item.entry_time, PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT)
                        : PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT)}
                  </div>
                  <div className="col-span-2 text-slate-600">{formattedExitTime}</div>
                  <div className="col-span-1 text-slate-600">
                    {item.duration || item.duration_text || PARKING_HISTORY_DEFAULTS.PLACEHOLDER_TEXT}
                  </div>
                  <div className="col-span-1">
                    {isOngoing ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusInfo.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusInfo.dotClass} animate-pulse`}
                            aria-hidden="true"
                          />
                          {statusInfo.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenCloseSessionModal(item)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 cursor-pointer transition-colors shadow-2xs"
                          title="Đóng hoặc đồng bộ kết thúc phiên đỗ này"
                        >
                          Kết thúc
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.badgeClass}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusInfo.dotClass}`}
                          aria-hidden="true"
                        />
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-between items-center">
                    <div className="flex flex-col">
                      {isOngoing && item.estimatedFee ? (
                        <>
                          <span
                            className="font-semibold text-amber-700"
                            title={`Tạm tính dựa trên thời gian đỗ thực tế: ${item.estimatedFee.calculationBreakdown}`}
                          >
                            ~{item.estimatedFee.feeFormatted}
                          </span>
                          <span className="text-[10px] text-amber-600/80">
                            {item.estimatedFee.hasPackageCoverage && item.estimatedFee.overageHours > 0
                              ? "(Tạm tính vượt hạn)"
                              : item.estimatedFee.isCapped
                              ? "(Đã áp trần)"
                              : "(Tạm tính)"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-emerald-600">
                            {item.fee || (item.fee_amount !== undefined && item.fee_amount !== null ? formatCurrencyVND(item.fee_amount) : "0đ")}
                          </span>
                          {item.paymentMethod && (
                            <span className="text-[10px] font-medium text-slate-500">
                              {item.paymentMethod === "WALLET"
                                ? "Ví khách hàng (WALLET)"
                                : item.paymentMethod === "VIETQR"
                                ? "Chuyển khoản (VIETQR)"
                                : item.paymentMethod === "CASH"
                                ? "Tiền mặt (CASH)"
                                : item.paymentMethod}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <ParkingSessionThumbnail item={item} onPreview={onPreviewImage} />
                  </div>
                  {/* Cột Ghi chú / Đối soát ở cuối bảng */}
                  <div className="col-span-1 text-slate-600">
                    {auditInfo.isAudited ? (
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs cursor-help"
                          title={`[Kiểm toán]: ${auditInfo.reasonLabel || auditInfo.reasonCode || "Xử lý bất thường"}\nNgười duyệt: ${auditInfo.approverName || "—"}\nNgười xử lý: ${auditInfo.actorName || "—"}${auditInfo.detail ? `\nChi tiết: ${auditInfo.detail}` : ""}`}
                        >
                          📋 {auditInfo.reasonLabel || "Bất thường"}
                        </span>
                        {auditInfo.detail && (
                          <span className="text-[10px] text-slate-500 line-clamp-2" title={auditInfo.detail}>
                            {auditInfo.detail}
                          </span>
                        )}
                      </div>
                    ) : item.notes ? (
                      <span className="text-[11px] text-slate-600 line-clamp-2 hover:line-clamp-none transition-all cursor-default" title={item.notes}>
                        {item.notes}
                      </span>
                    ) : (item.isWaived || item.waiveFee) ? (
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300"
                        title={item.waiverReason ? `Lý do: ${item.waiverReason}` : "Miễn cước đặc cách"}
                      >
                        Miễn cước
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
