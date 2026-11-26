import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ArrowRight, Wallet } from "lucide-react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { ROUTES } from "../config/navigation.js";
import { formatCurrencyVND } from "../constants/paymentConstants.js";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchLiveNotifications,
} from "../services/notificationService";

const DOT_CLASSES = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  slate: "bg-slate-300",
};

const NOTIFICATION_TYPE_LABELS = {
  PAYMENT: "Thanh toán",
  TICKET_EXPIRY: "Gia hạn vé",
  SECURITY: "An ninh",
  SYSTEM: "Hệ thống",
  OVERSTAY: "Quá giờ",
  MAINTENANCE: "Bảo trì",
  INFO: "Thông tin",
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { role } = useCurrentUser();
  const normalizedRole = String(role || "").toUpperCase();
  const isCustomer = normalizedRole === "CUSTOMER";

  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        if (isCustomer) {
          const res = await getMyNotifications({ pageSize: 50 });
          if (isMounted) {
            setNotifications(res.results || []);
          }
        } else if (
          normalizedRole === "EMPLOYEE" ||
          normalizedRole === "MANAGER" ||
          normalizedRole === "ADMIN"
        ) {
          const items = await fetchLiveNotifications();
          if (isMounted) {
            setNotifications(Array.isArray(items) ? items : []);
          }
        } else if (isMounted) {
          setNotifications([]);
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(err?.message || "Không thể tải danh sách thông báo.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [isCustomer, normalizedRole]);

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const markAllAsRead = async () => {
    if (isCustomer) {
      try {
        await markAllNotificationsRead();
      } catch {
        // Keep UI responsive even if transient network error occurs
      }
    }
    setNotifications((items) => items.map((item) => ({ ...item, unread: false, isRead: true })));
  };

  const handleToggleRead = async (id) => {
    const target = notifications.find((item) => item.id === id);
    if (isCustomer && target?.unread) {
      try {
        await markNotificationRead(id);
      } catch {
        // Ignore transient network errors
      }
    }
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, unread: false, isRead: true } : item))
    );
  };

  const filteredNotifications = useMemo(() => {
    if (filterType === "PAYMENT") {
      return notifications.filter((n) => n.type === "PAYMENT" || n.notificationType === "PAYMENT");
    }
    if (filterType === "OVERSTAY") {
      return notifications.filter((n) => n.type === "OVERSTAY");
    }
    if (filterType === "UNREAD") {
      return notifications.filter((n) => n.unread);
    }
    return notifications;
  }, [notifications, filterType]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Tất cả thông báo
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCustomer
              ? "Theo dõi thông báo thanh toán ví, gia hạn vé và sự kiện tại cổng bãi đỗ xe"
              : "Theo dõi các sự kiện và cảnh báo vận hành toàn hệ thống"}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllAsRead}
          disabled={notifications.length === 0}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50"
        >
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setFilterType("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
            filterType === "ALL"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Tất cả ({notifications.length})
        </button>
        {isCustomer ? (
          <button
            type="button"
            onClick={() => setFilterType("PAYMENT")}
            className={`min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterType === "PAYMENT"
                ? "bg-rose-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Thanh toán</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setFilterType("OVERSTAY")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterType === "OVERSTAY"
                ? "bg-rose-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Đỗ quá giờ</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setFilterType("UNREAD")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
            filterType === "UNREAD"
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Chưa đọc ({unreadCount})
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Đang tải thông báo...
          </div>
        ) : loadError ? (
          <div className="p-8 text-center text-xs text-rose-600">{loadError}</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Không có thông báo nào trong mục này.
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const nType = notification.notificationType || notification.type;
            const badgeLabel = NOTIFICATION_TYPE_LABELS[nType] || nType;
            return (
              <div
                key={notification.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 p-4 transition-colors last:border-b-0 hover:bg-slate-50/80 ${
                  notification.unread ? "bg-blue-50/50" : "bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleRead(notification.id)}
                  className="flex flex-1 items-start gap-3 text-left cursor-pointer"
                >
                  <span
                    className={`h-2.5 w-2.5 mt-1 shrink-0 rounded-full ${
                      DOT_CLASSES[notification.tone] || "bg-blue-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800">
                        {notification.title}
                      </span>
                      {badgeLabel && (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            nType === "PAYMENT" || nType === "OVERSTAY" || nType === "SECURITY"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {badgeLabel}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 block text-2xs text-slate-500">
                      {notification.content || notification.detail}
                    </span>
                  </div>
                </button>

                <div className="flex items-center justify-between sm:justify-end gap-3 pl-5 sm:pl-0">
                  <span className="shrink-0 text-2xs text-slate-400">
                    {notification.time}
                  </span>

                  {isCustomer && notification.missingAmount && (
                    <button
                      type="button"
                      onClick={async () => {
                        const missingInt = Math.ceil(Number(notification.missingAmount));
                        await handleToggleRead(notification.id);
                        if (Number.isFinite(missingInt) && missingInt > 0) {
                          navigate(
                            `${ROUTES.CUSTOMER_PROFILE}?topup=vnpay&amount=${missingInt}`,
                            {
                              state: {
                                openTopup: true,
                                topupMethod: "vnpay",
                                topupAmount: missingInt,
                                source: "WALLET_INSUFFICIENT",
                                notificationId: notification.id,
                              },
                            }
                          );
                        } else {
                          navigate(`${ROUTES.CUSTOMER_PROFILE}?topup=vnpay`, {
                            state: { openTopup: true, topupMethod: "vnpay" },
                          });
                        }
                      }}
                      className="min-h-[44px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition shrink-0"
                    >
                      <span>Nạp {formatCurrencyVND(notification.missingAmount)}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {notification.actionUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleToggleRead(notification.id);
                        navigate(notification.actionUrl);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer transition shrink-0"
                    >
                      <span>Xem vị trí</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {!isLoading && unreadCount === 0 && notifications.length > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Bạn đã đọc tất cả thông báo quan trọng.</span>
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-3 text-xs font-medium text-slate-500 hover:text-blue-600 cursor-pointer"
        >
          ← Quay lại
        </button>
      </div>
    </div>
  );
}
