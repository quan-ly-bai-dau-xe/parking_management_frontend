import { useState } from "react";
import { BaseModal } from "./common/modal";

export default function RenewTicketModal({ isOpen, onClose, ticket, onConfirm }) {
  const [ticketType, setTicketType] = useState(ticket?.ticketType || "");
  const [slot, setSlot] = useState(ticket?.slotLocation || "");
  const [newEndDate, setNewEndDate] = useState("2026-12-07");
  const [renewPrice, setRenewPrice] = useState("500000");
  const [note, setNote] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onConfirm) {
      onConfirm({
        ticketId: ticket?.ticketCode,
        newTicketType: ticketType,
        newSlot: slot,
        newEndDate,
        renewPrice,
        note,
      });
    }
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Gia hạn vé"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Mã vé (Readonly) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã vé
            </label>
            <input
              type="text"
              readOnly
              value={ticket ? `${ticket.ticketCode} - ${ticket.licensePlate}` : "Chọn Gia hạn từ danh sách"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 focus:outline-none cursor-default font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Loại vé mới <span className="text-rose-500">*</span>
            </label>
            <select
              name="newTicketType"
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Chọn loại vé</option>
              <option value="Vé tháng">Vé tháng</option>
              <option value="Vé ngày">Vé ngày</option>
              <option value="Vé quý">Vé quý</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vị trí đỗ xe mới <span className="text-rose-500">*</span>
            </label>
            <select
              name="newSlot"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Chọn vị trí đỗ xe</option>
              <option value="Tầng B1 - A10">Tầng B1 - A10</option>
              <option value="Tầng B1 - A05">Tầng B1 - A05</option>
              <option value="Tầng B2 - B12">Tầng B2 - B12</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ngày hết hạn mới <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="newEndDate"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Giá gia hạn <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="renewPrice"
                value={renewPrice}
                onChange={(e) => setRenewPrice(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 pr-8 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                đ
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú
            </label>
            <textarea
              name="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition"
            >
              Xác nhận
            </button>
          </div>
        </form>
    </BaseModal>
  );
}