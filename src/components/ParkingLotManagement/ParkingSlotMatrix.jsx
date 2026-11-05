import {
  Check,
  Car,
  Clock,
  Wrench,
  ArrowRight,
  ArrowLeft,
  Layers,
  Grid,
  MapPin,
  AlertTriangle,
} from "lucide-react";

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
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Check className="w-3.5 h-3.5" />
        </div>
        <span className="text-[0.65rem] text-emerald-400 font-bold tracking-wider">TRỐNG</span>
      </div>
    );
  }

  // 2. Ô ĐÃ CÓ XE (OCCUPIED)
  if (slot.status === "OCCUPIED") {
    const isOverstay = Boolean(slot.isOverstay);
    return (
      <div
        key={slot.slotId || slot.label}
        onClick={() => onSelect(slot)}
        className={`h-28 rounded-xl border flex flex-col items-center justify-between p-2 cursor-pointer transition-all relative ${opacityClass} ${
          isSelected
            ? isOverstay
              ? "border-amber-400 bg-[#3a131b] ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/20"
              : "border-rose-400 bg-rose-950/80 ring-2 ring-rose-400/50"
            : isOverstay
              ? "border-amber-500/80 bg-[#2d0e16] hover:border-amber-400 shadow-sm shadow-amber-500/10"
              : "border-rose-500/50 bg-[#2A0C16] hover:border-rose-400"
        }`}
      >
        {isOverstay && (
          <span
            title="Phương tiện đỗ quá giờ quy định"
            className="absolute -top-1.5 -right-1.5 flex h-4 items-center gap-0.5 rounded-full bg-amber-500 px-1.5 text-[9px] font-bold text-slate-950 shadow animate-pulse"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            <span>QUÁ HẠN</span>
          </span>
        )}
        <div className="w-full flex items-center justify-between text-[0.65rem]">
          <span className={isOverstay ? "text-amber-400 font-bold" : "text-rose-400 font-bold"}>
            {slot.label}
          </span>
          <span
            className={`font-sans text-[0.6rem] ${
              isOverstay ? "text-amber-300 font-semibold" : "text-slate-400"
            }`}
          >
            {slot.duration}
          </span>
        </div>
        <Car className={`w-6 h-6 ${isOverstay ? "text-amber-400" : "text-rose-400"}`} />
        <span
          className={`text-[0.62rem] font-mono font-bold tracking-tight ${
            isOverstay ? "text-amber-200" : "text-rose-300"
          }`}
        >
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
        <Clock className="w-5 h-5 text-amber-400" />
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
      className={`h-28 rounded-xl border flex flex-col items-center justify-between p-2 cursor-pointer transition-all ${opacityClass} ${
        isSelected
          ? "border-slate-400 bg-slate-800 ring-2 ring-slate-400/50"
          : "border-slate-700 bg-slate-800/60 hover:border-slate-500"
      }`}
    >
      <span className="text-[0.7rem] text-slate-400 font-bold">{slot.label}</span>
      <Wrench className="w-5 h-5 text-slate-400" />
      <span className="text-[0.65rem] text-slate-400 font-bold tracking-wider">BẢO TRÌ</span>
    </div>
  );
}

