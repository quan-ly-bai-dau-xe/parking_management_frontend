/**
 * Parking Session Service
 * Quản lý phiên gửi xe: Kiểm tra điều kiện xe vào (Check-in), tính phí và kết thúc phiên (Check-out)
 * Tương thích cả mock data (fallback offline) lẫn backend REST API.
 */

import { apiClient } from "../services/apiClient";
import { mockParkingHistory } from "../mocks/parkingHistoryData";

// Biểu phí mẫu tham chiếu (SRS & Thực tế: Ô tô 25.000đ/2h đầu + 10.000đ/h tiếp theo, Xe máy 5.000đ)
export function calculateParkingFee({ vehicleType = "CAR", durationMinutes = 0, hasActiveTicket = false }) {
  if (hasActiveTicket) {
    return {
      feeAmount: 0,
      feeFormatted: "0đ (Vé tháng / Cư dân)",
      isCoveredByTicket: true,
      calculationBreakdown: "Phương tiện đã đăng ký vé tháng còn hiệu lực",
    };
  }

  const isCar = String(vehicleType).toUpperCase().includes("CAR") || String(vehicleType).includes("Ô tô");
  const hours = Math.max(1, Math.ceil(durationMinutes / 60));

  let totalFee;
  let breakdown;

  if (isCar) {
    if (hours <= 2) {
      totalFee = 25000;
      breakdown = "25.000đ (Block 2 giờ đầu)";
    } else {
      totalFee = 25000 + (hours - 2) * 10000;
      breakdown = `25.000đ (2h đầu) + ${(hours - 2) * 10000}đ (${hours - 2}h tiếp)`;
    }
  } else {
    totalFee = hours <= 4 ? 5000 : 10000;
    breakdown = `${totalFee.toLocaleString("vi-VN")}đ (Gửi xe theo lượt)`;
  }

  return {
    feeAmount: totalFee,
    feeFormatted: `${totalFee.toLocaleString("vi-VN")}đ`,
    isCoveredByTicket: false,
    calculationBreakdown: breakdown,
  };
}

/**
 * Kiểm tra điều kiện xe vào (Entry eligibility check)
 */
export function validateVehicleEntry({ vehicle, lookupResult }) {
  const isBlacklisted = Boolean(
    lookupResult?.is_blacklisted ||
    vehicle?.note?.toLowerCase()?.includes("cảnh báo") ||
    vehicle?.isBlacklisted
  );

  if (isBlacklisted) {
    return {
      eligible: false,
      reasonCode: "BLACKLISTED",
      message: "Phương tiện nằm trong danh sách đen / cảnh báo an ninh. Khóa barrier!",
    };
  }

  const hasActiveSession = Boolean(
    lookupResult?.open_session ||
    vehicle?.status === "parked" ||
    vehicle?.status === "Đang gửi"
  );

  if (hasActiveSession) {
    return {
      eligible: false,
      reasonCode: "ALREADY_PARKED",
      message: "Phương tiện đang có phiên gửi xe chưa kết thúc trong bãi.",
    };
  }

  return {
    eligible: true,
    reasonCode: "OK",
    message: "Phương tiện đủ điều kiện vào bãi.",
  };
}

/**
 * Thực hiện Check-in: Ghi nhận xe vào & mở barrier
 */
export async function checkInVehicle({
  licensePlate,
  vehicleType = "CAR",
  entryGate = "Cổng A1",
  slotCode = "A1-01",
  imageUrl = null,
  activeTicket = null,
}) {
  const now = new Date();
  const sessionCode = `SS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const response = await apiClient("/api/v1/parking/sessions/", {
      method: "POST",
      body: JSON.stringify({
        license_plate: licensePlate,
        vehicle_type: vehicleType,
        entry_gate: entryGate,
        slot_code: slotCode,
        entry_image_url: imageUrl,
      }),
    });
    return response;
  } catch {
    // Fallback: ghi nhận phiên mới vào bộ nhớ mock
    const newSession = {
      id: `PH${Math.floor(1000 + Math.random() * 9000)}`,
      sessionCode,
      licensePlate,
      entryTime: now.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }),
      entryTimeRaw: now.toISOString(),
      exitTime: null,
      entryGate,
      exitGate: null,
      slotCode,
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
  const entryDate = entryTimeRaw ? new Date(entryTimeRaw) : new Date(Date.now() - 2.5 * 3600 * 1000); // Mặc định 2h30m nếu mock
  const durationMinutes = Math.max(1, Math.round((exitDate - entryDate) / (1000 * 60)));

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationText = hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;

  const feeData = calculateParkingFee({
    vehicleType,
    durationMinutes,
    hasActiveTicket,
  });

  try {
    const response = await apiClient(`/api/v1/parking/sessions/${sessionId}/checkout/`, {
      method: "POST",
      body: JSON.stringify({
        license_plate: licensePlate,
        exit_gate: exitGate,
        payment_method: paymentMethod,
        fee_amount: feeData.feeAmount,
      }),
    });
    return response;
  } catch {
    // Fallback cập nhật session mock
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
}
