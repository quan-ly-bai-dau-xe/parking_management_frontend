import { useState, useEffect } from "react";
import { ticketService } from "../services/ticketService";
import { customerService } from "../services/customerService";

export default function CreateTicketModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    customer: "",
    vehicle: "",
    ticketType: "2", // Default to MONTH
    parkingSlot: "Tầng B1 - A10",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    price: "500000",
    note: "",
  });

  const [ticketTypes, setTicketTypes] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      ticketService.getTicketTypes().then((types) => {
        if (types && types.length > 0) setTicketTypes(types);
      });
      customerService.getCustomers().then((custs) => {
        if (custs && custs.length > 0) setCustomers(custs);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "ticketType") {
      const selected = ticketTypes.find((t) => String(t.id) === String(value) || t.code === value);
      if (selected) {
        const days = selected.duration_days || 30;
        const newEnd = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
        setFormData((prev) => ({
          ...prev,
          ticketType: value,
          price: String(selected.default_price || "500000"),
          endDate: newEnd,
        }));
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        ticket_type_id: parseInt(formData.ticketType, 10) || 2,
        customer_code: formData.customer,
        license_plate: formData.vehicle,
        effective_from: `${formData.startDate}T00:00:00`,
        effective_to: `${formData.endDate}T23:59:59`,
        price: parseFloat(formData.price) || 500000,
        notes: formData.note,
        // Frontend display format fallback
        ticketCode: `VT${String(Date.now() % 10000).padStart(4, "0")}`,
        customerCode: formData.customer,
        licensePlate: formData.vehicle,
        ticketType: ticketTypes.find((t) => String(t.id) === String(formData.ticketType))?.name || "Vé tháng",
        startDate: formData.startDate,
        endDate: formData.endDate,
        slotLocation: formData.parkingSlot,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Thêm vé mới</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khách hàng <span className="text-rose-500">*</span>
              </label>
              <select
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Chọn khách hàng</option>
                {customers.length > 0 ? (
                  customers.map((c) => (
                    <option key={c.id || c.customerCode} value={c.customerCode || c.code}>
                      {c.customerCode || c.code} - {c.name || c.full_name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="KH0001">KH0001 - Nguyễn Văn An</option>
                    <option value="KH0002">KH0002 - Trần Thị Bình</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Biển số xe <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="vehicle"
                value={formData.vehicle}
                onChange={handleChange}
                placeholder="VD: 51K-992.14"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Loại vé <span className="text-rose-500">*</span>
              </label>
              <select
                name="ticketType"
                value={formData.ticketType}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {ticketTypes.length > 0 ? (
                  ticketTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({Number(t.default_price).toLocaleString("vi-VN")}đ)
                    </option>
                  ))
                ) : (
                  <>
                    <option value="2">Vé tháng (500.000đ)</option>
                    <option value="1">Vé ngày (50.000đ)</option>
                    <option value="3">Vé quý (1.200.000đ)</option>
                    <option value="4">Vé năm (4.500.000đ)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vị trí đỗ xe <span className="text-rose-500">*</span>
              </label>
              <select
                name="parkingSlot"
                value={formData.parkingSlot}
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
                Ngày hiệu lực <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày hết hạn <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giá vé <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="price"
                  value={formData.price}
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
              <input
                type="text"
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="Nhập ghi chú..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
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
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
