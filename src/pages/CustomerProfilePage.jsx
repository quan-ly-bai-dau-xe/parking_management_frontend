import { useState, useEffect, useMemo } from "react";
import AppTopHeader from "../components/layout/AppTopHeader";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiClient } from "../services/apiClient";
import { MOCK_CUSTOMERS } from "../mocks/customerSideData";

const MOCK_TRANSACTIONS = [
  {
    id: 1,
    time: "05/11/2026 - 09:30",
    title: "Gia hạn vé tháng xe máy",
    subTitle: "59P1-678.90",
    code: "GD-261105-001",
    amount: -150000,
    status: "Thành công",
  },
  {
    id: 2,
    time: "04/11/2026 - 16:42",
    title: "Nạp tiền vào ví",
    subTitle: "Chuyển khoản ngân hàng",
    code: "GD-261104-002",
    amount: 1000000,
    status: "Thành công",
  },
  {
    id: 3,
    time: "01/11/2026 - 08:15",
    title: "Mua vé tháng ô tô",
    subTitle: "51K-992.14",
    code: "GD-261101-003",
    amount: -1200000,
    status: "Thành công",
  },
  {
    id: 4,
    time: "01/11/2026 - 08:10",
    title: "Nạp tiền vào ví",
    subTitle: "Chuyển khoản ngân hàng",
    code: "GD-261101-002",
    amount: 1000000,
    status: "Thành công",
  },
  {
    id: 5,
    time: "31/10/2026 - 17:25",
    title: "Nạp tiền vào ví",
    subTitle: "Chuyển khoản ngân hàng",
    code: "GD-261031-001",
    amount: 200000,
    status: "Thành công",
  },
];

