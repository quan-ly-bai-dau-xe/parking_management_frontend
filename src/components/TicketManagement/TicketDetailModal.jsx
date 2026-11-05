import React from "react";
import { BaseModal } from "../common/modal";
import StatusBadge from "../common/badge/StatusBadge";

export default function TicketDetailModal({
  isOpen,
  onClose,
  ticket,
  selectedTicket, // Alias hỗ trợ gọi từ VehicleManagement
}) {
  const activeTicket = ticket || selectedTicket;
  const isModalOpen = isOpen !== undefined ? isOpen : Boolean(activeTicket);

  if (!isModalOpen || !activeTicket) return null;

  // Chuẩn hóa dữ liệu từ cả 2 nguồn (ticketsData và vehicle representative ticket)
  const ticketCode =
    activeTicket.ticketCode || activeTicket.code || activeTicket.ticket_code || "—";
  const customerCode =
    activeTicket.customerCode ||
    activeTicket.vehicle?.customer?.customerCode ||
    activeTicket.customer_code ||
    "—";
  const customerName =
    activeTicket.customerName ||
    activeTicket.vehicle?.customer?.name ||
    activeTicket.customer_name ||
    "—";
  const licensePlate =
    activeTicket.licensePlate ||
    activeTicket.vehicle?.licensePlate ||
    activeTicket.license_plate ||
    "—";
  const ticketType =
    activeTicket.ticketType || activeTicket.type || activeTicket.ticket_type || "—";
  const startDate =
    activeTicket.startDate || activeTicket.effective_from || activeTicket.start_date || "—";
  const endDate =
    activeTicket.endDate || activeTicket.effective_to || activeTicket.end_date || "—";
  const price =
    activeTicket.price ||
    (activeTicket.total_amount ? `${Number(activeTicket.total_amount).toLocaleString("vi-VN")}đ` : "—");
  const slotLocation =
    activeTicket.slotLocation || activeTicket.slot_code || activeTicket.slot || "—";
  const status =
    activeTicket.status || activeTicket.state || "active";
  const statusLabel =
    activeTicket.statusText || activeTicket.status_label;

  const renewalHistory = activeTicket.renewalHistory || [
    {
      stt: 1,
      date: startDate,
      ticketType: ticketType,
      price: price,
      staff: "NV0005",
    },
  ];

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={onClose}
      title="Chi tiết vé đỗ xe"
      size="2xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Cột trái: Thông tin thuộc tính vé (5 cột) */}
          <div className="md:col-span-5 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Mã vé</span>
              <span className="font-bold text-slate-800 font-mono">{ticketCode}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Mã khách hàng</span>
              <span className="font-medium text-slate-800 font-mono">{customerCode}</span>
            </div>
            {customerName !== "—" && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Tên khách hàng</span>
                <span className="font-semibold text-slate-800">{customerName}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Biển số xe</span>
              <span className="font-semibold text-slate-800 font-mono">{licensePlate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Loại vé</span>
              <span className="font-medium text-slate-800">{ticketType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Ngày hiệu lực</span>
              <span className="font-mono text-slate-700">{startDate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Ngày hết hạn</span>
              <span className="font-mono text-slate-700">{endDate}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Vị trí đỗ</span>
              <span className="font-medium text-slate-700">{slotLocation}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Giá vé</span>
              <span className="font-bold text-slate-900 font-mono">{price}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Trạng thái</span>
              <StatusBadge status={status} label={statusLabel} />
            </div>
          </div>

          {/* Cột phải: Bảng lịch sử gia hạn (7 cột) */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Lịch sử gia hạn</span>
            </div>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-2xs text-slate-400 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3 text-center">STT</th>
                    <th className="py-2.5 px-3">Ngày gia hạn</th>
                    <th className="py-2.5 px-3">Loại vé</th>
                    <th className="py-2.5 px-3">Giá vé</th>
                    <th className="py-2.5 px-3">Nhân viên</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {renewalHistory.map((h, idx) => (
                    <tr key={h.stt || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-slate-500">{h.stt || idx + 1}</td>
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
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
