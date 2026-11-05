import { useState } from "react";
import { Eye, Pencil, Trash2, Plus, Layers, Grid } from "lucide-react";
import Button from "../common/button/Button";

function getItemCode(item) {
  if (item?.code) return String(item.code).trim().toUpperCase();
  const rawName = String(item?.name || "").trim();
  return rawName.replace(/^(Tầng|Khu)\s*/i, "").trim().toUpperCase();
}

export default function ParkingLotStructureAndActivity({
  structureList = [],
  selectedFloor = "B1",
  selectedZone = "A",
  onSelectFloor,
  onSelectZone,
  onConfigureStructure,
  onAddFloor,
  onAddZone,
  onEditStructure,
  onDeleteStructure,
  activities = [],
}) {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'floor' | 'zone'

  const defaultActivities = [
    {
      id: "act-1",
      color: "bg-blue-500",
      text: "Khởi tạo sơ đồ bãi xe Smart Mobility thành công.",
    },
    {
      id: "act-2",
      color: "bg-emerald-500",
      text: "Khu A - Tầng B1 đã hoàn tất tải dữ liệu 24 ô đỗ.",
    },
    {
      id: "act-3",
      color: "bg-amber-500",
      text: "Ô A-04 được xác nhận đặt trước bởi khách hàng VIP.",
    },
  ];

  const displayActivities =
    activities && activities.length > 0 ? activities : defaultActivities;

  const floors = structureList.filter((item) => item.type === "Tầng");
  const zones = structureList.filter((item) => item.type === "Khu");

  const renderStructureCard = (item, isFloor) => {
    const code = getItemCode(item);
    const isSelected = isFloor
      ? code === String(selectedFloor || "").trim().toUpperCase()
      : code === String(selectedZone || "").trim().toUpperCase();

    const handleSelect = (e) => {
      e?.stopPropagation?.();
      if (isFloor) {
        onSelectFloor?.(code);
      } else {
        onSelectZone?.(code);
      }
    };

    return (
      <div
        key={item.id || `${item.type}-${code}`}
        onClick={handleSelect}
        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
          isSelected
            ? "border-blue-500 bg-blue-50/80 shadow-2xs ring-1 ring-blue-400/50"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
        }`}
        title={`Bấm để xem sơ đồ ${item.name}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isFloor
                ? isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-600 border border-blue-200/60"
                : isSelected
                ? "bg-purple-600 text-white"
                : "bg-purple-50 text-purple-600 border border-purple-200/60"
            }`}
          >
            {isFloor ? <Layers className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-800 truncate">
                {item.name}
              </span>
              {code && (
                <span className="px-1.5 py-0.2 text-3xs font-mono font-medium rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {code}
                </span>
              )}
            </div>
            <span className="text-3xs text-slate-400 font-medium">
              {isFloor ? "Tầng bãi xe" : "Phân khu bãi xe"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isSelected ? (
            <button
              type="button"
              onClick={handleSelect}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-3xs font-bold bg-blue-600 text-white shadow-xs cursor-pointer hover:bg-blue-700 transition"
              title="Đang hiển thị trên sơ đồ bãi xe. Bấm để cuộn lên xem sơ đồ."
            >
              <Eye className="w-3 h-3" />
              <span>ĐANG XEM</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSelect}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-3xs font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 cursor-pointer transition"
              title={`Chuyển sơ đồ sang ${item.name}`}
            >
              <Eye className="w-3 h-3 text-slate-400" />
              <span>Xem sơ đồ</span>
            </button>
          )}

          <Button
            variant="ghost"
            size="xs"
            icon={<Pencil className="w-3 h-3 text-slate-500" />}
            onClick={() => onEditStructure?.(item)}
            className="cursor-pointer"
            title="Chỉnh sửa hạng mục"
          />
          <Button
            variant="ghost"
            size="xs"
            icon={<Trash2 className="w-3 h-3 text-rose-500" />}
            onClick={() => onDeleteStructure?.(item)}
            className="cursor-pointer hover:bg-rose-50"
            title="Xóa hạng mục"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Quản lý cấu trúc bãi */}
      <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Quản lý cấu trúc bãi
            </h2>
            <p className="text-xs text-slate-400">
              {floors.length} tầng • {zones.length} khu vực • Bấm để đồng bộ sơ đồ
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="xs"
              icon={<Plus className="w-3 h-3 text-slate-500" />}
              onClick={() => (onAddFloor ? onAddFloor() : onConfigureStructure?.())}
              className="cursor-pointer"
            >
              Thêm tầng
            </Button>
            <Button
              variant="secondary"
              size="xs"
              icon={<Plus className="w-3 h-3 text-slate-500" />}
              onClick={() => (onAddZone ? onAddZone() : onConfigureStructure?.())}
              className="cursor-pointer"
            >
              Thêm khu
            </Button>
          </div>
        </div>

        {/* Tab chuyển nhóm */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-1 text-center rounded-md transition cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Tất cả ({structureList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("floor")}
            className={`flex-1 py-1 text-center rounded-md transition cursor-pointer ${
              activeTab === "floor"
                ? "bg-white text-blue-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Tầng ({floors.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("zone")}
            className={`flex-1 py-1 text-center rounded-md transition cursor-pointer ${
              activeTab === "zone"
                ? "bg-white text-purple-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Phân khu ({zones.length})
          </button>
        </div>

        {/* Danh sách các hạng mục */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
          {structureList.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Chưa có tầng hoặc khu vực nào trong hệ thống.
            </div>
          ) : (
            <>
              {(activeTab === "all" || activeTab === "floor") &&
                floors.map((item) => renderStructureCard(item, true))}

              {(activeTab === "all" || activeTab === "zone") &&
                zones.map((item) => renderStructureCard(item, false))}
            </>
          )}
        </div>
      </div>

      {/* 2. Hoạt động gần đây */}
      <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="pb-2 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            Hoạt động gần đây
          </h2>
          <p className="text-xs text-slate-400">
            Nhật ký cập nhật cấu trúc và trạng thái ô đỗ
          </p>
        </div>

        <ul className="space-y-3 text-xs pl-1">
          {displayActivities.map((act) => (
            <li key={act.id} className="flex items-start gap-2.5 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${act.color || "bg-blue-500"} shrink-0 mt-1`} />
              <span>{act.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}