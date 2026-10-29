import { useState, useMemo } from "react";
import { fullParkingLotData } from "../mocks/parkingLotData";
import { FilterSelect } from "../components/common";

export default function ParkingLot() {
  const [selectedFloor, setSelectedFloor] = useState("B1");
  const [selectedZone, setSelectedZone] = useState("A");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("");

  const currentZoneData = useMemo(() => {
    return fullParkingLotData[0]?.zones[0];
  }, []);

  const allSlots = useMemo(() => {
    return currentZoneData?.slots || [];
  }, [currentZoneData]);

  // Quản lý ô đỗ đang được chọn xem chi tiết (mặc định chọn A-01)
  const [selectedSlot, setSelectedSlot] = useState({
    id: "A-01",
    status: "OCCUPIED",
    statusText: "Đang đỗ",
    parkingLot: "Bãi xe Smart Mobility",
    floor: "B1",
    zone: "A",
    licensePlate: "30A-123.45",
    vehicleType: "Ô tô",
    reservedBy: "—",
    note: "—",
  });

  // Mock danh sách cấu trúc bãi ở chân trang
  const structureList = [
    { type: "Tầng", name: "Tầng B1" },
    { type: "Tầng", name: "Tầng B2" },
    { type: "Tầng", name: "Tầng F1" },
    { type: "Khu", name: "Khu A" },
    { type: "Khu", name: "Khu B" },
    { type: "Khu", name: "Khu C" },
  ];

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = allSlots.length || 24;
    const available = allSlots.filter((s) => s.status === "AVAILABLE").length || 7;
    const occupied = allSlots.filter((s) => s.status === "OCCUPIED").length || 12;
    const reservedOrMaint = allSlots.filter((s) => s.status === "RESERVED" || s.status === "MAINTENANCE").length || 5;
    return { total, available, occupied, reservedOrMaint };
  }, [allSlots]);

  // Filter slots for highlight/match
  const matchesFilter = (slot) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchLabel = slot.label?.toLowerCase().includes(q);
      const matchPlate = slot.plate?.toLowerCase().includes(q);
      if (!matchLabel && !matchPlate) return false;
    }
    if (statusFilter && slot.status !== statusFilter) {
      return false;
    }
    if (vehicleTypeFilter) {
      if (vehicleTypeFilter === "PRIORITY" && slot.type !== "PRIORITY") return false;
      if (vehicleTypeFilter === "STANDARD" && slot.type !== "STANDARD") return false;
    }
    return true;
  };

  const rowASlots = useMemo(() => {
    return allSlots.filter((s) => s.row === "A");
  }, [allSlots]);

  const rowBSlots = useMemo(() => {
    return allSlots.filter((s) => s.row === "B");
  }, [allSlots]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setVehicleTypeFilter("");
  };

  // Xử lý khi click vào 1 ô đỗ trên sơ đồ
  const handleSelectSlot = (slot) => {
    setSelectedSlot({
      id: slot.label,
      status: slot.status,
      statusText:
        slot.status === "OCCUPIED"
          ? "Đang đỗ"
          : slot.status === "AVAILABLE"
          ? "Trống"
          : slot.status === "RESERVED"
          ? "Đã đặt trước"
          : "Bảo trì",
      parkingLot: "Bãi xe Smart Mobility",
      floor: "B1",
      zone: "A",
      licensePlate: slot.plate || "—",
      vehicleType: slot.type === "PRIORITY" ? "Xe ưu tiên" : "Ô tô",
      reservedBy: slot.reservedTime ? `Khách đặt lúc ${slot.reservedTime}` : "—",
      note: slot.note || "—",
    });
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 1. TIÊU ĐỀ TRANG & NÚT THAO TÁC CHÍNH                     */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sơ đồ bãi đậu xe
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi sức chứa, trạng thái từng ô và quản lý cấu trúc bãi đỗ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Xuất báo cáo</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <span>+</span> Thêm tầng
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <span>+</span> Thêm khu
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
          >
            <span>+</span> Thêm ô đỗ xe
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC                        */}
      {/* ========================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <FilterSelect
            label="Bãi đỗ xe"
            value="Bãi xe Smart Mobility"
            onChange={() => {}}
            options={[{ value: "Bãi xe Smart Mobility", label: "Bãi xe Smart Mobility" }]}
            placeholder=""
          />

          <FilterSelect
            label="Tầng"
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            options={[
              { value: "B1", label: "Tầng B1" },
              { value: "B2", label: "Tầng B2" },
              { value: "F1", label: "Tầng F1" },
            ]}
            placeholder=""
          />

          <FilterSelect
            label="Khu vực"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            options={[
              { value: "A", label: "Khu A" },
              { value: "B", label: "Khu B" },
              { value: "C", label: "Khu C" },
            ]}
            placeholder=""
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tìm kiếm
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Mã ô hoặc biển số..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <FilterSelect
            label="Trạng thái ô đỗ"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="Tất cả trạng thái"
            options={[
              { value: "AVAILABLE", label: "Trống" },
              { value: "OCCUPIED", label: "Đang đỗ" },
              { value: "RESERVED", label: "Đã đặt trước" },
              { value: "MAINTENANCE", label: "Bảo trì" },
            ]}
          />

          <FilterSelect
            label="Loại xe"
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            placeholder="Tất cả loại xe"
            options={[
              { value: "STANDARD", label: "Ô tô tiêu chuẩn" },
              { value: "PRIORITY", label: "Xe ưu tiên" },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {(searchQuery || statusFilter || vehicleTypeFilter) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Đặt lại bộ lọc</span>
              </button>
            )}
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-900 hover:text-white text-xs font-semibold text-slate-800 transition-colors shadow-2xs cursor-pointer ml-auto"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Chế độ chỉnh sửa sơ đồ</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. HÀNG 4 THẺ THỐNG KÊ NHANH (METRIC CARDS)               */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500">
              Tổng ô đỗ trong khu
            </span>
            <span className="text-xl font-bold text-slate-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500">
              Ô trống
            </span>
            <span className="text-xl font-bold text-emerald-600">{stats.available}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500">
              Đang sử dụng
            </span>
            <span className="text-xl font-bold text-slate-900">{stats.occupied}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500">
              Đặt trước / Bảo trì
            </span>
            <span className="text-xl font-bold text-slate-900">{stats.reservedOrMaint}</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. KHU VỰC TRUNG TÂM: SƠ ĐỒ MATRIX & CHI TIẾT Ô ĐỖ        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SƠ ĐỒ MATRIX NỀN TỐI (9 CỘT) */}
        <div className="lg:col-span-9 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          {/* Header thanh chú giải & mật độ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-slate-400 font-medium">Chú giải:</span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Trống
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Đang đỗ
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Đặt trước
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Bảo trì
              </span>
            </div>
            <div className="text-slate-500 font-medium">
              Mật độ: <strong className="text-slate-900">{stats.occupied + stats.reservedOrMaint} / {stats.total} ô</strong> ({Math.round(((stats.occupied + stats.reservedOrMaint) / (stats.total || 1)) * 100)}%)
            </div>
          </div>

          {/* Canvas sơ đồ nền tối */}
          <div className="bg-[#0B132B] rounded-xl p-5 sm:p-7 relative overflow-hidden text-white font-mono select-none">
            {/* DÃY A: A1 - A08 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[0.72rem] text-slate-400 font-semibold tracking-wider">
                <span>DÃY A1 - A08 (XE Ô TÔ TIÊU CHUẨN)</span>
                <span className="text-emerald-400 flex items-center gap-1">➔ HƯỚNG VÀO (ENTRY LANE)</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                {rowASlots.map((slot) => {
                  const isMatch = matchesFilter(slot);
                  return renderSlotCard(slot, selectedSlot?.id === slot.label, handleSelectSlot, isMatch);
                })}
              </div>
            </div>

            {/* ĐƯỜNG XE CHẠY NỘI BỘ (DRIVEWAY) */}
            <div className="my-7 py-3 border-y border-dashed border-slate-700/80 flex items-center justify-between text-[0.7rem] text-slate-400 uppercase tracking-widest relative">
              <div className="flex items-center gap-2">
                <span>← LÀN ĐƯỜNG XE CHẠY NỘI BỘ (DRIVEWAY)</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-sans text-[0.68rem]">
                TỐC ĐỘ TỐI ĐA: 10 KM/H
              </div>
              <div className="flex items-center gap-2">
                <span>LỐI RA KHỎI BÃI →</span>
              </div>
            </div>

            {/* DÃY B: B1 - B08 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[0.72rem] text-slate-400 font-semibold tracking-wider">
                <span>DÃY B1 - B08 (XE ƯU TIÊN)</span>
                <span className="text-blue-400">CẢM BIẾN SIÊU ÂM ACTIVE</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                {rowBSlots.map((slot) => {
                  const isMatch = matchesFilter(slot);
                  return renderSlotCard(slot, selectedSlot?.id === slot.label, handleSelectSlot, isMatch);
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CỘT THÔNG TIN CHI TIẾT Ô ĐỖ (3 CỘT) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Chi tiết ô đỗ</h2>
              <p className="text-xs text-slate-400">Thông tin vị trí đang chọn</p>
            </div>

            {/* Header mã ô & badge trạng thái */}
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-2xs font-semibold uppercase tracking-wider text-slate-400">Mã ô đỗ</span>
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {selectedSlot?.id}
                </span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                selectedSlot?.status === "OCCUPIED"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : selectedSlot?.status === "AVAILABLE"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : selectedSlot?.status === "RESERVED"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  selectedSlot?.status === "OCCUPIED"
                    ? "bg-rose-500"
                    : selectedSlot?.status === "AVAILABLE"
                    ? "bg-emerald-500"
                    : selectedSlot?.status === "RESERVED"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`} />
                {selectedSlot?.statusText || "Đang đỗ"}
              </span>
            </div>

            {/* Thuộc tính ô đỗ */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Bãi đỗ xe</span>
                <span className="font-semibold text-slate-800">{selectedSlot?.parkingLot}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Tầng</span>
                <span className="font-semibold text-slate-800">{selectedSlot?.floor}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Khu vực</span>
                <span className="font-semibold text-slate-800">{selectedSlot?.zone}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Biển số xe</span>
                <span className="font-bold text-slate-900 font-mono">{selectedSlot?.licensePlate}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Loại xe</span>
                <span className="font-semibold text-slate-800">{selectedSlot?.vehicleType}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Người đặt</span>
                <span className="text-slate-600 font-mono">{selectedSlot?.reservedBy}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Ghi chú</span>
                <span className="text-slate-600 font-mono">{selectedSlot?.note}</span>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                className="w-1/2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✏️</span> Sửa
              </button>
              <button
                type="button"
                className="w-1/2 py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🗑️</span> Xóa
              </button>
            </div>
          </div>

          {/* Thao tác nhanh */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 text-xs">
            <span className="block font-bold text-slate-800">Cập nhật nhanh trạng thái</span>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setSelectedSlot(prev => ({ ...prev, status: "AVAILABLE", statusText: "Trống", licensePlate: "—" }))}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-left transition flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Đặt làm ô trống
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlot(prev => ({ ...prev, status: "OCCUPIED", statusText: "Đang đỗ" }))}
                className="w-full py-2 px-3 rounded-lg border border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100/60 font-medium text-left transition flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Đánh dấu có xe đỗ
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlot(prev => ({ ...prev, status: "RESERVED", statusText: "Đã đặt trước" }))}
                className="w-full py-2 px-3 rounded-lg border border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100/60 font-medium text-left transition flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Đánh dấu đã đặt trước
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlot(prev => ({ ...prev, status: "MAINTENANCE", statusText: "Bảo trì" }))}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium text-left transition flex items-center gap-2 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" /> Đánh dấu bảo trì
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. CHÂN TRANG: CẤU TRÚC BÃI & HOẠT ĐỘNG GẦN ĐÂY           */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* QUẢN LÝ CẤU TRÚC BÃI */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Quản lý cấu trúc bãi</h2>
              <p className="text-xs text-slate-400">Danh mục tầng, phân khu và sức chứa</p>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              ⚙ Cấu hình
            </button>
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
                  <span className="text-xs font-bold text-slate-800">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition cursor-pointer"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium text-xs border border-rose-200 transition cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HOẠT ĐỘNG GẦN ĐÂY */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hoạt động gần đây</h2>
            <p className="text-xs text-slate-400">Nhật ký trạng thái ô đỗ và vị trí</p>
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
    </>
  );
}

function renderSlotCard(slot, isSelected, onSelect, isMatch = true) {
  const opacityClass = isMatch ? "opacity-100" : "opacity-30";

  // 1. Ô ĐỖ TRỐNG (AVAILABLE)
  if (slot.status === "AVAILABLE") {
    return (
      <div
        key={slot.slotId || slot.label}
        onClick={() => onSelect(slot)}
        className={`h-28 rounded-xl border flex flex-col items-center justify-between p-2 cursor-pointer transition-all ${opacityClass} ${
          isSelected
            ? "border-emerald-400 bg-emerald-950/80 ring-2 ring-emerald-400/50"
            : "border-emerald-500/50 bg-[#06201B] hover:border-emerald-400"
        }`}
      >
        <span className="text-[0.7rem] text-emerald-400 font-bold">{slot.label}</span>
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
          ✓
        </div>
        <span className="text-[0.65rem] text-emerald-400 font-bold tracking-wider">TRỐNG</span>
      </div>
    );
  }

  // 2. Ô ĐÃ CÓ XE (OCCUPIED)
  if (slot.status === "OCCUPIED") {
    return (
      <div
        key={slot.slotId || slot.label}
        onClick={() => onSelect(slot)}
        className={`h-28 rounded-xl border flex flex-col items-center justify-between p-2 cursor-pointer transition-all ${opacityClass} ${
          isSelected
            ? "border-rose-400 bg-rose-950/80 ring-2 ring-rose-400/50"
            : "border-rose-500/50 bg-[#2A0C16] hover:border-rose-400"
        }`}
      >
        <div className="w-full flex items-center justify-between text-[0.65rem]">
          <span className="text-rose-400 font-bold">{slot.label}</span>
          <span className="text-slate-400 font-sans text-[0.6rem]">{slot.duration}</span>
        </div>
        <span className="text-xl">🚗</span>
        <span className="text-[0.62rem] text-rose-300 font-mono font-bold tracking-tight">
          {slot.plate}
        </span>
      </div>
    );
  }

  // 3. Ô ĐÃ ĐẶT TRƯỚC (RESERVED)
  if (slot.status === "RESERVED") {
    return (
      <div
        key={slot.slotId || slot.label}
        onClick={() => onSelect(slot)}
        className={`h-28 rounded-xl border border-dashed flex flex-col items-center justify-between p-2 cursor-pointer transition-all ${opacityClass} ${
          isSelected
            ? "border-amber-400 bg-amber-950/80 ring-2 ring-amber-400/50"
            : "border-amber-500/70 bg-[#251A08] hover:border-amber-400"
        }`}
      >
        <span className="text-[0.7rem] text-amber-400 font-bold">{slot.label}</span>
        <span className="text-base text-amber-400">⏱</span>
        <span className="text-[0.6rem] text-amber-300 text-center font-bold leading-tight">
          {slot.note || `ĐÃ ĐẶT ${slot.reservedTime || ""}`}
        </span>
      </div>
    );
  }

  // 4. Ô BẢO TRÌ (MAINTENANCE)
  return (
    <div
      key={slot.slotId || slot.label}
      onClick={() => onSelect(slot)}
      className={`h-28 rounded-xl border border-slate-700 bg-slate-800/60 flex flex-col items-center justify-between p-2 cursor-pointer transition-all hover:border-slate-500 ${opacityClass}`}
    >
      <span className="text-[0.7rem] text-slate-400 font-bold">{slot.label}</span>
      <span className="text-base text-slate-400">⚠️</span>
      <span className="text-[0.65rem] text-slate-400 font-bold tracking-wider">BẢO TRÌ</span>
    </div>
  );
}
