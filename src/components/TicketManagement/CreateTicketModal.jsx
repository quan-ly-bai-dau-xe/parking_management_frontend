import { useState, useMemo } from "react";
import { BaseModal } from "../common/modal";
import { FormInput, FormSelect, SearchableCombobox, Button } from "../common";
import { mockCustomers } from "../../mocks/customerData";
import { mockParkingFloors } from "../../mocks/parkingLotData";

export default function CreateTicketModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    customer: "",
    vehicle: "",
    ticketType: "Vé tháng",
    parkingSlot: "Tầng B1 - A-06",
    startDate: "2026-05-01",
    endDate: "2026-06-01",
    price: "500000",
    note: "",
  });

  // 1. Danh sách khách hàng dạng SearchableCombobox
  const customerOptions = useMemo(() => {
    return mockCustomers.map((c) => ({
      value: c.customerCode,
      label: c.name,
      badge: c.customerCode,
      subLabel: `SĐT: ${c.phone || "Chưa có"} · ${c.vehicles?.length || 0} phương tiện`,
      raw: c,
    }));
  }, []);

  // 2. Danh sách xe: linh hoạt theo khách hàng đã chọn dạng SearchableCombobox
  const vehicleOptions = useMemo(() => {
    if (!formData.customer) {
      // Khi chưa chọn khách hàng cụ thể: gộp tất cả xe của toàn bộ khách hàng
      return mockCustomers.flatMap((c) =>
        (c.vehicles || []).map((v) => ({
          value: v.licensePlate,
          label: v.licensePlate,
          badge: v.vehicleType,
          subLabel: `Chủ xe: ${c.name} (${c.customerCode})`,
          ownerCode: c.customerCode,
        })),
      );
    }
    const selectedCust = mockCustomers.find(
      (c) => c.customerCode === formData.customer,
    );
    if (!selectedCust || !selectedCust.vehicles?.length) {
      return [];
    }
    return selectedCust.vehicles.map((v) => ({
      value: v.licensePlate,
      label: v.licensePlate,
      badge: v.vehicleType,
      subLabel: `Chủ xe: ${selectedCust.name}`,
      ownerCode: selectedCust.customerCode,
    }));
  }, [formData.customer]);

  // 3. Danh sách vị trí đỗ xe chuẩn hóa từ mockParkingFloors dạng SearchableCombobox
  const parkingSlotOptions = useMemo(() => {
    const options = [];
    mockParkingFloors.forEach((floor) => {
      (floor.zones || []).forEach((zone) => {
        (zone.slots || []).forEach((slot) => {
          const typeName =
            slot.type === "EV_CHARGING"
              ? "Sạc điện"
              : slot.type === "RESERVED"
              ? "Ưu tiên"
              : "Tiêu chuẩn";
          const statusText =
            slot.status === "OCCUPIED"
              ? "Đang đỗ"
              : slot.status === "MAINTENANCE"
              ? "Bảo trì"
              : "Trống";
          const value = `${floor.floorName} - ${slot.slotId}`;
          options.push({
            value,
            label: `${floor.floorName} - Ô ${slot.slotId}`,
            badge: typeName,
            subLabel: `${zone.zoneName} · Trạng thái: ${statusText}`,
          });
        });
      });
    });

    // Bổ sung các slot mặc định nếu mock danh mục ngắn
    if (options.length === 0) {
      return [
        { value: "Tầng B1 - A-06", label: "Tầng B1 - Ô A-06", badge: "Tiêu chuẩn", subLabel: "Khu A" },
        { value: "Tầng B1 - A-07", label: "Tầng B1 - Ô A-07", badge: "Tiêu chuẩn", subLabel: "Khu A" },
        { value: "Tầng B1 - B-03", label: "Tầng B1 - Ô B-03", badge: "Ưu tiên", subLabel: "Khu B" },
        { value: "Tầng B1 - C-04", label: "Tầng B1 - Ô C-04", badge: "Sạc điện", subLabel: "Khu C" },
        { value: "Tầng B2 - A-05", label: "Tầng B2 - Ô A-05", badge: "Tiêu chuẩn", subLabel: "Khu A" },
      ];
    }
    return options;
  }, []);

  const handleCustomerChange = (customerCode) => {
    setFormData((prev) => {
      const next = { ...prev, customer: customerCode };
      if (!customerCode) {
        next.vehicle = "";
      } else {
        const cust = mockCustomers.find((c) => c.customerCode === customerCode);
        next.vehicle = cust?.vehicles?.[0]?.licensePlate || "";
      }
      return next;
    });
  };

  const handleVehicleChange = (licensePlate, opt) => {
    setFormData((prev) => {
      const next = { ...prev, vehicle: licensePlate };
      // Nếu xe được chọn thuộc về 1 khách hàng cụ thể và chưa chọn KH, tự động điền KH đó
      if (opt?.ownerCode && !prev.customer) {
        next.customer = opt.ownerCode;
      }
      return next;
    });
  };

  const handleSlotChange = (slotValue) => {
    setFormData((prev) => ({ ...prev, parkingSlot: slotValue }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(formData);
    onClose();
  };

  const TICKET_TYPE_OPTIONS = [
    { value: "Vé ngày", label: "Vé ngày" },
    { value: "Vé tháng", label: "Vé tháng" },
    { value: "Vé quý", label: "Vé quý" },
    { value: "Vé năm", label: "Vé năm" },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm vé mới"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SearchableCombobox
            label="Khách hàng"
            required
            options={customerOptions}
            value={formData.customer}
            onChange={handleCustomerChange}
            placeholder="Tìm theo tên, SĐT, mã KH..."
            emptyText="Không tìm thấy khách hàng nào"
          />

          <SearchableCombobox
            label="Phương tiện"
            required
            options={vehicleOptions}
            value={formData.vehicle}
            onChange={handleVehicleChange}
            placeholder="Tìm theo biển số, loại xe..."
            emptyText={
              formData.customer
                ? "Khách hàng này chưa có xe đăng ký"
                : "Không tìm thấy phương tiện nào"
            }
          />

          <FormSelect
            label="Loại vé"
            name="ticketType"
            value={formData.ticketType}
            onChange={handleChange}
            options={TICKET_TYPE_OPTIONS}
            placeholder="Chọn loại vé"
            required
          />

          <SearchableCombobox
            label="Vị trí đỗ xe"
            options={parkingSlotOptions}
            value={formData.parkingSlot}
            onChange={handleSlotChange}
            placeholder="Tìm theo tầng, khu, mã ô, loại ô..."
            emptyText="Không tìm thấy vị trí đỗ nào"
          />

          <FormInput
            type="date"
            label="Ngày hiệu lực"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            required
          />

          <FormInput
            type="date"
            label="Ngày hết hạn"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            required
          />

          <FormInput
            type="number"
            label="Giá vé"
            name="price"
            value={formData.price}
            onChange={handleChange}
            className="font-mono"
            required
          />

          <FormInput
            label="Ghi chú"
            name="note"
            placeholder="Nhập ghi chú (nếu có)..."
            value={formData.note}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary">
            Lưu vé
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
