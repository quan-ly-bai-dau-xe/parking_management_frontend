/**
 * Hằng số cấu hình cho màn hình Lịch sử ra/vào bãi đỗ xe (ParkingHistory)
 * Phù hợp với Smart Mobility Design System tokens và quy chuẩn Clean Code
 */

export const PARKING_HISTORY_DEFAULTS = {
  PAGE_SIZE_DEFAULT: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50],
  PLACEHOLDER_TEXT: "—",
  DEFAULT_QUICK_FILTER: "30days",
  SEARCH_DEBOUNCE_MS: 350,
};

export const QUICK_FILTER_KEYS = {
  TODAY: "today",
  YESTERDAY: "yesterday",
  LAST_7_DAYS: "7days",
  LAST_30_DAYS: "30days",
  CUSTOM: "custom",
};

export const QUICK_FILTER_LABELS = [
  { key: QUICK_FILTER_KEYS.TODAY, label: "Hôm nay" },
  { key: QUICK_FILTER_KEYS.YESTERDAY, label: "Hôm qua" },
  { key: QUICK_FILTER_KEYS.LAST_7_DAYS, label: "7 ngày qua" },
  { key: QUICK_FILTER_KEYS.LAST_30_DAYS, label: "30 ngày qua" },
  { key: QUICK_FILTER_KEYS.CUSTOM, label: "Tùy chỉnh" },
];

export const SESSION_STATUS_CONFIG = {
  COMPLETED: {
    label: "Đã ra bãi",
    badgeClass: "bg-slate-100 text-slate-600 border border-slate-200",
  },
  IN_PROGRESS: {
    label: "Đang trong bãi",
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-200/60",
  },
};

export const PARKING_HISTORY_MESSAGES = {
  PAGE_TITLE: "Lịch sử ra/vào",
  PAGE_SUBTITLE: "Theo dõi toàn bộ các phiên gửi xe ô tô ra/vào bãi theo thời gian thực",
  FOOTER_BRANDING: "Sơ đồ bãi đậu xe — Smart Mobility",
  RELOAD_TOOLTIP: "Tải lại dữ liệu mới nhất từ máy chủ",
  EMPTY_TITLE: "Chưa có dữ liệu",
  EMPTY_DESC: "Không tìm thấy phiên đỗ xe nào phù hợp với bộ lọc hiện tại.",
  LOADING_TEXT: "Đang tải lịch sử ra/vào...",
  LOAD_ERROR_DEFAULT: "Không thể tải lịch sử ra/vào từ máy chủ.",
  CLOSE_SESSION_SUCCESS: (plate) => `✓ Đã kết thúc phiên đỗ xe ${plate} thành công!`,
  CLOSE_SESSION_ALREADY: (plate) =>
    `✓ Phiên đỗ xe ${plate} đã được kết thúc trước đó. Đã cập nhật trạng thái đã ra bãi!`,
  CLOSE_SESSION_ERROR: "Không thể kết thúc phiên đỗ xe. Vui lòng thử lại sau.",
};
