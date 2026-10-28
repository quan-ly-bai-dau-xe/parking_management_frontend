import { useState } from "react";

export default function CreateTicketModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    customer: "",
    vehicle: "",
    ticketType: "",
    parkingSlot: "",
    startDate: "2026-12-05",
    endDate: "2026-12-06",
    price: "500000",
    note: "",
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(formData);
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
                <option value="KH0001">KH0001 - Nguyễn Văn A</option>
                <option value="KH0002">KH0002 - Trần Thị B</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Xe <span className="text-rose-500">*</span>
              </label>
              <select
                name="vehicle"
                value={formData.vehicle}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Chọn xe</option>
                <option value="51K-992-14">51K-992-14 (Ô tô)</option>
                <option value="30A-123-45">30A-123-45 (Ô tô)</option>
              </select>
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
                <option value="">Chọn loại vé</option>
                <option value="monthly">Vé tháng</option>
                <option value="daily">Vé ngày</option>
                <option value="quarterly">Vé quý</option>
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
                <option value="">Chọn vị trí đỗ xe</option>
                <option value="Tầng B1 - A10">Tầng B1 - A10</option>
                <option value="Tầng B1 - A05">Tầng B1 - A05</option>
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
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}