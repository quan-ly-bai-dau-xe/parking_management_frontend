import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppTopHeader from "../components/layout/AppTopHeader";

const NOTIFICATIONS = [
  { id: 1, tone: "red", title: "Xe đỗ quá giờ tại Tầng B1 - Ô A12", detail: "Biển số 51A-12345 - Chủ xe Nguyễn Văn C", time: "10:15 31/10", unread: true },
  { id: 2, tone: "amber", title: "Camera làn vào số 2 mất kết nối", detail: "Cần kiểm tra kết nối mạng", time: "09:45 31/10", unread: true },
  { id: 3, tone: "blue", title: "Không nhận diện được biển số", detail: "Làn vào số 1 - Cần phát hiện", time: "09:30 31/10", unread: true },
  { id: 4, tone: "green", title: "Đã xử lý xong cảnh báo tại B2-A05", detail: "Nhân viên: Trần Thị B", time: "09:00 31/10", unread: false },
  { id: 5, tone: "slate", title: "Cảnh báo cũ đã được đóng", detail: "Hệ thống tự động đóng sau 24h", time: "Hôm qua", unread: false },
];

const DOT_CLASSES = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  slate: "bg-slate-300",
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const markAllAsRead = () => {
    setNotifications((items) => items.map((item) => ({ ...item, unread: false })));
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-slate-800">
      <AppTopHeader activeTabHref="" />
      <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Tất cả thông báo</h1>
          <button type="button" onClick={markAllAsRead} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">Đánh dấu tất cả đã đọc</button>
        </div>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          {notifications.map((notification) => (
            <button key={notification.id} type="button" onClick={() => setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, unread: false } : item))} className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 sm:px-5 ${notification.unread ? "bg-blue-50/60" : "bg-white"}`}>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASSES[notification.tone]}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-700">{notification.title}</span>
                <span className="mt-1 block text-[11px] text-slate-400">{notification.detail}</span>
              </span>
              <span className="shrink-0 text-[10px] text-slate-400">{notification.time}</span>
            </button>
          ))}
        </section>
        {unreadCount === 0 && <p className="mt-4 text-center text-xs text-slate-400">Bạn đã đọc tất cả thông báo.</p>}
        <button type="button" onClick={() => navigate(-1)} className="mt-5 text-xs font-medium text-slate-500 hover:text-blue-600">← Quay lại</button>
        </div>
      </div>
    </div>
  );
}
