import { getLocalDateIso } from "./formatDateTime.js";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Chuyển đổi tọa độ cực (góc tính theo chiều kim đồng hồ từ hướng 12 giờ) sang tọa độ SVG (x, y).
 */
export function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

/**
 * Sinh chuỗi SVG path `d` cho cung tròn từ startAngle đến endAngle.
 */
export function describeArc(cx, cy, radius, startAngle, endAngle) {
  const safeSpan = Math.min(359.999, Math.max(0, endAngle - startAngle));
  const safeEnd = startAngle + safeSpan;
  const start = polarToCartesian(cx, cy, radius, safeEnd);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = safeSpan <= 180 ? "0" : "1";
  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

/**
 * Tính toán các phân đoạn biểu đồ Donut thuần SVG dựa trên stroke-dasharray và stroke-dashoffset.
 */
export function computeDonutSegments(items = [], radius = 76) {
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 76;
  const circumference = 2 * Math.PI * safeRadius;

  const sanitized = (Array.isArray(items) ? items : []).map((item) => {
    const rawVal = Number(item?.value);
    const value = Number.isFinite(rawVal) && rawVal > 0 ? rawVal : 0;
    return {
      key: String(item?.key ?? ""),
      label: String(item?.label ?? ""),
      color: String(item?.color ?? "#3B82F6"),
      value,
    };
  });

  const total = sanitized.reduce((sum, item) => sum + item.value, 0);
  let accumulatedLength = 0;

  const segments = sanitized.map((item) => {
    const ratio = total > 0 ? item.value / total : 0;
    const percentage = ratio * 100;
    const arcLength = ratio * circumference;
    const gapLength = Math.max(0, circumference - arcLength);
    const dashArray = `${arcLength} ${gapLength}`;
    const dashOffset = accumulatedLength === 0 ? 0 : -accumulatedLength;
    accumulatedLength += arcLength;

    return {
      ...item,
      percentage,
      arcLength,
      dashArray,
      dashOffset,
    };
  });

  return {
    total,
    circumference,
    segments,
  };
}

/**
 * Tính giá trị trần đẹp cho trục Y của biểu đồ cột (chia hết cho số mốc tickCount).
 * Khi `integerOnly` bật (biểu đồ số lượng nguyên), đảm bảo niceMax >= tickCount và mỗi bước tick là số nguyên.
 */
export function computeNiceAxisMax(
  rawMax,
  tickCount = 4,
  { integerOnly = false } = {},
) {
  const safeTicks = Number.isInteger(tickCount) && tickCount > 0 ? tickCount : 4;
  if (!Number.isFinite(rawMax) || rawMax <= 0) {
    return integerOnly ? safeTicks : safeTicks * 25;
  }

  const roughStep = rawMax / safeTicks;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;

  const niceFactors =
    integerOnly && magnitude === 1 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  const niceFactor =
    niceFactors.find((factor) => factor >= residual) ?? niceFactors[niceFactors.length - 1];
  const niceStep = niceFactor * magnitude;
  if (integerOnly) {
    const integerStep = Math.max(1, Math.ceil(niceStep));
    return Math.max(safeTicks, integerStep * safeTicks);
  }
  return niceStep * safeTicks;
}

/**
 * Tính tọa độ vẽ các cột và các đường lưới trục Y cho biểu đồ SVG Bar Chart.
 */
export function computeBarLayout(
  items = [],
  {
    width = 560,
    height = 260,
    padding = { top: 24, right: 20, bottom: 44, left: 68 },
    tickCount = 4,
    integerOnly = false,
  } = {},
) {
  const safePadding = {
    top: padding?.top ?? 24,
    right: padding?.right ?? 20,
    bottom: padding?.bottom ?? 44,
    left: padding?.left ?? 68,
  };
  const plotWidth = Math.max(1, width - safePadding.left - safePadding.right);
  const plotHeight = Math.max(1, height - safePadding.top - safePadding.bottom);

  const sanitized = (Array.isArray(items) ? items : []).map((item) => {
    const rawVal = Number(item?.value);
    const value = Number.isFinite(rawVal) && rawVal > 0 ? rawVal : 0;
    return {
      key: String(item?.key ?? ""),
      label: String(item?.label ?? ""),
      color: String(item?.color ?? "#3B82F6"),
      value,
    };
  });

  const rawMax = sanitized.reduce((max, item) => Math.max(max, item.value), 0);
  const niceMax = computeNiceAxisMax(rawMax, tickCount, { integerOnly });

  const ticks = [];
  for (let i = 0; i <= tickCount; i += 1) {
    const tickValue = (niceMax / tickCount) * i;
    const y = safePadding.top + plotHeight - (tickValue / niceMax) * plotHeight;
    ticks.push({ value: tickValue, y });
  }

  const count = Math.max(1, sanitized.length);
  const slotWidth = plotWidth / count;
  const barWidth = Math.min(56, slotWidth * 0.52);

  const bars = sanitized.map((item, index) => {
    const rawHeight = niceMax > 0 ? (item.value / niceMax) * plotHeight : 0;
    const barHeight = item.value > 0 ? Math.max(4, rawHeight) : 0;
    const x = safePadding.left + index * slotWidth + (slotWidth - barWidth) / 2;
    const y = safePadding.top + plotHeight - barHeight;

    return {
      ...item,
      x,
      y,
      width: barWidth,
      height: barHeight,
      centerX: x + barWidth / 2,
    };
  });

  return {
    width,
    height,
    padding: safePadding,
    plotWidth,
    plotHeight,
    rawMax,
    niceMax,
    ticks,
    bars,
  };
}

/**
 * Tính toán thông số vòng cung SVG Circular Gauge cho tỷ lệ lấp đầy ô đỗ (%).
 */
export function computeGaugeArc(rate, radius = 60) {
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 60;
  const circumference = 2 * Math.PI * safeRadius;
  const numRate = Number(rate);
  const clampedRate = Number.isFinite(numRate) ? Math.min(100, Math.max(0, numRate)) : 0;
  const dashOffset = circumference * (1 - clampedRate / 100);

  let tone = "emerald";
  let statusText = "Còn chỗ";
  let strokeColor = "#059669";

  if (clampedRate >= 90) {
    tone = "rose";
    statusText = "Sắp đầy";
    strokeColor = "#E11D48";
  } else if (clampedRate >= 75) {
    tone = "amber";
    statusText = "Gần đầy";
    strokeColor = "#D97706";
  }

  return {
    rate: clampedRate,
    circumference,
    dashOffset,
    tone,
    statusText,
    strokeColor,
  };
}

/**
 * Rút gọn số tiền VND cho nhãn trục Y / đỉnh cột (ví dụ: 15.5M, 500K).
 */
export function formatCompactVnd(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return "0";
  }
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(num % 1_000_000_000 === 0 ? 0 : 1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1)}K`;
  }
  return String(Math.round(num));
}

/**
 * Trả về cặp { startDate, endDate } (YYYY-MM-DD local) cho 3 preset lọc nhanh 4.7.1.
 */
export function getDatePresetRange(preset, now = new Date()) {
  const endDate = getLocalDateIso(now);

  if (preset === "today") {
    return { startDate: endDate, endDate };
  }

  if (preset === "last7days") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return { startDate: getLocalDateIso(start), endDate };
  }

  // Mặc định: "thisMonth" (ngày 1 của tháng hiện tại -> hôm nay)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: getLocalDateIso(monthStart), endDate };
}

function isValidIsoCalendarDate(dateStr) {
  if (!ISO_DATE_REGEX.test(dateStr)) {
    return false;
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * Kiểm tra hợp lệ khoảng ngày theo chuẩn PROP-4.7.1-P01.
 */
export function validateDateRange(startDate, endDate) {
  const start = typeof startDate === "string" ? startDate.trim() : "";
  const end = typeof endDate === "string" ? endDate.trim() : "";

  if (!start || !end) {
    return {
      valid: false,
      code: "PROP-4.7.1-P01",
      error: "Dữ liệu điều kiện thống kê không hợp lệ.",
      detail: "Vui lòng chọn đầy đủ Từ ngày và Đến ngày.",
    };
  }

  if (!isValidIsoCalendarDate(start) || !isValidIsoCalendarDate(end)) {
    return {
      valid: false,
      code: "PROP-4.7.1-P01",
      error: "Dữ liệu điều kiện thống kê không hợp lệ.",
      detail: "Định dạng ngày phải hợp lệ theo chuẩn YYYY-MM-DD.",
    };
  }

  if (start > end) {
    return {
      valid: false,
      code: "PROP-4.7.1-P01",
      error: "Dữ liệu điều kiện thống kê không hợp lệ.",
      detail: "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
    };
  }

  return {
    valid: true,
    code: "",
    error: "",
    detail: "",
  };
}
