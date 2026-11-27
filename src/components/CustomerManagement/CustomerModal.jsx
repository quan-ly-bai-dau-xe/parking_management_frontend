import { Button } from "../common";
import { BaseModal } from "../common/modal";
import {
  TICKET_PACKAGE_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  GENDER_OPTIONS,
} from "../../constants/customerConstants";
import { maskDateInput, isValidDateFormat } from "../../utils/dateUtils";

export default function CustomerModal({
  isOpen,
  onClose,
  editingCustomerId,
  customerData,
  onChange,
  onSubmit,
  isSubmitting = false,
}) {
  const birthdayVal = customerData.birthday || "";
  const isBirthdayEmpty = !birthdayVal.trim();
  const isBirthdayValid = isBirthdayEmpty || isValidDateFormat(birthdayVal);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!isBirthdayValid) return;
    onSubmit(e);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      isBusy={isSubmitting}
      title={editingCustomerId ? "Sửa thông tin khách hàng" : "Thêm khách hàng mới"}
      size="lg"
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {editingCustomerId && (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-2xs font-semibold text-slate-600">
                Mã khách hàng
              </label>
              <input
                value={customerData.customerCode}
                disabled
                className="h-9 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs text-slate-700 outline-none cursor-not-allowed"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Tên khách hàng <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={customerData.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Nhập tên khách hàng..."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={customerData.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="Nhập số điện thoại (vd: 0905123456)..."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Số CCCD/CMND <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={customerData.idNumber}
              onChange={(e) => onChange("idNumber", e.target.value)}
              placeholder="Nhập 9-12 chữ số CCCD..."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Ngày sinh
            </label>
            <input
              value={birthdayVal}
              onChange={(e) => onChange("birthday", maskDateInput(e.target.value))}
              placeholder="dd/mm/yyyy (ví dụ: 15/08/1995)"
              maxLength={10}
              className={`h-9 w-full rounded-lg border px-3 text-xs outline-none transition-colors ${
                !isBirthdayValid
                  ? "border-red-400 bg-red-50/20 text-red-900 focus:border-red-500"
                  : "border-slate-300 bg-white text-slate-700 focus:border-blue-500"
              }`}
            />
            {!isBirthdayValid ? (
              <span className="text-[11px] text-red-500 font-medium">
                Ngày sinh không hợp lệ. Vui lòng nhập chuẩn dd/mm/yyyy (ví dụ: 15/08/1995).
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Định dạng chuẩn: dd/mm/yyyy
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Email
            </label>
            <input
              type="email"
              value={customerData.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="Nhập email (vd: user@example.com)..."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Giới tính
            </label>
            <select
              value={customerData.gender || "Nam"}
              onChange={(e) => onChange("gender", e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Gói vé đăng ký
            </label>
            <select
              value={customerData.packageType || "Vé tháng"}
              onChange={(e) => onChange("packageType", e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            >
              {TICKET_PACKAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-2xs font-semibold text-slate-600">
              Trạng thái tài khoản
            </label>
            <select
              value={customerData.status || "ACTIVE"}
              onChange={(e) => onChange("status", e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            >
              {CUSTOMER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
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
            disabled={isSubmitting || !isBirthdayValid}
          >
            {isSubmitting ? "Đang xử lý..." : editingCustomerId ? "Cập nhật" : "Lưu khách hàng"}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
