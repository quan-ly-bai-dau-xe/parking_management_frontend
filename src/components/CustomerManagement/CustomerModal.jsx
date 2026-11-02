import { Button } from "../common";
import { BaseModal } from "../common/modal";

export default function CustomerModal({
  isOpen,
  onClose,
  editingCustomerId,
  customerData,
  onChange,
  onSubmit,
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
              Mã khách hàng
            </label>
            <input
              required
              value={customerData.customerCode}
              onChange={(e) => onChange("customerCode", e.target.value)}
              placeholder="Nhập mã khách hàng..."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Tên khách hàng
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
              Số điện thoại
            </label>
            <input
              required
              value={customerData.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="Nhập số điện thoại..."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Số CCCD
            </label>
            <input
              required
              value={customerData.idNumber}
              onChange={(e) => onChange("idNumber", e.target.value)}
              placeholder="Nhập số CCCD..."
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
              placeholder="dd/mm/yyyy"
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
              placeholder="Nhập email..."
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Giới tính
            </label>
            <select
              value={customerData.gender}
              onChange={(e) => onChange("gender", e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-2xs font-semibold text-slate-600">
              Gói thuê bao
            </label>
            <select
              value={customerData.packageType || "Gói tháng"}
              onChange={(e) => onChange("packageType", e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="Gói tháng">Gói tháng</option>
              <option value="Gói quý">Gói quý</option>
              <option value="Gói năm">Gói năm</option>
              <option value="Vãng lai">Vãng lai</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-2xs font-semibold text-slate-600">
              Trạng thái
            </label>
            <select
              value={customerData.status || "Đang hoạt động"}
              onChange={(e) => onChange("status", e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="Đang hoạt động">Đang hoạt động</option>
              <option value="Sắp hết hạn">Sắp hết hạn</option>
              <option value="Tạm khóa">Tạm khóa</option>
              <option value="Hết hạn">Hết hạn</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
          >
            {editingCustomerId ? "Cập nhật" : "Lưu khách hàng"}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
