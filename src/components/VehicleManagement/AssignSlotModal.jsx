import { useState, useEffect, useMemo, useRef } from "react";
import BaseModal from "../common/modal/BaseModal";
import Button from "../common/button/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import { getAvailableSlotsForCheckIn } from "../../services/parkingSessionService";

export default function AssignSlotModal({ isOpen, onClose, vehicle, onAssignSlot }) {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dual-layer guard: actionPendingRef blocks synchronous multi-clicks before React re-render
  const actionPendingRef = useRef(false);

  const vehicleTypeCode = useMemo(() => {
    if (!vehicle) return "CAR";
    const typeStr = String(vehicle.vehicleTypeCode || vehicle.vehicleType || "").toUpperCase();
    return typeStr.includes("EV") || typeStr.includes("ĐIỆN") ? "EV" : "CAR";
  }, [vehicle]);

  // Async slot loading when modal is open
  useEffect(() => {
    if (!isOpen) return undefined;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingSlots(true);
    setErrorMessage("");
    setSelectedSlotId(null);

    getAvailableSlotsForCheckIn({
      vehicleTypeCode,
      licensePlate: vehicle?.licensePlate || "",
      filterReserved: true,
    })
      .then((slots) => {
        if (!isMounted) return;
        setAvailableSlots(slots || []);
        if (slots?.length > 0) setSelectedFloor(slots[0].floor || "");
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Could not load available slots:", err);
        setErrorMessage("Không thể tải danh sách ô đỗ trống. Vui lòng thử lại.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, vehicleTypeCode, vehicle?.licensePlate]);

  const floorOptions = useMemo(() => Array.from(new Set(availableSlots.map((s) => s.floor).filter(Boolean))), [availableSlots]);
  const zoneOptions = useMemo(() => {
    const byFloor = selectedFloor ? availableSlots.filter((s) => s.floor === selectedFloor) : availableSlots;
    return Array.from(new Set(byFloor.map((s) => s.zone).filter(Boolean)));
  }, [availableSlots, selectedFloor]);

  const filteredSlots = useMemo(() => availableSlots.filter((slot) => {
    if (selectedFloor && slot.floor !== selectedFloor) return false;
    if (selectedZone && slot.zone !== selectedZone) return false;
    return true;
  }), [availableSlots, selectedFloor, selectedZone]);

  const selectedSlot = useMemo(() => availableSlots.find((s) => s.id === selectedSlotId) || null, [availableSlots, selectedSlotId]);

  const handleConfirm = async () => {
    if (!selectedSlot || !vehicle || actionPendingRef.current) return;
    actionPendingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await onAssignSlot({ vehicle, slot: selectedSlot });
      onClose();
    } catch (err) {
      setErrorMessage(err?.data?.message || err?.message || "Không thể xếp ô đỗ cho xe này.");
    } finally {
      actionPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const renderFilterButtons = (options, selectedValue, onSelect, showAllOption = false) => (
    <div className="flex items-center gap-1">
      {showAllOption && (
        <button
          type="button"
          onClick={() => onSelect("")}
          className={`px-2 py-0.5 rounded text-2xs font-semibold cursor-pointer border transition-colors ${
            !selectedValue
              ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          Tất cả
        </button>
      )}
      {options.map((opt) => {
        const isSelected = selectedValue === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`px-2 py-0.5 rounded text-2xs font-semibold cursor-pointer border transition-colors ${
              isSelected
                ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉ định vị trí ô đỗ"
      description="Xếp xe đang có mặt trong bãi vào ô đỗ thực tế khả dụng"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-2xs text-slate-500 font-medium">
            {selectedSlot ? `Đã chọn: ${selectedSlot.floor} · ${selectedSlot.zone} · ${selectedSlot.code}` : "Vui lòng chọn 1 ô đỗ bên trên"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>Hủy bỏ</Button>
            <Button variant="primary" size="sm" onClick={handleConfirm} disabled={!selectedSlot || isSubmitting}>
              {isSubmitting ? "Đang xếp ô..." : "Xác nhận xếp ô"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {vehicle && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-black font-mono px-2.5 py-1 bg-white border border-slate-300 rounded shadow-2xs text-slate-900 tracking-wide">
                {vehicle.licensePlate}
              </span>
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  {vehicle.model && vehicle.model !== "—" ? `${vehicle.brand || ""} ${vehicle.model}` : "Phương tiện"}
                </span>
                <span className="text-2xs text-slate-500 block">Chủ xe: {vehicle.customer?.name || "Khách vãng lai"}</span>
              </div>
            </div>
            <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border ${
              vehicleTypeCode === "EV" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
            }`}>
              {vehicleTypeCode === "EV" ? "⚡ Xe điện (EV)" : "Ô tô"}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 rounded-lg">{errorMessage}</div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {floorOptions.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-2xs font-medium text-slate-500">Tầng:</span>
              {renderFilterButtons(floorOptions, selectedFloor, (fl) => { setSelectedFloor(fl); setSelectedZone(""); })}
            </div>
          )}
          {zoneOptions.length > 1 && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-2xs font-medium text-slate-500">Khu:</span>
              {renderFilterButtons(zoneOptions, selectedZone, setSelectedZone, true)}
            </div>
          )}
        </div>

        {/* Slot Grid */}
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 min-h-[160px] max-h-[240px] overflow-y-auto">
          {isLoadingSlots ? (
            <div className="h-36 flex flex-col items-center justify-center gap-2">
              <LoadingSpinner size="md" />
              <span className="text-xs text-slate-400">Đang tìm các ô đỗ khả dụng...</span>
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center text-slate-400 text-xs">
              <span>Không còn ô đỗ trống nào trong khu vực này.</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {filteredSlots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-400 hover:shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold font-mono ${isSelected ? "text-emerald-800" : "text-slate-800"}`}>
                        {slot.code}
                      </span>
                      {slot.kind === "EV_CHARGING" && (
                        <span className="text-2xs font-bold text-emerald-600" title="Trạm sạc điện EV">⚡</span>
                      )}
                    </div>
                    <span className="text-3xs text-slate-400 mt-1 block truncate">{slot.zone}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
