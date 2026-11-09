import React, { useState, useEffect } from "react";
import { ticketService } from "../services/ticketService";

export default function RenewTicketModal({ isOpen, onClose, ticket, onConfirm }) {
  const [formData, setFormData] = useState({
    ticket_type_id: 2,
    newTicketType: "",
    newSlot: "",
    extend_days: 30,
    newEndDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    renewPrice: "500000",
    note: "",
  });

  const [ticketTypes, setTicketTypes] = useState([]);

  useEffect(() => {
    if (isOpen) {
      ticketService.getTicketTypes().then((types) => {
        if (types && types.length > 0) setTicketTypes(types);
      });
      if (ticket) {
        setFormData((prev) => ({
          ...prev,
          newTicketType: ticket.ticketType || "Vé tháng",
          newSlot: ticket.slotLocation || "Tầng B1 - A10",
        }));
      }
    }
  }, [isOpen, ticket]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "newTicketType") {
      const match = ticketTypes.find((t) => String(t.id) === String(value) || t.name === value);
      if (match) {
        const days = match.duration_days || 30;
        setFormData((prev) => ({
          ...prev,
          ticket_type_id: match.id,
          newTicketType: match.name,
          extend_days: days,
          renewPrice: String(match.default_price || "500000"),
          newEndDate: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10),
        }));
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onConfirm) {
      onConfirm({
        ticketId: ticket?.backendId || ticket?.ticketCode || ticket?.id,
        ticket_type_id: formData.ticket_type_id,
        extend_days: formData.extend_days || 30,
        additional_price: parseFloat(formData.renewPrice) || 0,
        notes: formData.note,
        // UI fallback
        ticketType: formData.newTicketType,
        slotLocation: formData.newSlot,
        endDate: formData.newEndDate,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Gia hạn vé</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

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
              value={formData.newTicketType}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {ticketTypes.length > 0 ? (
                ticketTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} ({Number(t.default_price).toLocaleString("vi-VN")}đ)
                  </option>
                ))
              ) : (
                <>
                  <option value="Vé tháng">Vé tháng</option>
                  <option value="Vé ngày">Vé ngày</option>
                  <option value="Vé quý">Vé quý</option>
                  <option value="Vé năm">Vé năm</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vị trí đỗ xe <span className="text-rose-500">*</span>
            </label>
            <select
              name="newSlot"
              value={formData.newSlot}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Tầng B1 - A10">Tầng B1 - A10</option>
              <option value="Tầng B1 - A05">Tầng B1 - A05</option>
              <option value="Tầng B2 - B12">Tầng B2 - B12</option>
              <option value="Tầng B2 - C03">Tầng B2 - C03</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ngày hết hạn mới <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="newEndDate"
              value={formData.newEndDate}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phí gia hạn <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="renewPrice"
                value={formData.renewPrice}
                onChange={handleChange}
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
              value={formData.note}
              onChange={handleChange}
              placeholder="Nhập ghi chú..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
