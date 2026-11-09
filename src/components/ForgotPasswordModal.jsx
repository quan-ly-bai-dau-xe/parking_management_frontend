import { useState, useEffect } from "react";

export default function ForgotPasswordModal({
  isOpen,
  initialAccount = "",
  onClose,
  onSuccess,
}) {
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAccount(initialAccount || "");
      setError("");
      setLoading(false);
    }
  }, [isOpen, initialAccount]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanAccount = account.trim();

    if (!cleanAccount) {
      setError("Vui lòng nhập Email hoặc Số điện thoại.");
      return;
    }

    setLoading(true);
    setError("");

    // Giả lập gửi yêu cầu cấp mã xác thực OTP
    setTimeout(() => {
      setLoading(false);
      if (onSuccess) {
        onSuccess(cleanAccount);
      }
    }, 400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn font-sans"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Quên mật khẩu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhận mã xác thực để đặt lại mật khẩu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form nhập tài khoản */}
        <form onSubmit={handleSubmit} className="pt-5 space-y-4">
          <div>
            <label
              htmlFor="forgotAccountInput"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Email hoặc Số điện thoại <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="forgotAccountInput"
              value={account}
              onChange={(e) => {
                setAccount(e.target.value);
                if (error) setError("");
              }}
              placeholder="Nhập email hoặc số điện thoại của bạn..."
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            <span className="block text-[11px] text-slate-400 mt-1">
              Mã OTP sẽ được gửi về kênh liên lạc tương ứng.
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              {loading && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              <span>Tiếp tục gửi mã OTP</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}