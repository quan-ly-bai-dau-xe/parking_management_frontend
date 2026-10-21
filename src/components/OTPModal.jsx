import { useState } from "react";
import { authService } from "../features/authService";

export default function OtpModal({ isOpen, onClose, account, onSuccess }) {
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        authService
        .verifyOtp({ account, otp })
        .then(() => {
            onSuccess(otp);
        })
        .catch((err) => {
            setError(err.message || "Mã OTP không chính xác");
        })
        .finally(() => {
            setLoading(false);
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900">Xác thực mã OTP</h3>
            <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
            >
                ✕
            </button>
            </div>

            <p className="text-sm text-slate-500 mb-6">
            Mã xác minh gồm 6 số đã được gửi tới tài khoản{" "}
            <strong className="text-slate-800">{account}</strong> (Mã thử nghiệm:{" "}
            <span className="font-mono font-bold text-blue-600">123456</span>).
            </p>

            {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
            </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label
                htmlFor="otp-code"
                className="block text-sm font-semibold text-slate-700 mb-2"
                >
                Mã OTP (6 chữ số)
                </label>
                <input
                type="text"
                id="otp-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="XXXXXX"
                required
                autoFocus
                className="w-full text-center tracking-[0.5em] font-mono text-lg font-bold px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
            </div>

            <div className="flex gap-3">
                <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                Hủy
                </button>
                <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-1/2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold shadow-md transition-all flex items-center justify-center gap-2"
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
                <span>Xác nhận</span>
                </button>
            </div>
            </form>
        </div>
        </div>
    );
}