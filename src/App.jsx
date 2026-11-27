import { useEffect } from "react";
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import VehicleManagement from "./pages/VehicleManagement";
import ParkingHistory from "./pages/ParkingHistory";
import Login from "./pages/LoginPage";
import CustomerManagement from "./pages/CustomerManagement";
import NotificationsPage from "./pages/NotificationsPage";
import EmployeeManagement from "./pages/EmployeeManagement";
import { ROUTES, PLACEHOLDER_PATHS } from "./config/navigation";
import { UNAUTHORIZED_EVENT_NAME } from "./services/apiClient";
import { useToast } from "./context/ToastContext";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { checkIsEmployeeOrManager } from "./constants/roleConstants";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Home from "./pages/homepage";
import ParkingLot from "./pages/ParkingLotManagement";
import Ticket from "./pages/TicketManagement";
import CameraScanPage from "./pages/CameraScannerPage";
import RegisterPage from "./pages/RegisterPage";
import OnboardingProfilePage from "./pages/OnBoardProfile";
import CustomerProfilePage from "./pages/CustomerProfilePage";
import CustomerOverviewPage from "./pages/CustomerOverviewPage";
import CustomerVehiclesPage from "./pages/CustomerVehiclePage";
import CustomerTicketsPage from "./pages/CustomerTicketPage";
import VnpayReturnPage from "./pages/VnpayReturnPage";
import StatisticsPage from "./pages/StatisticsPage";

// Cấu hình các route có giao diện dạng Layout chuẩn
const LAYOUT_ROUTES = [
  { path: ROUTES.CUSTOMERS, component: <CustomerManagement /> },
  { path: ROUTES.EMPLOYEES, component: <EmployeeManagement /> },
  { path: ROUTES.VEHICLES, component: <VehicleManagement /> },
  { path: ROUTES.HISTORY, component: <ParkingHistory /> },
  { path: ROUTES.TICKETS, component: <Ticket /> },
];

function ParkingLotLayoutWrapper() {
  const { role } = useCurrentUser();
  const isCustomer = role === "CUSTOMER";
  return (
    <AppLayout
      headerProps={
        isCustomer
          ? { variant: "customer", activePath: ROUTES.PARKING_LOT }
          : {}
      }
    />
  );
}

function NotificationsLayoutWrapper() {
  const { role } = useCurrentUser();
  const isCustomer = role === "CUSTOMER";
  return (
    <AppLayout
      headerProps={
        isCustomer
          ? { variant: "customer", activePath: ROUTES.NOTIFICATIONS }
          : { activePath: ROUTES.NOTIFICATIONS }
      }
    />
  );
}

function RootRedirect() {
  const { role } = useCurrentUser();
  const target = role === "CUSTOMER" ? ROUTES.CUSTOMER_OVERVIEW : ROUTES.HOME;
  return <Navigate to={target} replace />;
}

function StaffOnlyRoute({ children }) {
  const navigate = useNavigate();
  const { user, role } = useCurrentUser();
  const isStaff = checkIsEmployeeOrManager(user || role);

  if (!isStaff) {
    const fallbackPath =
      role === "CUSTOMER" ? ROUTES.CUSTOMER_OVERVIEW : ROUTES.LOGIN;
    return (
      <div
        data-testid="access-denied-403"
        className="min-h-screen bg-[#FAF8FF] flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-16 h-16 mb-4 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m0-6v2m8 0a8 8 0 11-16 0 8 8 0 0116 0z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          403 - Không có quyền truy cập
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          Khu vực quản trị này chỉ dành cho Nhân viên và Quản lý bãi xe.
        </p>
        <button
          type="button"
          onClick={() => navigate(fallbackPath, { replace: true })}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          Quay lại trang chính
        </button>
      </div>
    );
  }

  return children;
}

function CustomerOnlyRoute({ children }) {
  const navigate = useNavigate();
  const { user, role } = useCurrentUser();
  const isStaff = checkIsEmployeeOrManager(user || role);

  if (isStaff) {
    return (
      <div
        data-testid="access-denied-403"
        className="min-h-screen bg-[#FAF8FF] flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-16 h-16 mb-4 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m0-6v2m8 0a8 8 0 11-16 0 8 8 0 0116 0z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          403 - Không có quyền truy cập
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          Trang tự phục vụ này chỉ dành cho tài khoản Khách hàng.
        </p>
        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME, { replace: true })}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          Quay lại trang chính
        </button>
      </div>
    );
  }

  return children;
}

function ManagerOnlyRoute({
  children,
  message = "Chức năng Thống kê tổng hợp chỉ dành cho tài khoản Quản lý (Manager).",
}) {
  const navigate = useNavigate();
  const { isManager, role, user } = useCurrentUser();

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!isManager) {
    const fallbackPath =
      role === "CUSTOMER" ? ROUTES.CUSTOMER_OVERVIEW : ROUTES.HOME;
    return (
      <div className="min-h-screen bg-[#FAF8FF] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m0-6v2m8 0a8 8 0 11-16 0 8 8 0 0116 0z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          403 - Không có quyền truy cập
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          {message}
        </p>
        <button
          type="button"
          onClick={() => navigate(fallbackPath, { replace: true })}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          Quay lại trang chính
        </button>
      </div>
    );
  }

  return children;
}

