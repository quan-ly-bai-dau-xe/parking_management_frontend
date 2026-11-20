import { useState, useEffect, useMemo } from "react";
import BaseModal from "../common/modal/BaseModal";
import Button from "../common/button/Button";
import { customerService } from "../../services/customerService";
import { vehicleService } from "../../services/vehicleService";
import { VehicleFormSchema } from "../../schemas/vehicleSchema";
import CustomerSelectCombobox from "./CustomerSelectCombobox";

const DEFAULT_VEHICLE_TYPES = [
  { id: 1, code: "CAR", name: "Ô tô (Xăng / Dầu)" },
  { id: 2, code: "EV", name: "Xe điện (EV)" },
];

const INITIAL_FORM = {
  licensePlate: "",
  vehicleTypeId: 1,
  vehicleType: "CAR",
  brand: "",
  model: "",
  color: "",
  customerId: "",
  customerName: "",
  customerPhone: "",
  notes: "",
};

/**
 * AddVehicleModal
 * Modal chuyên dụng cho việc Đăng ký thêm xe mới vào hệ thống:
 * - Tự động tải danh sách loại xe từ Backend (/api/v1/vehicle-types/)
 * - Tự động tải danh sách khách hàng để chọn chủ sở hữu
 * - Thẩm định biển số xe chuẩn Việt Nam
 * - Đảm bảo gửi payload chuẩn CSDL
 */
