import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../features/login/authService";

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        account: '',
        password: '',
        rememberMe: false,
    })
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [submittedStatus, setSubmittedStatus] = useState(null);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrorMessage("");
        setLoading(true);

        authService.login(formData)
        .then((res) => {
            console.log(res);
            setSubmittedStatus({
                account: res.user?.account || formData.account,
            });

            setTimeout(() => {
                navigate("/home");
            }, 600);
        })
        .catch((err) => {
            setErrorMessage(err.message || "Đăng nhập thất bại. Vui lòng thử lại");
        })
        .finally(() => {
            setLoading(false);
        })
    }

    return (
        <main className="min-h-screen w-full bg-slate-100/90 flex items-center justify-center p-4 sm:p-6
        lg:p-10 font-inter text-slate-800 antialiased selection:bg-blue-500 selection:text-white">
            {/* Thông báo đăng nhập */}
            {submittedStatus && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-600 text-white
                px-5 py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 text-sm font-medium animate-bounce">
                    <svg className="w-5 h-5 text-emerald-200 shrink-0" fill="none" stroke="currentColor"
                    viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Đăng nhập thành công với: {submittedStatus.account}</span>
                </div>
            )}

            {/* Thẻ Container Chính */}
            <div className="w-full max-w-[980px] bg-white rounded-3xl shadow-xl shadow-slate-200/80
            border border-slate-200/70 overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[580px]">
                {/* Thẻ bên trái */}
                <section className="bg-gradient-to-tr from-[#0F172A] to-[#1E293B] p-8 sm:p-12 lg:p-14
                text-white flex flex-col justify-between relative overflow-hidden">
                    {/* Hiệu ứng background */}
                    <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-blue-600/10 rounded-full
                    blur-3xl pointer-events-none" />
                        {/* Header */}
                        <header className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center
                            justify-center font-bold text-xl text-white shadow-md shadow-blue-500/30 select-none">
                                P
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white select-none">
                                Smart Parking
                            </span>
                        </header>

                        {/* Nội dung chính */}
                        <div className="mt-auto relative z-10">
                            <h1 className="text-2xl sm:text-3xl font-bold
                            leading-tight tracking-tight mb-5">
                                Quản lý bãi đỗ xe<br />thông minh
                            </h1>
                            <p className="text-slate-300 text-sm sm:text-[0.95rem] leading-relaxed
                            mb-8 max-w-sm font-normal">
                                Hệ thống quản lý bãi đỗ xe hiện đại, giúp bạn theo dõi và tối ưu hóa không gian đỗ xe một cách hiệu quả.
                            </p>
                            {/* Danh sách tính năng */}
                            <ul className="space-y-4 text-sm sm:text-[0.95rem]">
                                <li className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0
                                    shadow-blue-500" />
                                    <span className="text-slate-200 font-thin text-white">Theo dõi real-time số chỗ trống</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0
                                    shadow-bluw-500" />
                                    <span className="text-slate-200 font-thin text-white">Quản lý xe vào ra tự động</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0
                                    shadow-bluw-500" />
                                    <span className="text-slate-200 font-thin text-white">Báo cáo và thống kê chi tiết</span>
                                </li>
                            </ul>
                        </div>
                </section>

                {/* Thẻ bên phải */}
                <section className="bg-white p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
                    <div className="w-full max-w-md mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900
                            tracking-tight mb-2">
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
                                <label htmlFor="account" className="block text-sm font-semibold text-slate-700 mb-2">
                                    Email hoặc Số điện thoại
                                </label>
                                <input type="text"
                                id="account"
                                name="account"
                                value={formData.account}
                                onChange={handleInputChange}
                                placeholder="Nhập email hoặc số điện thoại..."
                                required
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200
                                text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2
                                focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
                                />
                            </div>

                            {/* Nhập password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                                    Mật khẩu
                                </label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Nhập mật khẩu..."
                                    required
                                    className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200
                                    text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2
                                    focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
                                    />
                                    <button type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm font-medium
                                    text-slate-400 hover:text-slate-700 active:text-slate-900 transition-colors select-none
                                    focus:outline-none"
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    >
                                        {showPassword ? 'Ẩn' : 'Hiện'}
                                    </button>
                                </div>
                            </div>

                            {/* Ghi nhớ và Quên mật khẩu */}
                            <div className="flex items-center justify-between text-sm pt-0.5">
                                <div className="flex items-center gap-2 select-none">
                                    <input type="checkbox"
                                    id="rememberMe"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500/40 cursor-pointer transition-colors"
                                    />
                                    <label
                                    htmlFor="rememberMe"
                                    className="text-slate-600 font-normal cursor-pointer">
                                        Ghi nhớ đăng nhập
                                    </label>
                                </div>
                                <a href="#forgot"
                                onClick={(e) => e.preventDefault()}
                                className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                >Quên mật khẩu?</a>
                            </div>

                            {/* Thông báo lỗi nếu có */}
                            {errorMessage && (
                                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 round-xl text-red-600 text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4 shrink-0 text-red-500"
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Nút Submit */}
                            <div className="pt-2">
                                <button type="submit"
                                disabled={loading}
                                className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700
                                active:bg-blue-800 text-white font-semibold text-base shadow-sm hover:shadow-md
                                hover:shadow-blue-600/20 active:scale-[0.99] transition-all duration-150 focus:outline-none
                                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                    {loading ? 'Đang xử lý' : 'Đăng nhập'}
                                </button>
                            </div>
                        </form>

                        {/* Đường phân cách */}
                        <div className="relative my-7 flex items-center justify-center">
                            <div className="border-t border-slate-300 w-full" />
                            <span className="bg-white px-3 text-xs text-slate-400 font-medium
                            tracking-wider absolute">hoặc</span>
                        </div>

                        {/* Chưa có tài khoản */}
                        <div className="text-center text-sm text-slate-600">
                            Chưa có tài khoản?{' '}
                            <a href="#register"
                            onClick={(e) => e.preventDefault()}
                            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline
                            transition-colors ml-0.5">
                                Đăng ký ngay
                            </a>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}