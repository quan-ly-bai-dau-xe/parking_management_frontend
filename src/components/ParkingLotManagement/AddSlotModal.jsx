import { useState, useEffect } from "react";
import { BaseModal } from "../common/modal";
import { FormInput, FormSelect } from "../common/form";
import Button from "../common/button/Button";
import {
  PARKING_FLOOR_OPTIONS,
  PARKING_ZONE_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from "../../constants/parkingLotConstants";

export default function AddSlotModal({
  isOpen,
  onClose,
  selectedFloor = "B1",
  selectedZone = "A",
  floorOptions = PARKING_FLOOR_OPTIONS,
  zoneOptions = PARKING_ZONE_OPTIONS,
  onAdd,
}) {
  const [formData, setFormData] = useState({
    floor: selectedFloor,
    zone: selectedZone,
    row: "A",
    code: "",
    type: "STANDARD",
    isUnderMaintenance: false,
    maintenanceReason: "",
    note: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        floor: selectedFloor || floorOptions?.[0]?.value || "B1",
        zone: selectedZone || zoneOptions?.[0]?.value || "A",
        isUnderMaintenance: false,
        maintenanceReason: "",
      }));
      setError("");
    }
  }, [isOpen, selectedFloor, selectedZone, floorOptions, zoneOptions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setError("Vui lòng nhập mã ô đỗ xe (ví dụ: A-09).");
      return;
    }

    if (formData.isUnderMaintenance && !formData.maintenanceReason.trim()) {
      setError("Vui lòng nhập lý do bảo trì ô đỗ.");
      return;
    }

    const code = formData.code.trim().toUpperCase();
    const row = code.includes("-") ? code.split("-")[0] : formData.row || "A";

    // Phân tách trạng thái an toàn:
    // Tuyệt đối không cho phép tự ý gán có xe (OCCUPIED) hoặc đặt trước (RESERVED) khi tạo mới.
    // Nếu có bảo trì/chưa nghiệm thu -> MAINTENANCE (kèm lý do bắt buộc).
    // Nếu sẵn sàng đưa vào vận hành -> AVAILABLE.
    const initialStatus = formData.isUnderMaintenance ? "MAINTENANCE" : "AVAILABLE";
    const resolvedNotes = formData.isUnderMaintenance
      ? `[Bảo trì hạ tầng] ${formData.maintenanceReason.trim()}${formData.note ? ` - ${formData.note.trim()}` : ""}`
      : formData.note.trim();

    onAdd?.({
      id: code,
      slotId: code,
      code,
      label: code,
      row,
      floor: formData.floor,
      zone: formData.zone,
      type: formData.type,
      slot_kind: formData.type,
      status: initialStatus,
      plate: null,
      licensePlate: "—",
      note: resolvedNotes,
      parkingLot: "Bãi xe Smart Mobility",
    });

    setFormData({
      floor: selectedFloor,
      zone: selectedZone,
      row: "A",
      code: "",
      type: "STANDARD",
      isUnderMaintenance: false,
      maintenanceReason: "",
      note: "",
    });
    setError("");
    onClose?.();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm ô đỗ xe mới"
      description="Tạo mới ô đỗ trong sơ đồ bãi xe"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <FormSelect
            label="Tầng"
            value={formData.floor}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, floor: e.target.value }))
            }
            options={floorOptions}
          />
          <FormSelect
            label="Khu vực"
            value={formData.zone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, zone: e.target.value }))
            }
            options={zoneOptions}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Mã ô đỗ"
            required
            placeholder="Ví dụ: A-09"
            value={formData.code}
            error={error}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, code: e.target.value }));
              if (error) setError("");
            }}
          />
          <FormSelect
            label="Loại ô đỗ"
            value={formData.type}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, type: e.target.value }))
            }
            options={VEHICLE_TYPE_OPTIONS}
          />
        </div>

        {/* Khóa bảo vệ trạng thái: Không cho phép tự tạo xe ảo hay đặt chỗ ảo */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={formData.isUnderMaintenance}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isUnderMaintenance: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <span>Ô đỗ chưa sẵn sàng khai thác / Đang bảo trì hạ tầng</span>
          </label>

          {formData.isUnderMaintenance ? (
            <div className="pt-1 animate-in fade-in duration-150">
              <FormInput
                label="Lý do bảo trì / chưa nghiệm thu *"
                placeholder="Ví dụ: Đang kẻ vạch, lắp cảm biến, chưa nghiệm thu PCCC..."
                value={formData.maintenanceReason}
                error={error.includes("lý do bảo trì") ? error : ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maintenanceReason: e.target.value,
                  }))
                }
              />
            </div>
          ) : (
            <p className="text-3xs text-slate-500">
              * Ô đỗ sẵn sàng khai thác sẽ được bàn giao trạng thái <strong>Trống (AVAILABLE)</strong> để cổng tự động phân bổ xe khi vào bãi.
            </p>
          )}
        </div>

        <FormInput
          label="Ghi chú thêm"
          placeholder="Thông số kỹ thuật, ký hiệu đặc biệt..."
          value={formData.note}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, note: e.target.value }))
          }
        />

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="cursor-pointer"
          >
            Tạo ô đỗ
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
