import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarCheck, Car, Clock } from "lucide-react";
import { BaseModal } from "../common/modal";
import { Button, FormInput } from "../common";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useToast } from "../../context/ToastContext";
import { ROUTES } from "../../config/navigation";
import { reserveSlot } from "../../services/parkingLotService";
import { lookupVehicleByPlate } from "../../services/plateScanService";
import { walletService, extractApiErrorInfo } from "../../services/walletService";

function toLocalDateTimeInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDefaultWindow() {
  const now = new Date();
  now.setSeconds(0, 0);
  const start = new Date(now.getTime() + 5 * 60 * 1000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return {
    from: toLocalDateTimeInputValue(start),
    until: toLocalDateTimeInputValue(end),
  };
}

function getAllowedSlotTypeCodes(slot) {
  if (!slot) return [];
  const raw = Array.isArray(slot.vehicle_types) && slot.vehicle_types.length > 0
    ? slot.vehicle_types
    : Array.isArray(slot.allowed_vehicle_types)
      ? slot.allowed_vehicle_types.map((t) => (typeof t === "string" ? t : t?.code || t?.vehicle_type_code))
      : [];
  return raw
    .map((t) => String(t || "").trim().toUpperCase())
    .filter(Boolean);
}

/**
 * ReserveSlotModal (SRS 4.5.2)
 * Modal đặt chỗ ô đỗ xe:
 * - CUSTOMER: chọn xe từ danh sách xe cá nhân (/api/v1/me/vehicles/)
 * - EMPLOYEE/MANAGER: nhập biển số xe & tự động kiểm tra loại xe qua lookup
 * - Chọn thời gian bắt đầu / kết thúc (reserved_from, reserved_until)
 * - Validate loại xe phù hợp với slot_allowed_vehicle_type
 * - Giữ modal mở khi gặp lỗi (đặc biệt 409 PROP-4.5.2-P05) để hiển thị rõ thông báo
 */
export default function ReserveSlotModal({
  isOpen,
  onClose,
  slot,
  selectedFloor,
  selectedZone,
  onSuccess,
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useCurrentUser();
  const isCustomer = role === "CUSTOMER";

  const [myVehicles, setMyVehicles] = useState([]);
  const [vehicleTypeCodeById, setVehicleTypeCodeById] = useState({});
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(() => Boolean(isOpen && isCustomer));

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [licensePlateInput, setLicensePlateInput] = useState("");
  const [lookedUpVehicle, setLookedUpVehicle] = useState(null);
  const [isLookingUpPlate, setIsLookingUpPlate] = useState(false);

  const [reservedFrom, setReservedFrom] = useState(() => getDefaultWindow().from);
  const [reservedUntil, setReservedUntil] = useState(() => getDefaultWindow().until);
  const [reservedName, setReservedName] = useState("");
  const [reservedPhone, setReservedPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load customer vehicles asynchronously when modal is open for CUSTOMER
  useEffect(() => {
    if (!isOpen || !slot || !isCustomer) return undefined;

    let isMounted = true;
    Promise.all([walletService.getMyVehicles(), walletService.getMyVehicleTypes()])
      .then(([vehiclesRes, typesRes]) => {
        if (!isMounted) return;
        const vList = Array.isArray(vehiclesRes) ? vehiclesRes : [];
        const tMap = {};
        (Array.isArray(typesRes) ? typesRes : []).forEach((t) => {
          if (t?.id && t?.code) {
            tMap[Number(t.id)] = String(t.code).toUpperCase();
          }
        });
        setVehicleTypeCodeById(tMap);
        setMyVehicles(vList);
        if (vList.length > 0) {
          setSelectedVehicleId(String(vList[0].id));
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        const info = extractApiErrorInfo(err, "Không thể tải danh sách xe của bạn.");
        setFormError(info.message);
      })
      .finally(() => {
        if (isMounted) setIsLoadingVehicles(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen, slot, isCustomer]);

  const allowedTypeCodes = useMemo(() => getAllowedSlotTypeCodes(slot), [slot]);

  const selectedCustomerVehicle = useMemo(() => {
    if (!isCustomer || !selectedVehicleId) return null;
    return myVehicles.find((v) => String(v.id) === String(selectedVehicleId)) || null;
  }, [isCustomer, myVehicles, selectedVehicleId]);

  const activeVehicleTypeCode = useMemo(() => {
    if (isCustomer && selectedCustomerVehicle) {
      return (
        vehicleTypeCodeById[Number(selectedCustomerVehicle.vehicle_type_id)] ||
        String(selectedCustomerVehicle.vehicle_type_code || selectedCustomerVehicle.vehicle_type || "").toUpperCase()
      );
    }
    if (!isCustomer && lookedUpVehicle?.vehicle) {
      return String(
        lookedUpVehicle.vehicle.vehicle_type_code ||
          lookedUpVehicle.vehicle.vehicle_type ||
          ""
      ).toUpperCase();
    }
    return "";
  }, [isCustomer, selectedCustomerVehicle, vehicleTypeCodeById, lookedUpVehicle]);

  const vehicleTypeMismatchMessage = useMemo(() => {
    if (!activeVehicleTypeCode || allowedTypeCodes.length === 0) return "";
    if (!allowedTypeCodes.includes(activeVehicleTypeCode)) {
      return `Loại phương tiện (${activeVehicleTypeCode}) không tương thích với ô đỗ này (cho phép: ${allowedTypeCodes.join(", ")}).`;
    }
    return "";
  }, [activeVehicleTypeCode, allowedTypeCodes]);

  const handleStaffPlateBlur = async () => {
    const clean = licensePlateInput.trim().toUpperCase();
    if (isCustomer || !clean) {
      setLookedUpVehicle(null);
      return;
    }
    setIsLookingUpPlate(true);
    try {
      const res = await lookupVehicleByPlate(clean);
      setLookedUpVehicle(res || null);
      if (res?.customer) {
        if (!reservedName && res.customer.full_name) {
          setReservedName(res.customer.full_name);
        }
        if (!reservedPhone && res.customer.phone) {
          setReservedPhone(res.customer.phone);
        }
      }
    } catch {
      setLookedUpVehicle(null);
    } finally {
      setIsLookingUpPlate(false);
    }
  };

  if (!isOpen || !slot) return null;

  const isHardBlockedStatus =
    slot.status === "MAINTENANCE" ||
    slot.status === "OCCUPIED" ||
    slot.status === "CHARGING";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (isCustomer) {
      if (!selectedCustomerVehicle) {
        setFormError("Vui lòng chọn phương tiện cần đặt chỗ.");
        return;
      }
    } else if (!licensePlateInput.trim()) {
      setFormError("Vui lòng nhập biển số xe đã đăng ký.");
      return;
    }

    if (vehicleTypeMismatchMessage) {
      setFormError(vehicleTypeMismatchMessage);
      return;
    }

    const fromDate = new Date(reservedFrom);
    const untilDate = new Date(reservedUntil);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(untilDate.getTime())) {
      setFormError("Vui lòng chọn thời gian bắt đầu và kết thúc hợp lệ.");
      return;
    }
    if (untilDate <= fromDate) {
      setFormError("Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");
      return;
    }
    if (untilDate <= new Date()) {
      setFormError("Thời gian kết thúc phải lớn hơn thời điểm hiện tại.");
      return;
    }

    const slotId = slot.numericId || slot.id;
    const payload = {
      reserved_from: fromDate.toISOString(),
      reserved_until: untilDate.toISOString(),
    };
    if (isCustomer && selectedCustomerVehicle) {
      payload.vehicle_id = Number(selectedCustomerVehicle.id);
    } else {
      if (lookedUpVehicle?.vehicle?.id) {
        payload.vehicle_id = Number(lookedUpVehicle.vehicle.id);
      }
      payload.license_plate = licensePlateInput.trim().toUpperCase();
    }
    if (reservedName.trim()) payload.reserved_name = reservedName.trim();
    if (reservedPhone.trim()) payload.reserved_phone = reservedPhone.trim();
    if (notes.trim()) payload.notes = notes.trim();

    setIsSubmitting(true);
    try {
      const created = await reserveSlot(slotId, payload);
      toast.success(
        `Đã đăng ký đặt chỗ thành công cho ô ${slot.label || slot.code} (${created?.code || ""}).`
      );
      if (onSuccess) {
        await onSuccess(created);
      }
      onClose();
    } catch (err) {
      const info = extractApiErrorInfo(
        err,
        "Không thể đăng ký đặt chỗ. Vui lòng thử lại."
      );
      setFormError(info.message);
      toast.error(info.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      isBusy={isSubmitting}
      title={`Đăng ký đỗ xe — Ô ${slot.label || slot.code}`}
      description="Đặt chỗ đỗ xe theo khung giờ (kiểm tra trùng lịch GiST)"
      size="md"
    >
      <div className="space-y-4 pt-2 font-sans text-xs">
        {isHardBlockedStatus ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Không thể đăng ký vị trí này</span>
            </div>
            <p className="text-amber-700">
              Vị trí này hiện đang ở trạng thái{" "}
              <strong>{slot.statusText || slot.status}</strong>, không thể tiếp nhận đặt chỗ mới.
            </p>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" className="min-h-[44px]" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Thông tin ô đỗ */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                  Ô {slot.label || slot.code} (Tầng {slot.floor || selectedFloor} - Khu{" "}
                  {slot.zone || selectedZone})
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-3xs font-mono font-bold text-slate-700">
                  {slot.slot_kind || "STANDARD"}
                </span>
              </div>
              {allowedTypeCodes.length > 0 && (
                <p className="text-3xs text-slate-500">
                  Loại xe cho phép:{" "}
                  <strong className="text-slate-700">{allowedTypeCodes.join(", ")}</strong>
                </p>
              )}
            </div>

            {slot.status === "RESERVED" && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-3xs flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Ô đỗ này đang có lịch đặt trước. Chọn khung giờ khác không giao nhau hoặc kiểm tra trùng lịch.
                </span>
              </div>
            )}

            {/* Chọn xe (CUSTOMER) hoặc Nhập biển số (STAFF) */}
            {isCustomer ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="reserve-vehicle-select"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Chọn phương tiện của bạn <span className="text-rose-500">*</span>
                </label>
                {isLoadingVehicles ? (
                  <p className="text-xs text-slate-500 py-2">Đang tải danh sách xe...</p>
                ) : myVehicles.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <p className="text-amber-900">
                      Bạn chưa đăng ký phương tiện nào trong tài khoản.
                    </p>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() => {
                        onClose();
                        navigate(ROUTES.CUSTOMER_VEHICLE);
                      }}
                    >
                      Thêm phương tiện ngay
                    </Button>
                  </div>
                ) : (
                  <select
                    id="reserve-vehicle-select"
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {myVehicles.map((v) => {
                      const tCode =
                        vehicleTypeCodeById[Number(v.vehicle_type_id)] ||
                        v.vehicle_type_name ||
                        v.vehicle_type ||
                        "";
                      return (
                        <option key={v.id} value={v.id}>
                          {v.license_plate} — {v.model_name || "Ô tô"} ({tCode})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <FormInput
                  label="Biển số xe đã đăng ký"
                  placeholder="Ví dụ: 51A-123.45"
                  value={licensePlateInput}
                  onChange={(e) => setLicensePlateInput(e.target.value.toUpperCase())}
                  onBlur={handleStaffPlateBlur}
                  required
                />
                {isLookingUpPlate && (
                  <span className="text-3xs text-slate-400">Đang kiểm tra xe...</span>
                )}
                {lookedUpVehicle?.vehicle && (
                  <div className="flex items-center gap-2 text-3xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                    <Car className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Xe: <strong>{lookedUpVehicle.vehicle.license_plate}</strong> (
                      {lookedUpVehicle.vehicle.vehicle_type_code ||
                        lookedUpVehicle.vehicle.vehicle_type}
                      ) — Chủ xe: {lookedUpVehicle.customer?.full_name || "N/A"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Thời gian bắt đầu và kết thúc */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reserved-from"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Thời gian bắt đầu <span className="text-rose-500">*</span>
                </label>
                <input
                  id="reserved-from"
                  type="datetime-local"
                  value={reservedFrom}
                  onChange={(e) => setReservedFrom(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="reserved-until"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Thời gian kết thúc <span className="text-rose-500">*</span>
                </label>
                <input
                  id="reserved-until"
                  type="datetime-local"
                  value={reservedUntil}
                  onChange={(e) => setReservedUntil(e.target.value)}
                  required
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {!isCustomer && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="Người đặt (tùy chọn)"
                  placeholder="Nguyễn Văn A"
                  value={reservedName}
                  onChange={(e) => setReservedName(e.target.value)}
                />
                <FormInput
                  label="Số điện thoại (tùy chọn)"
                  placeholder="0912345678"
                  value={reservedPhone}
                  onChange={(e) => setReservedPhone(e.target.value)}
                />
              </div>
            )}

            <FormInput
              label="Ghi chú (tùy chọn)"
              placeholder="Ghi chú thêm..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {(vehicleTypeMismatchMessage || formError) && (
              <div
                data-testid="reserve-slot-error"
                className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError || vehicleTypeMismatchMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-[44px]"
                disabled={isSubmitting}
                onClick={onClose}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="min-h-[44px]"
                disabled={
                  isSubmitting ||
                  Boolean(vehicleTypeMismatchMessage) ||
                  (isCustomer && myVehicles.length === 0)
                }
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận đặt chỗ"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </BaseModal>
  );
}
