/**
 * HẰNG SỐ ĐƯỜNG DẪN CỦA TOÀN BỘ ỨNG DỤNG (ROUTES CONSTANTS)
 * Tránh hardcode chuỗi "/..." ở khắp các component.
 */
export const ROUTES = {
  HOME: "/home",
  LOGIN: "/login",
  CUSTOMERS: "/customers",
  VEHICLES: "/vehicles",
  HISTORY: "/history",
  PARKING_LOT: "/parking-lot",
  TICKETS: "/tickets",
  EMPLOYEES: "/employees",
  NOTIFICATIONS: "/notifications",
};

export const DEFAULT_PATH = ROUTES.HOME;

/**
 * Danh sách toàn bộ tab điều hướng chính trên Navbar.
 * - Để ẩn hoặc xóa tab: Chỉ cần xóa hoặc comment dòng tương ứng ở đây.
 * - isPlaceholder: true nếu màn hình chưa làm, hệ thống sẽ tự động gắn PlaceholderPage.
 */
export const APP_NAVIGATION_TABS = [
  { label: "Trang chủ", path: ROUTES.HOME },
  { label: "Khách hàng", path: ROUTES.CUSTOMERS },
  { label: "Quản lý xe", path: ROUTES.VEHICLES },
  { label: "Lịch sử ra/vào", path: ROUTES.HISTORY },
  { label: "Sơ đồ bãi đậu xe", path: ROUTES.PARKING_LOT, isPlaceholder: true },
  { label: "Quản lý loại vé", path: ROUTES.TICKETS, isPlaceholder: true },
  { label: "Quản lý nhân viên", path: ROUTES.EMPLOYEES },
];

/**
 * Tự động trích xuất các đường dẫn trang placeholder đang phát triển
 */
export const PLACEHOLDER_PATHS = APP_NAVIGATION_TABS
  .filter((tab) => tab.isPlaceholder)
  .map((tab) => tab.path);

/**
 * Bảng phụ trợ tương thích ngược cho mã hash cũ (nếu có component nào gọi #...)
 */
export const LEGACY_HASH_TO_PATH = {
  "#home": ROUTES.HOME,
  "#homepage": ROUTES.HOME,
  "#customers": ROUTES.CUSTOMERS,
  "#vehicles": ROUTES.VEHICLES,
  "#history": ROUTES.HISTORY,
  "#parking-lot": ROUTES.PARKING_LOT,
  "#tickets": ROUTES.TICKETS,
  "#employees": ROUTES.EMPLOYEES,
};

/**
 * Chuẩn hóa đích đến: nhận vào '#home' hay '/home' đều ra path chuẩn
 */
export function resolveNavigationPath(target) {
  if (!target) return DEFAULT_PATH;
  return LEGACY_HASH_TO_PATH[target] ?? target;
}
