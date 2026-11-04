import { INITIAL_VEHICLE_FORM_STATE, DEFAULT_UNASSIGNED_SLOT_LABEL } from "../../constants/vehicleConstants";

/**
 * mapVehicleToFormData
 * Domain-specific mapper: Chuyển đổi dữ liệu Vehicle Entity từ props/API sang Vehicle Form State.
 * 
 * Flow:
 * Vehicle Entity (API/Props)
 *        |
 *        v
 * mapVehicleToFormData()
 *        |
 *        v
 * Vehicle Form State
 *
 * @param {Object|null} vehicle - Đối tượng phương tiện từ API hoặc state cha
 * @returns {Object} State chuẩn cho form nhập liệu phương tiện
 */
export function mapVehicleToFormData(vehicle) {
  if (!vehicle) return { ...INITIAL_VEHICLE_FORM_STATE };

  return {
    licensePlate: vehicle.licensePlate || "",
    model: vehicle.model && vehicle.model !== "—" ? vehicle.model : (vehicle.modelName || ""),
    brand: vehicle.brand && vehicle.brand !== "—" ? vehicle.brand : "",
    color: vehicle.color || "",
    customerId: vehicle.customer?.id || "",
    customerName:
      vehicle.customer?.name && vehicle.customer.name !== "—"
        ? vehicle.customer.name
        : "",
    customerPhone:
      vehicle.customer?.phone && vehicle.customer.phone !== "—"
        ? vehicle.customer.phone
        : "",
    vehicleTypeId:
      vehicle.vehicleTypeId || (vehicle.vehicleTypeCode === "EV" ? 2 : 1),
    vehicleType: vehicle.vehicleTypeCode || "CAR",
    notes: vehicle.note || "",
    parkingSlotCode:
      vehicle.parkingSlot?.display &&
      vehicle.parkingSlot.display !== DEFAULT_UNASSIGNED_SLOT_LABEL
        ? vehicle.parkingSlot.display
        : "",
    status: vehicle.status || "active",
  };
}

/**
 * mapFormDataToVehicleEntity
 * Domain-specific mapper: Chuyển đổi dữ liệu form sang entity cập nhật hoặc payload.
 *
 * @param {Object} formData - Dữ liệu nhập từ form
 * @param {Object} currentVehicle - Đối tượng phương tiện ban đầu
 * @param {Object|null} selectedCustomer - Khách hàng được chọn từ combobox
 * @returns {Object} Đối tượng vehicle entity đã chuẩn hóa
 */
export function mapFormDataToVehicleEntity(formData, currentVehicle = {}, selectedCustomer = null) {
  const cleanCustId =
    formData.customerId !== "" && !isNaN(Number(formData.customerId))
      ? Number(formData.customerId)
      : selectedCustomer?.id && !isNaN(Number(selectedCustomer.id))
      ? Number(selectedCustomer.id)
      : formData.customerId || undefined;

  const modelVal = (formData.model || "").trim() || "Ô tô";

  return {
    ...currentVehicle,
    licensePlate: (formData.licensePlate || "").trim().toUpperCase(),
    model: modelVal,
    model_name: modelVal,
    brand: (formData.brand || "").trim(),
    color: (formData.color || "").trim(),
    vehicleTypeId: 1,
    vehicle_type_id: 1,
    vehicleTypeCode: "CAR",
    customerId: cleanCustId,
    customer_id: cleanCustId,
    customerName: (formData.customerName || "").trim(),
    customerPhone: (formData.customerPhone || "").trim(),
    customer: {
      ...currentVehicle.customer,
      id: cleanCustId ?? currentVehicle.customer?.id,
      name: (formData.customerName || "").trim() || currentVehicle.customer?.name,
      phone: (formData.customerPhone || "").trim() || currentVehicle.customer?.phone,
    },
    parkingSlot: {
      ...currentVehicle.parkingSlot,
      display: formData.parkingSlotCode || currentVehicle.parkingSlot?.display || DEFAULT_UNASSIGNED_SLOT_LABEL,
      slot: formData.parkingSlotCode || currentVehicle.parkingSlot?.slot || "",
    },
    note: (formData.notes || "").trim(),
    notes: (formData.notes || "").trim(),
    status: formData.status || "active",
  };
}
