import { apiClient } from "./apiClient.js";
import { updateSlotStatus } from "./parkingLotService.js";
import { mockParkingHistory } from "../mocks/parkingHistoryData.js";
import { mockVehicles } from "../mocks/vehicleData.js";
import { calculateParkingFee } from "../utils/parking/parkingFeeCalculator.js";

const USE_MOCK =
  import.meta.env?.VITE_USE_MOCK?.trim().toLowerCase() === "true";

export { calculateParkingFee, validateVehicleEntry } from "../utils/parking/parkingFeeCalculator.js";

/**
 * Tạo danh sách toàn bộ 96 vị trí đỗ xe theo chuẩn PostgreSQL schema & seed (db/01-schema.sql, db/02-seed.sql)
 */
export function getAllParkingSlotsInventory() {
  const slots = [];
  // Zone A (Floor B1): IDs 1..24 -> A-01..A-24
  for (let i = 1; i <= 24; i++) {
    const num = String(i).padStart(2, "0");
    const code = `A-${num}`;
    slots.push({
      id: i,
      code,
      slotCode: code,
      zone: "Khu A",
      floor: "Tầng B1",
      display: `Khu A · Tầng B1 · Slot ${code}`,
      kind: "STANDARD",
      type: "car",
    });
  }
  // Zone B (Floor B1): IDs 25..48 -> B-01..B-24
  for (let i = 1; i <= 24; i++) {
    const num = String(i).padStart(2, "0");
    const code = `B-${num}`;
    slots.push({
      id: 24 + i,
      code,
      slotCode: code,
      zone: "Khu B",
      floor: "Tầng B1",
      display: `Khu B · Tầng B1 · Slot ${code}`,
      kind: "STANDARD",
      type: "car",
    });
  }
  // Zone C (Floor B2): IDs 49..72 -> C-01..C-24 (EV Charging)
  for (let i = 1; i <= 24; i++) {
    const num = String(i).padStart(2, "0");
    const code = `C-${num}`;
    slots.push({
      id: 48 + i,
      code,
      slotCode: code,
      zone: "Khu C",
      floor: "Tầng B2",
      display: `Khu C · Tầng B2 · Slot ${code}`,
      kind: "EV_CHARGING",
      type: "ev",
    });
  }
  // Zone D (Floor B2): IDs 73..96 -> D-01..D-24
  for (let i = 1; i <= 24; i++) {
    const num = String(i).padStart(2, "0");
    const code = `D-${num}`;
    slots.push({
      id: 72 + i,
      code,
      slotCode: code,
      zone: "Khu D",
      floor: "Tầng B2",
      display: `Khu D · Tầng B2 · Slot ${code}`,
      kind: "STANDARD",
      type: "car",
    });
  }
  return slots;
}

// Mapping ô đỗ được gán cố định cho vé tháng / vé quý / vé năm đang hoạt động (TL-04, TL-05, MSG-4.5.2-M02)
export const TICKET_RESERVED_SLOTS = {
  1: "43K86050",  // A-01: Vé tháng xe 43K-860.50 (XE0001, VT0001)
  2: "43X43353",  // A-02: Vé tháng xe 43X-433.53 (XE0003, VT0003)
  3: "43B40962",  // A-03: Vé năm xe 43B-40962 (XE0004, VT0004)
  5: "43C72491",  // A-05: Vé tháng xe 43C-724.91 (XE0007, VT0007)
  7: "43S91234",  // A-07: Vé tháng xe 43S-912.34 (XE0013, VT0013)
  25: "92C18274", // B-01: Vé năm xe 92C-182.74 (XE0009, VT0009)
  26: "92A39485", // B-02: Vé tháng xe 92A-394.85 (XE0010, VT0010)
  27: "92B71829", // B-03: Vé quý xe 92B-718.29 (XE0014, VT0014)
  28: "92D84719", // B-04: Vé tháng xe 92D-847.19 (XE0015, VT0015)
  49: "92F18713", // C-01: Vé quý xe điện 92F-187.13 (XE0002, VT0002)
  50: "92B65432", // C-02: Vé tháng xe điện 92B-654.32 (XE0005, VT0005)
  51: "92D12398", // C-03: Vé quý xe điện 92D-123.98 (XE0008, VT0008)
  52: "43E55566", // C-04: Vé năm xe điện 43E-555.66 (XE0012, VT0012)
};

