import { useMemo } from "react";
import {
  CheckCircle2,
  Car,
  Clock,
  Wrench,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import DataTable from "../common/table/DataTable";
import Button from "../common/button/Button";

function renderStatusBadge(status, statusText, isOverstay = false) {
  if (status === "OCCUPIED" && isOverstay) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
        {statusText || "Đang đỗ"} (Quá giờ)
      </span>
    );
  }

  switch (status) {
    case "AVAILABLE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          {statusText || "Trống"}
        </span>
      );
    case "OCCUPIED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <Car className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          {statusText || "Đang đỗ"}
        </span>
      );
    case "RESERVED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          {statusText || "Đã đặt trước"}
        </span>
      );
    case "MAINTENANCE":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Wrench className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          {statusText || "Bảo trì"}
        </span>
      );
  }
}

export default function ParkingSlotListView({
  slots = [],
  selectedSlot,
  onSelectSlot,
  onEditSlot,
  onDeleteSlot,
  selectedFloor = "B1",
  selectedZone = "A",
}) {
  const columns = useMemo(
    () => [
      {
        header: "Mã ô",
        minWidth: 100,
        accessor: (slot) => (
          <span className="font-mono font-bold text-slate-900">
            {slot.label || slot.code || slot.id}
          </span>
        ),
      },
      {
        header: "Vị trí",
        minWidth: 160,
        accessor: (slot) => (
          <span className="text-slate-600">
            Tầng {slot.floor || selectedFloor} • Khu {slot.zone || selectedZone}
            {slot.row ? ` (Dãy ${slot.row})` : ""}
          </span>
        ),
      },
      {
        header: "Loại ô",
        minWidth: 140,
        accessor: (slot) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-700">
            {slot.type === "PRIORITY" ? "Xe ưu tiên" : "Ô tô tiêu chuẩn"}
          </span>
        ),
      },
      {
        header: "Trạng thái",
        minWidth: 160,
        accessor: (slot) =>
          renderStatusBadge(slot.status, slot.statusText, slot.isOverstay),
      },
      {
        header: "Biển số xe",
        minWidth: 120,
        accessor: (slot) => (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {slot.plate || slot.licensePlate || "—"}
          </span>
        ),
      },
      {
        header: "Thời gian / Ghi chú",
        minWidth: 160,
        accessor: (slot) => (
          <span
            className={`text-xs ${
              slot.isOverstay
                ? "font-bold text-amber-700 flex items-center gap-1"
                : "text-slate-500"
            }`}
          >
            {slot.isOverstay && <AlertTriangle className="w-3 h-3 text-amber-500" />}
            {slot.duration || slot.reservedTime || slot.note || "—"}
          </span>
        ),
      },
      {
        header: "Thao tác",
        align: "right",
        minWidth: 120,
        accessor: (slot) => (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="xs"
              title="Xem chi tiết"
              onClick={() => onSelectSlot?.(slot)}
              className="cursor-pointer !h-7 !px-2 text-slate-600 hover:text-blue-600"
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              title="Chỉnh sửa ô đỗ"
              onClick={() => onEditSlot?.(slot)}
              className="cursor-pointer !h-7 !px-2 text-slate-600 hover:text-amber-600"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              title="Xóa ô đỗ"
              onClick={() => onDeleteSlot?.(slot)}
              className="cursor-pointer !h-7 !px-2 text-slate-600 hover:text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [selectedFloor, selectedZone, onSelectSlot, onEditSlot, onDeleteSlot]
  );

  const selectedSlotId = selectedSlot?.id || selectedSlot?.label || selectedSlot?.code;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-0">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">
              Danh sách ô đỗ: Tầng {selectedFloor} — Phân khu {selectedZone}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {slots.length} ô
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Chi tiết các vị trí đỗ xe tại Tầng {selectedFloor} - Khu {selectedZone}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80">
            Tầng: <strong>{selectedFloor}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200/80">
            Khu vực: <strong>Khu {selectedZone}</strong>
          </span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={slots}
        rowKey={(row) => row.id || row.slotId || row.label || row.code}
        selectedId={selectedSlotId}
        onRowClick={onSelectSlot}
        emptyMessage={
          <div className="py-12 text-center text-slate-400 text-xs">
            Không tìm thấy ô đỗ nào phù hợp với bộ lọc hiện tại.
          </div>
        }
      />
    </div>
  );
}