export default function AddVehicleModal({
  isOpen,
  onClose,
  onSave,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [vehicleTypes, setVehicleTypes] = useState(DEFAULT_VEHICLE_TYPES);
  const [customers, setCustomers] = useState([]);
  const [formError, setFormError] = useState("");

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM);
      setFormError("");

      // Tải loại xe
      vehicleService
        .getTypes()
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.results || [];
          if (list.length > 0) setVehicleTypes(list);
        })
        .catch(() => setVehicleTypes(DEFAULT_VEHICLE_TYPES));

      // Tải danh sách khách hàng
      customerService
        .getCustomers()
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.results || [];
          setCustomers(list);
        })
        .catch((err) => console.warn("Could not load customers:", err));
    }
  }, [isOpen]);

  const selectedCustomer = useMemo(() => {
    if (!formData.customerId) return null;
    return (
      customers.find(
        (c) =>
          String(c.id) === String(formData.customerId) ||
          String(c.customerCode) === String(formData.customerId) ||
          String(c.code) === String(formData.customerId)
      ) || null
    );
  }, [customers, formData.customerId]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError("");
  };

  const handleSelectCustomer = (customer) => {
    if (!customer) {
      setFormData((prev) => ({
        ...prev,
        customerId: "",
        customerName: "",
        customerPhone: "",
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name || customer.full_name || "",
      customerPhone: customer.phone || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    const plate = formData.licensePlate.trim().toUpperCase();
    if (!plate) {
      setFormError("Vui lòng nhập biển số xe.");
      return;
    }

    // Kiểm tra định dạng sơ bộ Zod schema
    const validation = VehicleFormSchema.safeParse({
      ...formData,
      licensePlate: plate,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || "Biển số xe không đúng định dạng.";
      setFormError(firstIssue);
      return;
    }

    if (!formData.customerId) {
      setFormError("Vui lòng chọn khách hàng (chủ sở hữu) cho phương tiện.");
      return;
    }

    const payload = {
      id: "NEW",
      licensePlate: plate,
      license_plate: plate,
      model: (formData.model || "").trim() || "Ô tô",
      model_name: (formData.model || "").trim() || "Ô tô",
      brand: (formData.brand || "").trim(),
      color: (formData.color || "").trim(),
      vehicleTypeId: Number(formData.vehicleTypeId || 1),
      vehicle_type_id: Number(formData.vehicleTypeId || 1),
      vehicleTypeCode: Number(formData.vehicleTypeId) === 2 ? "EV" : "CAR",
      customerId: Number(formData.customerId),
      customer_id: Number(formData.customerId),
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customer: selectedCustomer || {
        id: formData.customerId,
        name: formData.customerName,
        phone: formData.customerPhone,
      },
      notes: (formData.notes || "").trim(),
      note: (formData.notes || "").trim(),
      status: "active",
      parkingSlot: { display: "Chưa vào bãi", slot: "" },
      ticket: { type: "Vé lượt", status: "active", remainingDays: 0 },
    };

    onSave(payload);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm phương tiện mới"
      description="Đăng ký hồ sơ phương tiện vào hệ thống và liên kết với chủ sở hữu"
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <span className="font-bold">⚠️</span>
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Biển số xe */}
          <div>
            <label className="block text-2xs font-semibold text-slate-700 mb-1">
              Biển số xe <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: 51K-992.14 hoặc 30H-123.45"
              value={formData.licensePlate}
              onChange={(e) => handleChange("licensePlate", e.target.value.toUpperCase())}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono font-bold"
              required
              autoFocus
            />
            <span className="text-2xs text-slate-400 mt-1 block">
              Quy chuẩn: 51K-992.14, 30H-123.45 (mã tỉnh + seri + số)
            </span>
          </div>

          {/* Loại xe */}
          <div>
            <label className="block text-2xs font-semibold text-slate-700 mb-1">
              Loại phương tiện <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.vehicleTypeId}
              onChange={(e) => {
                const id = Number(e.target.value);
                const matched = vehicleTypes.find((t) => t.id === id);
                setFormData((prev) => ({
                  ...prev,
                  vehicleTypeId: id,
                  vehicleType: matched ? matched.code : "CAR",
                }));
              }}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {vehicleTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
            <span className="text-2xs text-slate-400 mt-1 block">
              Phân loại phục vụ cấp phát slot ô đỗ & trạm sạc điện
            </span>
          </div>

          {/* Mẫu xe (Model) */}
          <div>
            <label className="block text-2xs font-semibold text-slate-700 mb-1">
              Dòng xe (Model)
            </label>
            <input
              type="text"
              placeholder="VD: VF8, Camry, CX-5, SantaFe..."
              value={formData.model}
              onChange={(e) => handleChange("model", e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Hãng xe */}
          <div>
            <label className="block text-2xs font-semibold text-slate-700 mb-1">
              Hãng sản xuất
            </label>
            <input
              type="text"
              placeholder="VD: VinFast, Toyota, Mazda, Hyundai..."
              value={formData.brand}
              onChange={(e) => handleChange("brand", e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Màu sắc */}
          <div>
            <label className="block text-2xs font-semibold text-slate-700 mb-1">
              Màu sơn xe
            </label>
            <input
              type="text"
              placeholder="VD: Trắng ngọc trai, Đen, Xanh..."
              value={formData.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Khách hàng / Chủ sở hữu */}
          <CustomerSelectCombobox
            customers={customers}
            selectedCustomer={selectedCustomer}
            isAddingNew={true}
            onSelectCustomer={handleSelectCustomer}
          />

          {/* Ghi chú */}
          <div className="sm:col-span-2">
            <label className="block text-2xs font-semibold text-slate-700 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              placeholder="Thông tin lưu ý thêm cho phương tiện (nếu có)..."
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Chú thích thông minh */}
        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-2xs text-blue-800 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <span>ℹ️</span> Quy trình tự động hóa bãi đỗ:
          </div>
          <p className="text-slate-600">
            • Sau khi thêm, xe sẽ sẵn sàng nhận diện tự động qua Camera tại làn ra/vào.
          </p>
          <p className="text-slate-600">
            • Vị trí ô đỗ sẽ được cấp phát linh hoạt khi xe quét biển số check-in hoặc đăng ký vé cố định.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={isSubmitting}
          >
            Xác nhận thêm xe
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}