function PlaceholderPage({ title = "Trang đang được phát triển" }) {
  const navigate = useNavigate();
  const { role } = useCurrentUser();
  const homeRoute = role === "CUSTOMER" ? ROUTES.CUSTOMER_OVERVIEW : ROUTES.HOME;
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
        onClick={() => navigate(homeRoute)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
      >
        Quay lại trang chính
      </button>
    </div>
  );
}

function NotFoundPage() {
  const navigate = useNavigate();
  const { role } = useCurrentUser();
  const homeRoute = role === "CUSTOMER" ? ROUTES.CUSTOMER_OVERVIEW : ROUTES.HOME;
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
        onClick={() => navigate(homeRoute)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
      >
        Quay lại trang chính
      </button>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Lắng nghe sự kiện 401 Unauthorized từ apiClient với cơ chế dedupe
  useEffect(() => {
    const handleUnauthorized = (event) => {
      const message =
        event?.detail?.message ||
        "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại.";

      // Chỉ hiển thị toast cảnh báo và chuyển hướng nếu không phải đang ở trang Login
      if (location.pathname !== ROUTES.LOGIN) {
        toast.warning(message);
        navigate(ROUTES.LOGIN, {
          replace: true,
          state: { from: location.pathname },
        });
      }
    };

    window.addEventListener(UNAUTHORIZED_EVENT_NAME, handleUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT_NAME, handleUnauthorized);
    };
  }, [navigate, location.pathname, toast]);

  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />

      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path={ROUTES.ONBOARD} element={<OnboardingProfilePage />} />

      {/* Các route yêu cầu đăng nhập */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RootRedirect />} />

        <Route
          path={ROUTES.HOME}
          element={
            <StaffOnlyRoute>
              <AppLayout headerProps={{ brandName: "LOGO" }} />
            </StaffOnlyRoute>
          }
        >
          <Route index element={<Home />} />
        </Route>
        {/* Các trang vận hành nhân viên & quản lý: chặn CUSTOMER bằng StaffOnlyRoute / ManagerOnlyRoute */}
        {LAYOUT_ROUTES.map(({ path, component }) => (
          <Route
            key={path}
            path={path}
            element={
              path === ROUTES.EMPLOYEES ? (
                <ManagerOnlyRoute message="Chức năng Quản lý nhân viên chỉ dành cho tài khoản Quản lý (Manager).">
                  <AppLayout />
                </ManagerOnlyRoute>
              ) : (
                <StaffOnlyRoute>
                  <AppLayout />
                </StaffOnlyRoute>
              )
            }
          >
            <Route index element={component} />
          </Route>
        ))}

        {/* Thống kê tổng hợp 4.7.1: Chỉ cho phép MANAGER */}
        <Route
          path={ROUTES.STATISTICS}
          element={
            <ManagerOnlyRoute>
              <AppLayout />
            </ManagerOnlyRoute>
          }
        >
          <Route index element={<StatisticsPage />} />
        </Route>

        {/* Sơ đồ bãi đậu xe: ẩn sidebar staff khi CUSTOMER truy cập */}
        <Route path={ROUTES.PARKING_LOT} element={<ParkingLotLayoutWrapper />}>
          <Route index element={<ParkingLot />} />
        </Route>

        {/* Thông báo: bọc trong AppLayout để giữ AppSidebar cho staff và header cho customer */}
        <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsLayoutWrapper />}>
          <Route index element={<NotificationsPage />} />
        </Route>
        <Route
          path={ROUTES.CAMERA_SCANNER}
          element={
            <StaffOnlyRoute>
              <CameraScanPage />
            </StaffOnlyRoute>
          }
        />



        {/* Tự động render các trang placeholder từ config navigation */}
        {PLACEHOLDER_PATHS.map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <StaffOnlyRoute>
                <PlaceholderPage />
              </StaffOnlyRoute>
            }
          />
        ))}

        {/* Customer self-service routes require authenticated customer session */}
        <Route
          path={ROUTES.CUSTOMER_PROFILE}
          element={
            <CustomerOnlyRoute>
              <CustomerProfilePage />
            </CustomerOnlyRoute>
          }
        />
        <Route
          path={ROUTES.CUSTOMER_OVERVIEW}
          element={
            <CustomerOnlyRoute>
              <CustomerOverviewPage />
            </CustomerOnlyRoute>
          }
        />
        <Route
          path={ROUTES.CUSTOMER_VEHICLE}
          element={
            <CustomerOnlyRoute>
              <CustomerVehiclesPage />
            </CustomerOnlyRoute>
          }
        />
        <Route
          path={ROUTES.CUSTOMER_TICKET}
          element={
            <CustomerOnlyRoute>
              <CustomerTicketsPage />
            </CustomerOnlyRoute>
          }
        />
        <Route
          path={ROUTES.VNPAY_RETURN}
          element={
            <CustomerOnlyRoute>
              <VnpayReturnPage />
            </CustomerOnlyRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
