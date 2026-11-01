import { useState } from "react";
import { BaseModal } from "../common/modal";

const ROLE_OPTIONS = [
  "Quản lý",
  "Nhân viên vận hành",
  "Nhân viên thu ngân",
  "Kỹ thuật viên",
];

const TONE_OPTIONS = [
  { value: "indigo", label: "Chàm (Indigo)" },
  { value: "blue", label: "Xanh dương (Blue)" },
  { value: "pink", label: "Hồng (Pink)" },
  { value: "amber", label: "Hổ phách (Amber)" },
  { value: "emerald", label: "Xanh lục (Emerald)" },
  { value: "cyan", label: "Xanh ngọc (Cyan)" },
  { value: "violet", label: "Tím (Violet)" },
  { value: "rose", label: "Đỏ hồng (Rose)" },
];

function EmployeeModalContent({ onClose, employee, onSave }) {
  const isEditing = Boolean(employee && employee.id);

  const [formData, setFormData] = useState(() => ({
    id: employee?.id || "",
    name: employee?.name || "",
    email: employee?.email || "",
    phone: employee?.phone || "",
    role: employee?.role || "Nhân viên vận hành",
    area: employee?.area || "",
    city: employee?.city || "Đà Nẵng",
    status: employee?.status || "active",
    tone: employee?.tone || "blue",
  }));

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Họ và tên không được để trống";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Email không hợp lệ";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Số điện thoại không được để trống";
    }
    if (!formData.area.trim()) {
      newErrors.area = "Khu vực không được để trống";
    }
    if (!formData.city.trim()) {
      newErrors.city = "Tỉnh/Thành phố không được để trống";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      ...formData,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      area: formData.area.trim(),
      city: formData.city.trim(),
    });
    onClose();
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}
      description={
        isEditing
          ? "Cập nhật thông tin nhân sự trong hệ thống."
          : "Điền đầy đủ thông tin để tạo hồ sơ nhân viên mới."
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ví dụ: Nguyễn Văn A"
                className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-700 outline-none transition-colors ${
                  errors.name
                    ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                    : "border-slate-200 focus:border-blue-500"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-[11px] text-rose-500">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@smartpark.vn"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-700 outline-none transition-colors ${
                    errors.email
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                      : "border-slate-200 focus:border-blue-500"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-[11px] text-rose-500">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0905 xxx xxx"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-700 outline-none transition-colors ${
                    errors.phone
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                      : "border-slate-200 focus:border-blue-500"
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-[11px] text-rose-500">{errors.phone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chức vụ <span className="text-rose-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 outline-none focus:border-blue-500 bg-white"
                >
                  {ROLE_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Màu đại diện
                </label>
                <select
                  name="tone"
                  value={formData.tone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 outline-none focus:border-blue-500 bg-white"
                >
                  {TONE_OPTIONS.map((tone) => (
                    <option key={tone.value} value={tone.value}>
                      {tone.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khu vực <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Ví dụ: Hải Châu, Quận 1..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-700 outline-none transition-colors ${
                    errors.area
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                      : "border-slate-200 focus:border-blue-500"
                  }`}
                />
                {errors.area && (
                  <p className="mt-1 text-[11px] text-rose-500">{errors.area}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tỉnh / Thành phố <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Ví dụ: Đà Nẵng, Hồ Chí Minh..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-700 outline-none transition-colors ${
                    errors.city
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                      : "border-slate-200 focus:border-blue-500"
                  }`}
                />
                {errors.city && (
                  <p className="mt-1 text-[11px] text-rose-500">{errors.city}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trạng thái
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 outline-none focus:border-blue-500 bg-white"
              >
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              {isEditing ? "Lưu thay đổi" : "Thêm nhân viên"}
            </button>
          </div>
        </form>
    </BaseModal>
  );
}

export default function EmployeeModal({ isOpen, onClose, employee, onSave }) {
  if (!isOpen) return null;

  return (
    <EmployeeModalContent
      key={employee?.id || "new"}
      onClose={onClose}
      employee={employee}
      onSave={onSave}
    />
  );
}
