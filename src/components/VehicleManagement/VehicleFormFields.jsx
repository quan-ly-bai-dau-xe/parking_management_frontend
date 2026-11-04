import { AUTO_ASSIGN_SLOT_NOTE } from "../../constants/vehicleConstants";

/**
 * VehicleFormFields
 * Tập hợp các trường nhập liệu phương tiện (Biển số, Model, Hãng, Màu sắc, Ghi chú, Vị trí đỗ).
 * Tách biệt để giữ EditVehicleModal tinh gọn và tuân thủ giới hạn < 150-200 dòng.
 */
export default function VehicleFormFields({
  formData,
  onChange,
  isAddingNew = false,
  customerCombobox,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {/* Biển số xe */}
      <div>
        <label className="block text-2xs font-semibold text-slate-500 mb-1">
          Biển số xe <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          placeholder="VD: 51K-992.14 hoặc 30H-123.45"
          value={formData.licensePlate}
          onChange={(e) => onChange("licensePlate", e.target.value)}
          disabled={!isAddingNew}
          title={!isAddingNew ? "Biển số xe là mã định danh không thể sửa sau khi tạo" : ""}
          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono font-semibold disabled:bg-slate-100 disabled:text-slate-500 cursor-text disabled:cursor-not-allowed"
          required
        />
        {isAddingNew ? (
          <span className="text-2xs text-slate-400 mt-0.5 block">
            Định dạng: 51K-992.14, 30H-123.45 (mã tỉnh + seri + số)
          </span>
        ) : (
          <span className="text-2xs text-slate-400 mt-0.5 block">
            Biển số xe bất biến theo quy chuẩn CSDL
          </span>
        )}
      </div>

      {/* Tên mẫu xe (Model) */}
      <div>
        <label className="block text-2xs font-semibold text-slate-500 mb-1">
          Mẫu xe (Model)
        </label>
        <input
          type="text"
          placeholder="VD: VF8, Camry, Mazda 3..."
          value={formData.model ?? ""}
          onChange={(e) => onChange("model", e.target.value)}
          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Hãng xe */}
      <div>
        <label className="block text-2xs font-semibold text-slate-500 mb-1">
          Hãng sản xuất
        </label>
        <input
          type="text"
          placeholder="VD: VinFast, Toyota, Honda..."
          value={formData.brand}
          onChange={(e) => onChange("brand", e.target.value)}
          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Màu sắc */}
      <div>
        <label className="block text-2xs font-semibold text-slate-500 mb-1">
          Màu sơn xe
        </label>
        <input
          type="text"
          placeholder="VD: Trắng, Đen, Xanh cửu long..."
          value={formData.color}
          onChange={(e) => onChange("color", e.target.value)}
          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Khách hàng / Chủ xe Combobox */}
      {customerCombobox}

      {/* Vị trí đỗ xe - Thông tin hệ thống tự động phân bổ */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold text-slate-700">Vị trí đỗ xe hiện tại:</span>
          <span
            className={`text-xs font-bold ${
              formData.parkingSlotCode ? "text-emerald-700" : "text-slate-500 font-normal"
            }`}
          >
            {formData.parkingSlotCode || AUTO_ASSIGN_SLOT_NOTE}
          </span>
        </div>
        <p className="text-2xs text-slate-500 mt-1">
          {formData.parkingSlotCode
            ? "Vị trí được đồng bộ tự động theo phiên đỗ thực tế trong bãi hoặc vé cố định."
            : "Vị trí đỗ sẽ được tự động đồng bộ khi xe quét biển số check-in vào cổng bãi."}
        </p>
      </div>

      {/* Ghi chú */}
      <div className="sm:col-span-2">
        <label className="block text-2xs font-semibold text-slate-500 mb-1">
          Ghi chú
        </label>
        <textarea
          rows={2}
          placeholder="Thông tin lưu ý thêm cho phương tiện..."
          value={formData.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
}
