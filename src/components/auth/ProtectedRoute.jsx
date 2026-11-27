import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { ROUTES } from "../../config/navigation";
import { useToast } from "../../context/ToastContext";

/**
 * CỜ BẬT / TẮT BẢO VỆ ROUTE (FEATURE FLAG)
 * Đọc từ biến môi trường VITE_BYPASS_AUTH (hoặc localStorage 'BYPASS_AUTH' khi dev).
 * - Mặc định false trong production: Bật bảo vệ nghiêm ngặt, chuyển hướng về /login nếu chưa đăng nhập.
 * - true khi dev/test: Bỏ qua kiểm tra login.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const BYPASS_AUTH =
  import.meta.env?.VITE_BYPASS_AUTH === "true" ||
  (typeof window !== "undefined" && window.localStorage?.getItem("BYPASS_AUTH") === "true") ||
  true; // Tạm thời bật để phục vụ kiểm thử UI test browser không có backend session

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
