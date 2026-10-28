import { useState } from "react";
import AppTopHeader from "../components/layout/AppTopHeader";
import { fullParkingLotData } from "../mocks/parkingLotData";

export default function ParkingLot({ onNavigateTab }) {
    const currentZone = fullParkingLotData[0]?.zones[0];
    const rowASlots = currentZone?.slots?.filter((s) => s.row === "A") || [];
    const rowBSlots = currentZone?.slots?.filter((s) => s.row === "B") || [];

    // Quản lý ô đỗ đang được chọn xem chi tiết (mặc định chọn A-01)
    const [selectedSlot, setSelectedSlot] = useState({
        id: "A-01",
        status: "OCCUPIED",
        statusText: "Đang đỗ",
        parkingLot: "Bãi xe Smart Mobility",
        floor: "B1",
        zone: "A",
        licensePlate: "30A-123.45",
        vehicleType: "Ô tô",
        reservedBy: "—",
        note: "—",
    });

    // Mock danh sách cấu trúc bãi ở chân trang
    const structureList = [
        { type: "Tầng", name: "Tầng B1" },
        { type: "Tầng", name: "Tầng B2" },
        { type: "Tầng", name: "Tầng F1" },
        { type: "Khu", name: "Khu A" },
        { type: "Khu", name: "Khu B" },
        { type: "Khu", name: "Khu C" },
    ];

    // Xử lý khi click vào 1 ô đỗ trên sơ đồ
    const handleSelectSlot = (slot) => {
        setSelectedSlot({
        id: slot.label,
        status: slot.status,
        statusText:
            slot.status === "OCCUPIED"
            ? "Đang đỗ"
            : slot.status === "AVAILABLE"
            ? "Trống"
            : slot.status === "RESERVED"
            ? "Đã đặt trước"
            : "Bảo trì",
        parkingLot: "Bãi xe Smart Mobility",
        floor: "B1",
        zone: "A",
        licensePlate: slot.plate || "—",
        vehicleType: slot.type === "PRIORITY" ? "Xe ưu tiên" : "Ô tô",
        reservedBy: slot.reservedTime ? `Khách đặt lúc ${slot.reservedTime}` : "—",
        note: slot.note || "—",
        });
    };

    return (
        <main className="min-h-screen bg-[#FAF8FF] text-slate-800 font-sans flex flex-col justify-between">
            <AppTopHeader
                activeTabHref="#parking-lot"
                brandName="LOGO"
                adminName="Admin"
                onTabClick={onNavigateTab}
            />

            {/* ========================================================= */}
            {/* 1. TIÊU ĐỀ & THANH CÔNG CỤ TRÊN CÙNG                      */}
            {/* ========================================================= */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Sơ đồ bãi đậu xe
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                    Theo dõi sức chứa, trạng thái từng ô và quản lý cấu trúc bãi đỗ
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-all"
                    >
                    <span>⬇</span> Xuất báo cáo
                    </button>
                    <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-all"
                    >
                    <span>+</span> Thêm tầng
                    </button>
                    <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-all"
                    >
                    <span>+</span> Thêm khu
                    </button>
                    <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-all"
                    >
                    <span>+</span> Thêm ô đỗ xe
                    </button>
                </div>
                </div>

                {/* Hàng bộ lọc tìm kiếm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                <div>
                    <label className="block text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Bãi đỗ xe
                    </label>
                    <input
                    type="text"
                    readOnly
                    value="Bãi xe Smart Mobility"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none cursor-default"
                    />
                </div>

                <div>
                    <label className="block text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Tầng
                    </label>
                    <input
                    type="text"
                    readOnly
                    value="Tầng B1"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none cursor-default"
                    />
                </div>

                <div>
                    <label className="block text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Khu vực
                    </label>
                    <input
                    type="text"
                    readOnly
                    value="Khu A"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none cursor-default"
                    />
                </div>

                <div>
                    <label className="block text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Tìm kiếm
                    </label>
                    <input
                    type="text"
                    placeholder="Mã ô đỗ hoặc biển số..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>

                <div>
                    <label className="block text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Trạng thái ô đỗ
                    </label>
                    <input
                    type="text"
                    readOnly
                    value="Tất cả trạng thái"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none cursor-default"
                    />
                </div>

                <div>
                    <label className="block text-[0.72rem] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Loại xe được phép
                    </label>
                    <input
                    type="text"
                    readOnly
                    value="Tất cả loại xe"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none cursor-default"
                    />
                </div>

                <div className="flex items-end">
                    <button
                    type="button"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all flex items-center justify-center gap-1.5"
                    >
                    <span>🔄</span> Làm mới bộ lọc
                    </button>
                </div>

                <div className="flex items-end">
                    <button
                    type="button"
                    className="w-full px-4 py-2 rounded-xl border border-slate-800 bg-white hover:bg-slate-900 hover:text-white text-xs font-semibold text-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                    <span>✏️</span> Bật chế độ chỉnh sửa
                    </button>
                </div>
                </div>
            </div>

            {/* ========================================================= */}
            {/* 2. HÀNG 4 THẺ THỐNG KÊ NHANH                              */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 text-lg">
                    ⊞
                </div>
                <div>
                    <span className="block text-[0.72rem] font-medium text-slate-400">
                    Tổng ô đỗ trong khu
                    </span>
                    <span className="text-2xl font-extrabold text-slate-900">24</span>
                </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                    ✓
                </div>
                <div>
                    <span className="block text-[0.72rem] font-medium text-slate-400">
                    Ô trống
                    </span>
                    <span className="text-2xl font-extrabold text-slate-900">7</span>
                </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">
                    −
                </div>
                <div>
                    <span className="block text-[0.72rem] font-medium text-slate-400">
                    Đang sử dụng
                    </span>
                    <span className="text-2xl font-extrabold text-slate-900">12</span>
                </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                    ⏱
                </div>
                <div>
                    <span className="block text-[0.72rem] font-medium text-slate-400">
                    Đặt trước / Bảo trì
                    </span>
                    <span className="text-2xl font-extrabold text-slate-900">5</span>
                </div>
                </div>
            </div>

            {/* ========================================================= */}
            {/* 3. KHU VỰC TRUNG TÂM: SƠ ĐỒ MATRIX & CHI TIẾT Ô ĐỖ        */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* SƠ ĐỒ MATRIX NỀN TỐI (9 CỘT) */}
                <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                {/* Header thanh chú giải & mật độ */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                    <span className="text-slate-400 font-medium">Chú giải ô đỗ:</span>
                    <span className="flex items-center gap-1.5 text-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Trống (Available)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Có xe (Occupied)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Đặt trước (Reserved)
                    </span>
                    </div>
                    <div className="text-slate-500 font-medium">
                    Mật độ: <strong className="text-slate-800">18 / 24 ô</strong> đã dùng (75%)
                    </div>
                </div>

                {/* Canvas sơ đồ nền tối */}
                <div className="bg-[#0B132B] rounded-2xl p-5 sm:p-7 relative overflow-hidden text-white font-mono select-none">
                    
                    {/* DÃY A: A1 - A08 */}
                    <div className="space-y-2">
                    <div className="flex items-center justify-between text-[0.72rem] text-slate-400 font-semibold tracking-wider">
                        <span>DÃY A1 - A08 (XE Ô TÔ TIÊU CHUẨN)</span>
                        <span className="text-emerald-400 flex items-center gap-1">➔ HƯỚNG VÀO (ENTRY LANE)</span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                        {rowASlots.map((slot) =>
                        renderSlotCard(slot, selectedSlot?.id === slot.label, handleSelectSlot)
                        )}
                    </div>
                    </div>

                    {/* ĐƯỜNG XE CHẠY NỘI BỘ (DRIVEWAY) */}
                    <div className="my-7 py-3 border-y border-dashed border-slate-700/80 flex items-center justify-between text-[0.7rem] text-slate-400 uppercase tracking-widest relative">
                    <div className="flex items-center gap-2">
                        <span>← LÀN ĐƯỜNG XE CHẠY NỘI BỘ (DRIVEWAY)</span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-sans text-[0.68rem]">
                        TỐC ĐỘ TỐI ĐA: 10 KM/H
                    </div>
                    <div className="flex items-center gap-2">
                        <span>LỐI RA KHỎI BÃI →</span>
                    </div>
                    </div>

                    {/* DÃY B: B1 - B08 */}
                    <div className="space-y-2">
                    <div className="flex items-center justify-between text-[0.72rem] text-slate-400 font-semibold tracking-wider">
                        <span>DÃY B1 - B08 (XE ƯU TIÊN)</span>
                        <span className="text-blue-400">CẢM BIẾN SIÊU ÂM ACTIVE</span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                        {rowBSlots.map((slot) =>
                        renderSlotCard(slot, selectedSlot?.id === slot.label, handleSelectSlot)
                        )}
                    </div>
                    </div>

                </div>
                </div>

                {/* CỘT THÔNG TIN CHI TIẾT Ô ĐỖ (3 CỘT) */}
                <div className="lg:col-span-3 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Chi tiết ô đỗ</h2>
                    <p className="text-xs text-slate-400">Thông tin vị trí đang chọn</p>
                    </div>

                    {/* Header mã ô & badge trạng thái */}
                    <div className="flex items-center justify-between">
                    <div>
                        <span className="block text-[0.7rem] font-medium text-slate-400">Mã ô đỗ</span>
                        <span className="text-2xl font-extrabold text-slate-900 font-mono">
                        {selectedSlot?.id}
                        </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        {selectedSlot?.statusText || "Đang đỗ"}
                    </span>
                    </div>

                    {/* Thuộc tính ô đỗ */}
                    <div className="space-y-3 text-xs">
                    <div>
                        <span className="block text-slate-400 mb-0.5">Bãi đỗ xe</span>
                        <span className="font-semibold text-slate-800">{selectedSlot?.parkingLot}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 mb-0.5">Tầng</span>
                        <span className="font-semibold text-slate-800">{selectedSlot?.floor}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 mb-0.5">Khu vực</span>
                        <span className="font-semibold text-slate-800">{selectedSlot?.zone}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 mb-0.5">Biển số xe</span>
                        <span className="font-bold text-slate-900 font-mono">{selectedSlot?.licensePlate}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 mb-0.5">Loại xe</span>
                        <span className="font-semibold text-slate-800">{selectedSlot?.vehicleType}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 mb-0.5">Người đặt trước</span>
                        <span className="text-slate-500 font-mono">{selectedSlot?.reservedBy}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 mb-0.5">Ghi chú</span>
                        <span className="text-slate-500 font-mono">{selectedSlot?.note}</span>
                    </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="pt-2 flex items-center gap-3">
                    <button
                        type="button"
                        className="w-1/2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                    >
                        <span>✏️</span> Sửa
                    </button>
                    <button
                        type="button"
                        className="w-1/2 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs border border-rose-200 transition flex items-center justify-center gap-1.5"
                    >
                        <span>🗑️</span> Xóa ô đỗ
                    </button>
                    </div>
                </div>

                {/* Thao tác nhanh */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3 text-xs">
                    <span className="block font-bold text-slate-800">Thao tác nhanh</span>
                    <div className="space-y-2">
                    <button
                        type="button"
                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-left transition flex items-center gap-2"
                    >
                        <span className="w-2 h-2 rounded-full bg-slate-400" /> Đánh dấu trống
                    </button>
                    <button
                        type="button"
                        className="w-full py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-600 hover:bg-rose-100/60 font-medium text-left transition flex items-center gap-2"
                    >
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Đánh dấu có xe
                    </button>
                    <button
                        type="button"
                        className="w-full py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-600 hover:bg-emerald-100/60 font-medium text-left transition flex items-center gap-2"
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Đánh dấu đặt trước
                    </button>
                    <button
                        type="button"
                        className="w-full py-2 px-3 rounded-xl border border-amber-200 bg-amber-50/60 text-amber-600 hover:bg-amber-100/60 font-medium text-left transition flex items-center gap-2"
                    >
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Đánh dấu bảo trì
                    </button>
                    </div>
                </div>
                </div>

            </div>

            {/* ========================================================= */}
            {/* 4. CHÂN TRANG: QUẢN LÝ CẤU TRÚC BÃI & HOẠT ĐỘNG GẦN ĐÂY     */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* QUẢN LÝ CẤU TRÚC BÃI */}
                <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                    <h2 className="text-base font-bold text-slate-900">Quản lý cấu trúc bãi</h2>
                    <p className="text-xs text-slate-400">Quản lý bãi xe, tầng, khu vực và sức chứa</p>
                    </div>
                    <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                    >
                    ⚙ Cấu hình
                    </button>
                </div>

                <div className="space-y-2">
                    {structureList.map((item, idx) => (
                    <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                        <div>
                        <span className="block text-[0.65rem] text-slate-400 font-semibold uppercase">
                            {item.type}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-[0.72rem] transition"
                        >
                            ✏ Sửa
                        </button>
                        <button
                            type="button"
                            className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium text-[0.72rem] border border-rose-200 transition"
                        >
                            Xóa
                        </button>
                        </div>
                    </div>
                    ))}
                </div>
                </div>

                {/* HOẠT ĐỘNG GẦN ĐÂY */}
                <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                <div>
                    <h2 className="text-base font-bold text-slate-900">Hoạt động gần đây</h2>
                    <p className="text-xs text-slate-400">Nhật ký thao tác</p>
                </div>

                <ul className="space-y-3 text-xs pl-2">
                    <li className="flex items-start gap-2.5 text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                    <span>Khởi tạo sơ đồ bãi xe Smart Mobility.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                    <span>Khu A - Tầng B1 đã được tải.</span>
                    </li>
                </ul>
                </div>

            </div>
        </main>
    )
};

function renderSlotCard(slot, isSelected, onSelect) {
  // 1. Ô ĐỖ TRỐNG (AVAILABLE)
  if (slot.status === "AVAILABLE") {
    return (
      <div
        key={slot.slotId || slot.label}
        onClick={() => onSelect(slot)}
        className={`h-28 rounded-xl border flex flex-col items-center justify-between p-2 cursor-pointer transition-all ${
          isSelected
            ? "border-emerald-400 bg-emerald-950/80 ring-2 ring-emerald-400/50"
            : "border-emerald-500/50 bg-[#06201B] hover:border-emerald-400"
        }`}
      >
        <span className="text-[0.7rem] text-emerald-400 font-bold">{slot.label}</span>
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
          ✓
        </div>
        <span className="text-[0.65rem] text-emerald-400 font-bold tracking-wider">TRỐNG</span>
      </div>
    );
  }

  // 2. Ô ĐÃ CÓ XE (OCCUPIED)
  if (slot.status === "OCCUPIED") {
    return (
      <div
        key={slot.slotId || slot.label}
        onClick={() => onSelect(slot)}
        className={`h-28 rounded-xl border flex flex-col items-center justify-between p-2 cursor-pointer transition-all ${
          isSelected
            ? "border-rose-400 bg-rose-950/80 ring-2 ring-rose-400/50"
            : "border-rose-500/50 bg-[#2A0C16] hover:border-rose-400"
        }`}
      >
        <div className="w-full flex items-center justify-between text-[0.65rem]">
          <span className="text-rose-400 font-bold">{slot.label}</span>
          <span className="text-slate-400 font-sans text-[0.6rem]">{slot.duration}</span>
        </div>
        <span className="text-xl">🚗</span>
        <span className="text-[0.62rem] text-rose-300 font-mono font-bold tracking-tight">
          {slot.plate}
        </span>
      </div>
    );
  }

  // 3. Ô ĐÃ ĐẶT TRƯỚC (RESERVED)
  if (slot.status === "RESERVED") {
    return (
      <div
        key={slot.slotId || slot.label}
        onClick={() => onSelect(slot)}
        className={`h-28 rounded-xl border border-dashed flex flex-col items-center justify-between p-2 cursor-pointer transition-all ${
          isSelected
            ? "border-amber-400 bg-amber-950/80 ring-2 ring-amber-400/50"
            : "border-amber-500/70 bg-[#251A08] hover:border-amber-400"
        }`}
      >
        <span className="text-[0.7rem] text-amber-400 font-bold">{slot.label}</span>
        <span className="text-base text-amber-400">⏱</span>
        <span className="text-[0.6rem] text-amber-300 text-center font-bold leading-tight">
          {slot.note || `ĐÃ ĐẶT ${slot.reservedTime || ""}`}
        </span>
      </div>
    );
  }

  // 4. Ô BẢO TRÌ (MAINTENANCE)
  return (
    <div
      key={slot.slotId || slot.label}
      onClick={() => onSelect(slot)}
      className="h-28 rounded-xl border border-slate-700 bg-slate-800/60 flex flex-col items-center justify-between p-2 cursor-pointer transition-all hover:border-slate-500"
    >
      <span className="text-[0.7rem] text-slate-400 font-bold">{slot.label}</span>
      <span className="text-base text-slate-400">⚠️</span>
      <span className="text-[0.65rem] text-slate-400 font-bold tracking-wider">BẢO TRÌ</span>
    </div>
  );
}