export default function CustomerProfilePage() {
  const { user } = useCurrentUser();

  // Khớp dữ liệu từ tệp mockCustomers theo user hiện tại hoặc lấy khách hàng đầu tiên
  const initialCustomerData = useMemo(() => {
    if (!user) return MOCK_CUSTOMERS[0].customer;
    const found = MOCK_CUSTOMERS.find(
      (item) =>
        item.customer.email === user.email ||
        item.customer.phone === user.phone ||
        item.customer.identity_card_number === user.identity_card_number
    );
    return found ? found.customer : MOCK_CUSTOMERS[0].customer;
  }, [user]);

  const [formData, setFormData] = useState({
    fullName: initialCustomerData.full_name || "",
    email: initialCustomerData.email || "",
    phone: initialCustomerData.phone || "",
    identityCard: initialCustomerData.identity_card_number || "",
  });

  const [walletBalance] = useState(0);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Cập nhật lại form khi tài khoản đăng nhập thay đổi
  useEffect(() => {
    setFormData({
      fullName: initialCustomerData.full_name || "",
      email: initialCustomerData.email || "",
      phone: initialCustomerData.phone || "",
      identityCard: initialCustomerData.identity_card_number || "",
    });
  }, [initialCustomerData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      if (user?.id) {
        await apiClient(`/api/v1/customers/${user.id}/`, {
          method: "PATCH",
          data: {
            full_name: formData.fullName,
            phone: formData.phone.replace(/\s+/g, ""),
            identity_card_number: formData.identityCard.replace(/\s+/g, ""),
            email: formData.email,
          },
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || "Không thể cập nhật hồ sơ. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTransactions = MOCK_TRANSACTIONS.filter((item) => {
    if (activeFilter === "deposit") return item.amount > 0;
    if (activeFilter === "payment") return item.amount < 0;
    return true;
  });

  const formatCurrency = (val) => {
    const formatted = Math.abs(val).toLocaleString("vi-VN");
    return val > 0 ? `+${formatted} đ` : `-${formatted} đ`;
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Header biến thể Customer với 5 tab bo tròn (Pill) */}
      <AppTopHeader
        variant="customer"
        activePath="/customer/profile"
        showHelp={true}
        showCamera={false}
      />

      {/* 2. Nội dung chính */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tiêu đề trang */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Thông tin cá nhân
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý hồ sơ, bảo mật tài khoản và ví Smart Parking của bạn.
          </p>
        </div>

        {/* Lưới 2 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CỘT TRÁI (8 CỘT) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card Hồ sơ cá nhân */}
            <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  Hồ sơ cá nhân
                </h2>
                <span className="text-xs font-semibold text-blue-600">
                  Đã xác minh
                </span>
              </div>

              {/* Avatar & Tên hiển thị từ file mock data */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 shrink-0 bg-slate-100">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {formData.fullName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ảnh JPG hoặc PNG, tối đa 5 MB.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
                >
                  Đổi ảnh đại diện
                </button>
              </div>

              {/* Form cập nhật thông tin */}
              <form onSubmit={handleSaveProfile} className="pt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="identityCard"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Số CCCD
                    </label>
                    <input
                      type="text"
                      id="identityCard"
                      name="identityCard"
                      value={formData.identityCard}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {saveSuccess && (
                  <p className="text-xs text-emerald-600 font-medium">
                    ✓ Cập nhật hồ sơ thành công!
                  </p>
                )}
                {saveError && (
                  <p className="text-xs text-rose-600 font-medium">{saveError}</p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    Thông tin cá nhân của bạn luôn được bảo mật.
                  </span>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer self-end sm:self-auto"
                  >
                    {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </section>

            {/* Card Bảo mật tài khoản */}
            <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Bảo mật tài khoản
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Thay đổi mật khẩu định kỳ để bảo vệ tài khoản.
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                Đổi mật khẩu
              </button>
            </section>
          </div>

          {/* CỘT PHẢI (4 CỘT) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card Ví Smart Parking */}
            <section className="bg-gradient-to-tr from-[#0F172A] to-[#1E293B] text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-900/10 space-y-4">
              <span className="text-[0.68rem] font-bold tracking-widest text-slate-300 uppercase block">
                VÍ SMART PARKING
              </span>

              <div>
                <span className="text-xs text-slate-400 block mb-1">
                  Số dư khả dụng
                </span>
                <div className="text-3xl font-extrabold tracking-tight font-mono">
                  {walletBalance.toLocaleString("vi-VN")}{" "}
                  <span className="underline text-2xl font-bold">đ</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Dùng để mua vé và thanh toán phí đỗ xe.
              </p>

              <button
                type="button"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="text-base font-bold leading-none">+</span>
                <span>Nạp tiền vào ví</span>
              </button>

              <p className="text-[11px] text-slate-400 text-center pt-1">
                Giao dịch được cập nhật tự động sau khi hoàn tất.
              </p>
            </section>

            {/* Card Thanh toán thuận tiện */}
            <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-2">
              <h3 className="font-bold text-sm text-slate-900">
                Thanh toán thuận tiện
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nạp tiền qua chuyển khoản ngân hàng hoặc mã QR. Theo dõi mọi
                khoản thu, chi ngay bên dưới.
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Cần hỗ trợ giao dịch? Liên hệ <strong>1900 1234</strong>.
              </p>
            </section>
          </div>
        </div>

        {/* 3. Bảng Lịch sử giao dịch */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Lịch sử giao dịch
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi các lần nạp tiền và thanh toán từ ví của bạn.
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              Xuất sao kê
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="inline-flex p-1 bg-slate-100/80 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("deposit")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === "deposit"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Nạp tiền
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("payment")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === "payment"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Thanh toán
              </button>
            </div>

            <span className="text-xs text-slate-400">30 ngày gần nhất</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="py-3 px-3">Thời gian</th>
                  <th className="py-3 px-3">Nội dung giao dịch</th>
                  <th className="py-3 px-3">Mã giao dịch</th>
                  <th className="py-3 px-3 text-right">Số tiền</th>
                  <th className="py-3 px-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                      {tx.time}
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-slate-800">{tx.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {tx.subTitle}
                      </p>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                      {tx.code}
                    </td>
                    <td
                      className={`py-3.5 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                        tx.amount > 0 ? "text-emerald-600" : "text-slate-800"
                      }`}
                    >
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-emerald-600 font-medium whitespace-nowrap">
                      {tx.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Hiển thị {filteredTransactions.length} giao dịch gần nhất
            </span>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors self-end sm:self-auto cursor-pointer"
            >
              Xem tất cả giao dịch
            </button>
          </div>
        </section>
      </main>

      {/* 4. Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 px-6 sm:px-10 lg:px-14 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div>© 2026 Smart Mobility · Smart Parking</div>
        <div className="flex items-center gap-6">
          <a
            href="#privacy"
            onClick={(e) => e.preventDefault()}
            className="hover:text-slate-600 transition-colors"
          >
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