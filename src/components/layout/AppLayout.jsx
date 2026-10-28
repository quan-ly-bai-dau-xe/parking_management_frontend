import AppTopHeader from "./AppTopHeader";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";
import { resolveNavigationPath } from "../../config/navigation";

/**
 * Layout chung cho các trang trong ứng dụng.
 */
export default function AppLayout({
  children,
  headerProps = {},
  mainClassName = "",
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <AppTopHeader
        {...headerProps}
        onTabClick={(path) => {
          navigate(resolveNavigationPath(path));
        }}
      />

      <main className={`w-full px-6 py-6 ${mainClassName}`}>
        {outlet ?? children}
      </main>
    </div>
  );
}

