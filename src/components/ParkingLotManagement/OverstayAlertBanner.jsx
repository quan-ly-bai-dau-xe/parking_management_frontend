import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import Button from "../common/button/Button";

/**
 * Banner cảnh báo ô đỗ xe vi phạm quá giờ (Overstay Parking Alert)
 * 
 * @param {Object} props
 * @param {Object} props.slot - Thông tin ô đỗ đang chọn
 * @param {Function} [props.onAcknowledge] - Callback khi nhân viên bấm xác nhận đã kiểm tra ô đỗ
 * @param {Function} [props.onReportViolation] - Callback khi nhân viên bấm lập biên bản / báo vi phạm
 */
export default function OverstayAlertBanner({
  slot,
  onAcknowledge,
  onReportViolation,
}) {
  if (!slot?.isOverstay) return null;

  const plate = slot.plate || slot.licensePlate || "Chưa rõ biển số";
  const duration = slot.duration || ">48h";
  const isCritical = slot.overstaySeverity === "CRITICAL" || String(duration).includes("48h");

  return (
    <div
      role="alert"
      className={`rounded-xl border p-3.5 space-y-2.5 transition-all ${
        isCritical
          ? "bg-rose-50 border-rose-300 text-rose-900"
          : "bg-amber-50 border-amber-300 text-amber-900"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${
              isCritical ? "text-rose-600 animate-pulse" : "text-amber-600"
            }`}
          />
          <span>Cảnh báo: Xe đỗ quá giờ</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            isCritical
              ? "bg-rose-200 text-rose-800"
              : "bg-amber-200 text-amber-800"
          }`}
        >
          {isCritical ? "Quá hạn 48h" : "Quá hạn 24h"}
        </span>
      </div>

      <p className="text-2xs leading-relaxed text-slate-700">
        Phương tiện biển số <strong className="font-mono text-slate-900">{plate}</strong>{" "}
        đã đỗ liên tục <strong className="text-rose-700 font-semibold">{duration}</strong>,{" "}
        vượt giới hạn quy định. Cần kiểm tra thực địa hoặc liên hệ chủ phương tiện.
      </p>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="dangerOutline"
          size="xs"
          fullWidth
          icon={<ShieldAlert className="w-3.5 h-3.5" />}
          onClick={() => onReportViolation?.(slot)}
          className="cursor-pointer !text-2xs"
        >
          Báo vi phạm
        </Button>
        <Button
          variant="secondary"
          size="xs"
          fullWidth
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          onClick={() => onAcknowledge?.(slot)}
          className="cursor-pointer !text-2xs"
        >
          Đã kiểm tra
        </Button>
      </div>
    </div>
  );
}
