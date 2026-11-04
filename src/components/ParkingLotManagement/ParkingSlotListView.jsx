import { useMemo } from "react";
import { CheckCircle2, Car, Clock, Wrench, Eye, Pencil, Trash2 } from "lucide-react";
import DataTable from "../common/table/DataTable";
import Button from "../common/button/Button";

function renderStatusBadge(status, statusText) {
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
        minWidth: 140,
        accessor: (slot) => renderStatusBadge(slot.status, slot.statusText),
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
          <span className="text-slate-500 text-xs">
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
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Danh sách ô đỗ xe</h3>
          <p className="text-xs text-slate-400">
            Hiển thị {slots.length} ô đỗ trong phân khu đang chọn
          </p>
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
