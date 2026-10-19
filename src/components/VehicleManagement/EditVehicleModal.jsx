import React, { useEffect, useState } from "react";

export default function EditVehicleModal({ isOpen, onClose, vehicle, onSave }) {
  const [formData, setFormData] = useState({
    licensePlate: "",
    vehicleType: "",
    customerName: "",
    customerPhone: "",
    parkingDisplay: "",
    status: "",
  });

  useEffect(() => {
    if (!vehicle) return;

    setFormData({
      licensePlate: vehicle.licensePlate || "",
      vehicleType: vehicle.vehicleType || "",
      customerName: vehicle.customer?.name || "",
      customerPhone: vehicle.customer?.phone || "",
      parkingDisplay: vehicle.parkingSlot?.display || "",
      status: vehicle.status || "",
    });
  }, [vehicle]);

  if (!isOpen || !vehicle) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      ...vehicle,
      licensePlate: formData.licensePlate.trim(),
      vehicleType: formData.vehicleType,
      status: formData.status,
      customer: {
        ...vehicle.customer,
        name: formData.customerName.trim(),
        phone: formData.customerPhone.trim(),
      },
      parkingSlot: {
        ...vehicle.parkingSlot,
        display: formData.parkingDisplay.trim(),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose}></div>

      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white border border-slate-200 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Chỉnh sửa phương tiện
            </h2>
            <p className="text-2xs text-slate-500 mt-0.5">
              Mã xe: {vehicle.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Biển số xe
              </label>
              <input
                type="text"
                value={formData.licensePlate}
                onChange={(e) => handleChange("licensePlate", e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Loại xe
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => handleChange("vehicleType", e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="Ô tô">Ô tô</option>
                <option value="Xe máy">Xe máy</option>
                <option value="Xe điện">Xe điện</option>
                <option value="Xe tải">Xe tải</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Tên khách hàng
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Số điện thoại
              </label>
              <input
                type="text"
                value={formData.customerPhone}
                onChange={(e) => handleChange("customerPhone", e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Vị trí đỗ
              </label>
              <input
                type="text"
                value={formData.parkingDisplay}
                onChange={(e) => handleChange("parkingDisplay", e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">
                Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="parked">Đang đỗ</option>
                <option value="active">Đang hoạt động</option>
                <option value="in_transit">Đang di chuyển</option>
                <option value="maintenance">Bảo trì</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
