/**
 * Biểu phí mẫu tham chiếu (SRS & Thực tế: Ô tô 25.000đ/2h đầu + 10.000đ/h tiếp theo, Xe máy 5.000đ)
 */
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
