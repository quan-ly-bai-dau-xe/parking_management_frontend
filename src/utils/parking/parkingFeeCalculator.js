/**
 * ============================================================================
 * MODULE TÍNH TOÁN CƯỚC PHÍ GỬI XE (PARKING TARIFF & BILLING ENGINE)
 * ============================================================================
 * Mục tiêu thiết kế:
 * 1. Tập trung hóa (Single Source of Truth): Mọi quy tắc tính cước, bảng giá,
 *    miễn giảm và trần chi phí nằm duy nhất tại file này.
 * 2. Cấu hình linh hoạt (Pluggable Config): Khi Backend trả về biểu phí mới hoặc
 *    Ban quản lý thay đổi chính sách, chỉ cần cập nhật `TARIFF_POLICY` hoặc truyền
 *    config từ API vào mà không phải sửa logic tính toán.
 * 3. Minh bạch & Dễ hiểu (Clarity & Auditability):
 *    - Bước 1: Kiểm tra miễn phí (Vé tháng / Đặc cách / Miễn trừ).
 *    - Bước 2: Kiểm tra thời gian ân hạn (Grace Period).
 *    - Bước 3: Tính số giờ làm tròn (Round-up Hours theo quy tắc tối thiểu 1h).
 *    - Bước 4: Áp dụng cơ chế trần giá (Daily Max Cap) chống đội giá khi gửi lâu.
 *    - Bước 5: Đánh giá cảnh báo xe tồn bãi (Overstay Warning).
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. CẤU HÌNH BIỂU PHÍ MẶC ĐỊNH (POLICY CONFIGURATION)
// Đồng bộ 100% với Backend Specs (OQ-85 & TL-50)
// ----------------------------------------------------------------------------
export const DEFAULT_PARKING_TARIFF_CONFIG = {
  // Đơn giá tiêu chuẩn mỗi giờ (VND)
  HOURLY_RATE_VND: 10000,

  // Thời gian ân hạn miễn phí (phút).
  // Mặc định = 0 theo quy định OQ-85: Vào bãi dưới 15 phút vẫn tính đủ 1 giờ đầu (10.000đ).
  // Nếu sau này nhóm quyết định miễn phí 15 phút đầu, chỉ cần đổi thành 15.
  GRACE_PERIOD_MINUTES: 0,

  // Số giờ làm tròn tối thiểu khi bắt đầu phát sinh cước
  MINIMUM_BILLED_HOURS: 1,

  // Giới hạn cước tối đa trong 1 ngày (24 giờ liên tục) (VND)
  // Ngăn tình trạng xe gửi qua đêm hoặc nhiều ngày bị cộng dồn giá quá lớn.
  // Ví dụ: 24h x 10.000đ = 240.000đ -> Chỉ tính tối đa 100.000đ/ngày.
  DAILY_MAX_CAP_VND: 100000,

  // Ngưỡng phát hiện & cảnh báo xe lưu bãi quá lâu (giờ)
  OVERSTAY_WARNING_HOURS: 24,   // > 24h: Cảnh báo qua đêm
  OVERSTAY_CRITICAL_HOURS: 72,  // > 72h: Cảnh báo xe bỏ quên / tồn bãi dài hạn
};

// Backward-compatibility exports
export const DEFAULT_HOURLY_RATE_VND = DEFAULT_PARKING_TARIFF_CONFIG.HOURLY_RATE_VND;
export const GRACE_PERIOD_MINUTES = DEFAULT_PARKING_TARIFF_CONFIG.GRACE_PERIOD_MINUTES;
export const DAILY_MAX_CAP_VND = DEFAULT_PARKING_TARIFF_CONFIG.DAILY_MAX_CAP_VND;

// ----------------------------------------------------------------------------
// 2. HELPER FUNCTIONS NỘI BỘ (TÁCH BẠCH RÕ RÀNG TỪNG PHÉP TÍNH)
// ----------------------------------------------------------------------------

/**
 * Tính số giờ tính cước dựa trên số phút gửi thực tế:
 * - Dưới 60 phút -> Tính tối thiểu 1 giờ (theo OQ-85).
 * - Làm tròn lên từng giờ: ví dụ 65 phút -> 2 giờ.
 */
