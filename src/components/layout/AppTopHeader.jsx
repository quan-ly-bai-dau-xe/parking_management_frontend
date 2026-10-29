import React from "react";
import { APP_NAVIGATION_TABS, ROUTES, resolveNavigationPath } from "../../config/navigation";
import { authService } from "../../features/authService";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useNavigate, useLocation } from "react-router-dom";
import PlateScannerModal from "../PlateScannerModal";

const INITIAL_NOTIFICATIONS = [
  { id: 1, tone: "red", title: "Xe 51A-12345 đỗ quá giờ tại B1-A12", detail: "10:15 - 31/10/2024", unread: true },
  { id: 2, tone: "amber", title: "Camera làn vào số 2 mất kết nối", detail: "09:45 - 31/10/2024", unread: true },
  { id: 3, tone: "blue", title: "Biển số 51A-67890 không nhận diện được", detail: "09:30 - 31/10/2024", unread: true },
  { id: 4, tone: "green", title: "Đã xử lý xong cảnh báo tại B2-A05", detail: "09:00 - 31/10/2024", unread: false },
];
const NOTIFICATION_DOT_CLASSES = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
};

export default function AppTopHeader({
  onOpenScanModal,
  onPlateDetected,
  tabs = APP_NAVIGATION_TABS,
  activePath,
  activeTabHref,
  brandName = "LOGO",
  userName,
  fallbackName = "Anonymous",
  adminName,
  onTabClick,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Tự động nhận diện tab active qua URL hiện tại, đồng thời tương thích nếu page truyền activePath/activeTabHref
  const rawActive = activePath !== undefined ? activePath : (activeTabHref !== undefined ? activeTabHref : location.pathname);
  const currentActivePath = resolveNavigationPath(rawActive);

  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = React.useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState(INITIAL_NOTIFICATIONS);
  const dropdownRef = React.useRef(null);
  const notificationRef = React.useRef(null);
  const { displayName: hookDisplayName, role: hookRole } = useCurrentUser();

  // Ưu tiên: userName truyền trực tiếp -> hook user displayName -> adminName (nếu còn truyền) -> fallbackName
  const displayName = userName || hookDisplayName || adminName || fallbackName;
  const displayRole = hookRole || "Chưa xác định";
  const displayAvatar = displayName.charAt(0).toUpperCase();

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    setIsDropdownOpen(false);
    navigate(ROUTES.LOGIN);
  };

  const handlePasswordChange = () => {
    setIsDropdownOpen(false);
    navigate(ROUTES.LOGIN);
  };

  const handleCameraClick = () => {
    if (onOpenScanModal) {
      onOpenScanModal();
    }
    setIsScanModalOpen(true);
  };

  const handlePlateDetected = (plate) => {
    if (onPlateDetected) {
      onPlateDetected(plate);
    }
    setIsScanModalOpen(false);
  };

  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-2xs">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              {brandName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCameraClick}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
              title="Quét biển số xe từ hình ảnh camera"
            >
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Camera</span>
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setIsNotificationOpen((current) => !current)}
                aria-label="Thông báo"
                aria-expanded={isNotificationOpen}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Thông báo hệ thống</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifications((items) => items.map((item) => ({ ...item, unread: false })));
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Đánh dấu đã đọc
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setNotifications((items) =>
                            items.map((it) => (it.id === item.id ? { ...it, unread: false } : it))
                          );
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 transition-colors ${
                          item.unread ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${NOTIFICATION_DOT_CLASSES[item.tone]}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="px-4 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate(ROUTES.NOTIFICATIONS);
                      }}
                      className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-1 cursor-pointer"
                    >
                      Xem tất cả thông báo
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((current) => !current)}
                aria-label="Menu tài khoản"
                aria-expanded={isDropdownOpen}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  {displayAvatar}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {displayRole}
                  </span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="menu"
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-500">{displayRole}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                    role="menuitem"
                  >
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    <span>Đổi mật khẩu</span>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    role="menuitem"
                  >
                    <svg
                      className="w-4 h-4 text-rose-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <nav className="flex space-x-6 overflow-x-auto text-xs font-medium">
            {tabs.map((tab) => {
              const targetPath = tab.path || tab.href;
              const isActive = targetPath === currentActivePath;

              return (
                <a
                  key={`${tab.label}-${targetPath}`}
                  href={targetPath}
                  onClick={(e) => {
                    e.preventDefault();
                    if (onTabClick) {
                      onTabClick(targetPath);
                    } else {
                      navigate(resolveNavigationPath(targetPath));
                    }
                  }}
                  className={
                    isActive
                      ? "py-2.5 px-1 text-blue-600 border-b-2 border-blue-600 font-semibold whitespace-nowrap cursor-pointer"
                      : "py-2.5 px-1 text-slate-500 hover:text-slate-800 border-b-2 border-transparent hover:border-slate-300 whitespace-nowrap cursor-pointer"
                  }
                >
                  {tab.label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </header>

    {/* Component Modal Camera Quét Biển Số */}
      <PlateScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onDetected={handlePlateDetected}
      />
    </>
  );
}


