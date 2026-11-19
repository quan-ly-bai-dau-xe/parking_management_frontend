import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDateTime,
  formatDate,
  resolveMediaUrl,
  mapParkingSession,
  mapPlateScanToVehicle,
  mapVehicleLookupToVehicle,
  mapSessionToFrontend,
  MAPPER_DEFAULTS,
} from "#src/utils/parking/plateScanMapper.js";
import {
  getParkingSessionStatus,
  SESSION_STATUS_CONFIG,
} from "#src/constants/parkingHistoryConstants.js";

test("formatDateTime and formatDate handle null/empty gracefully", () => {
  assert.equal(formatDateTime(null), "—");
  assert.equal(formatDateTime(""), "—");
  assert.equal(formatDate(null), "—");
});

test("resolveMediaUrl handles absolute, data and relative URLs", () => {
  assert.equal(resolveMediaUrl(null), null);
  assert.equal(resolveMediaUrl("https://example.com/img.jpg"), "https://example.com/img.jpg");
  assert.equal(resolveMediaUrl("data:image/png;base64,abc"), "data:image/png;base64,abc");
  assert.equal(resolveMediaUrl("/media/plates/img.jpg"), "/media/plates/img.jpg");
});

test("mapParkingSession maps raw backend session correctly", () => {
  const raw = {
    id: 101,
    session_code: "SES-2026-001",
    license_plate: "30A-123.45",
    vehicle_type_name: "Ô tô 5 chỗ",
    entry_time: "2026-11-05T08:00:00Z",
    exit_time: null,
    entry_gate_name: "Cổng vào A",
    slot_code: "A-101",
    entry_image_url: "/media/entry.jpg",
    fee_amount: 25000,
    status: "in_progress",
    duration_minutes: 45,
    has_active_ticket: true,
  };

  const mapped = mapParkingSession(raw);
  assert.equal(mapped.id, "101");
  assert.equal(mapped.sessionCode, "SES-2026-001");
  assert.equal(mapped.licensePlate, "30A-123.45");
  assert.equal(mapped.vehicleType, "Ô tô 5 chỗ");
  assert.equal(mapped.entryGate, "Cổng vào A");
  assert.equal(mapped.slotCode, "A-101");
  assert.equal(mapped.feeNumber, 25000);
  assert.equal(mapped.fee, "25.000đ");
  assert.equal(mapped.duration, "45 phút");
  assert.equal(mapped.plateImageUrl, "/media/entry.jpg");
  assert.equal(mapped.hasActiveTicket, true);
});

test("mapPlateScanToVehicle maps OCR scan result without key/data duplication bugs", () => {
  const scanResult = {
    plate_final: "29A-888.88",
    confidence: 0.98,
    vehicle_lookup: {
      vehicle: {
        id: 12,
        license_plate: "29A-888.88",
        model: "VinFast VF8",
        brand: "VinFast",
        color: "Trắng",
        vehicle_type: "Ô tô điện",
        vehicle_type_id: 2,
        vehicle_type_code: "EV",
      },
      customer: {
        id: 5,
        full_name: "Nguyễn Văn A",
        phone: "0912345678",
        code: "KH0005",
      },
      active_ticket: {
        package_name: "Vé tháng VIP",
        status: "ACTIVE",
        is_active: true,
        effective_to: "2026-12-31T23:59:59Z",
      },
      parking_position: {
        slot_code: "B2-A10",
        display_text: "Tầng B2 - Khu A - Ô 10",
        slot_id: 42,
        floor_name: "Tầng B2",
        zone_code: "A",
      },
    },
    image_url: "/media/scans/scan_1.jpg",
  };

  const mapped = mapPlateScanToVehicle(scanResult);

  // Both flat and nested structures must match identically without discrepancies
  assert.equal(mapped.licensePlate, "29A-888.88");
  assert.equal(mapped.confidence, 98);
  assert.equal(mapped.isRecognized, true);
  assert.equal(mapped.vehicleId, 12);
  assert.equal(mapped.model, "VinFast VF8");

  // Customer checks (flat and nested must match)
  assert.equal(mapped.customerId, 5);
  assert.equal(mapped.customerName, "Nguyễn Văn A");
  assert.equal(mapped.customerPhone, "0912345678");
  assert.deepEqual(mapped.customer, {
    id: 5,
    name: "Nguyễn Văn A",
    phone: "0912345678",
    code: "KH0005",
  });

  // Ticket checks (flat and nested must match)
  assert.equal(mapped.ticketType, "Vé tháng VIP");
  assert.equal(mapped.ticketStatus, "active");
  assert.equal(mapped.hasActiveTicket, true);
  assert.deepEqual(mapped.ticket, {
    type: "Vé tháng VIP",
    status: "active",
    effectiveTo: mapped.ticketExpiration,
  });

  // Parking Slot checks
  assert.equal(mapped.slotCode, "B2-A10");
  assert.equal(mapped.parkingSlot?.display, "Tầng B2 - Khu A - Ô 10");
});

