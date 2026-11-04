import { apiClient } from "./apiClient";
import { mockParkingHistory } from "../mocks/parkingHistoryData";
import { calculateParkingFee } from "../utils/parking/parkingFeeCalculator";

const USE_MOCK =
  import.meta.env.VITE_USE_MOCK?.trim().toLowerCase() === "true";

export { calculateParkingFee, validateVehicleEntry } from "../utils/parking/parkingFeeCalculator";

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
  aiConfidence = 98.5,
  imageUrl = null,
  activeTicket = null,
  overrideBlacklist = false,
  notes = null,
}) {
  const now = new Date();
  const sessionCode = `SS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (USE_MOCK) {
    const newSession = {
      id: `PH${Math.floor(1000 + Math.random() * 9000)}`,
      sessionCode,
      licensePlate,
      entryTime: now.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }),
      entryTimeRaw: now.toISOString(),
      exitTime: null,
      entryGate: entryGateId ? `Cổng vào ${entryGateId}` : "Cổng vào 1",
      exitGate: null,
      slotCode: slotId ? `Slot #${slotId}` : "Chưa có vị trí",
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
  notes = "Cưỡng chế đóng phiên đỗ khẩn cấp bởi Quản lý",
  exitGateId,
}) {
  if (USE_MOCK) {
    const idx = mockParkingHistory.findIndex(
      (s) => s.licensePlate === licensePlate && !s.exitTime
    );
    if (idx !== -1) {
      mockParkingHistory[idx].exitTime = new Date().toLocaleString("vi-VN");
      mockParkingHistory[idx].status = "completed";
      mockParkingHistory[idx].notes = notes;
    }
    return { success: true };
  }

  // Tự động tìm cổng OUT hợp lệ nếu không truyền exitGateId
  let targetGateId = exitGateId;
  if (!targetGateId) {
    const exitGates = await getActiveExitGates();
    targetGateId = exitGates[0]?.id || 3;
  }

  // Backend endpoint: /api/v1/parking/sessions/check-out/
  try {
    return await apiClient("/api/v1/parking/sessions/check-out/", {
      method: "POST",
      body: JSON.stringify({
        license_plate: licensePlate,
        exit_gate_id: targetGateId,
        payment_method: "CASH",
        notes,
      }),
    });
  } catch (err) {
    // Nếu phiên đỗ đã được kết thúc trước đó (PROP-4.5.1-P10 hoặc thông báo tương đương),
    // nghĩa là xe không còn phiên đỗ mở -> an toàn để tiếp tục xóa xe
    const errMsg = err?.message || "";
    const errCode = err?.code || "";
    if (
      errCode === "PROP-4.5.1-P10" ||
      errMsg.includes("đã được kết thúc trước đó") ||
      errMsg.includes("Không tìm thấy dữ liệu trùng khớp")
    ) {
      console.info("Session already closed or no open session, safe to proceed with vehicle delete.");
      return { success: true, alreadyClosed: true };
    }
    throw err;
  }
}

/**
 * Thực hiện Check-out: Tính phí & đóng phiên gửi xe
 */
export async function checkOutVehicle({
  sessionId,
  licensePlate,
  entryTimeRaw,
  vehicleType = "CAR",
  hasActiveTicket = false,
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
  });

  if (USE_MOCK) {
    const found = mockParkingHistory.find(
      (s) => s.id === sessionId || s.licensePlate === licensePlate
    );

    const updated = {
      ...(found || {}),
      id: sessionId || `PH${Math.floor(1000 + Math.random() * 9000)}`,
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
    payment_method: paymentMethod === "TICKET_EXEMPT" ? "CASH" : (paymentMethod || "CASH"),
  };
  if (licensePlate) {
    payload.license_plate = licensePlate;
  }
  if (sessionId && typeof sessionId === "string" && sessionId.startsWith("#PK-")) {
    payload.session_code = sessionId;
  }

  return await apiClient("/api/v1/parking/sessions/check-out/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