// Các ô đỗ đang bảo trì hoặc có lịch đặt trước hệ thống (TL-03, TL-04)
export const SYSTEM_BLOCKED_SLOT_IDS = new Set([
  8,  // A-08: Bảo trì cảm biến siêu âm (MAINTENANCE)
  9,  // A-09: Đặt trước (RSV-2026-0001)
  10, // A-10: Đặt trước (RSV-2026-0002)
  29, // B-05: Đặt trước (RSV-2026-0003)
]);

/**
 * Lấy danh sách ô đỗ còn trống khả dụng để xếp chỗ khi Check-in
 */
export async function getAvailableSlotsForCheckIn({
  vehicleTypeCode = "CAR",
  licensePlate = "",
  filterReserved = false,
} = {}) {
  const allSlots = getAllParkingSlotsInventory();
  const occupiedSlotIds = new Set();

  try {
    const response = await apiClient("/api/v1/parking/sessions/?status=open");
    const sessions = Array.isArray(response)
      ? response
      : Array.isArray(response?.results)
      ? response.results
      : [];

    sessions.forEach((s) => {
      if (s.slot_id) occupiedSlotIds.add(Number(s.slot_id));
      if (s.slotId) occupiedSlotIds.add(Number(s.slotId));
    });
  } catch (err) {
    console.warn("Could not query active sessions for slot filtering, checking mock:", err);
    if (Array.isArray(mockParkingHistory)) {
      mockParkingHistory.forEach((item) => {
        if (!item.exitTime && item.slotId) {
          occupiedSlotIds.add(Number(item.slotId));
        }
      });
    }
  }

  const normPlate = String(licensePlate || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  const isEv =
    String(vehicleTypeCode || "").toUpperCase() === "EV" ||
    String(vehicleTypeCode || "").includes("ĐIỆN");

  const available = allSlots.filter((slot) => {
    // 1. Loại bỏ các ô đang có phiên đỗ mở
    if (occupiedSlotIds.has(slot.id)) return false;

    // 2. Nếu kích hoạt lọc ô đặt trước / vé tháng (hoặc khi có biển số xe cụ thể)
    if (filterReserved || licensePlate) {
      // Loại bỏ ô đang bảo trì hoặc có lịch đặt trước
      if (SYSTEM_BLOCKED_SLOT_IDS.has(slot.id)) return false;

      // Nếu ô đỗ thuộc danh sách gán vé tháng cố định, chỉ cho phép nếu đúng xe sở hữu
      const authorizedPlate = TICKET_RESERVED_SLOTS[slot.id];
      if (authorizedPlate) {
        return Boolean(normPlate && normPlate === authorizedPlate);
      }
    }

    return true;
  });

  // Sắp xếp ưu tiên ô sạc điện cho xe EV, hoặc ô tiêu chuẩn cho xe xăng/dầu
  return available.sort((a, b) => {
    if (isEv) {
      if (a.kind === "EV_CHARGING" && b.kind !== "EV_CHARGING") return -1;
      if (a.kind !== "EV_CHARGING" && b.kind === "EV_CHARGING") return 1;
    } else {
      if (a.kind === "STANDARD" && b.kind !== "STANDARD") return -1;
      if (a.kind !== "STANDARD" && b.kind === "STANDARD") return 1;
    }
    return a.id - b.id;
  });
}

/**
 * Lấy danh sách cổng vào (direction = IN) hợp lệ từ backend
 */
export async function getActiveEntryGates() {
  try {
    const gates = await apiClient("/api/v1/parking/gates/?direction=IN&is_active=true");
    if (Array.isArray(gates) && gates.length > 0) {
      return gates;
    }
  } catch (err) {
    console.warn("Failed to fetch entry gates dynamically, fallback to default IN gates:", err);
  }
  return [
    { id: 1, code: "IN_01", name: "Cổng vào 1", direction: "IN" },
    { id: 2, code: "IN_02", name: "Cổng vào 2", direction: "IN" },
  ];
}

/**
 * Thực hiện Check-in: Ghi nhận xe vào & mở barrier
 */
export async function checkInVehicle({
  licensePlate,
  vehicleType = "CAR",
  entryGateId = null,
  slotId = null,
  recognitionSource = "AI",
  aiConfidence = null,
  imageUrl = null,
  activeTicket = null,
  overrideBlacklist = false,
  notes = null,
}) {
  const now = new Date();
  const sessionCode = `SS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (USE_MOCK) {
    const matchedInventorySlot = slotId ? getAllParkingSlotsInventory().find((s) => s.id === Number(slotId)) : null;
    const resolvedSlotDisplay = matchedInventorySlot?.display || (slotId ? `Slot #${slotId}` : "Chưa có vị trí");

    const newSession = {
      id: `PH${Math.floor(1000 + Math.random() * 9000)}`,
      sessionCode,
      licensePlate,
      entryTime: now.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }),
      entryTimeRaw: now.toISOString(),
      exitTime: null,
      entryGate: entryGateId ? `Cổng vào ${entryGateId}` : "Cổng vào 1",
      exitGate: null,
      slotId: slotId ? Number(slotId) : null,
      slotCode: matchedInventorySlot?.code || (slotId ? `Slot #${slotId}` : "Chưa có vị trí"),
      slot_display: resolvedSlotDisplay,
      display_text: resolvedSlotDisplay,
      duration: "Vừa vào bãi",
      fee: "Chưa tính",
      feeNumber: 0,
      plateImageUrl: imageUrl || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80",
      vehicleType: vehicleType.includes("CAR") ? "Ô tô" : "Xe máy",
      hasActiveTicket: Boolean(activeTicket),
      status: "in_progress",
    };

    mockParkingHistory.unshift(newSession);
    return newSession;
  }

  // Tự động tìm cổng IN nếu chưa truyền entryGateId
  let targetEntryGateId = entryGateId;
  if (!targetEntryGateId) {
    const entryGates = await getActiveEntryGates();
    targetEntryGateId = entryGates[0]?.id || 1;
  }

  const payload = {
    license_plate: licensePlate,
    entry_gate_id: targetEntryGateId,
    recognition_source: recognitionSource,
    ai_confidence: aiConfidence,
    override_blacklist: overrideBlacklist,
  };

  if (slotId) {
    payload.slot_id = slotId;
  }
  if (imageUrl) {
    payload.entry_image_url = imageUrl;
  }
  if (notes) {
    payload.notes = notes;
  }

  return await apiClient("/api/v1/parking/sessions/check-in/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Lấy danh sách cổng ra (direction = OUT) hợp lệ từ backend
 */
export async function getActiveExitGates() {
  try {
    const gates = await apiClient("/api/v1/parking/gates/?direction=OUT&is_active=true");
    if (Array.isArray(gates) && gates.length > 0) {
      return gates;
    }
  } catch (err) {
    console.warn("Failed to fetch exit gates dynamically, fallback to default OUT gates:", err);
  }
  return [
    { id: 3, code: "OUT_01", name: "Cổng ra 1", direction: "OUT" },
    { id: 4, code: "OUT_02", name: "Cổng ra 2", direction: "OUT" },
    { id: 5, code: "OUT_03", name: "Cổng ra 3", direction: "OUT" },
  ];
}

/**
 * Đóng phiên đỗ khẩn cấp và giải phóng chỗ đỗ (Dành riêng cho Manager giải quyết sự cố thực tế)
 */
export async function forceCloseSessionAndReleaseSlot({
  licensePlate,
  sessionCode,
  notes = "Cưỡng chế đóng phiên đỗ khẩn cấp bởi Quản lý",
  exitGateId,
}) {
  if (USE_MOCK) {
    const idx = mockParkingHistory.findIndex(
      (s) =>
        (sessionCode && s.sessionCode === sessionCode) ||
        (licensePlate && s.licensePlate === licensePlate && !s.exitTime)
    );
    let updatedSession = null;
    if (idx !== -1) {
      const targetPlate = licensePlate || mockParkingHistory[idx].licensePlate;
      const targetVeh = mockVehicles.find((v) => v.licensePlate === targetPlate);
      const hasActiveTicket = targetVeh?.ticket?.status === "active";
      const feeData = calculateParkingFee({
        vehicleType: mockParkingHistory[idx].vehicleType || "CAR",
        durationMinutes: 120,
        hasActiveTicket,
      });

      mockParkingHistory[idx].exitTime = new Date().toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      });
      mockParkingHistory[idx].status = "completed";
      mockParkingHistory[idx].notes = notes;
      mockParkingHistory[idx].fee = feeData.feeFormatted;
      mockParkingHistory[idx].feeNumber = feeData.feeAmount;
      mockParkingHistory[idx].duration = "2 giờ 0 phút";
      updatedSession = mockParkingHistory[idx];
    }
    const targetVeh = mockVehicles.find((v) => v.licensePlate === licensePlate);
    if (targetVeh && targetVeh.status === "parked") {
      targetVeh.status = targetVeh.ticket?.status === "active" ? "active" : "left";
    }
    return { success: true, session: updatedSession };
  }

  // Tự động tìm cổng OUT hợp lệ nếu không truyền exitGateId
  let targetGateId = exitGateId;
  if (!targetGateId) {
    const exitGates = await getActiveExitGates();
    targetGateId = exitGates[0]?.id || 3;
  }

  // Backend endpoint: /api/v1/parking/sessions/check-out/
  // Backend yêu cầu cung cấp chính xác 1 trong 2 tiêu chí (PROP-4.5.1-P11): session_code HOẶC license_plate
  const payload = {
    exit_gate_id: targetGateId,
    payment_method: "CASH",
    notes,
  };
  if (sessionCode && typeof sessionCode === "string" && sessionCode.trim()) {
    payload.session_code = sessionCode.trim();
  } else if (licensePlate && typeof licensePlate === "string" && licensePlate.trim()) {
    payload.license_plate = licensePlate.trim();
  }

  try {
    return await apiClient("/api/v1/parking/sessions/check-out/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Nếu phiên đỗ đã được kết thúc trước đó (PROP-4.5.1-P10 hoặc thông báo tương đương),
    // nghĩa là xe không còn phiên đỗ mở -> an toàn để tiếp tục xóa xe hoặc cập nhật giao diện
    const errMsg = err?.data?.message || err?.message || "";
    const errCode = err?.data?.code || err?.code || "";
    if (
      errCode === "PROP-4.5.1-P10" ||
      errMsg.includes("đã được kết thúc trước đó") ||
      errMsg.includes("Không tìm thấy dữ liệu trùng khớp")
    ) {
      console.info("Session already closed or no open session, safe to proceed.");
      return { success: true, alreadyClosed: true, message: "Phiên đỗ xe này đã được kết thúc trước đó." };
    }
    throw err;
  }
}

