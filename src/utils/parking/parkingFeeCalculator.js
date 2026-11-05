/**
 * Biểu phí chuẩn đồng bộ Backend API (OQ-85 & TL-50):
 * - Đơn giá chuẩn cho ô tô vãng lai: 10.000đ/giờ (PARKING_HOURLY_RATE_VND).
 * - Miễn phí hoàn toàn (0đ) đối với xe có vé tháng ACTIVE còn hiệu lực hoặc được miễn trừ đặc cách.
 * - Thời gian ân hạn (Grace Period): Dưới 15 phút ra vào không tính cước (0đ).
 * - Cơ chế bảo vệ Trần giá ngày (Daily Cap): Tối đa 100.000đ / chu kỳ 24h nhằm chống trừ tiền quá lớn khi đỗ xe qua đêm.
 */
export const DEFAULT_HOURLY_RATE_VND = 10000;
export const GRACE_PERIOD_MINUTES = 15;
export const DAILY_MAX_CAP_VND = 100000;

export function calculateParkingFee({
  vehicleType = "CAR",
  durationMinutes = 0,
  hasActiveTicket = false,
  isExempt = false,
}) {
  void vehicleType;
  if (hasActiveTicket || isExempt) {
    return {
      feeAmount: 0,
      feeFormatted: "0đ (Miễn phí / Vé tháng)",
      isCoveredByTicket: true,
      calculationBreakdown: isExempt
        ? "Được miễn cước (Đặc cách / Sự cố kỹ thuật)"
        : "Phương tiện đã đăng ký vé tháng còn hiệu lực",
      hoursBilled: 0,
    };
  }

  // Grace period: Ra vào dưới 15 phút (đón trả khách hoặc quay đầu) miễn phí
  if (durationMinutes < GRACE_PERIOD_MINUTES) {
    return {
      feeAmount: 0,
      feeFormatted: "0đ (Miễn phí dưới 15 phút)",
      isCoveredByTicket: false,
      calculationBreakdown: `Thời gian đỗ ${durationMinutes} phút thuộc diện ân hạn (< ${GRACE_PERIOD_MINUTES} phút)`,
      hoursBilled: 0,
    };
  }

  // Số giờ tính phí làm tròn lên từng giờ theo chuẩn OQ-85
  const hours = Math.max(1, Math.ceil(durationMinutes / 60));
  const rawFee = hours * DEFAULT_HOURLY_RATE_VND;

  // Áp dụng trần tối đa theo ngày (24h) để tránh tính phí quá lớn khi gửi qua đêm
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const cappedFee =
    days * DAILY_MAX_CAP_VND + Math.min(DAILY_MAX_CAP_VND, remainingHours * DEFAULT_HOURLY_RATE_VND);
  const totalFee = Math.min(rawFee, cappedFee);

  let breakdown;
  if (totalFee < rawFee) {
    breakdown = `${hours}h đỗ -> Áp dụng trần tối đa theo ngày (${DAILY_MAX_CAP_VND.toLocaleString("vi-VN")}đ/24h)`;
  } else {
    breakdown = `${hours}h x ${DEFAULT_HOURLY_RATE_VND.toLocaleString("vi-VN")}đ/h (Đơn giá chuẩn OQ-85)`;
  }

  return {
    feeAmount: totalFee,
    feeFormatted: `${totalFee.toLocaleString("vi-VN")}đ`,
    isCoveredByTicket: false,
    calculationBreakdown: breakdown,
    hoursBilled: hours,
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
