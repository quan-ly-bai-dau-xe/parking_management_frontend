import { useState, useEffect } from "react";

function getStoredUser() {
  const storedUser = localStorage.getItem("sp_user") || sessionStorage.getItem("sp_user");
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

/**
 * Hook quản lý thông tin User đăng nhập
 * Đồng bộ với localStorage / sessionStorage và lắng nghe sự thay đổi
 */
export function useCurrentUser() {
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getStoredUser());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return {
    user,
    setUser,
    displayName:
      user?.name ||
      user?.full_name ||
      user?.fullName ||
      user?.username ||
      "",
    role: user?.role || user?.role_name || user?.roleName || "Chưa xác định",
  };
}
