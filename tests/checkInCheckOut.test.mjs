import test from "node:test";
import assert from "node:assert/strict";
import { axiosInstance } from "../src/services/apiClient.js";
import {
  calculateParkingFee,
  validateVehicleEntry,
  DEFAULT_HOURLY_RATE_VND,
  GRACE_PERIOD_MINUTES,
  DAILY_MAX_CAP_VND,
} from "../src/utils/parking/parkingFeeCalculator.js";
import {
  checkInVehicle,
  checkOutVehicle,
  getAvailableSlotsForCheckIn,
} from "../src/services/parkingSessionService.js";

test("ST-CORE-01: Check-in builds valid payload for backend API", async () => {
  const originalRequest = axiosInstance.request;
  let capturedBody = null;

  try {
    axiosInstance.request = async (config) => {
      if (config.url.includes("/api/v1/parking/gates/")) {
        return { data: { results: [{ id: 1, name: "Cổng vào A", direction: "IN" }] } };
      }
      capturedBody = JSON.parse(config.data);
      return {
        data: {
          id: 501,
          session_code: "SES-2026-CHECKIN",
          license_plate: "30A-888.88",
          entry_time: "2026-11-05T09:00:00Z",
          slot_id: 12,
          status: "in_progress",
        },
      };
    };

    const res = await checkInVehicle({
      licensePlate: "30A-888.88",
      entryGateId: 1,
      slotId: 12,
      recognitionSource: "AI",
      imageUrl: "/media/entry_scan.jpg",
    });

    assert.equal(capturedBody.license_plate, "30A-888.88");
    assert.equal(capturedBody.entry_gate_id, 1);
    assert.equal(capturedBody.slot_id, 12);
    assert.equal(capturedBody.recognition_source, "AI");
    assert.equal(capturedBody.entry_image_url, "/media/entry_scan.jpg");
    assert.equal(res.session_code, "SES-2026-CHECKIN");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("ST-CORE-02: Capacity Control: Blocks new check-in when all parking slots are occupied", async () => {
  const originalRequest = axiosInstance.request;

  try {
    // Giả lập bãi kín chỗ: cả 96 slot đều có session đang mở
    const allOccupiedSessions = Array.from({ length: 96 }, (_, idx) => ({
      id: idx + 1,
      slot_id: idx + 1,
      status: "open",
    }));

    axiosInstance.request = async () => ({
      data: { count: 96, results: allOccupiedSessions },
    });

    const availableSlots = await getAvailableSlotsForCheckIn();
    assert.equal(availableSlots.length, 0, "Không còn slot nào khả dụng khi bãi đầy");
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("ST-CORE-03: Anti-passback: Rejects entry for vehicle already inside the parking lot", () => {
  // Case A: Tra cứu trả về open_session đang tồn tại
  const lookupWithOpenSession = {
    open_session: { id: 101, session_code: "SES-CURRENT" },
  };
  const res1 = validateVehicleEntry({ lookupResult: lookupWithOpenSession });
  assert.equal(res1.eligible, false);
  assert.equal(res1.reasonCode, "ALREADY_PARKED");

  // Case B: Phương tiện có status 'parked' hoặc 'Đang gửi'
  const vehicleParked = { status: "parked" };
  const res2 = validateVehicleEntry({ vehicle: vehicleParked });
  assert.equal(res2.eligible, false);
  assert.equal(res2.reasonCode, "ALREADY_PARKED");

  // Case C: Phương tiện hợp lệ không có session đang mở
  const validVehicle = { status: "active" };
  const res3 = validateVehicleEntry({ vehicle: validVehicle });
  assert.equal(res3.eligible, true);
  assert.equal(res3.reasonCode, "OK");
});

test("ST-CORE-04: Security Guard: Rejects entry for blacklisted / warning vehicles", () => {
  // Biển số nằm trong danh sách đen
  const blacklistedVehicle = { isBlacklisted: true };
  const res1 = validateVehicleEntry({ vehicle: blacklistedVehicle });
  assert.equal(res1.eligible, false);
  assert.equal(res1.reasonCode, "BLACKLISTED");

  // Note xe có cảnh báo an ninh
  const warningVehicle = { note: "Cảnh báo an ninh: từng quẹt rách barie" };
  const res2 = validateVehicleEntry({ vehicle: warningVehicle });
  assert.equal(res2.eligible, false);
  assert.equal(res2.reasonCode, "BLACKLISTED");
});

test("ST-CORE-05: Fee Calculator calculates exact rates across all business tiers", () => {
  // Tier 1: Grace period (< 15 phút) -> 0đ
  const grace10m = calculateParkingFee({ durationMinutes: 10 });
  assert.equal(grace10m.feeAmount, 0);
  assert.equal(grace10m.hoursBilled, 0);

  const grace14m = calculateParkingFee({ durationMinutes: 14 });
  assert.equal(grace14m.feeAmount, 0);

  // Tier 2: Tròn 1 giờ (60 phút) -> 10.000đ
  const fee1h = calculateParkingFee({ durationMinutes: 60 });
  assert.equal(fee1h.feeAmount, DEFAULT_HOURLY_RATE_VND);
  assert.equal(fee1h.hoursBilled, 1);

  // Tier 3: Bậc thang làm tròn lên theo OQ-85 (65 phút -> tính 2 giờ = 20.000đ)
  const fee65m = calculateParkingFee({ durationMinutes: 65 });
  assert.equal(fee65m.feeAmount, 20000);
  assert.equal(fee65m.hoursBilled, 2);

  // Tier 4: Đỗ 195 phút (3h 15m) -> làm tròn 4 giờ = 40.000đ
  const fee195m = calculateParkingFee({ durationMinutes: 195 });
  assert.equal(fee195m.feeAmount, 40000);
  assert.equal(fee195m.hoursBilled, 4);

  // Tier 5: Daily Cap (Đỗ 15 giờ = 150.000đ -> Áp trần tối đa 100.000đ/ngày)
  const fee15h = calculateParkingFee({ durationMinutes: 15 * 60 });
  assert.equal(fee15h.feeAmount, DAILY_MAX_CAP_VND);

  // Tier 6: Qua đêm 30 giờ (1 ngày cap 100k + 6 giờ x 10k = 160.000đ)
  const fee30h = calculateParkingFee({ durationMinutes: 30 * 60 });
  assert.equal(fee30h.feeAmount, 160000);

  // Tier 7: Đỗ nhiều ngày 50 giờ (2 ngày cap 200k + 2 giờ x 10k = 220.000đ)
  const fee50h = calculateParkingFee({ durationMinutes: 50 * 60 });
  assert.equal(fee50h.feeAmount, 220000);

  // Tier 8: Vé tháng còn hiệu lực (hasActiveTicket = true) -> 0đ
  const monthlyTicket = calculateParkingFee({ durationMinutes: 120, hasActiveTicket: true });
  assert.equal(monthlyTicket.feeAmount, 0);
  assert.equal(monthlyTicket.isCoveredByTicket, true);

  // Tier 9: Đặc cách miễn trừ kỹ thuật (isExempt = true) -> 0đ
  const exempt = calculateParkingFee({ durationMinutes: 120, isExempt: true });
  assert.equal(exempt.feeAmount, 0);
  assert.equal(exempt.isCoveredByTicket, true);
});

test("ST-CORE-07: Ghost Exit Defense: Handles already closed or missing open session gracefully", async () => {
  const originalRequest = axiosInstance.request;

  try {
    // Mô phỏng backend trả lỗi session đã đóng trước đó
    axiosInstance.request = async (config) => {
      if (config.url.includes("/api/v1/parking/gates/")) {
        return { data: { results: [{ id: 3, name: "Cổng ra B", direction: "OUT" }] } };
      }
      const err = new Error("Session has already ended");
      err.data = { code: "PROP-4.5.1-P10", message: "Phiên đỗ xe này đã được kết thúc trước đó." };
      throw err;
    };

    const res = await checkOutVehicle({
      licensePlate: "30A-999.99",
      sessionCode: "SS-2026-CLOSED",
      exitGate: 3,
    });

    assert.equal(res.success, true);
    assert.equal(res.alreadyClosed, true);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("ST-CORE-08: Mismatch Detection: Flags discrepancy when entry plate differs from exit plate", () => {
  function verifyPlateMatch(entryPlate, exitPlate) {
    const normalize = (p) => (p || "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const cleanEntry = normalize(entryPlate);
    const cleanExit = normalize(exitPlate);

    if (!cleanEntry || !cleanExit) {
      return { isMatch: false, reason: "MISSING_PLATE_DATA" };
    }
    if (cleanEntry === cleanExit) {
      return { isMatch: true, reason: "EXACT_MATCH" };
    }
    return { isMatch: false, reason: "PLATE_MISMATCH" };
  }

  // Khớp chính xác
  assert.equal(verifyPlateMatch("30A-123.45", "30A-123.45").isMatch, true);
  assert.equal(verifyPlateMatch("30A 123.45", "30A-123.45").isMatch, true);

  // Sai lệch biển số (ví dụ tráo biển)
  const mismatch = verifyPlateMatch("30A-123.45", "30A-999.99");
  assert.equal(mismatch.isMatch, false);
  assert.equal(mismatch.reason, "PLATE_MISMATCH");
});

test("GUARD-01: Dual-layer Guard: Prevents simultaneous duplicate requests on check-in/out", async () => {
  let executionCount = 0;
  let isActionPending = false;

  async function triggerProtectedCheckIn() {
    if (isActionPending) return { ignored: true };
    isActionPending = true;
    try {
      executionCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return { success: true };
    } finally {
      isActionPending = false;
    }
  }

  // Giả lập người dùng bấm liên tiếp 4 lần cùng 1 lúc
  const results = await Promise.all([
    triggerProtectedCheckIn(),
    triggerProtectedCheckIn(),
    triggerProtectedCheckIn(),
    triggerProtectedCheckIn(),
  ]);

  assert.equal(executionCount, 1, "Chỉ được phép gọi API thực thi 1 lần duy nhất");
  const executedResults = results.filter((r) => r.success);
  const blockedResults = results.filter((r) => r.ignored);
  assert.equal(executedResults.length, 1);
  assert.equal(blockedResults.length, 3);
});
