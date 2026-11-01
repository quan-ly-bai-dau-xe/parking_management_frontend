import { useState } from "react";
import { BaseModal } from "../common/modal";

export default function EditVehicleModal({ isOpen, onClose, vehicle, onSave }) {
  const [formData, setFormData] = useState({
    licensePlate: "",
    customerName: "",
    customerPhone: "",
    parkingDisplay: "",
    status: "",
  });
  const [prevVehicle, setPrevVehicle] = useState(null);

  if (vehicle && vehicle !== prevVehicle) {
    setPrevVehicle(vehicle);
    setFormData({
      licensePlate: vehicle.licensePlate || "",
      customerName: vehicle.customer?.name || "",
      customerPhone: vehicle.customer?.phone || "",
      parkingDisplay: vehicle.parkingSlot?.display || "",
      status: vehicle.status || "",
    });
  }

  if (!isOpen || !vehicle) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      ...vehicle,
      licensePlate: formData.licensePlate.trim(),
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
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={vehicle?.id === "NEW" ? "Thêm phương tiện" : "Chỉnh sửa phương tiện"}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
                <option value="left">Đã rời bãi</option>
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
              {vehicle?.id === "NEW" ? "Thêm xe" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
    </BaseModal>
  );
}
