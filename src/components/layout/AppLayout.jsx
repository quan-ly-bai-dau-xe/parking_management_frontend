import AppTopHeader from "./AppTopHeader";
import { useLocation, useNavigate, useOutlet } from "react-router-dom";

const ROUTE_TO_TAB = {
  "/home": "#home",
  "/vehicles": "#vehicles",
  "/history": "#history",
  "/customers": "#customers",
  "/employees": "#employees",
};

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

  const routes = {
    "#home": "/home",
    "#vehicles": "/vehicles",
    "#history": "/history",
    "#customers": "/customers",
    "#employees": "/employees",
  };

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <AppTopHeader
        {...headerProps}
        activeTabHref={
          ROUTE_TO_TAB[location.pathname] ?? "#home"
        }
        onTabClick={(href) => {
          navigate(routes[href] ?? href);
        }}
      />

      <main className={`w-full px-6 py-6 ${mainClassName}`}>
        {outlet ?? children}
      </main>
    </div>
  );
}
