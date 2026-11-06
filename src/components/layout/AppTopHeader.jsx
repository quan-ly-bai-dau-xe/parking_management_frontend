import React, { useState, useRef, useEffect } from "react";
import { APP_NAVIGATION_TABS, ROUTES, resolveNavigationPath } from "../../config/navigation.js";
import { authService } from "../../services/authService";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useNavigate, useLocation } from "react-router-dom";

// Tabs dành riêng cho Khách hàng
export const CUSTOMER_NAVIGATION_TABS = [
  {
    key: "overview",
    label: "Tổng quan",
    path: "/customer/overview",
    icon: (
      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  { key: "vehicles", label: "Xe của tôi", path: "/customer/vehicles" },
  { key: "tickets", label: "Vé của tôi", path: "/customer/tickets" },
  { key: "history", label: "Lịch sử ra/vào", path: "/customer/history" },
  { key: "profile", label: "Thông tin cá nhân", path: "/customer/profile" },
];

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
  variant = "admin", // 'admin' (mặc định) hoặc 'customer'
  onOpenScanModal,
  gateId = null,
  showCamera,       // Có thể ghi đè thủ công nếu muốn
  showHelp,         // Có thể ghi đè thủ công nếu muốn
  onHelpClick,
  tabs,             // Nếu không truyền, sẽ tự chọn tabs theo variant
  activePath,
  activeTabHref,
  brandName = "Smart Parking",
  onTabClick,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { displayName, role: displayRole } = useCurrentUser();

  // Xác định cờ hiển thị theo variant nếu không được set cụ thể
  const isCustomer = variant === "customer";
  const shouldShowCamera = showCamera !== undefined ? showCamera : !isCustomer;
  const shouldShowHelp = showHelp !== undefined ? showHelp : isCustomer;

  // Tự động phân giải bộ tabs
  const effectiveTabs = tabs !== undefined
    ? tabs
    : (isCustomer ? CUSTOMER_NAVIGATION_TABS : APP_NAVIGATION_TABS);

  const rawActive = activePath !== undefined ? activePath : (activeTabHref !== undefined ? activeTabHref : location.pathname);
  const currentActivePath = resolveNavigationPath(rawActive);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    if (onOpenScanModal) onOpenScanModal();
    const targetUrl = gateId ? `/camera-scanner?gateId=${gateId}` : "/camera-scanner";
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-2xs font-sans">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3 select-none">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14V8a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0h2m-18 0H3m4 4h.01M17 18h.01" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              {brandName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* 1. Nút Camera (Mặc định ở Admin) */}
            {shouldShowCamera && (
              <button
                type="button"
                onClick={handleCameraClick}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
                title="Quét biển số xe từ hình ảnh camera"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Camera</span>
              </button>
            )}

            {/* 2. Nút Trợ giúp (Mặc định ở Customer) */}
            {shouldShowHelp && (
              <button
                type="button"
                onClick={onHelpClick || (() => {})}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs transition-all cursor-pointer"
              >
                <span>Trợ giúp</span>
              </button>
            )}

            {/* Chuông thông báo */}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setIsNotificationOpen((prev) => !prev)}
                className={`relative inline-flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer ${
                  isCustomer ? "rounded-full" : "rounded-lg"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
                      onClick={() => setNotifications((items) => items.map((it) => ({ ...it, unread: false })))}
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
                        onClick={() => setNotifications((items) => items.map((it) => (it.id === item.id ? { ...it, unread: false } : it)))}
                        className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 transition-colors ${item.unread ? "bg-blue-50/50" : ""}`}
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

            {isCustomer && <span className="h-5 w-[1px] bg-slate-200 mx-0.5" />}

            {/* Menu tài khoản */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className={`h-8 w-8 text-xs font-bold flex items-center justify-center ${
                  isCustomer
                    ? "rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                    : "rounded-lg bg-blue-100 text-blue-700"
                }`}>
                  {isCustomer ? (
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                    {displayName}
                  </span>
                  {!isCustomer && (
                    <span className="text-[10px] text-slate-500">{displayRole}</span>
                  )}
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-500">{displayRole}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>Đổi mật khẩu</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Tabs navigation: Switch kiểu dáng gạch chân (Admin) hoặc dạng Pill (Customer) */}
      {effectiveTabs && effectiveTabs.length > 0 && (
        <div className="border-t border-slate-100 bg-white">
          <div className={`w-full px-4 sm:px-6 lg:px-10 ${isCustomer ? "py-2" : ""}`}>
            <nav className={`flex overflow-x-auto text-xs ${isCustomer ? "space-x-2 sm:space-x-3" : "space-x-6 font-medium"}`}>
              {effectiveTabs.map((tab) => {
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
                      isCustomer
                        ? `inline-flex items-center px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                            isActive
                              ? "bg-blue-50 text-blue-600 font-bold shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                          }`
                        : `py-2.5 px-1 whitespace-nowrap cursor-pointer ${
                            isActive
                              ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                              : "text-slate-500 hover:text-slate-800 border-b-2 border-transparent hover:border-slate-300"
                          }`
                    }
                  >
                    {tab.icon && <span>{tab.icon}</span>}
                    <span>{tab.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}