/**
 * Thực hiện Check-out: Tính phí & đóng phiên gửi xe
 */
export async function checkOutVehicle({
  sessionId,
  sessionCode,
  licensePlate,
  entryTimeRaw,
  vehicleType = "CAR",
  hasActiveTicket = false,
  isExempt = false,
  paymentMethod = "CASH",
  exitGate = "Cổng B1",
}) {
  const exitDate = new Date();
  const entryDate = entryTimeRaw ? new Date(entryTimeRaw) : new Date(Date.now() - 2.5 * 3600 * 1000);
  const durationMinutes = Math.max(1, Math.round((exitDate - entryDate) / (1000 * 60)));

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationText = hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;

  const feeData = calculateParkingFee({
    vehicleType,
    durationMinutes,
    hasActiveTicket,
    isExempt,
  });

  if (USE_MOCK) {
    const foundIdx = mockParkingHistory.findIndex(
      (s) =>
        (sessionId && s.id === sessionId) ||
        (sessionCode && s.sessionCode === sessionCode) ||
        (licensePlate && s.licensePlate === licensePlate && !s.exitTime) ||
        (licensePlate && s.licensePlate === licensePlate)
    );

    const updated = {
      ...(foundIdx !== -1 ? mockParkingHistory[foundIdx] : {}),
      id: sessionId || (foundIdx !== -1 ? mockParkingHistory[foundIdx].id : `PH${Math.floor(1000 + Math.random() * 9000)}`),
      licensePlate,
      exitTime: exitDate.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }),
      exitGate,
      duration: durationText,
      durationMinutes,
      fee: feeData.feeFormatted,
      feeNumber: feeData.feeAmount,
      paymentMethod,
      feeBreakdown: feeData.calculationBreakdown,
      status: "completed",
    };

    if (foundIdx !== -1) {
      mockParkingHistory[foundIdx] = updated;
    } else {
      mockParkingHistory.unshift(updated);
    }

    const targetVeh = mockVehicles.find((v) => v.licensePlate === licensePlate);
    if (targetVeh && targetVeh.status === "parked") {
      targetVeh.status = targetVeh.ticket?.status === "active" ? "active" : "left";
    }

    return updated;
  }

  // Tìm target exit gate ID
  let targetExitGateId = typeof exitGate === "number" ? exitGate : null;
  if (!targetExitGateId) {
    const exitGates = await getActiveExitGates();
    targetExitGateId = exitGates[0]?.id || 3;
  }

  const payload = {
    exit_gate_id: targetExitGateId,
    payment_method:
      hasActiveTicket || isExempt
        ? "CASH"
        : paymentMethod === "VIETQR"
        ? "VIETQR"
        : "CASH",
  };

  // Backend quy định nghiêm ngặt (PROP-4.5.1-P11): Chỉ cung cấp chính xác 1 trong 2 tiêu chí
  const validSessionCode =
    (typeof sessionCode === "string" && sessionCode.trim()) ||
    (typeof sessionId === "string" &&
      (sessionId.startsWith("#") || sessionId.startsWith("PK-") || sessionId.startsWith("SS-"))
        ? sessionId.trim()
        : null);

  if (validSessionCode) {
    payload.session_code = validSessionCode;
  } else if (licensePlate && typeof licensePlate === "string" && licensePlate.trim()) {
    payload.license_plate = licensePlate.trim();
  }

  try {
    return await apiClient("/api/v1/parking/sessions/check-out/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const errMsg = err?.data?.message || err?.message || "";
    const errCode = err?.data?.code || err?.code || "";
    if (
      errCode === "PROP-4.5.1-P10" ||
      errMsg.includes("đã được kết thúc trước đó") ||
      errMsg.includes("Không tìm thấy dữ liệu trùng khớp")
    ) {
      console.info("Session already closed or no open session in backend, handling gracefully.");
      return {
        success: true,
        alreadyClosed: true,
        message: "Phiên đỗ xe này đã được kết thúc trước đó.",
      };
    }
    throw err;
  }
}