function calculateBilledHours(durationMinutes, minimumHours = 1) {
  const safeMinutes = Math.max(0, Number(durationMinutes) || 0);
  const rawHours = Math.ceil(safeMinutes / 60);
  return Math.max(minimumHours, rawHours);
}

/**
 * Áp dụng trần giá theo chu kỳ ngày (24 giờ):
 * - Nếu dailyCap <= 0 hoặc null: Không áp trần giá (tính lũy kế theo số giờ thực tế).
 * - Nếu có trần giá: Mỗi block 24h được chốt tối đa bằng `dailyCap`. Phần giờ lẻ còn lại tính theo giờ thường, không vượt quá trần 1 ngày.
 */
function calculateCappedFee(hours, hourlyRate, dailyCap) {
  if (!dailyCap || dailyCap <= 0) {
    return hours * hourlyRate;
  }
  const fullDays = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  const costForFullDays = fullDays * dailyCap;
  const costForRemainingHours = Math.min(dailyCap, remainingHours * hourlyRate);

  return costForFullDays + costForRemainingHours;
}

/**
 * Xác định mức độ cảnh báo xe lưu bãi lâu ngày
 */
function getOverstayLevel(hours, warningThreshold, criticalThreshold) {
  if (hours >= criticalThreshold) return "critical";
  if (hours >= warningThreshold) return "warning";
  return "normal";
}

