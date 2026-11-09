import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ROUTES } from "../../config/navigation";

/**
 * CỜ BẬT / TẮT BẢO VỆ ROUTE (FEATURE FLAG)
 * - Đặt true : Bỏ qua kiểm tra đăng nhập (Bypass), cho phép xem và test thoải mái khi login chưa hoàn thiện.
 * - Đặt false: Bật chế độ bảo vệ nghiêm ngặt, tự động chuyển hướng về trang /login nếu chưa có tài khoản.
 */
export const BYPASS_AUTH = true;

export default function ProtectedRoute() {
  const { user } = useCurrentUser();

  // Khi đang dev hoặc tính năng login chưa hoàn thiện -> cho phép truy cập ngay
  if (BYPASS_AUTH) {
    return <Outlet />;
  }

  // Khi bật bảo vệ (BYPASS_AUTH = false) -> chuyển hướng về /login nếu chưa đăng nhập
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
