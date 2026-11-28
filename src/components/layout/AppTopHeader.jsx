import React, { useState, useRef, useEffect } from "react";
import { APP_NAVIGATION_TABS, ROUTES, resolveNavigationPath } from "../../config/navigation.js";
import { SHOW_MANAGEMENT_SIDEBAR } from "../../config/appConfig.js";
import { authService } from "../../services/authService";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchLiveNotifications,
} from "../../services/notificationService";
import PlateScannerModal from "../PlateScannerModal";
import GateCameraControlModal from "../VehicleManagement/GateCameraControlModal";

const CUSTOMER_NAVIGATION_TABS = [
  {
    key: "overview",
    label: "Tổng quan",
    path: "/overview",
    icon: (
      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  { key: "vehicles", label: "Xe của tôi", path: "/customerVehicle" },
  { key: "tickets", label: "Vé của tôi", path: "/customerTicket" },
  { key: "parking-lot", label: "Sơ đồ bãi đậu xe", path: ROUTES.PARKING_LOT },
  { key: "profile", label: "Thông tin cá nhân", path: "/profile" },
];

const NOTIFICATION_DOT_CLASSES = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  slate: "bg-slate-300",
};

export default function AppTopHeader({
  variant = "admin",
  entryGateId = 1,
  exitGateId = 3,
  showCamera,
  showHelp,
  onHelpClick,
  tabs,
  activePath,
  activeTabHref,
  brandName = "Smart Parking",
  onTabClick,
  onOpenScanModal,
  onPlateDetected,
  onOpenMobileMenu,
  showTopTabs,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, displayName, role: displayRole } = useCurrentUser();

  const isAuthenticated = Boolean(user);
  const normalizedRole = String(displayRole || "").toUpperCase();
  const isCustomerRole = normalizedRole === "CUSTOMER";
  const isCustomer = variant === "customer" || isCustomerRole;
  const shouldShowCamera = showCamera !== undefined ? showCamera : !isCustomer;
  const shouldShowHelp = showHelp !== undefined ? showHelp : isCustomer;
  const shouldShowMobileMenuBtn = Boolean(
    onOpenMobileMenu && SHOW_MANAGEMENT_SIDEBAR && !isCustomer
  );
  const shouldShowTopTabs =
    showTopTabs !== undefined
      ? showTopTabs
      : isCustomer || !SHOW_MANAGEMENT_SIDEBAR;

  const effectiveTabs = tabs !== undefined
    ? tabs
    : (isCustomer ? CUSTOMER_NAVIGATION_TABS : APP_NAVIGATION_TABS);

  const rawActive = activePath !== undefined ? activePath : (activeTabHref !== undefined ? activeTabHref : location.pathname);
  const currentActivePath = resolveNavigationPath(rawActive);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = React.useState(false);
  const [isGateControlModalOpen, setIsGateControlModalOpen] = React.useState(false);
  const [gateModalPlate, setGateModalPlate] = React.useState("");
  const [gateModalScanResult, setGateModalScanResult] = useState(null);
  const [gateModalMode, setGateModalMode] = useState("entry");
  const [gateModalGateId, setGateModalGateId] = useState(entryGateId || 1);
  const lastHandledScanRef = useRef("");

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [serverUnreadCount, setServerUnreadCount] = useState(null);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !isCustomerRole) {
      return undefined;
    }

    let isMounted = true;
    let intervalId = null;
    const loadCustomerNotifications = async () => {
      try {
        const res = await getMyNotifications({ pageSize: 10 });
        if (isMounted) {
          setNotifications(res.results || []);
          setServerUnreadCount(res.unreadCount ?? 0);
        }
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }
    };

    loadCustomerNotifications();
    intervalId = setInterval(loadCustomerNotifications, 10000);
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [isAuthenticated, isCustomerRole]);

  useEffect(() => {
    if (!isAuthenticated || isCustomerRole || !isNotificationOpen) {
      return undefined;
    }
    if (normalizedRole !== "EMPLOYEE" && normalizedRole !== "MANAGER" && normalizedRole !== "ADMIN") {
      return undefined;
    }

    let isMounted = true;
    fetchLiveNotifications()
      .then((items) => {
        if (isMounted && Array.isArray(items)) {
          setNotifications(items);
        }
      })
      .catch(() => {
        // Ignore transient staff notification errors
      });
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isCustomerRole, isNotificationOpen, normalizedRole]);

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

  React.useEffect(() => {
    const handleOpenGateModal = (event) => {
      const detail = event?.detail;
      const rawMode = detail?.mode ?? detail?.lane;
      const hasMode = rawMode !== undefined && rawMode !== null && rawMode !== "";
      const mappedMode =
        rawMode === "out" || rawMode === "exit" ? "exit" : "entry";
      const hasGateId = detail?.gateId !== undefined && detail?.gateId !== null;
      const resolvedGateId = hasGateId
        ? detail.gateId
        : mappedMode === "exit"
        ? exitGateId
        : entryGateId;

      setIsScannerModalOpen(false);
      setGateModalPlate(detail?.plate || "");
      setGateModalScanResult(detail?.resultData || null);
      if (hasMode) {
        setGateModalMode(mappedMode);
      }
      if (hasGateId || hasMode) {
        setGateModalGateId(resolvedGateId);
      }
      setIsGateControlModalOpen(true);
    };

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("open-gate-control-modal", handleOpenGateModal);
    }

    return () => {
      if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("open-gate-control-modal", handleOpenGateModal);
      }
    };
  }, [entryGateId, exitGateId]);

  const handleLogout = () => {
    authService.logout();
    setIsDropdownOpen(false);
    navigate(ROUTES.LOGIN);
  };

  const handlePasswordChange = () => {
    setIsDropdownOpen(false);
    navigate(ROUTES.LOGIN);
  };

  // Mở tab máy quét theo chế độ Làn vào (IN) hoặc Làn ra (OUT)
  const handleOpenScanner = (mode) => {
    if (onOpenScanModal) {
      onOpenScanModal();
    }
    const gateId = mode === "in" ? entryGateId : exitGateId;
    const scannerUrl = `/camera-scanner?mode=${mode}&gateId=${gateId}`;
    window.open(scannerUrl, "_blank", "noopener,noreferrer");
  };

  const handlePlateDetectedFromScanner = (plate, scanResult) => {
    setIsScannerModalOpen(false);
    setGateModalPlate(plate || "");
    setGateModalScanResult(scanResult || null);
    setGateModalMode("entry");
    setGateModalGateId(entryGateId || 1);
    setIsGateControlModalOpen(true);
    if (onPlateDetected) {
      onPlateDetected(plate, scanResult);
    }
  };

  const handleGateModalClose = () => {
    setIsGateControlModalOpen(false);
    setGateModalPlate("");
    setGateModalScanResult(null);
  };

  // Lắng nghe sự kiện quét biển số từ tab máy quét độc lập (/camera-scanner)
  useEffect(() => {
    const handleScanMessage = (msg) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type !== "PLATE_SCANNED_SUCCESS") return;
      const rawPlate = (typeof msg.plate === "string" ? msg.plate : String(msg.plate || "")).trim();
      if (!rawPlate) return;

      // Khử trùng lặp (Deduplication) khi cả BroadcastChannel và storage event cùng kích hoạt
      const scanId = msg.scanId || `${rawPlate}_${msg.timestamp || Date.now()}`;
      if (lastHandledScanRef.current === scanId) return;
      lastHandledScanRef.current = scanId;

      const mappedMode = msg.mode === "out" || msg.mode === "exit" ? "exit" : "entry";
      const resolvedGateId = msg.gateId || (mappedMode === "exit" ? exitGateId : entryGateId);

      setIsScannerModalOpen(false); // [Challenger 2]: Ngăn chặn mở đúp 2 modal song song
      setGateModalPlate(rawPlate);
      setGateModalScanResult(msg.resultData || null);
      setGateModalMode(mappedMode);
      setGateModalGateId(resolvedGateId);
      setIsGateControlModalOpen(true);

      if (onPlateDetected) {
        onPlateDetected(rawPlate, msg.resultData || msg);
      }
    };

    let channel = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("smart_parking_plate_scan");
        channel.onmessage = (event) => {
          try {
            handleScanMessage(event?.data);
          } catch (err) {
            console.warn("BroadcastChannel message error:", err);
          }
        };
      }
    } catch (err) {
      console.warn("BroadcastChannel error:", err);
    }

    const handleStorage = (event) => {
      if (event.key !== "smart_parking_latest_scan" || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        handleScanMessage(parsed);
      } catch (err) {
        console.warn("Invalid localStorage scan payload:", err);
      }
    };

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch (err) {
          void err;
        }
      }
      if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, [entryGateId, exitGateId, onPlateDetected]);

  const unreadCount =
    isCustomerRole && serverUnreadCount !== null
      ? serverUnreadCount
      : notifications.filter((item) => item.unread).length;

  const handleMarkAllRead = async () => {
    if (isCustomerRole) {
      try {
        await markAllNotificationsRead();
        setServerUnreadCount(0);
      } catch {
        // Ignore transient mark-all failure
      }
    }
    setNotifications((items) => items.map((it) => ({ ...it, unread: false, isRead: true })));
  };

  const handleMarkSingleRead = async (item) => {
    if (!item?.id) return;
    if (isCustomerRole && item.unread) {
      try {
        const res = await markNotificationRead(item.id);
        if (typeof res?.unread_count === "number") {
          setServerUnreadCount(res.unread_count);
        } else {
          setServerUnreadCount((c) => (typeof c === "number" ? Math.max(0, c - 1) : 0));
        }
      } catch {
        // Ignore transient mark-read failure
      }
    }
    setNotifications((items) =>
      items.map((it) => (it.id === item.id ? { ...it, unread: false, isRead: true } : it))
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-2xs font-sans">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <div className="flex h-16 items-center justify-between gap-2 sm:gap-4 min-w-0">

            {/* Logo Brand */}
            <div className="flex items-center gap-2 sm:gap-3 select-none min-w-0">
              {shouldShowMobileMenuBtn && (
                <button
                  type="button"
                  onClick={onOpenMobileMenu}
                  className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
                  aria-label="Mở menu điều hướng"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div
                className={`${
                  shouldShowMobileMenuBtn ? "hidden sm:flex" : "flex"
                } h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14V8a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0h2m-18 0H3m4 4h.01M17 18h.01" />
                </svg>
              </div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 truncate">
                {brandName}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* TÁCH LÀM 2 NÚT CAMERA: LÀN VÀO VÀ LÀN RA */}
              {shouldShowCamera && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Nút 1: Camera Quét Xe Vào */}
                  <button
                    type="button"
                    onClick={() => handleOpenScanner("in")}
                    aria-label="Camera vào"
                    className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800 text-xs font-semibold text-emerald-700 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                    title="Mở camera barrier làn xe vào (Check-in)"
                  >
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="sm:hidden">Vào</span>
                    <span className="hidden sm:inline">Camera vào</span>
                  </button>

                  {/* Nút 2: Camera Quét Xe Ra */}
                  <button
                    type="button"
                    onClick={() => handleOpenScanner("out")}
                    aria-label="Camera ra"
                    className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:py-1.5 rounded-lg border border-blue-300 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-800 text-xs font-semibold text-blue-700 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                    title="Mở camera barrier làn xe ra (Check-out)"
                  >
                    <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="sm:hidden">Ra</span>
                    <span className="hidden sm:inline">Camera ra</span>
                  </button>
                </div>
              )}

              {/* Nút Trợ giúp */}
              {shouldShowHelp && (
                <button
                  type="button"
                  onClick={onHelpClick || (() => {})}
                  className="inline-flex items-center gap-1.5 px-3.5 min-h-[44px] sm:min-h-0 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Trợ giúp</span>
                </button>
              )}

              {/* Chuông thông báo (ẩn khi chưa đăng nhập, vd /onboard) */}
              {isAuthenticated && (
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => setIsNotificationOpen((prev) => !prev)}
                    aria-label="Thông báo"
                    className={`relative inline-flex min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:h-9 sm:w-9 items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer ${
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
                    <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800">
                          {isCustomer ? "Thông báo của tôi" : "Thông báo hệ thống"}
                        </span>
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          Đánh dấu đã đọc
                        </button>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-slate-400">
                            Chưa có thông báo nào.
                          </div>
                        ) : (
                          notifications.map((item) => {
                            const missingInt = item.missingAmount
                              ? Math.ceil(Number(item.missingAmount))
                              : 0;
                            return (
                              <div
                                key={item.id}
                                className={`w-full px-4 py-2.5 flex items-start gap-2.5 hover:bg-slate-50 transition-colors ${item.unread ? "bg-blue-50/50" : ""}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleMarkSingleRead(item)}
                                  className="flex flex-1 min-w-0 items-start gap-2.5 text-left cursor-pointer"
                                >
                                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${NOTIFICATION_DOT_CLASSES[item.tone] || "bg-blue-500"}`} />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{item.detail || item.content}</p>
                                    {item.time && (
                                      <p className="text-[10px] text-slate-400 mt-0.5">{item.time}</p>
                                    )}
                                  </div>
                                </button>
                                {isCustomerRole && Number.isFinite(missingInt) && missingInt > 0 && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await handleMarkSingleRead(item);
                                      setIsNotificationOpen(false);
                                      navigate(
                                        `${ROUTES.CUSTOMER_PROFILE}?topup=vnpay&amount=${missingInt}`,
                                        {
                                          state: {
                                            openTopup: true,
                                            topupMethod: "vnpay",
                                            topupAmount: missingInt,
                                            source: "WALLET_INSUFFICIENT",
                                            notificationId: item.id,
                                          },
                                        }
                                      );
                                    }}
                                    className="shrink-0 mt-0.5 px-2 py-1 rounded-md text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                  >
                                    Nạp bù
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="border-t border-slate-100 mt-1 pt-1.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNotificationOpen(false);
                            navigate(ROUTES.NOTIFICATIONS);
                          }}
                          className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-1 cursor-pointer"
                        >
                          Xem tất cả
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isAuthenticated && isCustomer && (
                <span className="h-5 w-[1px] bg-slate-200 mx-0.5" />
              )}

              {/* Menu tài khoản (ẩn khi chưa đăng nhập, vd /onboard) */}
              {isAuthenticated && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    aria-label="Tài khoản"
                    className="flex items-center justify-center sm:justify-start gap-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
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
              )}

            </div>
          </div>
        </div>

        {/* Tabs navigation */}
        {effectiveTabs && effectiveTabs.length > 0 && shouldShowTopTabs && (
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

      {/* 1. Modal Quét Biển Số trên Header (Camera Laptop) */}
      <PlateScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onDetected={handlePlateDetectedFromScanner}
        gateId={entryGateId || 1}
      />

      {/* 2. Modal Kiểm Soát Cổng Vào / Ra */}
      <GateCameraControlModal
        isOpen={isGateControlModalOpen}
        onClose={handleGateModalClose}
        initialPlate={gateModalPlate}
        initialScanResult={gateModalScanResult}
        initialLane={gateModalMode}
        gateId={gateModalGateId}
      />
    </>
  );
}
