import { useState, useEffect } from "react";
import { authService } from "../features/authService";

export default function OtpModal({
  isOpen,
  onClose,
  account,
  phone,
  isMock = false,
  testOtp = "123456",
  onResend,
  onSuccess,
}) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);

  const displayPhone = phone || account || "";

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const verifyResult = await authService.verifyOtp({ otp });
      const currentSession = authService.getActiveOtpSession();
      onSuccess({
        otp,
        idToken: verifyResult?.idToken,
        user: verifyResult?.user,
        sessionInfo: currentSession?.sessionInfo,
      });
    } catch (err) {
      setError(err.message || "Mã OTP không chính xác hoặc đã hết hạn");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setError("");
    setResending(true);
    try {
      if (onResend) {
        await onResend();
      } else {
        await authService.forgotPassword(displayPhone);
      }
      setCountdown(60);
    } catch (err) {
      setError(err.message || "Không thể gửi lại mã OTP. Vui lòng thử lại sau.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn font-inter">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
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
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Xác thực SMS OTP
              </h3>
              <p className="text-xs text-slate-400">Firebase Phone Authentication</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-5 leading-relaxed">
          Mã xác minh gồm 6 số đã được gửi qua SMS tới số điện thoại:{" "}
          <strong className="text-slate-900 font-semibold">{displayPhone}</strong>
        </p>

        {/* Thông báo chế độ thử nghiệm */}
        {isMock && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
            <span className="font-bold text-amber-600 shrink-0">Lưu ý:</span>
            <span>
              Chế độ thử nghiệm Firebase: Nhập mã OTP là{" "}
              <strong className="font-mono text-amber-900 font-bold">
                {testOtp}
              </strong>
            </span>
          </div>
        )}

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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="otp-code"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Nhập mã OTP (6 chữ số)
            </label>
            <input
              type="text"
              id="otp-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              required
              autoFocus
              className="w-full text-center tracking-[0.6em] font-mono text-2xl font-bold py-3.5 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Đếm ngược và Gửi lại mã */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 pt-1">
            <span>Chưa nhận được mã?</span>
            {countdown > 0 ? (
              <span className="text-slate-400 font-medium">
                Gửi lại sau ({countdown}s)
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none disabled:opacity-50"
              >
                {resending ? "Đang gửi..." : "Gửi lại mã OTP"}
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-1/2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 active:bg-blue-800 text-white font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
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
              <span>{loading ? "Đang xác thực..." : "Xác nhận OTP"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