export default function ParkingSlotMatrix({
  stats,
  rowASlots = [],
  rowBSlots = [],
  rowCSlots = [],
  rowLabels = {},
  selectedSlot,
  onSelectSlot,
  matchesFilter,
  selectedFloor = "B1",
  selectedZone = "A",
  onAddSlot,
}) {
  const densityPercent = Math.round(
    ((stats.occupied + stats.reservedOrMaint) / (stats.total || 1)) * 100
  );

  const hasAnySlots =
    rowASlots.length > 0 || rowBSlots.length > 0 || rowCSlots.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
      {/* 1. Thanh định danh Tầng & Phân khu đang xem */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            {selectedFloor}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Sơ đồ bãi đỗ: Tầng {selectedFloor} — Phân khu {selectedZone}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ĐANG HIỂN THỊ
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Ma trận 3 dãy ô đỗ • {stats.total} vị trí • Giám sát cảm biến thời gian thực
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/80 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Tầng: <strong>{selectedFloor}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200/80 text-xs font-semibold">
            <Grid className="w-3.5 h-3.5 text-purple-600" />
            <span>Khu vực: <strong>Khu {selectedZone}</strong></span>
          </div>
        </div>
      </div>

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
          Mật độ:{" "}
          <strong className="text-slate-900">
            {stats.occupied + stats.reservedOrMaint} / {stats.total} ô
          </strong>{" "}
          ({densityPercent}%)
        </div>
      </div>

      {/* Canvas sơ đồ nền tối */}
      <div className="bg-[#0B132B] rounded-xl p-5 sm:p-7 relative overflow-hidden text-white font-mono select-none">
        {/* Thanh định vị HUD đầu Canvas sơ đồ */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-5 border-b border-slate-800/90 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-900/60 border border-blue-500/50 text-blue-300 font-bold text-[0.75rem]">
              <Layers className="w-3 h-3 text-blue-400" />
              TẦNG {selectedFloor}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-900/60 border border-purple-500/50 text-purple-300 font-bold text-[0.75rem]">
              <Grid className="w-3 h-3 text-purple-400" />
              PHÂN KHU {selectedZone}
            </span>
            <span className="hidden sm:inline-block text-[0.7rem] text-slate-400 ml-1">
              • Ma trận 24 vị trí đỗ (3 dãy)
            </span>
          </div>

          <div className="flex items-center gap-2 text-[0.7rem] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              CẢM BIẾN TRỰC TUYẾN
            </span>
          </div>
        </div>
        {!hasAnySlots ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 font-sans">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
              <Car className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">
                Khu {selectedZone} - Tầng {selectedFloor} chưa có ô đỗ xe nào
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Phân khu này hiện chưa có dữ liệu ô đỗ. Bạn có thể bấm nút bên dưới để thêm ô đỗ xe mới vào sơ đồ.
              </p>
            </div>
            {onAddSlot && (
              <button
                type="button"
                onClick={onAddSlot}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                + Thêm ô đỗ xe vào Khu {selectedZone}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* DÃY 1 (rowASlots) */}
            {rowASlots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[0.72rem] text-slate-400 font-semibold tracking-wider">
                  <span>
                    {rowLabels?.a || `DÃY ${selectedZone}-1 (XE Ô TÔ TIÊU CHUẨN)`}
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>HƯỚNG VÀO (ENTRY LANE)</span>
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {rowASlots.map((slot) => {
                    const isMatch = matchesFilter(slot);
                    return renderSlotCard(
                      slot,
                      selectedSlot?.id === slot.label,
                      onSelectSlot,
                      isMatch
                    );
                  })}
                </div>
              </div>
            )}

            {/* ĐƯỜNG XE CHẠY NỘI BỘ (DRIVEWAY) */}
            {rowASlots.length > 0 && rowBSlots.length > 0 && (
              <div className="my-7 py-3 border-y border-dashed border-slate-700/80 flex items-center justify-between text-[0.7rem] text-slate-400 uppercase tracking-widest relative">
                <div className="flex items-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>LÀN ĐƯỜNG XE CHẠY NỘI BỘ (DRIVEWAY)</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-sans text-[0.68rem]">
                  TỐC ĐỘ TỐI ĐA: 10 KM/H
                </div>
                <div className="flex items-center gap-1.5">
                  <span>LỐI RA KHỎI BÃI</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            )}

            {/* DÃY 2 (rowBSlots) */}
            {rowBSlots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[0.72rem] text-slate-400 font-semibold tracking-wider">
                  <span>
                    {rowLabels?.b || `DÃY ${selectedZone}-2 (XE ƯU TIÊN)`}
                  </span>
                  <span className="text-blue-400">CẢM BIẾN SIÊU ÂM ACTIVE</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {rowBSlots.map((slot) => {
                    const isMatch = matchesFilter(slot);
                    return renderSlotCard(
                      slot,
                      selectedSlot?.id === slot.label,
                      onSelectSlot,
                      isMatch
                    );
                  })}
                </div>
              </div>
            )}

            {/* DÃY 3 (rowCSlots) */}
            {rowCSlots.length > 0 && (
              <div className="space-y-2 mt-7">
                <div className="flex items-center justify-between text-[0.72rem] text-slate-400 font-semibold tracking-wider">
                  <span>
                    {rowLabels?.c ||
                      `DÃY ${selectedZone}-3 (KHU VỰC MỞ RỘNG / SẠC ĐIỆN)`}
                  </span>
                  <span className="text-cyan-400">KHU VỰC MỞ RỘNG</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {rowCSlots.map((slot) => {
                    const isMatch = matchesFilter(slot);
                    return renderSlotCard(
                      slot,
                      selectedSlot?.id === slot.label,
                      onSelectSlot,
                      isMatch
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
