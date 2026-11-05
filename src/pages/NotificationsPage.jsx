import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import AppTopHeader from "../components/layout/AppTopHeader";

const NOTIFICATIONS = [
  {
    id: 1,
    tone: "red",
    type: "OVERSTAY",
    title: "Xe đỗ quá giờ tại Tầng B1 - Ô A12",
    detail: "Biển số 51A-12345 - Chủ xe Nguyễn Văn C - Đỗ liên tục >48h",
    time: "10:15 31/10",
    unread: true,
    actionUrl: "/parking-lot?floor=B1&zone=A&slot=A-12",
    slotCode: "A-12",
  },
  {
    id: 2,
    tone: "amber",
    type: "SYSTEM",
    title: "Camera làn vào số 2 mất kết nối",
    detail: "Cần kiểm tra kết nối mạng switch cổng Bắc",
    time: "09:45 31/10",
    unread: true,
  },
  {
    id: 3,
    tone: "blue",
    type: "ANOMALY",
    title: "Không nhận diện được biển số",
    detail: "Làn vào số 1 - Cần nhân viên soát vé nhập tay",
    time: "09:30 31/10",
    unread: true,
  },
  {
    id: 4,
    tone: "green",
    type: "OVERSTAY",
    title: "Đã xử lý xong cảnh báo đỗ quá giờ tại B2-A05",
    detail: "Nhân viên: Trần Thị B đã xác nhận chủ xe gia hạn",
    time: "09:00 31/10",
    unread: false,
    actionUrl: "/parking-lot?floor=B2&zone=A&slot=A-05",
    slotCode: "A-05",
  },
  {
    id: 5,
    tone: "slate",
    type: "SYSTEM",
    title: "Cảnh báo cũ đã được đóng tự động",
    detail: "Hệ thống tự động lưu trữ sau 24h",
    time: "Hôm qua",
    unread: false,
  },
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
  const [filterType, setFilterType] = useState("ALL");

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const markAllAsRead = () => {
    setNotifications((items) => items.map((item) => ({ ...item, unread: false })));
  };

  const handleToggleRead = (id) => {
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, unread: false } : item))
    );
  };

  const filteredNotifications = useMemo(() => {
    if (filterType === "OVERSTAY") {
      return notifications.filter((n) => n.type === "OVERSTAY");
    }
    if (filterType === "UNREAD") {
      return notifications.filter((n) => n.unread);
    }
    return notifications;
  }, [notifications, filterType]);

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-slate-800">
      <AppTopHeader activePath="" />
      <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Tất cả thông báo
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi các sự kiện và cảnh báo vận hành toàn hệ thống
              </p>
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Đánh dấu tất cả đã đọc
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
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
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Không có thông báo nào trong mục này.
              </div>
            ) : (
              filteredNotifications.map((notification) => (
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
                        DOT_CLASSES[notification.tone]
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">
                          {notification.title}
                        </span>
                        {notification.type === "OVERSTAY" && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            Quá giờ
                          </span>
                        )}
                      </div>
                      <span className="mt-1 block text-2xs text-slate-500">
                        {notification.detail}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-5 sm:pl-0">
                    <span className="shrink-0 text-2xs text-slate-400">
                      {notification.time}
                    </span>

                    {notification.actionUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleRead(notification.id);
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
              ))
            )}
          </section>

          {unreadCount === 0 && (
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
      </div>
    </div>
  );
}
