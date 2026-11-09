/**
 * Contract Factory cho Parking Session Domain
 * Cung cấp mock data chuẩn cho cả Raw Backend (snake_case) và Mapped Frontend (camelCase)
 */

export function makeMockRawBackendSession(overrides = {}) {
  return {
    id: 101,
    session_code: "SES-2026-001",
    license_plate: "30A-123.45",
    vehicle_type: "CAR",
    vehicle_type_name: "Ô tô 5 chỗ",
    entry_time: "2026-11-05T08:00:00Z",
    exit_time: null,
    entry_gate_name: "Cổng vào A",
    entry_gate_id: 1,
    exit_gate_name: null,
    exit_gate_id: null,
    slot_id: 1,
    slot_code: "A-01",
    entry_image_url: "/media/entry_101.jpg",
    plate_image_url: "/media/plate_101.jpg",
    exit_image_url: null,
    exit_plate_image_url: null,
    fee_amount: 0,
    status: "in_progress",
    duration_seconds: 1800,
    duration_text: "30 phút",
    review_status: "normal",
    review_reasons: [],
    ...overrides,
  };
}

export function makeMockParkingSession(overrides = {}) {
  return {
    id: "PH101",
    sessionCode: "SES-2026-001",
    licensePlate: "30A-123.45",
    vehicleType: "Ô tô",
    vehicleTypeCode: "CAR",
    entryTime: "05/11/2026, 08:00",
    entryTimeRaw: "2026-11-05T08:00:00Z",
    exitTime: null,
    entryGate: "Cổng vào A",
    exitGate: null,
    slotId: 1,
    slotCode: "A-01",
    duration: "30 phút",
    durationMinutes: 30,
    fee: "Chưa tính",
    feeNumber: 0,
    plateImageUrl: "/media/plate_101.jpg",
    exitPlateImageUrl: null,
    hasActiveTicket: false,
    status: "in_progress",
    ...overrides,
  };
}
