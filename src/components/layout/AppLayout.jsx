import AppTopHeader from "./AppTopHeader";
import { useNavigate, useOutlet } from "react-router-dom";
import { resolveNavigationPath } from "../../config/navigation";

/**
 * Layout chung cho các trang trong ứng dụng.
 * Quản lý header và cung cấp outlet cho các trang con.
 */
export default function AppLayout({
  children,
  headerProps = {},
}) {
  const navigate = useNavigate();
  const outlet = useOutlet();

  return (
    <div className="min-h-screen w-full bg-[#FAF8FF] text-[#0F172A] font-sans">
      <AppTopHeader
        {...headerProps}
        onTabClick={(path) => {
          navigate(resolveNavigationPath(path));
        }}
      />

      <main className="w-full px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {outlet ?? children}
      </main>
    </div>
  );
}
