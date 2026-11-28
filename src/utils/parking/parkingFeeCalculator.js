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
  // Mặc định = 0 để đồng bộ 100% với Backend (TL-60: không áp trần giá ngày mặc định).
  // Caller có thể truyền `dailyMaxCapVnd > 0` qua `tariffConfig` nếu muốn bật trần tùy chọn.
  DAILY_MAX_CAP_VND: 0,

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

const ONE_HOUR_MS = 3_600_000;

function ceilHoursFromMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor((ms + ONE_HOUR_MS - 1) / ONE_HOUR_MS);
}

/**
 * Hợp khoảng thời gian (Interval Merging) được bảo đảm bởi các vé gói hợp lệ
 * trên đơn vị millisecond nguyên để khớp 100% với thuật toán Backend (tariff.py).
 */
function mergeCoveredMs(entryMs, exitMs, tickets = []) {
  if (!Number.isFinite(entryMs) || !Number.isFinite(exitMs) || exitMs <= entryMs) {
    return 0;
  }
  const intervals = [];
  for (const t of tickets) {
    if (!t) continue;
    const status = String(t.status || "ACTIVE").toUpperCase();
    if (status === "CANCELLED" || status === "TERMINATED" || t.deleted_at) continue;
    const rawFrom = t.effectiveFrom ?? t.effective_from;
    const rawTo = t.effectiveTo ?? t.effective_to;
    if (!rawTo) continue;
    const fromMs = rawFrom ? new Date(rawFrom).getTime() : entryMs;
    const toMs = new Date(rawTo).getTime();
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) continue;
    const start = Math.max(entryMs, fromMs);
    const end = Math.min(exitMs, toMs);
    if (start < end) {
      intervals.push([start, end]);
    }
  }
  if (intervals.length === 0) return 0;
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i += 1) {
    const [s, e] = intervals[i];
    const last = merged[merged.length - 1];
    if (s <= last[1]) {
      if (e > last[1]) last[1] = e;
    } else {
      merged.push([s, e]);
    }
  }
  return merged.reduce((sum, [s, e]) => sum + (e - s), 0);
}

