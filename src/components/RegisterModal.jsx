import { useState, useEffect } from "react";
import { authService } from "../features/authService";

export default function RegisterModal({ isOpen, onClose, onSuccess }) {
  // Step 1: Điền thông tin | Step 2: Xác thực OTP qua SMS
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpInfo, setOtpInfo] = useState(null);

  useEffect(() => {
    if (!isOpen || step !== 2) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setError("");
    setOtp("");
    setOtpInfo(null);
    onClose();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Bước 1: Gửi mã OTP SMS qua Firebase
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.fullName.trim()) {
      setError("Vui lòng nhập họ và tên của bạn.");
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 9) {
      setError("Số điện thoại không hợp lệ.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Mật khẩu phải có độ dài tối thiểu 8 ký tự.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.requestRegisterOtp(
        formData.phone,
        "recaptcha-container"
      );
      setOtpInfo(res);
      setStep(2);
    } catch (err) {
      setError(err.message || "Không thể gửi mã OTP. Vui lòng kiểm tra lại.");
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Xác thực OTP và hoàn tất tạo tài khoản
  const handleConfirmRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (otp.length < 6) {
      setError("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    setLoading(true);
    try {
      // 1. Xác thực OTP với Firebase Phone Auth
      const verifyRes = await authService.verifyOtp({ otp });

      // 2. Gọi Backend API để lưu Account và Customer
      await authService.register({
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        otp,
        idToken: verifyRes?.idToken,
        sessionInfo: otpInfo?.sessionInfo,
      });

      onSuccess({
        account: formData.phone,
        fullName: formData.fullName,
        message: "Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Xác thực OTP hoặc đăng ký tài khoản thất bại.");
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await authService.requestRegisterOtp(
        formData.phone,
        "recaptcha-container"
      );
      setOtpInfo(res);
      setCountdown(60);
    } catch (err) {
      setError(err.message || "Không thể gửi lại mã OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn font-inter text-slate-800">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 max-h-[90vh] overflow-y-auto relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
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
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {step === 1 ? "Đăng ký tài khoản mới" : "Xác thực số điện thoại"}
              </h3>
              <p className="text-xs text-slate-400">
                {step === 1
                  ? "Bước 1/2: Thông tin đăng ký"
                  : "Bước 2/2: Nhập mã OTP từ tin nhắn SMS"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
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
            <span>{error}</span>
          </div>
        )}

        {/* BƯỚC 1: ĐIỀN THÔNG TIN ĐĂNG KÝ */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label
                htmlFor="reg-fullName"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="reg-fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Ví dụ: Nguyễn Văn A"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>

            <div>
              <label
                htmlFor="reg-phone"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Số điện thoại nhận OTP SMS <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="reg-phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="0912 345 678"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm sm:text-base"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Hệ thống sẽ gửi mã xác thực 6 số qua SMS Firebase đến số điện thoại này.
              </p>
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Email (không bắt buộc)
              </label>
              <input
                type="email"
                id="reg-email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@example.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="reg-password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Tối thiểu 8 ký tự"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 pr-12 text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-confirmPassword"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="reg-confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Nhập lại mật khẩu"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/3 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                <span>{loading ? "Đang gửi OTP..." : "Tiếp tục & Nhận OTP"}</span>
              </button>
            </div>
          </form>
        )}

        {/* BƯỚC 2: NHẬP MÃ OTP QUA SMS */}
        {step === 2 && (
          <form onSubmit={handleConfirmRegister} className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <p className="text-sm text-slate-600 mb-1">
                Mã xác thực đã được gửi tới số điện thoại:
              </p>
              <p className="text-base font-bold text-slate-900 font-mono">
                {otpInfo?.formattedPhone || formData.phone}
              </p>
            </div>

            {/* Thông báo chế độ thử nghiệm */}
            {otpInfo?.isMock && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                <span className="font-bold text-amber-600 shrink-0">Lưu ý:</span>
                <span>
                  Chế độ thử nghiệm Firebase: Nhập mã OTP là{" "}
                  <strong className="font-mono text-amber-900 font-bold">
                    {otpInfo?.testOtp || "123456"}
                  </strong>
                </span>
              </div>
            )}

            <div>
              <label
                htmlFor="reg-otp"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Nhập mã OTP SMS (6 số)
              </label>
              <input
                type="text"
                id="reg-otp"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                required
                autoFocus
                className="w-full text-center tracking-[0.6em] font-mono text-2xl font-bold py-3.5 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
              <span>Chưa nhận được tin nhắn?</span>
              {countdown > 0 ? (
                <span className="text-slate-400 font-medium">
                  Gửi lại sau ({countdown}s)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none"
                >
                  Gửi lại mã OTP
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-2/3 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 active:bg-emerald-800 text-white font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                <span>{loading ? "Đang xác thực..." : "Xác nhận & Hoàn tất"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
