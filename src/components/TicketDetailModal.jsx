export default function TicketDetailModal({ isOpen, onClose, ticket }) {
  if (!isOpen || !ticket) return null;

  // Mock lịch sử gia hạn hiển thị ở bảng bên phải
  const renewalHistory = [
    {
      stt: 1,
      date: "12/05/2026",
      ticketType: ticket.ticketType || "Vé tháng",
      price: ticket.price || "500.000đ",
      staff: "NV0005",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Chi tiết vé</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Nội dung 2 cột */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Cột trái: Thông tin thuộc tính vé (5 cột) */}
          <div className="md:col-span-5 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Mã vé</span>
              <span className="font-bold text-slate-800 font-mono">{ticket.ticketCode}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Mã khách hàng</span>
              <span className="font-medium text-slate-800 font-mono">{ticket.customerCode}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Biển số xe</span>
              <span className="font-bold text-slate-900 font-mono">{ticket.licensePlate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Loại vé</span>
              <span className="font-medium text-slate-800">{ticket.ticketType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Giá vé</span>
              <span className="font-semibold text-slate-900 font-mono">{ticket.price}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Ngày hiệu lực</span>
              <span className="text-slate-700 font-mono">{ticket.startDate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Ngày hết hạn</span>
              <span className="text-slate-700 font-mono">{ticket.endDate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Vị trí đỗ xe</span>
              <span className="font-medium text-slate-800">{ticket.slotLocation}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 items-center">
              <span className="text-slate-400">Trạng thái</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {ticket.statusText || "Đang hoạt động"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 items-center">
              <span className="text-slate-400">Nhân viên phát hành</span>
              <span className="text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                NV0005 (Nguyễn Văn A)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Ngày tạo</span>
              <span className="text-slate-600 font-mono">12/05/2026 08:30</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Ghi chú</span>
              <span className="text-slate-500">—</span>
            </div>
          </div>

          {/* Cột phải: Bảng lịch sử gia hạn (7 cột) */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span>↻</span> Lịch sử gia hạn
            </div>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[0.7rem] text-slate-400 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center">STT</th>
                    <th className="py-2.5 px-3">Ngày gia hạn</th>
                    <th className="py-2.5 px-3">Loại vé</th>
                    <th className="py-2.5 px-3">Giá vé</th>
                    <th className="py-2.5 px-3">Nhân viên</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {renewalHistory.map((h) => (
                    <tr key={h.stt} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-slate-500">{h.stt}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{h.date}</td>
                      <td className="py-2.5 px-3 text-slate-700">{h.ticketType}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-900 font-semibold">{h.price}</td>
                      <td className="py-2.5 px-3 text-slate-600">{h.staff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}