test("mapVehicleLookupToVehicle produces compatible vehicle model", () => {
  const lookupResult = {
    vehicle: {
      id: 99,
      license_plate: "51K-999.99",
      model_name: "Mercedes C300",
      brand: "Mercedes",
      color: "Đen",
    },
    customer: {
      id: 8,
      name: "Trần Thị B",
      phone: "0987654321",
      code: "KH0008",
    },
    active_ticket: {
      status: "EXPIRED",
      effective_to: "2026-10-01T00:00:00Z",
    },
    parking_position: {
      slot_code: "F1-B05",
      display_text: "Tầng F1 - Khu B - Ô 05",
    },
  };

  const mapped = mapVehicleLookupToVehicle(lookupResult);
  assert.equal(mapped.licensePlate, "51K-999.99");
  assert.equal(mapped.customerName, "Trần Thị B");
  assert.equal(mapped.customer.name, "Trần Thị B");
  assert.equal(mapped.ticketStatus, "expired");
  assert.equal(mapped.parkingSlot.display, "Tầng F1 - Khu B - Ô 05");
});

test("mapSessionToFrontend reuses already mapped session without redundant re-mapping", () => {
  const raw = {
    id: 1,
    session_code: "SES-001",
    license_plate: "30A-999.99",
    entry_time: "2026-11-05T07:00:00Z",
  };
  const mappedOnce = mapParkingSession(raw);
  const mappedTwice = mapSessionToFrontend(mappedOnce);

  // Must return the same mapped object or identically structured object
  assert.equal(mappedTwice.sessionCode, mappedOnce.sessionCode);
  assert.equal(mappedTwice.licensePlate, mappedOnce.licensePlate);
  assert.equal(mappedTwice.entryTime, mappedOnce.entryTime);
});

test("mapParkingSession correctly marks status and fees for checked-out vs open sessions", () => {
  const openSession = {
    id: 201,
    session_code: "#PK-20261105-001",
    license_plate: "51K-123.45",
    entry_time: "2026-11-05T07:00:00Z",
    exit_time: null,
    fee_amount: "0.00",
  };
  const mappedOpen = mapParkingSession(openSession);
  assert.equal(mappedOpen.status, "in_progress");
  assert.equal(mappedOpen.exitTime, null);
  assert.equal(mappedOpen.feeNumber, 0);

  const closedSession = {
    id: 202,
    session_code: "#PK-20261105-002",
    license_plate: "51K-567.89",
    entry_time: "2026-11-05T07:00:00Z",
    exit_time: "2026-11-05T09:30:00Z",
    duration_text: "2 giờ 30 phút",
    fee_amount: "30000.00",
  };
  const mappedClosed = mapParkingSession(closedSession);
  assert.equal(mappedClosed.status, "completed");
  assert.notEqual(mappedClosed.exitTime, null);
  assert.equal(mappedClosed.feeNumber, 30000);
  assert.equal(mappedClosed.fee, "30.000đ");
});

test("getParkingSessionStatus classifies session status correctly", () => {
  assert.equal(
    getParkingSessionStatus({ status: "in_progress", exitTime: null }).key,
    SESSION_STATUS_CONFIG.IN_PROGRESS.key
  );
  assert.equal(
    getParkingSessionStatus({ status: "completed", exitTime: "26/10/2026 10:00" }).key,
    SESSION_STATUS_CONFIG.COMPLETED.key
  );
  assert.equal(
    getParkingSessionStatus({ status: "closed", exitTime: "—" }).key,
    SESSION_STATUS_CONFIG.COMPLETED.key
  );
  assert.equal(
    getParkingSessionStatus({ status: "cancelled" }).key,
    SESSION_STATUS_CONFIG.CANCELLED.key
  );
  assert.equal(
    getParkingSessionStatus(null).key,
    SESSION_STATUS_CONFIG.IN_PROGRESS.key
  );
});
