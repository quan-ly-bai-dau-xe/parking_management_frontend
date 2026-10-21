import { useState } from "react";
import { authService } from "../features/authService";

export default function ResetPasswordModal({ isOpen, onClose, account, otp, onSuccess }) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        if (newPassword.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        setLoading(true);
        authService.resetPassword({account, otp, newPassword})
        .then(() => {
            onSuccess();
        }).catch((err) => {
            setError(err.message || "Không thể đặt lại mật khẩu")
        }).finally(() => {
            setLoading(false);
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8">
                {/* Header của Modal */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-900">
                        Đặt lại mật khẩu
                    </h3>
                    <button type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-l flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                        X
                    </button>
                </div>

                <p className="text-sm text-slate-500 mb-6">
                    Vui lòng thiết lập lại mật khẩu cho tài khoản {" "}
                    <strong className="text-slate-800">{account}</strong>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="newPassword"
                        className="block text-sm font-semibold text-slate-700 mb-2">
                            Mật khẩu mới
                        </label>
                        <div className="relative">
                            <input type={showNewPassword ? "text" : "password"}
                            id="newPassowrd"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Tối thiểu 6 ký tự..."
                            required
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200
                            text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30
                            focus:border-blue-500 pr-14"
                            />
                            <button type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs
                            font-semibold text-slate-400 hover:text-slate-600">
                                {showNewPassword ? "Ẩn" : "Hiện"}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword"
                        className="block text-sm font-semibold text-slate-700 mb-2">
                            Xác nhận mật khẩu mới
                        </label>
                        <input type={showNewPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới..."
                        required
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200
                        text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30
                        focus:border-blue-500"
                        />
                    </div>
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            {error}
                        </div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button type="button"
                        onClick={onClose}
                        className="w-1/2 py-3 px-4 rounded-xl border border-slate-200 text-slate-700
                        hover:bg-slate-50 font-medium transition-colors">
                            Hủy
                        </button>
                        <button type="submit"
                        disabled={loading}
                        className="w-1/2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700
                        disabled:bg-blue-300 text-white font-semibold shadow-md transition-all
                        flex items-center justify-center gap-2">
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
                            <span>Lưu mật khẩu</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}