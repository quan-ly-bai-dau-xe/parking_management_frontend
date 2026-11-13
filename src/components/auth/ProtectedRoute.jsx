import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ROUTES } from "../../config/navigation";
import { useToast } from "../../context/ToastContext";

/**
 * CỜ BẬT / TẮT BẢO VỆ ROUTE (FEATURE FLAG)
 * - Đặt false: Bật chế độ bảo vệ nghiêm ngặt, tự động chuyển hướng về trang /login nếu chưa có tài khoản.
 */
export const BYPASS_AUTH = false;

export default function ProtectedRoute() {
  const { user } = useCurrentUser();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    if (!BYPASS_AUTH && !user) {
      toast.warning("Vui lòng đăng nhập để truy cập tính năng này.");
    }
  }, [user, toast]);

  // Khi đang dev hoặc tính năng login chưa hoàn thiện -> cho phép truy cập ngay
  if (BYPASS_AUTH) {
    return <Outlet />;
  }

  // Khi bật bảo vệ (BYPASS_AUTH = false) -> chuyển hướng về /login nếu chưa đăng nhập
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
