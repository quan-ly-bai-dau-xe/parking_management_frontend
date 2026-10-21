// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { dashboardService } from "../features/dashboardService";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [activeFloor, setActiveFloor] = useState("B1");
  const [selectedImage, setSelectedImage] = useState(null); // Modal phóng to ảnh camera

  const [dashboardData, setDashboardData] = useState({
    stats: null,
    alerts: [],
    history: [],
    currentFloor: null,
  });

  // Nạp toàn bộ dữ liệu khi khởi động trang
  useEffect(() => {
    setLoading(true);
    dashboardService
      .loadInitialDashboard("B1")
      .then((data) => {
        setDashboardData(data);
      })
      .catch((err) => console.error("Lỗi tải trang chủ:", err))
      .finally(() => setLoading(false));
  }, []);

  // Xử lý đổi tầng bãi xe
  const handleFloorChange = (floorId) => {
    setActiveFloor(floorId);
    dashboardService
      .getFloorDetails(floorId)
      .then((res) => {
        setDashboardData((prev) => ({
          ...prev,
          currentFloor: res.data,
        }));
      })
      .catch((err) => console.error(err));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-inter">
        <div className="flex items-center gap-3 text-slate-600 font-medium text-sm">
          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>Đang nạp dữ liệu hệ thống bãi đỗ xe...</span>
        </div>
      </div>
    );
  }

  const { stats, alerts, history, currentFloor } = dashboardData;

  return (
    <main className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 font-inter text-slate-800 antialiased">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* ========================================================= */}
        {/* BANNER GIỚI THIỆU CÔNG NGHỆ TỰ ĐỘNG                       */}
        {/* ========================================================= */}
        <section className="bg-gradient-to-tr from-[#0B1325] via-[#101B33] to-[#1E293B] text-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl border border-slate-800/80 relative overflow-hidden">
          <div className="max-w-4xl space-y-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug">
              Đỗ xe thông minh – Ra vào tức thì cùng công nghệ đỗ xe tự động
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm lg:text-[0.925rem] leading-relaxed font-normal">
              Tạm biệt cảnh xếp hàng lấy thẻ giấy và chờ đợi thanh toán tiền mặt. Hệ thống tự động nhận diện biển số bằng AI giúp bạn ra vào bãi trong chưa đầy 3 giây. Tra cứu vị trí đỗ, kiểm tra lịch sử gửi xe và thanh toán nhanh qua mã VietQR ngay trên điện thoại của bạn.
            </p>
          </div>

          <div className="border-t border-slate-700/60 my-6" />

          {/* Badges trạng thái */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
            <span className="text-slate-400 font-medium mr-1 select-none">
              Trạng thái ô đỗ (Parking Status Badges):
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              Chỗ trống (Available)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/70 border border-rose-500/30 text-rose-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              Đã đỗ xe (Occupied)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/70 border border-amber-500/30 text-amber-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              Đã đặt trước (Reserved)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              Sạc xe điện (EV Charging)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-600/40 text-slate-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              Bảo trì / Tạm khóa
            </span>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 1. THỐNG KÊ TỔNG QUAN                                     */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-6 bg-blue-600 rounded-full" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                1. Thống kê tổng quan
              </h2>
            </div>
            <span className="font-mono text-xs text-slate-400 font-medium hidden sm:inline-block">
              Component: &lt;StatCard /&gt;
            </span>
          </div>

          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Thẻ 1: Tổng vị trí bãi */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[175px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Tổng vị trí bãi
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{stats.totalLocations.count}</span>
                    <span className="text-xs text-slate-500 font-medium">{stats.totalLocations.statusText}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-4 border-t border-slate-100">
                  <span className="text-emerald-600 font-semibold">{stats.totalLocations.growthText}</span>
                  <span className="text-slate-400">{stats.totalLocations.period}</span>
                </div>
              </div>

              {/* Thẻ 2: Tỷ lệ lấp đầy trực tiếp */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[175px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Tỷ lệ lấp đầy trực tiếp
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-3xl font-extrabold text-slate-900">{stats.occupancyRate.percent}%</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[0.7rem] font-semibold border border-amber-200/60">
                      {stats.occupancyRate.statusText}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100">
                    <div className="h-full bg-rose-500" style={{ width: `${stats.occupancyRate.percent}%` }} />
                    <div className="h-full bg-emerald-500" style={{ width: `${100 - stats.occupancyRate.percent}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3">
                  <span>Đã đỗ: <strong className="text-slate-700">{stats.occupancyRate.occupied}</strong></span>
                  <span>Trống: <strong className="text-slate-700">{stats.occupancyRate.empty}</strong></span>
                </div>
              </div>

              {/* Thẻ 3: Doanh thu hôm nay */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[175px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Doanh thu hôm nay
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{stats.revenueToday.amount}</span>
                    <span className="text-xs font-semibold text-emerald-600">{stats.revenueToday.growthText}</span>
                  </div>
                </div>
                <div className="flex items-end gap-1.5 h-6 pt-2">
                  {stats.revenueToday.chartHeights.map((h, i) => (
                    <span key={i} className="w-full bg-blue-500 rounded-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Thẻ 4: Lượt xe vào / ra */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[175px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Lượt xe vào / ra
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8m-8 5h8m-4 5h4M5 5a2 2 0 012-2h10a2 2 0 012 2v14l-4-3-4 3-4-3-4 3V5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[0.7rem] text-slate-400 font-medium">Xe vào cổng</span>
                      <span className="text-2xl font-extrabold text-slate-900">{stats.traffic.inbound.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[0.7rem] text-slate-400 font-medium">Xe rời bãi</span>
                      <span className="text-2xl font-extrabold text-slate-900">{stats.traffic.outbound.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    {stats.traffic.gateCount} Cổng quét tự động
                  </span>
                  <span className="text-blue-600 font-semibold">{stats.traffic.modeText}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* 2. CẢNH BÁO BẤT THƯỜNG                                   */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              2. Cảnh báo bất thường
            </h2>
          </div>
          <div className="space-y-3 pl-4 sm:pl-5">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-4 text-xs sm:text-sm">
                <span className="font-mono text-amber-500 font-semibold shrink-0 select-none">
                  {alert.time}
                </span>
                <p className="text-slate-700 font-normal leading-relaxed">{alert.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. LỊCH SỬ RA VÀO GẦN ĐÂY                                */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              3. Lịch sử ra vào gần đây
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[0.72rem] uppercase tracking-wider text-slate-400 font-semibold bg-slate-50/50">
                    <th className="py-3.5 px-6">Mã phiên / Loại xe</th>
                    <th className="py-3.5 px-6">Biển số xe</th>
                    <th className="py-3.5 px-6 text-center">Hình ảnh đối soát</th>
                    <th className="py-3.5 px-6">Thời gian ghi nhận</th>
                    <th className="py-3.5 px-6">Thời lượng</th>
                    <th className="py-3.5 px-6">Phí gửi</th>
                    <th className="py-3.5 px-6 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {history.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-600">
                        <span>{row.sessionCode}</span>
                        <span className="block text-[0.7rem] text-slate-400 font-sans mt-0.5">{row.vehicleType}</span>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">
                        {row.licensePlate}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {row.plateImageUrl ? (
                          <img
                            src={row.plateImageUrl}
                            alt={row.licensePlate}
                            onClick={() => setSelectedImage(row.plateImageUrl)}
                            className="w-12 h-8 object-cover rounded-md border border-slate-200 mx-auto cursor-pointer hover:opacity-80 transition"
                          />
                        ) : (
                          <span className="text-slate-400 text-xs">Không có</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                        <div>Vào: {row.entryTime}</div>
                        <div>Ra: {row.exitTime || "Chưa ra"}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-medium">
                        {row.duration}
                      </td>
                      <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                        {row.fee}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {row.status === "completed" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Đã ra
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200/60 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            Trong bãi
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. TỔNG QUAN SƠ ĐỒ BÃI ĐẬU XE                             */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                4. Tổng quan sơ đồ bãi đậu xe
              </h2>
            </div>
            {/* Toggle chọn tầng */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
              {["B1", "B2", "B3"].map((floor) => (
                <button
                  key={floor}
                  type="button"
                  onClick={() => handleFloorChange(floor)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeFloor === floor
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Tầng {floor}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm relative">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tỷ lệ lấp đầy trực tiếp ({currentFloor?.floorName || `Tầng ${activeFloor}`})
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                </svg>
              </div>
            </div>

            {/* Danh sách các khu trong tầng */}
            <div className="divide-y divide-slate-100">
              {currentFloor?.zones?.map((zone, idx) => {
                const zonePercent = zone.stats?.percent || 0;
                return (
                  <div key={zone.zoneId || idx} className={`${idx !== 0 ? "pt-7" : ""} ${idx !== currentFloor.zones.length - 1 ? "pb-7" : ""}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-4 bg-rose-500 rounded-full" />
                      <h3 className="font-bold text-slate-800 text-base sm:text-lg">{zone.zoneName}</h3>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{zonePercent}%</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200/60">
                        {zone.stats?.statusText || "Còn chỗ"}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100">
                      <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${zonePercent}%` }} />
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${100 - zonePercent}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
                      <span>Đã đỗ: <strong className="text-slate-600 font-sans">{zone.stats?.occupied ?? 0}</strong></span>
                      <span>Trống: <strong className="text-slate-600 font-sans">{zone.stats?.empty ?? 0}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </div>

      {/* Modal xem ảnh camera đối soát phóng to */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white p-3 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-sm font-semibold text-slate-800">
                Ảnh chụp camera đối soát biển số
              </span>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <img
              src={selectedImage}
              alt="Ảnh đối soát"
              className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </main>
  );
}