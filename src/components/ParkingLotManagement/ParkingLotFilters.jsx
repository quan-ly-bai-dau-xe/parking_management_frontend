import { Search, RotateCcw, Pencil, LayoutGrid, List } from "lucide-react";
import FilterSelect from "../common/FilterSelect";
import { FormInput } from "../common/form";
import Button from "../common/button/Button";
import {
  PARKING_LOT_OPTIONS,
  PARKING_FLOOR_OPTIONS,
  PARKING_ZONE_OPTIONS,
  SLOT_STATUS_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from "../../constants/parkingLotConstants";

export default function ParkingLotFilters({
  selectedFloor,
  setSelectedFloor,
  selectedZone,
  setSelectedZone,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  vehicleTypeFilter,
  setVehicleTypeFilter,
  onResetFilters,
  viewMode = "matrix",
  setViewMode,
  onToggleViewMode,
}) {
  const currentViewMode = viewMode || "matrix";
  const handleToggleMode = (mode) => {
    if (setViewMode) setViewMode(mode);
    if (onToggleViewMode) onToggleViewMode(mode);
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
    statusFilter ||
    vehicleTypeFilter ||
    (selectedFloor && selectedFloor !== "B1") ||
    (selectedZone && selectedZone !== "A")
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <FilterSelect
          label="Bãi đỗ xe"
          value="Bãi xe Smart Mobility"
          onChange={() => {}}
          options={PARKING_LOT_OPTIONS}
          placeholder=""
        />

        <FilterSelect
          label="Tầng"
          value={selectedFloor}
          onChange={(e) => setSelectedFloor(e?.target ? e.target.value : e)}
          options={PARKING_FLOOR_OPTIONS}
          placeholder=""
        />

        <FilterSelect
          label="Khu vực"
          value={selectedZone}
          onChange={(e) => setSelectedZone(e?.target ? e.target.value : e)}
          options={PARKING_ZONE_OPTIONS}
          placeholder=""
        />

        <FormInput
          label="Tìm kiếm"
          placeholder="Mã ô hoặc biển số..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
        />

        <FilterSelect
          label="Trạng thái ô đỗ"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e?.target ? e.target.value : e)}
          placeholder="Tất cả trạng thái"
          options={SLOT_STATUS_OPTIONS}
        />

        <FilterSelect
          label="Loại xe"
          value={vehicleTypeFilter}
          onChange={(e) => setVehicleTypeFilter(e?.target ? e.target.value : e)}
          placeholder="Tất cả loại xe"
          options={VEHICLE_TYPE_OPTIONS}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={onResetFilters}
              className="cursor-pointer"
            >
              Đặt lại bộ lọc
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* View mode toggle buttons (Matrix / List) */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Button
              variant={currentViewMode === "matrix" ? "primary" : "ghost"}
              size="sm"
              icon={<LayoutGrid className="w-3.5 h-3.5" />}
              onClick={() => handleToggleMode("matrix")}
              className="cursor-pointer !h-7 !px-2.5 !text-xs"
              title="Chế độ sơ đồ ma trận"
            >
              Ma trận
            </Button>
            <Button
              variant={currentViewMode === "list" ? "primary" : "ghost"}
              size="sm"
              icon={<List className="w-3.5 h-3.5" />}
              onClick={() => handleToggleMode("list")}
              className="cursor-pointer !h-7 !px-2.5 !text-xs"
              title="Chế độ danh sách"
            >
              Danh sách
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Pencil className="w-3.5 h-3.5" />}
            className="cursor-pointer"
          >
            Chế độ chỉnh sửa sơ đồ
          </Button>
        </div>
      </div>
    </div>
  );
}
