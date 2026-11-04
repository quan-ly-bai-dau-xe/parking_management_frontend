import { useState } from "react";
import { BaseModal } from "../common/modal";
import { FormInput, FormSelect } from "../common/form";
import Button from "../common/button/Button";
import {
  PARKING_FLOOR_OPTIONS,
  PARKING_ZONE_OPTIONS,
  SLOT_STATUS_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from "../../constants/parkingLotConstants";

export default function AddSlotModal({
  isOpen,
  onClose,
  selectedFloor = "B1",
  selectedZone = "A",
  onAdd,
}) {
  const [formData, setFormData] = useState({
    floor: selectedFloor,
    zone: selectedZone,
    row: "A",
    code: "",
    type: "STANDARD",
    status: "AVAILABLE",
    plate: "",
    note: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setError("Vui lòng nhập mã ô đỗ xe (ví dụ: A-09).");
      return;
    }

    const code = formData.code.trim().toUpperCase();
    const row = code.includes("-") ? code.split("-")[0] : formData.row || "A";

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
      status: formData.status,
      plate: formData.plate.trim() || null,
      licensePlate: formData.plate.trim() || "—",
      note: formData.note.trim() || "",
      parkingLot: "Bãi xe Smart Mobility",
    });

    setFormData({
      floor: selectedFloor,
      zone: selectedZone,
      row: "A",
      code: "",
      type: "STANDARD",
      status: "AVAILABLE",
      plate: "",
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
            options={PARKING_FLOOR_OPTIONS}
          />
          <FormSelect
            label="Khu vực"
            value={formData.zone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, zone: e.target.value }))
            }
            options={PARKING_ZONE_OPTIONS}
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

        <div className="grid grid-cols-2 gap-3">
          <FormSelect
            label="Trạng thái ban đầu"
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, status: e.target.value }))
            }
            options={SLOT_STATUS_OPTIONS}
          />
          <FormInput
            label="Biển số xe (nếu có)"
            placeholder="Ví dụ: 30A-999.99"
            value={formData.plate}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, plate: e.target.value }))
            }
          />
        </div>

        <FormInput
          label="Ghi chú"
          placeholder="Ghi chú thêm..."
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
