/**
 * Navigation tabs registry for the application.
 * To add a new page:
 * 1. Add an entry here with label, href (e.g. '#parking-lot'), and optional description.
 * 2. Register the component in src/App.jsx.
 */
export const APP_NAVIGATION_TABS = [
  { label: "Trang chủ", href: "#home" },
  { label: "Khách hàng", href: "#customers" },
  { label: "Quản lý xe", href: "#vehicles" },
  { label: "Lịch sử ra/vào", href: "#history" },
  { label: "Sơ đồ bãi đậu xe", href: "#parking-lot" },
  { label: "Quản lý loại vé", href: "#tickets" },
  { label: "Quản lý nhân viên", href: "#employees" },
];

export const DEFAULT_ACTIVE_TAB = "#history";
