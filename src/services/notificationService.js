import { apiClient } from "./apiClient.js";
import { getParkingSessions } from "./plateScanService.js";
import { getSlots } from "./parkingLotService.js";
import { formatDateTimeVN } from "../utils/formatDateTime.js";

/**
 * notificationService.js
 * Quản lý cảnh báo & thông báo tập trung cho toàn bộ ứng dụng (AppTopHeader & NotificationsPage).
 * - CUSTOMER: gọi API thật /api/v1/me/notifications/ (GET, mark read, read-all).
 * - EMPLOYEE / MANAGER: tổng hợp cảnh báo vận hành bãi xe từ phiên đỗ & trạng thái ô đỗ.
 */

const NOTIFICATION_LISTENERS = new Set();
let cachedNotifications = [];
let isFetching = false;

export const NOTIFICATION_TONES = {
  OVERSTAY: "red",
  PAYMENT: "red",
  SECURITY: "red",
  TICKET_EXPIRY: "amber",
  MAINTENANCE: "amber",
  SYSTEM: "blue",
  ANOMALY: "blue",
  INFO: "green",
};

export const NOTIFICATION_DOT_CLASSES = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  slate: "bg-slate-300",
};

function formatNotificationTime(isoString) {
  return formatDateTimeVN(isoString, "");
}

export function normalizeCustomerNotification(item) {
  const notificationType = String(
    item?.notification_type ?? item?.notificationType ?? "SYSTEM"
  ).toUpperCase();
  const isRead = Boolean(item?.is_read ?? item?.isRead);
  const createdAt = item?.created_at ?? item?.createdAt ?? null;
  const readAt = item?.read_at ?? item?.readAt ?? null;
  const content = item?.content ?? item?.detail ?? "";
  const missingAmount = item?.missing_amount ?? item?.missingAmount ?? null;
  const tone = NOTIFICATION_TONES[notificationType] || "blue";

  return {
    id: item?.id,
    title: item?.title || "",
    content,
    detail: content,
    notificationType,
    notification_type: notificationType,
    type: notificationType,
    isRead,
    is_read: isRead,
    unread: !isRead,
    readAt,
    read_at: readAt,
    createdAt,
    created_at: createdAt,
    missingAmount,
    missing_amount: missingAmount,
    tone,
    time: formatNotificationTime(createdAt),
  };
}

/**
 * CUSTOMER Self-Service: Lấy danh sách thông báo cá nhân từ /api/v1/me/notifications/.
 */
export async function getMyNotifications({
  page = 1,
  pageSize = 20,
  isRead,
  notificationType,
} = {}) {
  const params = {
    page,
    page_size: pageSize,
  };
  if (isRead !== undefined && isRead !== null && isRead !== "") {
    params.is_read = isRead;
  }
  if (notificationType) {
    params.notification_type = notificationType;
  }

  const data = await apiClient("/api/v1/me/notifications/", {
    method: "GET",
    params,
  });

  const rawItems = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];
  const results = rawItems.map(normalizeCustomerNotification);
  const unreadCount =
    typeof data?.unread_count === "number"
      ? data.unread_count
      : results.filter((n) => n.unread).length;

  cachedNotifications = results;
  notifyListeners();

  return {
    count: typeof data?.count === "number" ? data.count : results.length,
    totalPages: data?.total_pages ?? 1,
    currentPage: data?.current_page ?? page,
    pageSize: data?.page_size ?? pageSize,
    unreadCount,
    unread_count: unreadCount,
    results,
    items: results,
  };
}

/**
 * CUSTOMER Self-Service: Đánh dấu một thông báo là đã đọc.
 */
export async function markNotificationRead(id) {
  const data = await apiClient(`/api/v1/me/notifications/${id}/read/`, {
    method: "POST",
  });
  cachedNotifications = cachedNotifications.map((n) =>
    n.id === id
      ? {
          ...n,
          unread: false,
          isRead: true,
          is_read: true,
          readAt: data?.notification?.read_at ?? n.readAt ?? new Date().toISOString(),
        }
      : n
  );
  notifyListeners();
  return data;
}

export const markMyNotificationRead = markNotificationRead;

/**
 * CUSTOMER Self-Service: Đánh dấu toàn bộ thông báo cá nhân là đã đọc.
 */
export async function markAllNotificationsRead() {
  const data = await apiClient("/api/v1/me/notifications/read-all/", {
    method: "POST",
  });
  const nowIso = new Date().toISOString();
  cachedNotifications = cachedNotifications.map((n) => ({
    ...n,
    unread: false,
    isRead: true,
    is_read: true,
    readAt: n.readAt || nowIso,
  }));
  notifyListeners();
  return data;
}

export const markAllMyNotificationsRead = markAllNotificationsRead;

/**
 * Lấy danh sách thông báo thực tế được tổng hợp từ dữ liệu hệ thống (EMPLOYEE / MANAGER).
 */
