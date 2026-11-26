import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../config/navigation";
import { authService } from "../services/authService";
import { extractApiErrorInfo } from "../services/walletService";
import { validateVehiclePlateInput } from "../utils/plateFormatter";

const SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const ONBOARD_PLATE_STORAGE_KEY = "sp_onboarding_plate";

function normalizePhoneInput(raw) {
  const cleaned = String(raw || "").replace(/[\s.-]/g, "");
  if (cleaned.startsWith("+84")) {
    return "0" + cleaned.slice(3);
  }
  if (cleaned.startsWith("84") && cleaned.length >= 11) {
    return "0" + cleaned.slice(2);
  }
  return cleaned;
}

function validatePasswordStrength(pwd) {
  if (!pwd || pwd.length < 8 || pwd.length > 50) {
    return "Mật khẩu phải có độ dài từ 8 đến 50 ký tự.";
  }
  if (!/[a-z]/.test(pwd)) {
    return "Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.";
  }
  if (!/[A-Z]/.test(pwd)) {
    return "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.";
  }
  if (!/[0-9]/.test(pwd)) {
    return "Mật khẩu phải chứa ít nhất 1 chữ số.";
  }
  if (![...pwd].some((ch) => SPECIAL_CHARS.includes(ch))) {
    return "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...).";
  }
  return "";
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawUrlPlate = (searchParams.get("plate") || "").trim();
  const parsedUrlPlate =
    rawUrlPlate && !rawUrlPlate.includes("*")
      ? validateVehiclePlateInput(rawUrlPlate, "CAR")
      : { valid: false, formatted: "", normalized: "" };
  const urlPlate = parsedUrlPlate.valid
    ? parsedUrlPlate.formatted || parsedUrlPlate.normalized
    : rawUrlPlate && !rawUrlPlate.includes("*")
      ? rawUrlPlate.toUpperCase()
      : "";
  const [prefilledPlate] = useState(() => {
    if (urlPlate) {
      try {
        sessionStorage.setItem(ONBOARD_PLATE_STORAGE_KEY, urlPlate);
      } catch {
        // Ignore storage restrictions
      }
      return urlPlate;
    }
    try {
      const stored = (sessionStorage.getItem(ONBOARD_PLATE_STORAGE_KEY) || "").trim();
      if (!stored || stored.includes("*")) return "";
      const parsedStored = validateVehiclePlateInput(stored, "CAR");
      return parsedStored.valid
        ? parsedStored.formatted || parsedStored.normalized
        : stored.toUpperCase();
    } catch {
      return "";
    }
  });

  const [formData, setFormData] = useState({
    phone: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });

  const [otpRequested, setOtpRequested] = useState(false);
  const [sessionInfo, setSessionInfo] = useState("");
  const [otpCooldownSec, setOtpCooldownSec] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpInfoMessage, setOtpInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (otpCooldownSec <= 0) return undefined;
    const timer = setInterval(() => {
      setOtpCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldownSec]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestOtp = async () => {
    setErrorMessage("");
    setOtpInfoMessage("");

    const cleanPhone = normalizePhoneInput(formData.phone);
    if (!/^0[35789][0-9]{8}$/.test(cleanPhone) && !/^[0-9]{9,15}$/.test(cleanPhone)) {
      setErrorMessage("Số điện thoại không đúng định dạng (VD: 0912345678).");
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await authService.requestRegisterSmsOtp({ phone: cleanPhone });
      setSessionInfo(res?.session_info || "");
      setOtpRequested(true);
      setOtpCooldownSec(60);
      setOtpInfoMessage(
        res?.detail || "Mã OTP 6 chữ số đã được gửi đến số điện thoại của bạn."
      );
    } catch (err) {
      const info = extractApiErrorInfo(err, "Không thể gửi mã OTP. Vui lòng thử lại.");
      setErrorMessage(info.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");

    const cleanPhone = normalizePhoneInput(formData.phone);
    if (!/^0[35789][0-9]{8}$/.test(cleanPhone) && !/^[0-9]{9,15}$/.test(cleanPhone)) {
      setErrorMessage("Số điện thoại không đúng định dạng (VD: 0912345678).");
      return;
    }

    if (!otpRequested) {
      setErrorMessage("Vui lòng bấm \"Gửi mã OTP\" trước khi tiếp tục.");
      return;
    }

    const cleanOtp = formData.otp.trim();
    if (!/^[0-9]{6}$/.test(cleanOtp)) {
      setErrorMessage("Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.");
      return;
    }

    const pwdError = validatePasswordStrength(formData.password);
    if (pwdError) {
      setErrorMessage(pwdError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    navigate(ROUTES.ONBOARD, {
      state: {
        phone: cleanPhone,
        otp: cleanOtp,
        sessionInfo,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        prefilledPlate,
      },
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF8FF] flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">

      {/* ========================================================= */}
      {/* 1. THANH ĐIỀU HƯỚNG TRÊN CÙNG (HEADER)                     */}
      {/* ========================================================= */}
      <header className="w-full bg-white border-b border-slate-200/80 px-6 sm:px-10 lg:px-14 py-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 select-none">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-xs shadow-blue-500/30">
            P
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Smart Parking
          </span>
        </div>

        <button
          type="button"
          onClick={() => {}}
          className="text-xs sm:text-sm text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Bạn cần hỗ trợ?</span>
        </button>
      </header>

      {/* ========================================================= */}
      {/* 2. KHỐI CONTAINER CHÍNH (CARD 2 CỘT)                       */}
      {/* ========================================================= */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-4">
        <div className="w-full max-w-[1000px] bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">

          {/* CỘT TRÁI: BANNER THÔNG TIN NỀN TỐI (5 CỘT) */}
          <section className="md:col-span-5 bg-gradient-to-tr from-[#0F172A] to-[#1E293B] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden select-none">

            {/* Tag định danh khách hàng */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="w-4 h-0.5 bg-blue-500 rounded-full" />
                <span className="text-[0.68rem] font-bold tracking-widest text-slate-300 uppercase">
                  Dành cho khách hàng
                </span>
              </div>

              {/* Tiêu đề & mô tả */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug mb-3">
                Đỗ xe an tâm.<br />Di chuyển dễ dàng.
              </h1>
              <p className="text-slate-300 text-xs sm:text-[0.84rem] leading-relaxed font-normal max-w-xs">
                Một tài khoản để theo dõi phương tiện, quản lý vé và chủ động trong mỗi hành trình.
              </p>
            </div>

            {/* Khung mô phỏng sơ đồ bãi đỗ xe mini */}
            <div className="my-8 bg-[#0B132B]/80 rounded-2xl border border-slate-700/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-[0.72rem]">
                <span className="font-bold text-slate-200">Bãi xe thông minh</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-[0.68rem]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Đang kết nối
                </span>
              </div>

              {/* Lưới 4 ô đỗ mô phỏng */}
              <div className="grid grid-cols-4 gap-2">
                {/* Ô A-042 (Có xe / Active) */}
                <div className="h-16 rounded-xl bg-blue-600 flex flex-col items-center justify-center p-1 text-white shadow-sm">
                  <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8m-8 5h8m-4 5h4M5 5a2 2 0 012-2h10a2 2 0 012 2v14l-4-3-4 3-4-3-4 3V5z" />
                  </svg>
                  <span className="font-mono text-[0.6rem] font-bold">A - 042</span>
                </div>

                {/* Ô A-043 (Trống [P]) */}
                <div className="h-16 rounded-xl border border-slate-700 bg-slate-900/60 flex flex-col items-center justify-center p-1 text-slate-400">
                  <span className="w-5 h-5 rounded-md border border-slate-600 flex items-center justify-center text-[0.65rem] font-bold mb-1">
                    P
                  </span>
                  <span className="font-mono text-[0.6rem]">A - 043</span>
                </div>

                {/* Ô A-044 (Có xe) */}
                <div className="h-16 rounded-xl border border-slate-700 bg-slate-900/60 flex flex-col items-center justify-center p-1 text-slate-400">
                  <svg className="w-4 h-4 mb-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8m-8 5h8m-4 5h4M5 5a2 2 0 012-2h10a2 2 0 012 2v14l-4-3-4 3-4-3-4 3V5z" />
                  </svg>
                  <span className="font-mono text-[0.6rem]">A - 044</span>
                </div>

                {/* Ô A-045 (Trống [P]) */}
                <div className="h-16 rounded-xl border border-slate-700 bg-slate-900/60 flex flex-col items-center justify-center p-1 text-slate-400">
                  <span className="w-5 h-5 rounded-md border border-slate-600 flex items-center justify-center text-[0.65rem] font-bold mb-1">
                    P
                  </span>
                  <span className="font-mono text-[0.6rem]">A - 045</span>
                </div>
              </div>

              {/* Lối vào */}
              <div className="text-center pt-1 border-t border-slate-800 text-[0.65rem] tracking-wider text-slate-400 uppercase font-mono">
                LỐI VÀO →
              </div>
            </div>

            {/* Thông điệp bảo mật */}
            <div className="flex items-center gap-2 text-slate-300 text-[0.72rem]">
              <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>An toàn thông tin · Thuận tiện mỗi ngày</span>
            </div>
          </section>

          {/* CỘT PHẢI: FORM ĐĂNG KÝ (7 CỘT) */}
          <section className="md:col-span-7 p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
            <div className="w-full max-w-md mx-auto">

              {/* Tiêu đề Form */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1.5">
                  Tạo tài khoản
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Đăng ký để quản lý xe và vé đỗ xe của bạn.
                </p>
              </div>

              {prefilledPlate && (
                <div
                  data-testid="prefilled-plate-badge"
                  className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-medium text-blue-900">
                    Đăng ký nhanh cho xe biển số:
                  </span>
                  <span className="font-mono font-bold text-sm text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200">
                    {prefilledPlate}
                  </span>
                </div>
              )}

              {/* Form nhập liệu */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Số điện thoại + Gửi OTP */}
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      inputMode="numeric"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="0912345678"
                      required
                      className="flex-1 min-w-0 px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={isSendingOtp || otpCooldownSec > 0}
                      className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                    >
                      {isSendingOtp
                        ? "Đang gửi..."
                        : otpCooldownSec > 0
                          ? `Gửi lại (${otpCooldownSec}s)`
                          : otpRequested
                            ? "Gửi lại OTP"
                            : "Gửi mã OTP"}
                    </button>
                  </div>
                </div>

                {/* Mã xác thực SMS OTP */}
                <div>
                  <label htmlFor="otp" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mã xác thực SMS OTP (6 chữ số) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    id="otp"
                    name="otp"
                    maxLength={6}
                    value={formData.otp}
                    onChange={handleChange}
                    placeholder="Nhập 6 chữ số OTP"
                    required
                    className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono tracking-widest transition-all"
                  />
                </div>

                {otpInfoMessage && (
                  <div
                    data-testid="otp-info-banner"
                    className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs"
                  >
                    {otpInfoMessage}
                  </div>
                )}

                {/* Mật khẩu */}
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Tối thiểu 8 ký tự (hoa, thường, số, ký tự đặc biệt)"
                    required
                    className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Xác nhận mật khẩu */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Xác nhận mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Nhập lại mật khẩu"
                    required
                    className="w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Hiển thị lỗi nếu có */}
                {errorMessage && (
                  <div
                    data-testid="register-error"
                    className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Nút Tiếp tục */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    <span>Tiếp tục hoàn thiện hồ sơ →</span>
                  </button>
                </div>
              </form>

              {/* Đường phân cách */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider absolute">
                  hoặc
                </span>
              </div>

              {/* Chuyển hướng Đăng nhập */}
              <div className="text-center text-xs sm:text-sm text-slate-600">
                Đã có tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.LOGIN || "/login")}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors ml-0.5 cursor-pointer"
                >
                  Đăng nhập
                </button>
              </div>

              {/* Chú thích dịch vụ */}
              <p className="text-[11px] text-slate-400 text-center mt-5 leading-relaxed">
                Thông tin của bạn được bảo mật và chỉ sử dụng cho dịch vụ đỗ xe Smart Parking.
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* ========================================================= */}
      {/* 3. CHÂN TRANG (FOOTER)                                    */}
      {/* ========================================================= */}
      <footer className="w-full bg-white border-t border-slate-200/80 px-6 sm:px-10 lg:px-14 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div>
          © 2026 Smart Mobility · Smart Parking
        </div>
        <div className="flex items-center gap-6">
          <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-slate-600 transition-colors">
            Chính sách bảo mật
          </a>
          <span>
            Hỗ trợ: <strong className="text-slate-700 font-normal">1900 1234</strong>
          </span>
        </div>
      </footer>

    </div>
  );
}
