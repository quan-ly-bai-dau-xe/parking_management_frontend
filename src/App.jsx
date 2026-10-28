import { useNavigate, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import VehicleManagement from "./pages/VehicleManagement";
import ParkingHistory from "./pages/ParkingHistory";
import Login from "./pages/LoginPage";
import CustomerManagement from "./pages/CustomerManagement";
import NotificationsPage from "./pages/NotificationsPage";
import EmployeeManagement from "./pages/EmployeeManagement";
import { ROUTES, PLACEHOLDER_PATHS, resolveNavigationPath } from "./config/navigation";

// Cấu hình các route có giao diện dạng Layout chuẩn
const LAYOUT_ROUTES = [
  { path: ROUTES.CUSTOMERS, component: <CustomerManagement /> },
  { path: ROUTES.EMPLOYEES, component: <EmployeeManagement /> },
  { path: ROUTES.VEHICLES, component: <VehicleManagement /> },
];

function PlaceholderPage({ title = "Trang đang được phát triển" }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 mb-4 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">{title}</h2>
      <p className="text-xs text-slate-500 max-w-sm mb-6">
        Tính năng đang trong lộ trình hoàn thiện và sẽ sớm ra mắt.
      </p>
      <button
        type="button"
        onClick={() => navigate(ROUTES.VEHICLES)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
      >
        Về Quản lý xe
      </button>
    </div>
  );
}

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 mb-4 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-slate-800 mb-1">
        404 - Không tìm thấy trang
      </h2>
      <p className="text-xs text-slate-500 max-w-sm mb-6">
        Đường dẫn bạn truy cập không tồn tại hoặc đã được chuyển hướng.
      </p>
      <button
        type="button"
        onClick={() => navigate(ROUTES.VEHICLES)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
      >
        Về Quản lý xe
      </button>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();

  const handleNavigateTab = (target) => {
    navigate(resolveNavigationPath(target));
  };

  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />

      <Route path="/" element={<Navigate to={ROUTES.HOME} replace />} />

      <Route
        path={ROUTES.HOME}
        element={<Homepage onNavigateTab={handleNavigateTab} />}
      />

      <Route
        path={ROUTES.HISTORY}
        element={<ParkingHistory onNavigateTab={handleNavigateTab} />}
      />

      <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />

      {/* Tự động render các trang sử dụng AppLayout */}
      {LAYOUT_ROUTES.map(({ path, component }) => (
        <Route key={path} path={path} element={<AppLayout />}>
          <Route index element={component} />
        </Route>
      ))}

      {/* Tự động render các trang placeholder từ config navigation */}
      {PLACEHOLDER_PATHS.map((path) => (
        <Route key={path} path={path} element={<PlaceholderPage />} />
      ))}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
