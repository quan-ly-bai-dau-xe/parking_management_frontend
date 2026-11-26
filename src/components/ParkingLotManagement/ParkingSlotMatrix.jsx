import { useState, useEffect, useRef } from "react";
import {
  Check,
  Car,
  Clock,
  Wrench,
  ArrowRight,
  ArrowLeft,
  Layers,
  Grid,
  AlertTriangle,
  Info,
  CalendarCheck,
  Zap,
} from "lucide-react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { BaseModal } from "../common/modal";
import Button from "../common/button/Button";
import ReserveSlotModal from "./ReserveSlotModal";
import { formatReservedTimeDisplay } from "../../utils/formatDateTime";

function renderSlotCard(slot, isSelected, onCardClick, isMatch = true) {
  const opacityClass = isMatch ? "opacity-100" : "opacity-30";

  // 1. Ô ĐỖ TRỐNG (AVAILABLE)
  if (slot.status === "AVAILABLE") {
    return (
      <div
        key={slot.slotId || slot.label}
        onClick={(e) => onCardClick(e, slot)}
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
        onClick={(e) => onCardClick(e, slot)}
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
        onClick={(e) => onCardClick(e, slot)}
        className={`h-28 rounded-xl border border-dashed flex flex-col items-center justify-between p-2 cursor-pointer transition-all ${opacityClass} ${
          isSelected
            ? "border-amber-400 bg-amber-950/80 ring-2 ring-amber-400/50"
            : "border-amber-500/70 bg-[#251A08] hover:border-amber-400"
        }`}
      >
        <span className="text-[0.7rem] text-amber-400 font-bold">{slot.label}</span>
        <Clock className="w-5 h-5 text-amber-400" />
        <span className="text-[0.6rem] text-amber-300 text-center font-bold leading-tight">
          {slot.note || `ĐÃ ĐẶT ${formatReservedTimeDisplay(slot.reservedTime, "")}`}
        </span>
      </div>
    );
  }

  // 4. Ô ĐANG SẠC (CHARGING)
  if (slot.status === "CHARGING") {
    return (
      <div
        key={slot.slotId || slot.label}
        onClick={(e) => onCardClick(e, slot)}
        className={`h-28 rounded-xl border flex flex-col items-center justify-between p-2 cursor-pointer transition-all ${opacityClass} ${
          isSelected
            ? "border-blue-400 bg-blue-950/80 ring-2 ring-blue-400/50"
            : "border-blue-500/60 bg-[#0A1A3A] hover:border-blue-400"
        }`}
      >
        <span className="text-[0.7rem] text-blue-300 font-bold">{slot.label}</span>
        <Zap className="w-5 h-5 text-blue-400" />
        <span className="text-[0.65rem] text-blue-300 font-bold tracking-wider">ĐANG SẠC</span>
      </div>
    );
  }

  // 5. Ô BẢO TRÌ (MAINTENANCE)
  return (
    <div
      key={slot.slotId || slot.label}
      onClick={(e) => onCardClick(e, slot)}
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
  onReservationSuccess,
}) {
  const { role, isManager } = useCurrentUser();
  const isCustomer = role === "CUSTOMER";

  // State cho Context Menu và các Modal
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    slot: null,
    position: { x: 0, y: 0 },
  });
  const [vehicleInfoModal, setVehicleInfoModal] = useState({
    isOpen: false,
    slot: null,
  });
  const [reservationModal, setReservationModal] = useState({
    isOpen: false,
    slot: null,
  });

  const menuRef = useRef(null);

  // Đóng Context Menu khi click ra ngoài, cuộn trang hoặc nhấn Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
      }
    };
    const handleScroll = () => {
      setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setContextMenu((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      }
    };

    if (contextMenu.isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu.isOpen]);

  const handleSlotCardClick = (e, slot) => {
    e.stopPropagation();
    onSelectSlot?.(slot);

    // Tính toán tọa độ hiển thị Context Menu
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    let x = rect.left + rect.width / 2 - menuWidth / 2;
    if (x < 10) x = 10;
    if (x + menuWidth > window.innerWidth - 10) {
      x = window.innerWidth - menuWidth - 10;
    }
    const y = rect.bottom + 6;

    setContextMenu({
      isOpen: true,
      slot,
      position: { x, y },
    });
  };

  const handleOpenVehicleInfo = () => {
    const slot = contextMenu.slot;
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
    setVehicleInfoModal({ isOpen: true, slot });
  };

  const handleOpenReservation = () => {
    const slot = contextMenu.slot;
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
    setReservationModal({ isOpen: true, slot });
  };

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
              Ma trận 3 dãy ô đỗ • {stats.total} vị trí • Nhấn vào ô đỗ để mở menu thao tác
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
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Đang sạc
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
                Phân khu này hiện chưa có dữ liệu ô đỗ.
              </p>
            </div>
            {onAddSlot && isManager && !isCustomer && (
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
                      handleSlotCardClick,
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
                      handleSlotCardClick,
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
                  <span className="text-blue-400">KHU VỰC MỞ RỘNG</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {rowCSlots.map((slot) => {
                    const isMatch = matchesFilter(slot);
                    return renderSlotCard(
                      slot,
                      selectedSlot?.id === slot.label,
                      handleSlotCardClick,
                      isMatch
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 2. CONTEXT MENU 4.5.2 (Popup hiển thị khi click vào ô đỗ xe) */}
      {contextMenu.isOpen && contextMenu.slot && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            left: `${contextMenu.position.x}px`,
            top: `${contextMenu.position.y}px`,
          }}
          className="z-50 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 px-1 min-w-[200px] text-xs font-sans text-slate-800 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 mb-1 border-b border-slate-100">
            <span className="block font-bold text-slate-900 text-xs font-mono">
              Ô đỗ {contextMenu.slot.label || contextMenu.slot.code}
            </span>
            <span className="block text-3xs text-slate-400">
              Trạng thái: <strong>{contextMenu.slot.statusText || contextMenu.slot.status}</strong>
            </span>
          </div>

          <div className="space-y-0.5">
            {/* Tùy chọn 1: Xem thông tin phương tiện (MANAGER, EMPLOYEE) */}
            {!isCustomer && (
              <button
                type="button"
                onClick={handleOpenVehicleInfo}
                className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition cursor-pointer text-left"
              >
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Xem thông tin phương tiện</span>
              </button>
            )}

            {/* Tùy chọn 2: Đăng ký đỗ xe (MANAGER, EMPLOYEE, CUSTOMER) */}
            <button
              type="button"
              onClick={handleOpenReservation}
              className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium transition cursor-pointer text-left"
            >
              <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đăng ký đỗ xe</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. MODAL XEM THÔNG TIN XE (4.5.2) */}
      {vehicleInfoModal.isOpen && vehicleInfoModal.slot && (
        <BaseModal
          isOpen={vehicleInfoModal.isOpen}
          onClose={() => setVehicleInfoModal({ isOpen: false, slot: null })}
          title={`Thông tin phương tiện — Ô ${vehicleInfoModal.slot.label || vehicleInfoModal.slot.code}`}
          description={`Chi tiết phương tiện và trạng thái tại ô đỗ ${vehicleInfoModal.slot.code}`}
          size="md"
        >
          <div className="space-y-4 pt-2 font-sans text-xs">
            {vehicleInfoModal.slot.status === "AVAILABLE" ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Ô đỗ hiện đang trống
                </h4>
                <p className="text-emerald-700">
                  Vị trí {vehicleInfoModal.slot.label || vehicleInfoModal.slot.code} hiện chưa có phương tiện nào đang đỗ hoặc chiếm dụng.
                </p>
              </div>
            ) : vehicleInfoModal.slot.status === "OCCUPIED" ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-2xs text-rose-500 font-semibold uppercase">
                        Biển số xe đang đỗ
                      </span>
                      <span className="text-base font-bold text-rose-900 font-mono">
                        {vehicleInfoModal.slot.plate || vehicleInfoModal.slot.licensePlate || "Chưa ghi nhận"}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-3xs font-bold bg-rose-200 text-rose-800">
                    ĐANG ĐỖ
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-slate-400 text-2xs">Thời gian đỗ</span>
                    <span className="font-semibold text-slate-800">
                      {vehicleInfoModal.slot.duration || "Đang tính..."}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-2xs">Cảnh báo quá hạn</span>
                    <span
                      className={`font-semibold ${
                        vehicleInfoModal.slot.isOverstay ? "text-amber-600 font-bold" : "text-emerald-600"
                      }`}
                    >
                      {vehicleInfoModal.slot.isOverstay ? "Đỗ quá 24h" : "Bình thường"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-2xs">Loại ô đỗ</span>
                    <span className="font-semibold text-slate-800">
                      {vehicleInfoModal.slot.slot_kind || "STANDARD"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-2xs">Chủ xe / Người gửi</span>
                    <span className="font-semibold text-slate-800">
                      {vehicleInfoModal.slot.reservedBy || "Khách vãng lai"}
                    </span>
                  </div>
                </div>
              </div>
            ) : vehicleInfoModal.slot.status === "RESERVED" ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Ô đỗ đã được đặt trước</span>
                </div>
                <p className="text-amber-700">
                  Người đặt: <strong>{vehicleInfoModal.slot.reservedBy || "Khách hàng"}</strong>
                </p>
                {vehicleInfoModal.slot.reservedTime && (
                  <p className="text-amber-700">
                    Thời gian: {formatReservedTimeDisplay(vehicleInfoModal.slot.reservedTime)}
                  </p>
                )}
              </div>
            ) : vehicleInfoModal.slot.status === "CHARGING" ? (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2 text-blue-900">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-800">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span>Trạm sạc xe điện đang hoạt động (Đang sạc)</span>
                </div>
                <p>
                  Biển số xe:{" "}
                  <strong className="font-mono">
                    {vehicleInfoModal.slot.plate || vehicleInfoModal.slot.licensePlate || "Chưa ghi nhận"}
                  </strong>
                </p>
                {vehicleInfoModal.slot.duration && (
                  <p>Thời gian đỗ/sạc: {vehicleInfoModal.slot.duration}</p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-2 text-slate-700">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Wrench className="w-4 h-4 text-slate-600" />
                  <span>Ô đỗ đang bảo trì kỹ thuật</span>
                </div>
                <p>Vị trí này tạm thời không tiếp nhận đỗ xe.</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setVehicleInfoModal({ isOpen: false, slot: null })}
              >
                Đóng
              </Button>
            </div>
          </div>
        </BaseModal>
      )}

      {/* 4. MODAL ĐĂNG KÝ ĐỖ XE (4.5.2 Option 2) */}
      {reservationModal.isOpen && reservationModal.slot && (
        <ReserveSlotModal
          key={reservationModal.slot.id || reservationModal.slot.code}
          isOpen={reservationModal.isOpen}
          onClose={() => setReservationModal({ isOpen: false, slot: null })}
          slot={reservationModal.slot}
          selectedFloor={selectedFloor}
          selectedZone={selectedZone}
          onSuccess={onReservationSuccess}
        />
      )}
    </div>
  );
}
