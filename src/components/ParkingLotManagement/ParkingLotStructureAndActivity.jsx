import { Settings, Pencil, Trash2 } from "lucide-react";
import Button from "../common/button/Button";

export default function ParkingLotStructureAndActivity({
  structureList = [],
  onConfigureStructure,
  onEditStructure,
  onDeleteStructure,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Quản lý cấu trúc bãi */}
      <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Quản lý cấu trúc bãi
            </h2>
            <p className="text-xs text-slate-400">
              Danh mục tầng, phân khu và sức chứa
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Settings className="w-3.5 h-3.5" />}
            onClick={() => onConfigureStructure?.()}
            className="cursor-pointer"
          >
            Cấu hình
          </Button>
        </div>

        <div className="space-y-2">
          {structureList.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
            >
              <div>
                <span className="block text-2xs text-slate-400 font-semibold uppercase">
                  {item.type}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="xs"
                  icon={<Pencil className="w-3 h-3" />}
                  onClick={() => onEditStructure?.(item)}
                  className="cursor-pointer"
                >
                  Sửa
                </Button>
                <Button
                  variant="dangerOutline"
                  size="xs"
                  icon={<Trash2 className="w-3 h-3" />}
                  onClick={() => onDeleteStructure?.(item)}
                  className="cursor-pointer"
                >
                  Xóa
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Hoạt động gần đây */}
      <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Hoạt động gần đây
          </h2>
          <p className="text-xs text-slate-400">
            Nhật ký trạng thái ô đỗ và vị trí
          </p>
        </div>

        <ul className="space-y-3 text-xs pl-1">
          <li className="flex items-start gap-2.5 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
            <span>Khởi tạo sơ đồ bãi xe Smart Mobility thành công.</span>
          </li>
          <li className="flex items-start gap-2.5 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
            <span>Khu A - Tầng B1 đã hoàn tất tải dữ liệu 24 ô đỗ.</span>
          </li>
          <li className="flex items-start gap-2.5 text-slate-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
            <span>Ô A-04 được xác nhận đặt trước bởi khách hàng VIP.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
