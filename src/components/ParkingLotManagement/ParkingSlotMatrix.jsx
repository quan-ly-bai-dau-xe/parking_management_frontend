import { Check, Car, Clock, Wrench, ArrowRight, ArrowLeft } from "lucide-react";

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
        <Car className="w-6 h-6 text-rose-400" />
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
  rowASlots,
  rowBSlots,
  rowCSlots,
  selectedSlot,
  onSelectSlot,
  matchesFilter,
}) {
  const densityPercent = Math.round(
    ((stats.occupied + stats.reservedOrMaint) / (stats.total || 1)) * 100
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
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
        {/* DÃY A: A1 - A08 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[0.72rem] text-slate-400 font-semibold tracking-wider">
            <span>DÃY A1 - A08 (XE Ô TÔ TIÊU CHUẨN)</span>
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

        {/* ĐƯỜNG XE CHẠY NỘI BỘ (DRIVEWAY) */}
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

        {/* DÃY B: B1 - B08 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[0.72rem] text-slate-400 font-semibold tracking-wider">
            <span>DÃY B1 - B08 (XE ƯU TIÊN)</span>
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

        {/* DÃY C: C1 - C08 */}
        <div className="space-y-2 mt-7">
          <div className="flex items-center justify-between text-[0.72rem] text-slate-400 font-semibold tracking-wider">
            <span>DÃY C1 - C08 (KHU VỰC MỞ RỘNG / SẠC ĐIỆN)</span>
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
      </div>
    </div>
  );
}