// ----------------------------------------------------------------------------
// 3. HÀM TÍNH TOÁN CƯỚC PHÍ CHÍNH (MAIN BILLING ENGINE)
// ----------------------------------------------------------------------------
export function calculateParkingFee({
  vehicleType = "CAR",
  durationMinutes = 0,
  durationSeconds = null,
  entryTime = null,
  exitTime = null,
  tickets = null,
  ticketEffectiveFrom = null,
  ticketEffectiveTo = null,
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

  if (isExempt) {
    return {
      feeAmount: 0,
      feeFormatted: "0đ (Miễn phí / Đặc cách)",
      isCoveredByTicket: true,
      hasPackageCoverage: false,
      coveredMinutes: 0,
      overageMinutes: 0,
      overageHours: 0,
      feeBreakdownMode: "TICKET_EXEMPT",
      calculationBreakdown: "Được miễn cước (Đặc cách / Sự cố kỹ thuật)",
      hoursBilled: 0,
      isCapped: false,
      overstayLevel: "normal",
    };
  }

  const normalizedTickets = Array.isArray(tickets) ? [...tickets] : [];
  if (ticketEffectiveTo) {
    normalizedTickets.push({
      effectiveFrom: ticketEffectiveFrom,
      effectiveTo: ticketEffectiveTo,
      status: "ACTIVE",
    });
  }

  const entryMs = entryTime !== null && entryTime !== undefined ? new Date(entryTime).getTime() : NaN;
  const exitMs = exitTime !== null && exitTime !== undefined ? new Date(exitTime).getTime() : Date.now();
  const hasTimeWindow = Number.isFinite(entryMs) && Number.isFinite(exitMs);

  // --- BƯỚC 1: KIỂM TRA HỢP KHOẢNG VÉ GÓI & TÍNH VƯỢT HẠN (WP4 D6 / R3d) ---
  if (hasTimeWindow && normalizedTickets.length > 0) {
    const totalMs = Math.max(0, exitMs - entryMs);
    const coveredMs = mergeCoveredMs(entryMs, exitMs, normalizedTickets);
    const overageMs = Math.max(0, totalMs - coveredMs);
    const coveredMinutes = Math.floor(coveredMs / 60_000);
    const overageMinutes = overageMs > 0 ? Math.ceil(overageMs / 60_000) : 0;

    if (coveredMs > 0 && overageMs === 0) {
      return {
        feeAmount: 0,
        feeFormatted: "0đ (Miễn phí / Vé tháng)",
        isCoveredByTicket: true,
        hasPackageCoverage: true,
        coveredMinutes,
        overageMinutes: 0,
        overageHours: 0,
        feeBreakdownMode: "TICKET_EXEMPT",
        calculationBreakdown: "Phương tiện được vé gói còn hiệu lực bảo đảm toàn bộ thời gian đỗ",
        hoursBilled: 0,
        isCapped: false,
        overstayLevel: "normal",
      };
    }

    if (coveredMs > 0 && overageMs > 0) {
      const graceMs = Math.max(0, config.gracePeriodMinutes) * 60_000;
      const overageHours = graceMs > 0 && overageMs < graceMs ? 0 : ceilHoursFromMs(overageMs);
      const uncappedFee = overageHours * config.hourlyRateVnd;
      const cappedFee = calculateCappedFee(overageHours, config.hourlyRateVnd, config.dailyMaxCapVnd);
      const totalFee = Math.min(uncappedFee, cappedFee);
      const isCapped = totalFee < uncappedFee;
      const overstayLevel = getOverstayLevel(
        overageHours,
        config.overstayWarningHours,
        config.overstayCriticalHours
      );

      return {
        feeAmount: totalFee,
        feeFormatted: `${totalFee.toLocaleString("vi-VN")}đ`,
        isCoveredByTicket: false,
        hasPackageCoverage: true,
        coveredMinutes,
        overageMinutes,
        overageHours,
        feeBreakdownMode: "PACKAGE_OVERAGE",
        calculationBreakdown:
          overageHours === 0
            ? `Vượt hạn ${overageMinutes} phút trong thời gian ân hạn (< ${config.gracePeriodMinutes} phút)`
            : `Miễn 0đ phần trong hạn vé • Vượt hạn ${overageHours}h × ${config.hourlyRateVnd.toLocaleString("vi-VN")}đ/h`,
        hoursBilled: overageHours,
        isCapped,
        overstayLevel,
      };
    }
  }

  // Fallback boolean ticket coverage khi caller không truyền timestamp vé
  const isTicketValid = Boolean(hasActiveTicket || hasValidTicket);
  if (isTicketValid && normalizedTickets.length === 0) {
    return {
      feeAmount: 0,
      feeFormatted: "0đ (Miễn phí / Vé tháng)",
      isCoveredByTicket: true,
      hasPackageCoverage: true,
      coveredMinutes: 0,
      overageMinutes: 0,
      overageHours: 0,
      feeBreakdownMode: "TICKET_EXEMPT",
      calculationBreakdown: "Phương tiện đã đăng ký vé tháng còn hiệu lực",
      hoursBilled: 0,
      isCapped: false,
      overstayLevel: "normal",
    };
  }

  // --- BƯỚC 2: TÍNH CƯỚC VÃNG LAI (KHÔNG CÓ BAO PHỦ VÉ) ---
  let hours;
  let effectiveMinutes;
  if (hasTimeWindow) {
    const totalMs = Math.max(0, exitMs - entryMs);
    effectiveMinutes = Math.floor(totalMs / 60_000);
    if (config.gracePeriodMinutes > 0 && totalMs < config.gracePeriodMinutes * 60_000) {
      return {
        feeAmount: 0,
        feeFormatted: `0đ (Miễn phí dưới ${config.gracePeriodMinutes} phút)`,
        isCoveredByTicket: false,
        hasPackageCoverage: false,
        coveredMinutes: 0,
        overageMinutes: 0,
        overageHours: 0,
        feeBreakdownMode: "HOURLY",
        calculationBreakdown: `Thời gian đỗ ${effectiveMinutes} phút thuộc diện ân hạn (< ${config.gracePeriodMinutes} phút)`,
        hoursBilled: 0,
        isCapped: false,
        overstayLevel: "normal",
      };
    }
    hours = Math.max(config.minimumBilledHours, ceilHoursFromMs(totalMs));
  } else if (durationSeconds !== null && durationSeconds !== undefined) {
    const safeSec = Math.max(0, Number(durationSeconds) || 0);
    effectiveMinutes = Math.floor(safeSec / 60);
    if (config.gracePeriodMinutes > 0 && safeSec < config.gracePeriodMinutes * 60) {
      return {
        feeAmount: 0,
        feeFormatted: `0đ (Miễn phí dưới ${config.gracePeriodMinutes} phút)`,
        isCoveredByTicket: false,
        hasPackageCoverage: false,
        coveredMinutes: 0,
        overageMinutes: 0,
        overageHours: 0,
        feeBreakdownMode: "HOURLY",
        calculationBreakdown: `Thời gian đỗ ${effectiveMinutes} phút thuộc diện ân hạn (< ${config.gracePeriodMinutes} phút)`,
        hoursBilled: 0,
        isCapped: false,
        overstayLevel: "normal",
      };
    }
    hours = Math.max(config.minimumBilledHours, ceilHoursFromMs(safeSec * 1000));
  } else {
    if (config.gracePeriodMinutes > 0 && durationMinutes < config.gracePeriodMinutes) {
      return {
        feeAmount: 0,
        feeFormatted: `0đ (Miễn phí dưới ${config.gracePeriodMinutes} phút)`,
        isCoveredByTicket: false,
        hasPackageCoverage: false,
        coveredMinutes: 0,
        overageMinutes: 0,
        overageHours: 0,
        feeBreakdownMode: "HOURLY",
        calculationBreakdown: `Thời gian đỗ ${durationMinutes} phút thuộc diện ân hạn (< ${config.gracePeriodMinutes} phút)`,
        hoursBilled: 0,
        isCapped: false,
        overstayLevel: "normal",
      };
    }
    hours = calculateBilledHours(durationMinutes, config.minimumBilledHours);
  }

  const uncappedFee = hours * config.hourlyRateVnd;
  const cappedFee = calculateCappedFee(hours, config.hourlyRateVnd, config.dailyMaxCapVnd);
  const totalFee = Math.min(uncappedFee, cappedFee);
  const isCapped = totalFee < uncappedFee;

  let breakdown;
  if (isCapped) {
    breakdown = `${hours}h đỗ -> Áp dụng trần tối đa theo ngày (${config.dailyMaxCapVnd.toLocaleString("vi-VN")}đ/24h)`;
  } else {
    breakdown = `${hours}h x ${config.hourlyRateVnd.toLocaleString("vi-VN")}đ/h (Đơn giá chuẩn OQ-85, tối thiểu 1h đầu)`;
  }

  const overstayLevel = getOverstayLevel(hours, config.overstayWarningHours, config.overstayCriticalHours);

  return {
    feeAmount: totalFee,
    feeFormatted: `${totalFee.toLocaleString("vi-VN")}đ`,
    isCoveredByTicket: false,
    hasPackageCoverage: false,
    coveredMinutes: 0,
    overageMinutes: 0,
    overageHours: 0,
    feeBreakdownMode: "HOURLY",
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
