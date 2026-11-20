import { useState, useMemo } from "react";
import { BaseModal } from "../common/modal";
import { EMPLOYEE_ROLE_TITLES } from "../../constants/roleConstants";
import { useCurrentUser } from "../../hooks/useCurrentUser";

const ROLE_OPTIONS = EMPLOYEE_ROLE_TITLES;

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

function EmployeeModalContent({ onClose, employee, onSave, positions = [] }) {
  const { isManager } = useCurrentUser();
  const isEditing = Boolean(employee && employee.id);
  const roleList = positions.length > 0 ? positions.map((p) => p.name) : ROLE_OPTIONS;

  // Khóa lạm quyền RBAC: Chỉ Manager mới có quyền bổ nhiệm hoặc sửa người có chức vụ "Quản lý"
  const allowedRoleOptions = useMemo(() => {
    const base = roleList;
    if (isManager) return base;
    return base.filter((item) => item !== "Quản lý");
  }, [isManager, roleList]);

  const [formData, setFormData] = useState(() => ({
    id: employee?.id ?? "",
    backendId: employee?.backendId || (typeof employee?.id === "number" ? employee.id : null),
    name: employee?.name ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    password: "",
    role: employee?.role ?? "",
    area: typeof employee?.area === "string" ? employee.area : (employee?.area?.district_name || ""),
    city: typeof employee?.city === "string" ? employee.city : (employee?.area?.province_name || "Đà Nẵng"),
    status: employee?.status ?? (isEditing ? "" : "active"),
    tone: employee?.tone ?? "blue",
    rowVersion: employee?.rowVersion || 1,
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
    if (!formData.role.trim()) {
      newErrors.role = "Vui lòng chọn vai trò/chức danh";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    await onSave({
      ...formData,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password ? formData.password.trim() : undefined,
      area: formData.area.trim(),
      city: formData.city.trim(),
    });
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
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs text-slate-700 outline-none focus:border-blue-500 bg-white ${
                    errors.role ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
                  }`}
                >
                  <option value="">-- Chọn chức vụ nhân viên --</option>
                  {allowedRoleOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                {!isManager && (
                  <p className="text-3xs text-amber-600 mt-1">
                    * Chỉ Quản lý mới có quyền phân bổ chức danh Quản lý.
                  </p>
                )}
                {errors.role && (
                  <p className="text-2xs text-rose-500 mt-1 font-medium">{errors.role}</p>
                )}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isEditing ? "Mật khẩu mới (Tùy chọn)" : "Mật khẩu đăng nhập"}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isEditing ? "Để trống nếu không đổi" : "SmartPark@2026 (Mặc định)"}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {isEditing ? "Nhập mật khẩu mới nếu cần đổi mật khẩu nhân viên." : "Mặc định là SmartPark@2026 nếu để trống."}
                </p>
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
                <p className="mt-1 text-[11px] text-slate-400">
                  Nhân viên không hoạt động sẽ bị khóa quyền đăng nhập.
                </p>
              </div>
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

export default function EmployeeModal({ isOpen, onClose, employee, onSave, positions }) {
  if (!isOpen) return null;

  return (
    <EmployeeModalContent
      key={employee?.id || "new"}
      onClose={onClose}
      employee={employee}
      onSave={onSave}
      positions={positions}
    />
  );
}
