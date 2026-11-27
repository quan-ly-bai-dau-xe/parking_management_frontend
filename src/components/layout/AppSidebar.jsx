import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  History,
  Grid3X3,
  Ticket,
  Users,
  UserCheck,
  BarChart3,
  Camera,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ROUTES } from "../../config/navigation";
import useModalA11y from "../../hooks/useModalA11y";

/**
 * Định nghĩa danh mục điều hướng toàn hệ thống kèm icon và phân quyền RBAC (R1 Other, D2)
 */
const ALL_SIDEBAR_ITEMS = [
  {
    key: "home",
    label: "Trang chủ",
    path: ROUTES.HOME,
    icon: LayoutDashboard,
    managerOnly: false,
  },
  {
    key: "customers",
    label: "Khách hàng",
    path: ROUTES.CUSTOMERS,
    icon: Users,
    managerOnly: false,
  },
  {
    key: "vehicles",
    label: "Quản lý xe",
    path: ROUTES.VEHICLES,
    icon: Car,
    managerOnly: false,
  },
  {
    key: "history",
    label: "Lịch sử ra/vào",
    path: ROUTES.HISTORY,
    icon: History,
    managerOnly: false,
  },
  {
    key: "parking-lot",
    label: "Sơ đồ bãi đậu xe",
    path: ROUTES.PARKING_LOT,
    icon: Grid3X3,
    managerOnly: false,
  },
  {
    key: "tickets",
    label: "Quản lý loại vé",
    path: ROUTES.TICKETS,
    icon: Ticket,
    managerOnly: false,
  },
  {
    key: "employees",
    label: "Quản lý nhân viên",
    path: ROUTES.EMPLOYEES,
    icon: UserCheck,
    managerOnly: true,
  },
  {
    key: "statistics",
    label: "Thống kê báo cáo",
    path: ROUTES.STATISTICS,
    icon: BarChart3,
    managerOnly: true,
  },
  {
    key: "camera-scanner",
    label: "Quét camera",
    path: ROUTES.CAMERA_SCANNER,
    icon: Camera,
    managerOnly: false,
  },
];

/**
 * Component AppSidebar điều hướng bên trái có thể thu gọn (collapsible) và hỗ trợ mobile drawer (D2)
 *
 * @param {Object} props
 * @param {boolean} [props.isCollapsed=false] - Trạng thái thu gọn trên Desktop
 * @param {Function} [props.onToggleCollapse] - Hàm chuyển đổi thu gọn/mở rộng
 * @param {boolean} [props.isMobileOpen=false] - Trạng thái mở drawer trên Mobile
 * @param {Function} [props.onCloseMobile] - Hàm đóng drawer trên Mobile
 */
export default function AppSidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isManager } = useCurrentUser();
  const { titleId: mobileTitleId, dialogProps: mobileDialogProps } = useModalA11y({
    isOpen: isMobileOpen,
    onClose: onCloseMobile,
  });

  // Lọc mục menu theo vai trò: MANAGER (9 mục) vs EMPLOYEE (6 mục)
  const navItems = useMemo(() => {
    if (isManager) {
      return ALL_SIDEBAR_ITEMS;
    }
    return ALL_SIDEBAR_ITEMS.filter((item) => !item.managerOnly);
  }, [isManager]);

  const handleNavigate = (path) => {
    navigate(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const isItemActive = (path) => {
    if (location.pathname === path) return true;
    if (
      path !== ROUTES.HOME &&
      path !== "/" &&
      location.pathname.startsWith(path)
    ) {
      return true;
    }
    return false;
  };

  return (
    <>
      {/* 1. SIDEBAR TRÊN DESKTOP (Hiển thị từ màn hình lg >= 1024px) */}
      <aside
        className={`hidden lg:flex flex-col fixed top-16 left-0 bottom-0 z-30 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Danh sách các mục menu */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigate(item.path)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  active
                    ? "bg-blue-50 text-blue-600 font-bold border-r-4 border-blue-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                } ${isCollapsed ? "justify-center" : "justify-start"}`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    active ? "text-blue-600" : "text-slate-500"
                  }`}
                />
                {!isCollapsed && (
                  <span className="text-sm truncate leading-tight">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Nút thu gọn / mở rộng ở chân Sidebar */}
        <div className="p-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-xs font-medium ${
              isCollapsed ? "justify-center" : "justify-start"
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="truncate">Thu gọn thanh điều hướng</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 2. DRAWER TRÊN MOBILE (Hiển thị khi màn hình < lg và isMobileOpen = true) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" {...mobileDialogProps}>
          {/* Backdrop tối màu */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer container trượt từ trái sang */}
          <div className="relative w-64 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {/* Header của Drawer */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3 select-none">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xs">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14V8a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0h2m-18 0H3m4 4h.01M17 18h.01" />
                  </svg>
                </div>
                <span id={mobileTitleId} className="font-bold text-slate-900 text-base tracking-tight">
                  Smart Parking
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Danh sách mục menu mobile */}
            <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.path);

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                      active
                        ? "bg-blue-50 text-blue-600 font-bold border-r-4 border-blue-600"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        active ? "text-blue-600" : "text-slate-500"
                      }`}
                    />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
