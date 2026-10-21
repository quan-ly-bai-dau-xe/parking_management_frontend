import React from "react";
import { useNavigate } from "react-router-dom";
import { APP_NAVIGATION_TABS } from "../config/navigation";
import { authService } from "../features/authService";

export default function AppTopHeader({
  onOpenScanModal = () => {},
  tabs = APP_NAVIGATION_TABS,
  activeTabHref = "#vehicles",
  brandName = "LOGO",
  adminName = "Admin",
  onTabClick,
}) {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePasswordChange = () => {
    setIsDropdownOpen(false);
    // Custom logic or trigger modal / navigate to change password
    alert("Chức năng đổi mật khẩu");
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    if (authService?.logout) {
      await authService.logout();
    }
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              {brandName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenScanModal}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
              title="Quét biển số xe từ hình ảnh camera"
            >
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Camera</span>
            </button>

            {/* Admin Profile Dropdown */}
            <div
              className="relative pl-2 border-l border-slate-200"
              ref={dropdownRef}
            >
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-700 hidden sm:inline-block">
                  {adminName}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="menu"
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {adminName}
                    </p>
                    <p className="text-[11px] text-slate-500">Quản trị viên</p>
                  </div>

                  {/* 
                    Hồ sơ cá nhân: Tạm thời ẩn theo yêu cầu, đã comment sẵn để dễ mở lại sau này:
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        // handle profile
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                      role="menuitem"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Hồ sơ cá nhân</span>
                    </button>
                  */}

                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                    role="menuitem"
                  >
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    <span>Đổi mật khẩu</span>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    role="menuitem"
                  >
                    <svg
                      className="w-4 h-4 text-rose-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-6 overflow-x-auto text-xs font-medium">
            {tabs.map((tab) => {
              const isActive = tab.href === activeTabHref;

              return (
                <a
                  key={`${tab.label}-${tab.href}`}
                  href={tab.href}
                  onClick={(e) => {
                    if (onTabClick) {
                      e.preventDefault();
                      onTabClick(tab.href);
                    }
                  }}
                  className={
                    isActive
                      ? "py-2.5 px-1 text-blue-600 border-b-2 border-blue-600 font-semibold whitespace-nowrap cursor-pointer"
                      : "py-2.5 px-1 text-slate-500 hover:text-slate-800 border-b-2 border-transparent hover:border-slate-300 whitespace-nowrap cursor-pointer"
                  }
                >
                  {tab.label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
