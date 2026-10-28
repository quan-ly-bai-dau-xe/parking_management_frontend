import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../features/authService";
import { ROUTES } from "../config/navigation";
import OtpModal from "../components/OTPModal";
import ResetPasswordModal from "../components/ResetPasswordModal";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    account: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedStatus, setSubmittedStatus] = useState(null);
  const [notice, setNotice] = useState(null);

  // Quản lý modal
  const [modal, setModal] = useState(null);
  const [verifiedOtp, setVerifiedOtp] = useState("");

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    authService
      .login(formData)
      .then((res) => {
        setSubmittedStatus({
          account: res.user?.account || formData.account,
        });

        setTimeout(() => {
          navigate(ROUTES.HOME);
        }, 600);
      })
      .catch((err) => {
        setErrorMessage(err.message || "Đăng nhập thất bại. Vui lòng thử lại");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleOpenForgotPassword = (e) => {
    e.preventDefault();
    if (!formData.account.trim()) {
      setErrorMessage("Vui lòng nhập Email hoặc số điện thoại");
      return;
    }
    setErrorMessage("");
    setModal("OTP");
  };

  return (
    <main className="min-h-screen w-full bg-slate-100/90 flex items-center justify-center p-4 sm:p-6 lg:p-10 font-inter text-slate-800 antialiased selection:bg-blue-500 selection:text-white relative">
      {/* Thông báo đăng nhập / đổi mật khẩu */}
      {(submittedStatus || notice) && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 text-sm font-medium animate-bounce">
          <svg
            className="w-5 h-5 text-emerald-200 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {submittedStatus && (
            <span>Đăng nhập thành công với: {submittedStatus.account}</span>
          )}
          {notice && <span>{notice}</span>}
        </div>
      )}

      {/* Thẻ Container Chính */}
      <div className="w-full max-w-[980px] bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-200/70 overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[580px]">
        
        {/* Panel bên trái */}
        <section className="bg-gradient-to-tr from-[#0F172A] to-[#1E293B] p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Header */}
          <header className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-xl text-white shadow-md shadow-blue-500/30 select-none">
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-white select-none">
              Smart Parking
            </span>
          </header>

          {/* Nội dung chính panel trái */}
          <div className="mt-auto relative z-10 pt-10">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight mb-5">
              Quản lý bãi đỗ xe<br />thông minh
            </h1>
            <p className="text-slate-300 text-sm sm:text-[0.95rem] leading-relaxed mb-8 max-w-sm font-normal">
              Hệ thống quản lý bãi đỗ xe hiện đại, giúp bạn theo dõi và tối ưu hóa không gian đỗ xe một cách hiệu quả.
            </p>

            {/* Danh sách tính năng */}
            <ul className="space-y-4 text-sm sm:text-[0.95rem]">
              <li className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-sm shadow-blue-500/50" />
                <span className="text-slate-200 font-normal">Theo dõi real-time số chỗ trống</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-sm shadow-blue-500/50" />
                <span className="text-slate-200 font-normal">Quản lý xe vào ra tự động</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-sm shadow-blue-500/50" />
                <span className="text-slate-200 font-normal">Báo cáo và thống kê chi tiết</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Panel bên phải */}
        <section className="bg-white p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            {/* Header Form */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
                Đăng nhập
              </h2>
              <p className="text-slate-500 text-sm sm:text-base">
                Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nhập account */}
              <div>
                <label
                  htmlFor="account"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Email hoặc Số điện thoại
                </label>
                <input
                  type="text"
                  id="account"
                  name="account"
                  value={formData.account}
                  onChange={handleInputChange}
                  placeholder="Nhập email hoặc số điện thoại..."
                  required
                  disabled={loading}
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base disabled:opacity-60"
                />
              </div>

              {/* Nhập password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Nhập mật khẩu..."
                    required
                    disabled={loading}
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base pr-16 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm font-medium text-slate-400 hover:text-slate-700 active:text-slate-900 transition-colors select-none focus:outline-none"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

              {/* Ghi nhớ và Quên mật khẩu */}
              <div className="flex items-center justify-between text-sm pt-0.5">
                <div className="flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500/40 cursor-pointer transition-colors"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-slate-600 font-normal cursor-pointer"
                  >
                    Ghi nhớ đăng nhập
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleOpenForgotPassword}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Thông báo lỗi nếu có */}
              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <svg
                    className="w-4 h-4 shrink-0 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Nút Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-base shadow-sm hover:shadow-md hover:shadow-blue-600/20 active:scale-[0.99] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
                >
                  {loading && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                  )}
                  <span>{loading ? "Đang xử lý..." : "Đăng nhập"}</span>
                </button>
              </div>
            </form>

            {/* Đường phân cách */}
            <div className="relative my-7 flex items-center justify-center">
              <div className="border-t border-slate-300 w-full" />
              <span className="bg-white px-3 text-xs text-slate-400 font-medium tracking-wider absolute">
                hoặc
              </span>
            </div>

            {/* Chưa có tài khoản */}
            <div className="text-center text-sm text-slate-600">
              Chưa có tài khoản?{" "}
              <a
                href="#register"
                onClick={(e) => e.preventDefault()}
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors ml-0.5"
              >
                Đăng ký ngay
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Quản lý 2 modal độc lập ngoài container chính */}
      <OtpModal
        isOpen={modal === "OTP"}
        account={formData.account}
        onClose={() => setModal(null)}
        onSuccess={(otpCode) => {
          setVerifiedOtp(otpCode);
          setModal("RESET");
        }}
      />

      <ResetPasswordModal
        isOpen={modal === "RESET"}
        account={formData.account}
        otp={verifiedOtp}
        onClose={() => setModal(null)}
        onSuccess={() => {
          setModal(null);
          setNotice("Đổi mật khẩu thành công! Vui lòng hãy đăng nhập lại.");
          setTimeout(() => setNotice(null), 4000);
        }}
      />
    </main>
  );
}