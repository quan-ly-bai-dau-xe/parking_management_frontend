import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppTopHeader from "../components/layout/AppTopHeader";
import { ROUTES } from "../config/navigation";
import { registerService } from "../services/registerService";

export default function OnboardingProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Nhận email/số điện thoại và mật khẩu từ trang Register
  const registerState = location.state || {};
  const registrationAccount = registerState.account || "";
  const registrationPassword = registerState.password || "";

  // Nếu người dùng truy cập trực tiếp đường link mà không có thông tin bước 1, quay về trang đăng ký
  useEffect(() => {
    if (!registrationAccount || !registrationPassword) {
      navigate(ROUTES.REGISTER || "/register", { replace: true });
    }
  }, [registrationAccount, registrationPassword, navigate]);

  const [formData, setFormData] = useState({
    fullName: "",
    // Nếu ở bước 1 người dùng nhập SĐT thì tự động điền sẵn vào đây
    phone: !registrationAccount.includes("@") ? registrationAccount : "",
    identityCardNumber: "",
    agreePolicy: false,
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.fullName.trim()) {
        setErrorMessage("Vui lòng nhập họ và tên theo CCCD.");
        return;
    }

    const cleanPhone = formData.phone.replace(/\s+/g, "");
    if (!/^[0-9]{9,15}$/.test(cleanPhone)) {
        setErrorMessage("Số điện thoại không hợp lệ (gồm 9 đến 15 chữ số).");
        return;
    }

    const cleanIdCard = formData.identityCardNumber.replace(/\s+/g, "");
    if (!/^[0-9]{9,20}$/.test(cleanIdCard)) {
        setErrorMessage("Số CCCD không hợp lệ (gồm 9 đến 20 chữ số).");
        return;
    }

    if (!formData.agreePolicy) {
        setErrorMessage("Vui lòng xác nhận thông tin và đồng ý với Chính sách bảo mật.");
        return;
    }

    const isEmail = registrationAccount.includes("@");
    const payload = {
        full_name: formData.fullName.trim(),
        phone: cleanPhone,
        identity_card_number: cleanIdCard,
        email: isEmail ? registrationAccount : null,
        password: registrationPassword,
        status: "ACTIVE",
    };

    setLoading(true);

    try {
        // apiClient tự gắn header X-CSRFToken và cookie credentials
        await registerService.createCustomer(payload);

        navigate(`${ROUTES.LOGIN || "/login"}?account=${encodeURIComponent(registrationAccount)}`, {
        replace: true,
        });
    } catch (err) {
        // Interceptor của apiClient đã bóc tách message lỗi chi tiết
        setErrorMessage(err.message || "Không thể hoàn tất đăng ký. Vui lòng thử lại.");
    } finally {
        setLoading(false);
    }
    };

  return (
    <div className="min-h-screen w-full bg-[#FAF8FF] flex flex-col justify-between font-sans text-slate-800 antialiased">
      {/* 1. Header ẩn Camera, bật Trợ giúp */}
      <AppTopHeader
        brandName="Smart Parking"
        userName={formData.fullName || "Khách hàng"}
        showCamera={false}
        showHelp={true}
        tabs={[]}
      />

      {/* 2. Thanh tiến trình Stepper */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              ✓
            </span>
            <span>Đăng ký</span>
          </div>

          <div className="flex-1 h-[1.5px] bg-slate-200 mx-3 sm:mx-6" />

          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-xs">
              2
            </span>
            <span>Thông tin cá nhân</span>
          </div>

          <div className="flex-1 h-[1.5px] bg-slate-200 mx-3 sm:mx-6" />

          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">
              3
            </span>
            <span>Bắt đầu sử dụng</span>
          </div>
        </div>
      </div>

      {/* 3. Nội dung chính */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Cột trái */}
          <section className="lg:col-span-5 space-y-6 pt-2 select-none">
            <div>
              <span className="block text-[0.72rem] font-bold tracking-widest text-blue-600 uppercase mb-2">
                CHỈ CÒN MỘT BƯỚC
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-extrabold text-slate-900 tracking-tight leading-snug">
                Rất vui được<br />đồng hành cùng bạn.
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-3 leading-relaxed">
                Hoàn thiện thông tin để đăng ký phương tiện và sử dụng vé đỗ xe thuận tiện hơn.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">Một hồ sơ, mọi phương tiện</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Liên kết xe và vé trong cùng tài khoản.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">Không bỏ lỡ ngày gia hạn</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Nhận nhắc nhở trước khi vé hết hạn.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">Thông tin luôn được bảo vệ</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Dữ liệu cá nhân được lưu trữ an toàn.</p>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-200/60">
              Cần trợ giúp? Liên hệ <strong className="text-slate-600 font-semibold">1900 1234</strong><br />
              Chúng tôi luôn sẵn sàng hỗ trợ bạn.
            </div>
          </section>

          {/* Cột phải: Form nhập thông tin */}
          <section className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-sm">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Thông tin cá nhân
              </h2>
              <span className="text-xs text-slate-400">* Bắt buộc</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">
              Vui lòng nhập thông tin chính xác theo CCCD của bạn.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Nhập họ và tên đầy đủ..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Nhập đầy đủ họ và tên có dấu theo CCCD.
                </span>
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại liên hệ..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Dùng để nhận thông báo về phương tiện và vé.
                </span>
              </div>

              <div>
                <label htmlFor="identityCardNumber" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Số CCCD <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="identityCardNumber"
                  name="identityCardNumber"
                  value={formData.identityCardNumber}
                  onChange={handleChange}
                  placeholder="Nhập số CCCD/CMND..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  Số định danh cá nhân gồm 12 chữ số.
                </span>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
                <svg className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>
                  CCCD chỉ được sử dụng để xác nhận chủ phương tiện và hỗ trợ dịch vụ. Thông tin này không hiển thị công khai.
                </span>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="agreePolicy"
                  name="agreePolicy"
                  checked={formData.agreePolicy}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500/30 cursor-pointer mt-0.5"
                />
                <label htmlFor="agreePolicy" className="text-xs text-slate-600 leading-normal cursor-pointer select-none">
                  Tôi xác nhận thông tin trên là chính xác và đồng ý với{" "}
                  <a href="#privacy" onClick={(e) => e.preventDefault()} className="text-blue-600 hover:underline font-medium">
                    Chính sách bảo mật
                  </a>{" "}
                  của Smart Parking.
                </label>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  <span>Lưu thông tin và tiếp tục →</span>
                </button>
              </div>
            </form>
          </section>

        </div>
      </main>

      {/* 4. Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 px-6 sm:px-10 lg:px-14 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div>© 2026 Smart Mobility · Smart Parking</div>
        <div className="flex items-center gap-6">
          <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-slate-600 transition-colors">
            Chính sách bảo mật
          </a>
          <span>Hỗ trợ: <strong className="text-slate-700 font-normal">1900 1234</strong></span>
        </div>
      </footer>
    </div>
  );
}