/**
 * Gán hoặc cập nhật vị trí ô đỗ cho phương tiện đang đỗ trong bãi (phiên đỗ mở)
 * Tương thích cả Backend API lẫn Mock synchronization
 *
 * @param {Object} params
 * @param {string|number} [params.sessionId] - ID phiên đỗ
 * @param {string} params.licensePlate - Biển số xe
 * @param {string|number} [params.vehicleId] - ID xe
 * @param {string|number} params.slotId - ID ô đỗ được chọn
 * @param {Object} [params.slotData] - Dữ liệu ô đỗ (code, floor, zone, display)
 * @returns {Promise<Object>}
 */
export async function assignSlotToSession({
  sessionId,
  licensePlate,
  vehicleId,
  slotId,
  slotData,
}) {
  if (!slotId) {
    throw new Error("Vui lòng chọn ô đỗ hợp lệ.");
  }

  const cleanSlotId = Number(slotId);
  let apiSuccess = false;
  let resultData = null;

  // 1. Thử gọi API Backend nếu có sessionId
  if (sessionId) {
    try {
      resultData = await apiClient(`/api/v1/parking/sessions/${sessionId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: cleanSlotId }),
      });
      apiSuccess = true;
    } catch (err) {
      console.warn("Backend PATCH session endpoint not available, falling back to local sync:", err);
    }
  }

  // 2. Đồng bộ mockParkingHistory
  if (Array.isArray(mockParkingHistory)) {
    const targetSession = mockParkingHistory.find(
      (s) =>
        (sessionId && (s.id === sessionId || s.sessionCode === sessionId)) ||
        (licensePlate && s.licensePlate === licensePlate && !s.exitTime)
    );
    if (targetSession) {
      targetSession.slotId = cleanSlotId;
      targetSession.slotCode = slotData?.code || `Slot ${cleanSlotId}`;
      targetSession.slotDisplay =
        slotData?.display ||
        `${slotData?.floor || ""} · ${slotData?.zone || ""} · Slot ${slotData?.code || cleanSlotId}`;
      targetSession.status = "in_progress";
    }
  }

  // 3. Đồng bộ mockVehicles
  if (Array.isArray(mockVehicles)) {
    const targetVeh = mockVehicles.find(
      (v) =>
        (licensePlate && v.licensePlate === licensePlate) ||
        (vehicleId && (v.id === vehicleId || v.code === vehicleId))
    );
    if (targetVeh) {
      targetVeh.parkingSlot = {
        slotId: cleanSlotId,
        slot: slotData?.code || `Slot ${cleanSlotId}`,
        display:
          slotData?.display ||
          `${slotData?.floor || ""} · ${slotData?.zone || ""} · Slot ${slotData?.code || cleanSlotId}`,
        floor: slotData?.floor || "",
        zone: slotData?.zone || "",
      };
      targetVeh.status = "parked";
    }
  }

  // 4. Đồng bộ trạng thái ô đỗ thành OCCUPIED
  try {
    await updateSlotStatus(cleanSlotId, {
      status: "OCCUPIED",
      plate: licensePlate,
    });
  } catch (slotErr) {
    console.warn("Could not update slot status via API:", slotErr);
  }

  return {
    success: true,
    slotId: cleanSlotId,
    apiSuccess,
    data: resultData,
  };
}
