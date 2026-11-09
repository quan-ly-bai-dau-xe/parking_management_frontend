import { useNavigate } from "react-router-dom";
import { ROUTES } from "../config/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    account: "",
    password: "",
    confirmPassword: "",
    captchaInput: "",
  });

  // Tạo câu hỏi CAPTCHA toán học ngẫu nhiên
  const [captcha, setCaptcha] = useState(() => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    return { num1, num2, answer: num1 + num2 };
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshCaptcha = () => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    setCaptcha({ num1, num2, answer: num1 + num2 });
    setFormData((prev) => ({ ...prev, captchaInput: "" }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (formData.password.length < 6) {
      setErrorMessage("Mật khẩu phải có tối thiểu 6 ký tự.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (Number(formData.captchaInput) !== captcha.answer) {
      setErrorMessage("Kết quả phép tính CAPTCHA chưa chính xác.");
      refreshCaptcha();
      return;
    }

    setLoading(true);
    // Giả lập gửi thông tin đăng ký lên hệ thống
    navigate(ROUTES.ONBOARD, {
      state: {
        account: formData.account.trim(),
        password: formData.password,
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

              {/* Form nhập liệu */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email / Số điện thoại */}
                <div>
                  <label htmlFor="account" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email hoặc số điện thoại
                  </label>
                  <input
                    type="text"
                    id="account"
                    name="account"
                    value={formData.account}
                    onChange={handleChange}
                    placeholder=""
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Mật khẩu */}
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder=""
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Xác nhận mật khẩu */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder=""
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* CAPTCHA Hàng đôi */}
                <div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                        CAPTCHA
                      </span>
                      <div
                        onClick={refreshCaptcha}
                        title="Bấm để đổi phép tính khác"
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-center font-mono font-bold text-sm select-none cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        {captcha.num1} + {captcha.num2} = ?
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Kết quả
                      </span>
                      <input
                        type="number"
                        name="captchaInput"
                        value={formData.captchaInput}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Hiển thị lỗi nếu có */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Nút Đăng ký */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    <span>Đăng ký</span>
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