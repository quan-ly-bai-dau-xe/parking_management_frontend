import { useState, useEffect, useMemo, useRef } from "react";
import BaseModal from "../common/modal/BaseModal";
import Button from "../common/button/Button";
import ParkingSlotPicker from "../common/parking/ParkingSlotPicker";
import { getAvailableSlotsForCheckIn } from "../../services/parkingSessionService";
import { isMockEnabled } from "../../config/appConfig";

export default function AssignSlotModal({ isOpen, onClose, vehicle, onAssignSlot }) {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
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

  const loadKey = isOpen ? `${vehicleTypeCode}|${vehicle?.licensePlate || ""}` : null;
  const [prevLoadKey, setPrevLoadKey] = useState(null);
  if (loadKey !== prevLoadKey) {
    setPrevLoadKey(loadKey);
    if (loadKey) {
      setIsLoadingSlots(true);
      setErrorMessage("");
      setSelectedSlotId(null);
    }
  }

  // Async slot loading when modal is open
  useEffect(() => {
    if (!isOpen) return undefined;

    let isMounted = true;

    getAvailableSlotsForCheckIn({
      vehicleTypeCode,
      licensePlate: vehicle?.licensePlate || "",
      filterReserved: true,
    })
      .then((slots) => {
        if (!isMounted) return;
        setAvailableSlots(slots || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Could not load available slots:", err);
        setErrorMessage(
          err?.response?.status === 404 || err?.message?.includes("404")
            ? "Backend chưa hỗ trợ API ô đỗ xe (/api/v1/parking/slots/). Không thể tải danh sách ô đỗ thực tế."
            : err?.message || "Không thể tải danh sách ô đỗ trống. Vui lòng thử lại."
        );
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, vehicleTypeCode, vehicle?.licensePlate]);

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

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      isBusy={isSubmitting}
      title="Chỉ định vị trí ô đỗ"
      description="Xếp xe đang có mặt trong bãi vào ô đỗ thực tế khả dụng"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-2xs text-slate-500 font-medium">
            {selectedSlot
              ? `Đã chọn: ${selectedSlot.floor} · ${selectedSlot.zone} · ${selectedSlot.code}`
              : "Vui lòng chọn 1 ô đỗ bên trên"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={!selectedSlot || isSubmitting}
            >
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
                  {vehicle.model && vehicle.model !== "—"
                    ? `${vehicle.brand || ""} ${vehicle.model}`
                    : "Phương tiện"}
                </span>
                <span className="text-2xs text-slate-500 block">
                  Chủ xe: {vehicle.customer?.name || "Khách vãng lai"}
                </span>
              </div>
            </div>
            <span className="text-2xs font-semibold px-2.5 py-1 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
              {vehicle.brand || "Ô tô"}
            </span>
          </div>
        )}

        {/* Badge đánh dấu chế độ dữ liệu ô đỗ */}
        {isMockEnabled("parkingLot") ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-3xs px-3 py-1.5 rounded-lg flex items-center justify-between">
            <span className="font-medium">
              ℹ️ Đang hiển thị danh sách ô đỗ mô phỏng (Sandbox). Backend chưa mở route <code>/api/v1/parking/slots/</code>.
            </span>
            <span className="font-semibold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded text-4xs uppercase tracking-wider">
              Mô phỏng
            </span>
          </div>
        ) : null}

        {errorMessage && (
          <div className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Bộ chọn ô đỗ trực quan dùng chung */}
        <ParkingSlotPicker
          availableSlots={availableSlots}
          selectedSlotId={selectedSlotId}
          onSelectSlot={(id) => setSelectedSlotId(id)}
          isLoading={isLoadingSlots}
          maxHeight="max-h-[220px]"
          columns="grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
        />
      </div>
    </BaseModal>
  );
}
