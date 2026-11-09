/**
 * Contract Factory cho Vehicle Domain
 * Cung cấp mock data chuẩn cho Backend DRF API, Frontend Entity, và Form Data
 */

export function makeMockRawBackendVehicle(overrides = {}) {
  return {
    id: 1,
    license_plate: "30A-123.45",
    vehicle_type: {
      id: 1,
      code: "CAR_SEDAN",
      name: "Ô tô 5 chỗ (Sedan)",
    },
    vehicle_type_id: 1,
    vehicle_type_code: "CAR_SEDAN",
    vehicle_type_name: "Ô tô 5 chỗ (Sedan)",
    brand: "Toyota",
    model: "Vios 2023",
    color: "Trắng",
    customer: {
      id: 10,
      name: "Nguyễn Văn An",
      phone: "0912345678",
      email: "an.nguyen@example.com",
    },
    customer_id: 10,
    customer_name: "Nguyễn Văn An",
    customer_phone: "0912345678",
    parking_slot: {
      id: 5,
      code: "A-05",
      floor: "B1",
      zone: "A",
    },
    parking_slot_id: 5,
    parking_slot_code: "A-05",
    ticket_type: "monthly",
    status: "active",
    note: "Xe đăng ký vé tháng cư dân",
    row_version: 1,
    ...overrides,
  };
}

export function makeMockVehicle(overrides = {}) {
  return {
    id: 1,
    licensePlate: "30A-123.45",
    vehicleTypeId: 1,
    vehicleTypeCode: "CAR_SEDAN",
    vehicleTypeName: "Ô tô 5 chỗ (Sedan)",
    brand: "Toyota",
    model: "Vios 2023",
    color: "Trắng",
    customer: {
      id: 10,
      name: "Nguyễn Văn An",
      phone: "0912345678",
      email: "an.nguyen@example.com",
    },
    customerId: 10,
    customerName: "Nguyễn Văn An",
    customerPhone: "0912345678",
    parkingSlot: {
      id: 5,
      code: "A-05",
    },
    parkingSlotId: 5,
    parkingSlotCode: "A-05",
    ticketType: "monthly",
    status: "active",
    note: "Xe đăng ký vé tháng cư dân",
    rowVersion: 1,
    ...overrides,
  };
}

export function makeMockVehicleFormData(overrides = {}) {
  return {
    licensePlate: "30A-123.45",
    vehicleTypeId: 1,
    brand: "Toyota",
    model: "Vios 2023",
    color: "Trắng",
    customerId: 10,
    customerName: "Nguyễn Văn An",
    customerPhone: "0912345678",
    parkingSlotCode: "A-05",
    status: "active",
    notes: "Xe đăng ký vé tháng cư dân",
    ...overrides,
  };
}
