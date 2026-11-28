import { useState, useMemo } from "react";

/**
 * ParkingSlotPicker
 * Bộ chọn vị trí ô đỗ trực quan, linh hoạt quy mô (Scalable) dùng chung cho Check-in và Chỉ định ô đỗ.
 * - Hỗ trợ tìm kiếm nhanh theo mã ô / tầng / khu vực
 * - Bộ lọc Tầng & Khu dạng Dropdown nhỏ gọn, cố định 1 dòng, không bị vỡ layout khi có nhiều tầng/khu
 * - Lưới ô đỗ thẻ trực quan, responsive và cuộn độc lập
 */
export default function ParkingSlotPicker({
  availableSlots = [],
  selectedSlotId = null,
  onSelectSlot,
  isLoading = false,
  maxHeight = "max-h-[160px]",
  columns = "grid-cols-4 sm:grid-cols-6",
}) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedZone, setSelectedZone] = useState("");

  // Trích xuất danh sách tất cả các Tầng hiện có
  const floorOptions = useMemo(
    () => Array.from(new Set(availableSlots.map((s) => s.floor).filter(Boolean))),
    [availableSlots]
  );

  // Trích xuất danh sách các Khu tương ứng với tầng được chọn (hoặc tất cả các khu)
  const zoneOptions = useMemo(() => {
    const pool = selectedFloor
      ? availableSlots.filter((s) => s.floor === selectedFloor)
      : availableSlots;
    return Array.from(new Set(pool.map((s) => s.zone).filter(Boolean)));
  }, [availableSlots, selectedFloor]);

  // Lọc ô đỗ kết hợp cả Tìm kiếm gõ nhanh + Tầng + Khu
  const filteredSlots = useMemo(() => {
    const query = searchKeyword.trim().toLowerCase();
    return availableSlots.filter((slot) => {
      // Lọc theo Tầng
      if (selectedFloor && slot.floor !== selectedFloor) return false;
      // Lọc theo Khu
      if (selectedZone && slot.zone !== selectedZone) return false;
      // Lọc theo từ khóa tìm kiếm (mã ô, tầng, khu)
      if (query) {
        const slotCode = String(slot.code || "").toLowerCase();
        const slotZone = String(slot.zone || "").toLowerCase();
        const slotFloor = String(slot.floor || "").toLowerCase();
        const cleanQuery = query.replace(/[^a-z0-9]/g, "");
        const cleanCode = slotCode.replace(/[^a-z0-9]/g, "");

        const matchesCode = slotCode.includes(query) || cleanCode.includes(cleanQuery);
        const matchesZone = slotZone.includes(query);
        const matchesFloor = slotFloor.includes(query);

        if (!matchesCode && !matchesZone && !matchesFloor) {
          return false;
        }
      }
      return true;
    });
  }, [availableSlots, selectedFloor, selectedZone, searchKeyword]);

  const selectedSlot = useMemo(
    () =>
      availableSlots.find(
        (s) =>
          selectedSlotId !== null &&
          selectedSlotId !== undefined &&
          (String(s.id) === String(selectedSlotId) ||
            String(s.code || "").toUpperCase() === String(selectedSlotId).toUpperCase())
      ) || null,
    [availableSlots, selectedSlotId]
  );

  return (
    <div className="space-y-2">
      {/* Hàng điều khiển cố định 1 dòng: Tìm kiếm nhanh + Dropdown Tầng + Dropdown Khu */}
      <div className="flex items-center gap-1.5">
        {/* Ô tìm kiếm nhanh */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm ô (vd: A-01, B1)..."
            className="w-full text-3xs bg-white border border-slate-300 rounded-md pl-6 pr-5 py-1 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-3xs pointer-events-none">
            🔍
          </span>
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-3xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown Tầng */}
        {floorOptions.length > 0 && (
          <select
            value={selectedFloor}
            onChange={(e) => {
              setSelectedFloor(e.target.value);
              setSelectedZone(""); // Reset khu khi đổi tầng
            }}
            className="text-3xs font-medium bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shrink-0 max-w-[95px]"
            title="Lọc theo Tầng"
          >
            <option value="">Tất cả tầng</option>
            {floorOptions.map((fl) => (
              <option key={fl} value={fl}>
                {fl}
              </option>
            ))}
          </select>
        )}

        {/* Dropdown Khu */}
        {zoneOptions.length > 0 && (
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="text-3xs font-medium bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shrink-0 max-w-[90px]"
            title="Lọc theo Khu"
          >
            <option value="">Tất cả khu</option>
            {zoneOptions.map((zn) => (
              <option key={zn} value={zn}>
                {zn}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Lưới thẻ danh sách ô đỗ trực quan */}
      <div
        className={`border border-slate-200 rounded-lg p-2 bg-slate-50/50 min-h-[110px] ${maxHeight} overflow-y-auto`}
      >
        {isLoading ? (
          <div className="h-24 flex flex-col items-center justify-center gap-1.5 text-slate-400 text-3xs">
            <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            <span>Đang nạp danh sách ô đỗ...</span>
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="h-24 flex flex-col items-center justify-center text-slate-400 text-3xs text-center px-2">
            <span>Không tìm thấy ô đỗ phù hợp với tiêu chí lọc.</span>
            {(searchKeyword || selectedFloor || selectedZone) && (
              <button
                type="button"
                onClick={() => {
                  setSearchKeyword("");
                  setSelectedFloor("");
                  setSelectedZone("");
                }}
                className="mt-1 text-emerald-600 hover:underline font-semibold cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className={`grid ${columns} gap-1.5`}>
            {filteredSlots.map((slot) => {
              const isSelected =
                selectedSlotId !== null &&
                selectedSlotId !== undefined &&
                (String(selectedSlotId) === String(slot.id) ||
                  String(selectedSlotId).toUpperCase() === String(slot.code || "").toUpperCase());
              return (
                <button
                  key={slot.id ?? slot.code}
                  type="button"
                  onClick={() => onSelectSlot(isSelected ? null : slot.id)}
                  title={`${slot.floor} - ${slot.zone} - ${slot.code}${isSelected ? " (Bấm để hủy chọn)" : ""}`}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 shadow-2xs"
                      : "bg-white border-slate-200 hover:border-slate-400 hover:shadow-2xs"
                  }`}
                >
                  <span
                    className={`text-2xs font-bold font-mono tracking-tight ${
                      isSelected ? "text-emerald-800" : "text-slate-800"
                    }`}
                  >
                    {slot.code}
                  </span>
                  <span className="text-4xs text-slate-400 block truncate leading-none mt-0.5">
                    {slot.zone}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Thông tin ô đã chọn và số lượng kết quả */}
      <div className="flex items-center justify-between px-1 text-3xs text-slate-500">
        <span>
          Hiển thị <strong className="text-slate-700">{filteredSlots.length}</strong> /{" "}
          {availableSlots.length} ô
        </span>
        {selectedSlot ? (
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Đã chọn: {selectedSlot.floor} · {selectedSlot.zone} · {selectedSlot.code}
            </span>
            <button
              type="button"
              onClick={() => onSelectSlot(null)}
              className="px-1.5 py-0.5 rounded text-4xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 transition-colors cursor-pointer"
              title="Bỏ chọn ô này để xe tự do tìm chỗ"
            >
              ✕ Bỏ chọn
            </button>
          </div>
        ) : (
          <span className="italic text-slate-400 font-medium">
            (Chưa chỉ định ô - Xe tự tìm chỗ)
          </span>
        )}
      </div>
    </div>
  );
}
