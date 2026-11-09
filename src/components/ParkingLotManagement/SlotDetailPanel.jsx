import {
  LayoutGrid,
  Pencil,
  Trash2,
  CheckCircle2,
  Car,
  Clock,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import Button from "../common/button/Button";
import OverstayAlertBanner from "./OverstayAlertBanner";

export default function SlotDetailPanel({
  selectedSlot,
  onUpdateStatus,
  onEditSlot,
  onDeleteSlot,
  onAcknowledgeOverstay,
  onReportViolation,
}) {
  const handleStatusChange = (newStatus) => {
    if (onUpdateStatus && selectedSlot) {
      onUpdateStatus(selectedSlot, newStatus);
    }
  };

  const getBadgeStyle = () => {
    switch (selectedSlot?.status) {
      case "OCCUPIED":
        return {
          wrapper: "bg-rose-50 text-rose-700 border border-rose-200",
          icon: <Car className="w-3.5 h-3.5 text-rose-600" />,
        };
      case "AVAILABLE":
        return {
          wrapper: "bg-emerald-50 text-emerald-700 border border-emerald-200",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case "RESERVED":
        return {
          wrapper: "bg-amber-50 text-amber-700 border border-amber-200",
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
        };
      default:
        return {
          wrapper: "bg-slate-100 text-slate-700 border border-slate-200",
          icon: <Wrench className="w-3.5 h-3.5 text-slate-600" />,
        };
    }
  };

  if (!selectedSlot) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
          <LayoutGrid className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Chưa chọn ô đỗ nào</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Vui lòng chọn một ô đỗ trên sơ đồ hoặc danh sách để xem chi tiết và thao tác cập nhật.
        </p>
      </div>
    );
  }

  const badgeStyle = getBadgeStyle();

  return (
    <div className="space-y-4">
      {/* 1. Chi tiết ô đỗ */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Chi tiết ô đỗ</h2>
          <p className="text-xs text-slate-400">Thông tin vị trí đang chọn</p>
        </div>

        {/* Header mã ô & badge trạng thái */}
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-2xs font-semibold uppercase tracking-wider text-slate-400">
              Mã ô đỗ
            </span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {selectedSlot?.id}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
              selectedSlot?.isOverstay
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : badgeStyle.wrapper
            }`}
          >
            {selectedSlot?.isOverstay ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            ) : (
              badgeStyle.icon
            )}
            {selectedSlot?.statusText || "Đang đỗ"}
            {selectedSlot?.isOverstay ? " (Quá giờ)" : ""}
          </span>
        </div>

        {/* Banner cảnh báo nếu xe đỗ quá giờ */}
        {selectedSlot?.isOverstay && (
          <OverstayAlertBanner
            slot={selectedSlot}
            onAcknowledge={onAcknowledgeOverstay}
            onReportViolation={onReportViolation}
          />
        )}

        {/* Thuộc tính ô đỗ */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Bãi đỗ xe</span>
            <span className="font-semibold text-slate-800">
              {selectedSlot?.parkingLot}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Tầng</span>
            <span className="font-semibold text-slate-800">
              {selectedSlot?.floor}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Khu vực</span>
            <span className="font-semibold text-slate-800">
              {selectedSlot?.zone}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Biển số xe</span>
            <span className="font-bold text-slate-900 font-mono">
              {selectedSlot?.licensePlate}
            </span>
          </div>
          {selectedSlot?.duration && (
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Thời gian đỗ</span>
              <span
                className={`font-mono text-xs font-semibold ${
                  selectedSlot?.isOverstay
                    ? "text-rose-600 font-bold"
                    : "text-slate-800"
                }`}
              >
                {selectedSlot?.duration}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Loại xe</span>
            <span className="font-semibold text-slate-800">
              {selectedSlot?.vehicleType}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-50">
            <span className="text-slate-400">Người đặt</span>
            <span className="text-slate-600 font-mono">
              {selectedSlot?.reservedBy}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Ghi chú</span>
            <span className="text-slate-600 font-mono">
              {selectedSlot?.note}
            </span>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="pt-2 flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            icon={<Pencil className="w-3.5 h-3.5" />}
            onClick={() => onEditSlot?.(selectedSlot)}
            className="cursor-pointer"
          >
            Sửa
          </Button>
          <Button
            variant="dangerOutline"
            size="sm"
            fullWidth
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => onDeleteSlot?.(selectedSlot)}
            className="cursor-pointer"
          >
            Xóa
          </Button>
        </div>
      </div>

      {/* 2. Cập nhật nhanh trạng thái */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 text-xs">
        <span className="block font-bold text-slate-800">
          Cập nhật nhanh trạng thái
        </span>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => handleStatusChange("AVAILABLE")}
            className="w-full py-2 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-left transition flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Đặt làm ô trống</span>
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange("OCCUPIED")}
            className="w-full py-2 px-3 rounded-lg border border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100/60 font-medium text-left transition flex items-center gap-2 cursor-pointer"
          >
            <Car className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Đánh dấu có xe đỗ</span>
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange("RESERVED")}
            className="w-full py-2 px-3 rounded-lg border border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100/60 font-medium text-left transition flex items-center gap-2 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Đánh dấu đã đặt trước</span>
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange("MAINTENANCE")}
            className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium text-left transition flex items-center gap-2 cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Đánh dấu bảo trì</span>
          </button>
        </div>
      </div>
    </div>
  );
}
