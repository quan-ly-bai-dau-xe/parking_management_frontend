import { useState } from "react";
import { BaseModal } from "../common/modal";
import { FormInput, FormSelect } from "../common/form";
import Button from "../common/button/Button";
import {
  SLOT_STATUS,
  SLOT_STATUS_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
} from "../../constants/parkingLotConstants";
import { useCurrentUser } from "../../hooks/useCurrentUser";

function EditSlotForm({ slot, onClose, onSave }) {
  const { isManager } = useCurrentUser();
  const [formData, setFormData] = useState({
    status: slot?.status ?? "",
    plate: slot?.plate ?? slot?.licensePlate ?? "",
    type: slot?.type ?? slot?.slot_kind ?? "",
    reservedBy: slot?.reservedBy ?? "",
    note: slot?.note ?? slot?.notes ?? "",
  });

  // Khóa lạm quyền Trạng thái Ô đỗ:
  // - Quản lý (Manager): Có toàn quyền điều chỉnh các trạng thái PATCH hợp lệ của Backend
  //   (loại trừ OVERSTAY vì OVERSTAY chỉ là filter cảnh báo, không thuộc ParkingSlot.STATUS_CHOICES).
  // - Nhân viên (Employee): Chỉ được phép thao tác trạng thái vận hành kỹ thuật (AVAILABLE, MAINTENANCE).
  //   Tuyệt đối không được tự ý can thiệp các trạng thái hệ thống: OCCUPIED (Đang đỗ), OVERSTAY (Quá giờ), RESERVED (Đặt trước).
  const patchableStatusOptions = SLOT_STATUS_OPTIONS.filter(
    (opt) => opt.value !== SLOT_STATUS.OVERSTAY
  );
  const allowedStatusOptions = isManager
    ? patchableStatusOptions
    : patchableStatusOptions.filter((opt) =>
        [SLOT_STATUS.AVAILABLE, SLOT_STATUS.MAINTENANCE].includes(opt.value)
      );

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
          helperText={
            !isManager
              ? "Nhân viên chỉ có quyền chuyển đổi giữa Trống và Bảo trì."
              : ""
          }
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              status: e.target.value,
            }))
          }
          options={[
            { value: "", label: "-- Chọn trạng thái ô đỗ --" },
            ...allowedStatusOptions,
          ]}
        />

        <FormSelect
          label="Loại xe / Ô đỗ"
          value={formData.type}
          disabled={!isManager}
          helperText={
            !isManager
              ? "Chỉ Quản lý (Manager) mới có quyền thay đổi phân loại hạ tầng ô đỗ."
              : ""
          }
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              type: e.target.value,
            }))
          }
          options={[
            { value: "", label: "-- Chọn loại ô đỗ --" },
            ...VEHICLE_TYPE_OPTIONS,
          ]}
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
