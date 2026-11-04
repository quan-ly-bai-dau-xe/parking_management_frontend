import { useState } from "react";
import { BaseModal } from "../common/modal";
import { FormInput, FormSelect } from "../common/form";
import Button from "../common/button/Button";
import {
  SLOT_STATUS_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from "../../constants/parkingLotConstants";

function EditSlotForm({ slot, onClose, onSave }) {
  const [formData, setFormData] = useState({
    status: slot?.status || "AVAILABLE",
    plate: slot?.plate || slot?.licensePlate || "",
    type: slot?.type || slot?.slot_kind || "STANDARD",
    reservedBy: slot?.reservedBy || "",
    note: slot?.note || slot?.notes || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!slot) return;
    onSave?.({
      ...slot,
      ...formData,
      licensePlate: formData.plate || "—",
      plate: formData.plate,
    });
    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <FormSelect
          label="Trạng thái"
          value={formData.status}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              status: e.target.value,
            }))
          }
          options={SLOT_STATUS_OPTIONS}
        />

        <FormSelect
          label="Loại xe / Ô đỗ"
          value={formData.type}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              type: e.target.value,
            }))
          }
          options={VEHICLE_TYPE_OPTIONS}
        />
      </div>

      <FormInput
        label="Biển số xe"
        placeholder="Ví dụ: 30A-123.45"
        value={formData.plate}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            plate: e.target.value,
          }))
        }
      />

      <FormInput
        label="Người đặt trước"
        placeholder="Tên khách hàng hoặc mã đặt chỗ..."
        value={formData.reservedBy}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            reservedBy: e.target.value,
          }))
        }
      />

      <FormInput
        label="Ghi chú"
        placeholder="Ghi chú thêm..."
        value={formData.note}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            note: e.target.value,
          }))
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
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}

export default function EditSlotModal({ isOpen, onClose, slot, onSave }) {
  const slotKey = slot?.id || slot?.slotId || slot?.label || "edit-slot";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chỉnh sửa ô đỗ ${slot?.label || slot?.code || slot?.id || ""}`}
      description="Cập nhật trạng thái, thông tin xe và ghi chú cho ô đỗ"
      size="md"
    >
      <EditSlotForm
        key={slotKey}
        slot={slot}
        onClose={onClose}
        onSave={onSave}
      />
    </BaseModal>
  );
}