// ----------------------------------------------------------------------------
// 3. HÀM TÍNH TOÁN CƯỚC PHÍ CHÍNH (MAIN BILLING ENGINE)
// ----------------------------------------------------------------------------
export function calculateParkingFee({
  vehicleType = "CAR",
  durationMinutes = 0,
  hasActiveTicket = false,
  hasValidTicket = false,
  isExempt = false,
  tariffConfig = {},
}) {
  void vehicleType; // Dành cho việc mở rộng phân loại xe máy / xe tải sau này

  // Hợp nhất cấu hình tùy biến với cấu hình mặc định (hỗ trợ cả camelCase và UPPER_CASE)
  const config = {
    hourlyRateVnd: tariffConfig.hourlyRateVnd ?? tariffConfig.HOURLY_RATE_VND ?? DEFAULT_PARKING_TARIFF_CONFIG.HOURLY_RATE_VND,
    gracePeriodMinutes: tariffConfig.gracePeriodMinutes ?? tariffConfig.GRACE_PERIOD_MINUTES ?? DEFAULT_PARKING_TARIFF_CONFIG.GRACE_PERIOD_MINUTES,
    // Cấu hình trần cước theo ngày (Daily cap): nếu null hoặc <= 0 nghĩa là KHÔNG áp trần (tính lũy kế theo giờ thực tế)
    dailyMaxCapVnd: tariffConfig.dailyMaxCapVnd ?? tariffConfig.DAILY_MAX_CAP_VND ?? DEFAULT_PARKING_TARIFF_CONFIG.DAILY_MAX_CAP_VND,
    minimumBilledHours: tariffConfig.minimumBilledHours ?? tariffConfig.MINIMUM_BILLED_HOURS ?? DEFAULT_PARKING_TARIFF_CONFIG.MINIMUM_BILLED_HOURS,
    overstayWarningHours: tariffConfig.overstayWarningHours ?? tariffConfig.OVERSTAY_WARNING_HOURS ?? DEFAULT_PARKING_TARIFF_CONFIG.OVERSTAY_WARNING_HOURS,
    overstayCriticalHours: tariffConfig.overstayCriticalHours ?? tariffConfig.OVERSTAY_CRITICAL_HOURS ?? DEFAULT_PARKING_TARIFF_CONFIG.OVERSTAY_CRITICAL_HOURS,
  };

  // --- BƯỚC 1: XỬ LÝ MIỄN PHÍ (Vé tháng, Khách ưu tiên, Xe sự cố) ---
  const isTicketValid = Boolean(hasActiveTicket || hasValidTicket);
  if (isTicketValid || isExempt) {
    return {
      feeAmount: 0,
      feeFormatted: "0đ (Miễn phí / Vé tháng)",
      isCoveredByTicket: true,
      calculationBreakdown: isExempt
        ? "Được miễn cước (Đặc cách / Sự cố kỹ thuật)"
        : "Phương tiện đã đăng ký vé tháng còn hiệu lực",
      hoursBilled: 0,
      isCapped: false,
      overstayLevel: "normal",
    };
  }

  // --- BƯỚC 2: XỬ LÝ ÂN HẠN (GRACE PERIOD) ---
  if (config.gracePeriodMinutes > 0 && durationMinutes < config.gracePeriodMinutes) {
    return {
      feeAmount: 0,
      feeFormatted: `0đ (Miễn phí dưới ${config.gracePeriodMinutes} phút)`,
      isCoveredByTicket: false,
      calculationBreakdown: `Thời gian đỗ ${durationMinutes} phút thuộc diện ân hạn (< ${config.gracePeriodMinutes} phút)`,
      hoursBilled: 0,
      isCapped: false,
      overstayLevel: "normal",
    };
  }

  // --- BƯỚC 3: TÍNH TOÁN SỐ GIỜ TÍNH CƯỚC ---
  const hours = calculateBilledHours(durationMinutes, config.minimumBilledHours);
  const uncappedFee = hours * config.hourlyRateVnd;

  // --- BƯỚC 4: ÁP DỤNG TRẦN BẢO VỆ THEO NGÀY (DAILY CAP) ---
  const cappedFee = calculateCappedFee(hours, config.hourlyRateVnd, config.dailyMaxCapVnd);
  const totalFee = Math.min(uncappedFee, cappedFee);
  const isCapped = totalFee < uncappedFee;

  // Soạn diễn giải chi tiết cho người dùng và nhân viên bãi
  let breakdown;
  if (isCapped) {
    breakdown = `${hours}h đỗ -> Áp dụng trần tối đa theo ngày (${config.dailyMaxCapVnd.toLocaleString("vi-VN")}đ/24h)`;
  } else {
    breakdown = `${hours}h x ${config.hourlyRateVnd.toLocaleString("vi-VN")}đ/h (Đơn giá chuẩn OQ-85, tối thiểu 1h đầu)`;
  }

  // --- BƯỚC 5: ĐÁNH GIÁ MỨC ĐỘ XE TỒN BÃI ---
  const overstayLevel = getOverstayLevel(hours, config.overstayWarningHours, config.overstayCriticalHours);

  return {
    feeAmount: totalFee,
    feeFormatted: `${totalFee.toLocaleString("vi-VN")}đ`,
    isCoveredByTicket: false,
    calculationBreakdown: breakdown,
    hoursBilled: hours,
    isCapped,
    overstayLevel,
  };
}

/**
 * Định dạng số phút thành chuỗi thời lượng hiển thị tiếng Việt chuẩn hóa.
 * Ví dụ: 65 -> "1 giờ 5 phút", 45 -> "45 phút"
 */
export function formatDurationFromMinutes(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  }
  return `${minutes} phút`;
}

/**
 * Tính toán thời lượng đỗ (phút & text) từ mốc giờ vào và giờ ra.
 * Tái sử dụng đồng nhất toàn hệ thống, tránh trùng lặp tính toán.
 */
export function calculateParkingDuration(entryTime, exitTime = new Date()) {
  if (!entryTime) return null;
  const start = entryTime instanceof Date ? entryTime.getTime() : new Date(entryTime).getTime();
  const end = exitTime instanceof Date ? exitTime.getTime() : new Date(exitTime).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return null;
  }

  const durationMinutes = Math.max(1, Math.round((end - start) / (1000 * 60)));
  return {
    durationMinutes,
    durationText: formatDurationFromMinutes(durationMinutes),
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
