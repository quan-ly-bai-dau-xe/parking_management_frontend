import { useState, useMemo, useEffect } from "react";
import { BaseModal } from "../common/modal";
import { FormInput, FormSelect, SearchableCombobox, Button } from "../common";
import { customerService } from "../../services/customerService";
import { parkingLotService } from "../../services/parkingLotService";
import { ticketService, FALLBACK_TICKET_TYPES } from "../../services/ticketService";
import { getTodayIsoDate, addDaysToIsoDate } from "../../utils/ticket/renewTicketUtils";

export default function CreateTicketModal({ isOpen, onClose, onSave }) {
  const initialStartDate = getTodayIsoDate();
  const defaultType = FALLBACK_TICKET_TYPES.find((t) => t.code === "MONTHLY") || FALLBACK_TICKET_TYPES[1] || FALLBACK_TICKET_TYPES[0];
  const initialEndDate = addDaysToIsoDate(initialStartDate, defaultType.duration_days);

  const [formData, setFormData] = useState({
    customer: "",
    vehicle: "",
    ticketType: defaultType.name,
    parkingSlot: "Tầng B1 - A-11",
    startDate: initialStartDate,
    endDate: initialEndDate,
    price: String(defaultType.default_price),
    note: "",
  });

  const [customers, setCustomers] = useState([]);
  const [parkingFloors, setParkingFloors] = useState([]);
  const [ticketTypes, setTicketTypes] = useState(FALLBACK_TICKET_TYPES);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    customerService.getCustomers()
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : res?.results || [];
        setCustomers(list);
      })
      .catch((err) => {
        console.warn("[CreateTicketModal] Không thể tải danh sách khách hàng:", err);
      });

    parkingLotService.getParkingStructure()
      .then((res) => {
        if (!isMounted) return;
        const floors = Array.isArray(res) ? res : res?.floors || [];
        setParkingFloors(floors);
      })
      .catch((err) => {
        console.warn("[CreateTicketModal] Không thể tải sơ đồ bãi xe:", err);
      });

    ticketService.getTicketTypes()
      .then((res) => {
        if (!isMounted) return;
        const types = Array.isArray(res) && res.length > 0 ? res : FALLBACK_TICKET_TYPES;
        setTicketTypes(types);
      })
      .catch((err) => {
        console.warn("[CreateTicketModal] Không thể tải danh mục loại vé, dùng fallback:", err);
        if (isMounted) setTicketTypes(FALLBACK_TICKET_TYPES);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 1. Danh sách khách hàng dạng SearchableCombobox
  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      value: c.customerCode || String(c.id),
      label: c.name,
      badge: c.customerCode,
      subLabel: `SĐT: ${c.phone || "Chưa có"} · ${c.vehicles?.length || 0} phương tiện`,
      raw: c,
    }));
  }, [customers]);

  // 2. Danh sách xe: linh hoạt theo khách hàng đã chọn dạng SearchableCombobox
  const vehicleOptions = useMemo(() => {
    if (!formData.customer) {
      return customers.flatMap((c) =>
        (c.vehicles || []).map((v) => ({
          value: v.licensePlate,
          label: v.licensePlate,
          badge: v.vehicleType,
          subLabel: `Chủ xe: ${c.name} (${c.customerCode})`,
          ownerCode: c.customerCode || String(c.id),
        })),
      );
    }
    const selectedCust = customers.find(
      (c) => (c.customerCode || String(c.id)) === formData.customer,
    );
    if (!selectedCust || !selectedCust.vehicles?.length) {
      return [];
    }
    return selectedCust.vehicles.map((v) => ({
      value: v.licensePlate,
      label: v.licensePlate,
      badge: v.vehicleType,
      subLabel: `Chủ xe: ${selectedCust.name}`,
      ownerCode: selectedCust.customerCode || String(selectedCust.id),
    }));
  }, [formData.customer, customers]);

  // 3. Danh sách vị trí đỗ xe chuẩn hóa từ parkingFloors dạng SearchableCombobox
  const parkingSlotOptions = useMemo(() => {
    const options = [];
    parkingFloors.forEach((floor) => {
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
          const slotIdentifier = slot.slotCode || slot.slotId || slot.id;
          const value = `${floor.floorName || floor.name} - ${slotIdentifier}`;
          options.push({
            value,
            label: `${floor.floorName || floor.name} - Ô ${slotIdentifier}`,
            badge: typeName,
            subLabel: `${zone.zoneName || zone.name} · Trạng thái: ${statusText}`,
          });
        });
      });
    });

    if (options.length === 0) {
      return [
        { value: "Tầng B1 - A-11", label: "Tầng B1 - Ô A-11", badge: "Tiêu chuẩn", subLabel: "Khu A" },
        { value: "Tầng B1 - A-12", label: "Tầng B1 - Ô A-12", badge: "Tiêu chuẩn", subLabel: "Khu A" },
        { value: "Tầng B1 - B-06", label: "Tầng B1 - Ô B-06", badge: "Ưu tiên", subLabel: "Khu B" },
        { value: "Tầng B1 - C-05", label: "Tầng B1 - Ô C-05", badge: "Sạc điện", subLabel: "Khu C" },
        { value: "Tầng B2 - A-11", label: "Tầng B2 - Ô A-11", badge: "Tiêu chuẩn", subLabel: "Khu A" },
      ];
    }
    return options;
  }, [parkingFloors]);

  const handleCustomerChange = (customerCode) => {
    setFormData((prev) => {
      const next = { ...prev, customer: customerCode };
      if (!customerCode) {
        next.vehicle = "";
      } else {
        const cust = customers.find(
          (c) => (c.customerCode || String(c.id)) === customerCode,
        );
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

  const handleTicketTypeChange = (e) => {
    const selectedTypeName = e.target.value;
    const selectedType = ticketTypes.find(
      (t) => t.name === selectedTypeName || t.code === selectedTypeName,
    );
    const durationDays = Number(selectedType?.duration_days) || 30;
    const defaultPrice = selectedType?.default_price != null ? String(selectedType.default_price) : "500000";

    setFormData((prev) => {
      const baseStart = prev.startDate || getTodayIsoDate();
      const nextEndDate = addDaysToIsoDate(baseStart, durationDays);
      return {
        ...prev,
        ticketType: selectedTypeName,
        price: defaultPrice,
        endDate: nextEndDate,
      };
    });
  };

  const handleStartDateChange = (e) => {
    const nextStart = e.target.value;
    const selectedType = ticketTypes.find(
      (t) => t.name === formData.ticketType || t.code === formData.ticketType,
    );
    const durationDays = Number(selectedType?.duration_days) || 30;
    const nextEndDate = nextStart ? addDaysToIsoDate(nextStart, durationDays) : formData.endDate;

    setFormData((prev) => ({
      ...prev,
      startDate: nextStart,
      endDate: nextEndDate,
    }));
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

  const ticketTypeOptions = useMemo(() => {
    return ticketTypes.map((t) => ({
      value: t.name,
      label: `${t.name} (${t.duration_days} ngày - ${Number(t.default_price || 0).toLocaleString("vi-VN")}đ)`,
    }));
  }, [ticketTypes]);

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
            onChange={handleTicketTypeChange}
            options={ticketTypeOptions}
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
            onChange={handleStartDateChange}
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
