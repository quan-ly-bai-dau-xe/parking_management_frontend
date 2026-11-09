import React from "react";
import { ConfirmModal } from "../common";
import DeleteBlockedModal from "./DeleteBlockedModal";

export default function CustomerDeleteModals({
  customerToDelete,
  onCloseDelete,
  isDeleting,
  onConfirmDelete,
  customerBlockedFromDelete,
  onCloseBlocked,
}) {
  return (
    <>
      <ConfirmModal
        isOpen={Boolean(customerToDelete)}
        onClose={onCloseDelete}
        title="Xác nhận xóa khách hàng"
        variant="error"
        loading={isDeleting}
        confirmText="Xóa khách hàng"
        cancelText="Hủy"
        onConfirm={onConfirmDelete}
      >
        <div className="space-y-2">
          <p>
            Bạn có chắc chắn muốn xóa khách hàng{" "}
            <span className="font-bold text-slate-900">{customerToDelete?.name}</span> (Mã:{" "}
            <span className="font-mono font-semibold">{customerToDelete?.customerCode}</span>)?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Lưu ý quy tắc an toàn DEL-02:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-2xs text-amber-700">
              <li>Khách hàng không được sở hữu bất kỳ phương tiện nào còn hoạt động trong hệ thống.</li>
              <li>Khách hàng không có vé gửi xe hoặc phiên đỗ còn hiệu lực.</li>
            </ul>
          </div>
        </div>
      </ConfirmModal>

      <DeleteBlockedModal
        isOpen={Boolean(customerBlockedFromDelete)}
        onClose={onCloseBlocked}
        customer={customerBlockedFromDelete}
      />
    </>
  );
}
