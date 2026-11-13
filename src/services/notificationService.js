import { getParkingSessions } from "./plateScanService.js";
import { getSlots } from "./parkingLotService.js";

/**
 * notificationService.js
 * Quản lý cảnh báo & thông báo tập trung cho toàn bộ ứng dụng (AppTopHeader & NotificationsPage).
 * Tổng hợp thông báo thời gian thực từ Backend:
 *  1. Cảnh báo xe đỗ quá giờ (Overstay > 24h) từ phiên gửi xe đang mở.
 *  2. Cảnh báo ô đỗ đang bảo trì hoặc bất thường.
 */

const NOTIFICATION_LISTENERS = new Set();
let cachedNotifications = [];
let isFetching = false;

export const NOTIFICATION_TONES = {
  OVERSTAY: "red",
  MAINTENANCE: "amber",
  SYSTEM: "amber",
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

/**
 * Lấy danh sách thông báo thực tế được tổng hợp từ dữ liệu hệ thống
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
              time: entryDate.toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
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
 * Lấy danh sách notifications hiện tại trong cache
 */
export function getCachedNotifications() {
  return cachedNotifications;
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
export function markAllNotificationsAsRead() {
  cachedNotifications = cachedNotifications.map((n) => ({ ...n, unread: false }));
  notifyListeners();
  return cachedNotifications;
}

/**
 * Đánh dấu một thông báo cụ thể là đã đọc
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