export async function fetchLiveNotifications() {
  if (isFetching) return cachedNotifications;
  isFetching = true;

  try {
    const notifications = [];

    // 1. Quét các phiên xe đang mở để tìm xe đỗ quá giờ (>24h)
    try {
      const sessionRes = await getParkingSessions({ status: "open", limit: 50 });
      const activeSessions = Array.isArray(sessionRes?.items)
        ? sessionRes.items
        : Array.isArray(sessionRes?.results)
        ? sessionRes.results
        : [];

      const now = Date.now();
      activeSessions.forEach((s) => {
        const entryTime = s.entryTimeRaw || s.rawEntryTime || s.entry_time;
        if (entryTime) {
          const entryDate = new Date(entryTime);
          const durationHours = (now - entryDate.getTime()) / (1000 * 60 * 60);

          if (durationHours >= 24 || s.isOverstay || s.is_overstay) {
            const plate = s.licensePlate || s.license_plate || "Chưa rõ";
            const slot = s.slotCode || s.slot_code || "Chưa gán ô";
            notifications.push({
              id: `overstay-${s.id || s.sessionCode || plate}`,
              tone: "red",
              type: "OVERSTAY",
              title: `Xe ${plate} đỗ quá giờ tại ${slot}`,
              detail: `Thời gian đỗ: ${Math.floor(durationHours)}h liên tục. Vượt hạn mức 24h.`,
              time: formatDateTimeVN(entryTime, ""),
              unread: true,
              actionUrl: `/parking-lot?slot=${encodeURIComponent(slot)}`,
              slotCode: slot,
            });
          }
        }
      });
    } catch (err) {
      console.warn("Could not fetch active sessions for notifications:", err);
    }

    // 2. Quét các ô đỗ đang bảo trì hoặc hỏng hóc từ backend
    try {
      const slots = await getSlots();
      if (Array.isArray(slots)) {
        const maintenanceSlots = slots.filter(
          (slot) => slot.status === "MAINTENANCE" || slot.status === "maintenance"
        );
        maintenanceSlots.forEach((slot) => {
          notifications.push({
            id: `maintenance-${slot.id || slot.code}`,
            tone: "amber",
            type: "MAINTENANCE",
            title: `Ô đỗ ${slot.code || slot.slotCode} đang bảo trì`,
            detail: `Vị trí: ${slot.floor || "B1"} - ${slot.zone || "A"}. Tạm dừng phân bổ xe vào vị trí này.`,
            time: "Hôm nay",
            unread: false,
            actionUrl: `/parking-lot?slot=${encodeURIComponent(slot.code || "")}`,
            slotCode: slot.code || slot.slotCode,
          });
        });
      }
    } catch (err) {
      console.warn("Could not fetch slots for notifications:", err);
    }

    // Nếu hệ thống hoàn toàn mới chưa có cảnh báo nào, hiển thị thông báo trạng thái vận hành ổn định
    if (notifications.length === 0) {
      notifications.push({
        id: "system-ready",
        tone: "green",
        type: "INFO",
        title: "Hệ thống vận hành bình thường",
        detail: "Không có xe đỗ quá giờ hoặc cảnh báo kỹ thuật bất thường.",
        time: "Vừa xong",
        unread: false,
      });
    }

    cachedNotifications = notifications;
    notifyListeners();
    return cachedNotifications;
  } finally {
    isFetching = false;
  }
}

/**
 * Tải thông báo an toàn theo vai trò người dùng (tránh 403 chéo role).
 */
export async function fetchNotificationsForRole(role, options = {}) {
  const normalizedRole = String(role || "").toUpperCase();
  if (normalizedRole === "CUSTOMER") {
    return getMyNotifications(options);
  }
  if (normalizedRole === "EMPLOYEE" || normalizedRole === "MANAGER" || normalizedRole === "ADMIN") {
    const items = await fetchLiveNotifications();
    return {
      count: items.length,
      unreadCount: items.filter((n) => n.unread).length,
      unread_count: items.filter((n) => n.unread).length,
      results: items,
      items,
    };
  }
  return { count: 0, unreadCount: 0, unread_count: 0, results: [], items: [] };
}

/**
 * Lấy danh sách notifications hiện tại trong cache
 */
export function getCachedNotifications() {
  return cachedNotifications;
}

/**
 * Đánh dấu tất cả thông báo là đã đọc (cache cục bộ)
 */
export function markAllNotificationsAsRead() {
  cachedNotifications = cachedNotifications.map((n) => ({ ...n, unread: false }));
  notifyListeners();
  return cachedNotifications;
}

/**
 * Đánh dấu một thông báo cụ thể là đã đọc (cache cục bộ)
 */
export function markNotificationAsRead(id) {
  cachedNotifications = cachedNotifications.map((n) =>
    n.id === id ? { ...n, unread: false } : n
  );
  notifyListeners();
  return cachedNotifications;
}

/**
 * Đăng ký lắng nghe thay đổi thông báo (cho AppTopHeader và NotificationsPage)
 */
export function subscribeNotifications(callback) {
  NOTIFICATION_LISTENERS.add(callback);
  return () => {
    NOTIFICATION_LISTENERS.delete(callback);
  };
}

function notifyListeners() {
  NOTIFICATION_LISTENERS.forEach((cb) => {
    try {
      cb(cachedNotifications);
    } catch (e) {
      console.warn("Notification listener error:", e);
    }
  });
}
