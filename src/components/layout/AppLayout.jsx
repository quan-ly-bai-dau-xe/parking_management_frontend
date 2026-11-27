import { useState } from "react";
import { useNavigate, useOutlet } from "react-router-dom";
import AppTopHeader from "./AppTopHeader";
import AppSidebar from "./AppSidebar";
import { resolveNavigationPath } from "../../config/navigation";
import { SHOW_MANAGEMENT_SIDEBAR } from "../../config/appConfig";

/**
 * Layout chung cho các trang trong ứng dụng (D2).
 * Tích hợp AppTopHeader ở trên và AppSidebar bên trái (toggleable qua SHOW_MANAGEMENT_SIDEBAR).
 */
export default function AppLayout({
  children,
  headerProps = {},
}) {
  const navigate = useNavigate();
  const outlet = useOutlet();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const isCustomer = headerProps.variant === "customer";
  const showSidebar = SHOW_MANAGEMENT_SIDEBAR && !isCustomer;

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#FAF8FF] text-[#0F172A] font-sans">
      <AppTopHeader
        {...headerProps}
        showTopTabs={!showSidebar}
        onTabClick={(path) => {
          navigate(resolveNavigationPath(path));
        }}
        onOpenMobileMenu={
          showSidebar ? () => setIsMobileSidebarOpen(true) : undefined
        }
      />

      {/* Sidebar điều hướng cho quản trị & nhân viên */}
      {showSidebar && (
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Nội dung chính với khoảng đệm tự động thích ứng trạng thái Sidebar */}
      <main
        className={`w-full min-w-0 px-4 sm:px-6 lg:px-10 py-6 space-y-6 transition-all duration-300 ${
          showSidebar
            ? isSidebarCollapsed
              ? "lg:pl-20"
              : "lg:pl-70"
            : ""
        }`}
      >
        {outlet ?? children}
      </main>
    </div>
  );
}
