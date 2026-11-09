import { Button } from "../common";
import { BaseModal } from "../common/modal";
import {
  TICKET_PACKAGE_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  GENDER_OPTIONS,
} from "../../constants/customerConstants";

export default function CustomerModal({
  isOpen,
  onClose,
  editingCustomerId,
  customerData,
  onChange,
  onSubmit,
  isSubmitting = false,
}) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCustomerId ? "Sửa thông tin khách hàng" : "Thêm khách hàng mới"}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Mã khách hàng {editingCustomerId ? "" : "(Để trống hệ thống tự sinh)"}
            </label>
            <input
              value={customerData.customerCode}
              onChange={(e) => onChange("customerCode", e.target.value)}
              placeholder={editingCustomerId ? "Mã khách hàng" : "Để trống hoặc nhập KHxxxx..."}
              disabled={Boolean(editingCustomerId)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

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
              value={customerData.birthday}
              onChange={(e) => onChange("birthday", e.target.value)}
              placeholder="dd/mm/yyyy (hoặc yyyy-mm-dd)"
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
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
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang xử lý..." : editingCustomerId ? "Cập nhật" : "Lưu khách hàng"}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
