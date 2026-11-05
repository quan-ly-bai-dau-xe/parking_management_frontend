import React from "react";
import ConfirmModal from "../common/modal/ConfirmModal";
import { TICKET_DELETE_MESSAGES } from "../../constants/ticketConstants";

/**
 * DeleteTicketModal
 * Modal Safe Delete chuyên dụng cho Quản lý vé (DEL-04 Database Guards):
 * 1. Chặn xóa vé chưa hết hạn (PROP-4.6.4-P01)
 * 2. Chặn xóa vé đã được gia hạn (PROP-4.6.4-P02)
 * 3. Chặn xóa vé có xe đang đỗ trong bãi (PROP-DEL-04-OPEN-SES)
 * 4. Xác nhận xóa mềm cho vé hợp lệ (đã hết hạn)
 */
export default function DeleteTicketModal({
  isOpen,
  onClose,
  ticket,
  onConfirmDelete,
  loading = false,
}) {
  if (!ticket) return null;

  // 1. Kiểm tra guard DEL-04
  const isParked = Boolean(ticket.isParked || ticket.hasOpenSession);
  const isRenewed = ticket.status === "renewing" || ticket.status === "renewed" || Boolean(ticket.renewedCount);
  const isActive = ticket.status === "active" || ticket.status === "expiring";

  // Xác định lý do bị chặn (nếu có)
  let blockReason = null;
  let blockTitle = TICKET_DELETE_MESSAGES.TITLE_BLOCKED;

  if (isParked) {
    blockReason = TICKET_DELETE_MESSAGES.PARKED_VEHICLE;
  } else if (isRenewed) {
    blockReason = TICKET_DELETE_MESSAGES.RENEWED_TICKET;
  } else if (isActive) {
    blockReason = TICKET_DELETE_MESSAGES.ACTIVE_UNEXPIRED;
  }

  // TRƯỜNG HỢP 1: Bị chặn bởi Guard DEL-04
  if (blockReason) {
    return (
      <ConfirmModal
        isOpen={isOpen}
        onClose={onClose}
        title={blockTitle}
        description="Rào chắn toàn vẹn dữ liệu hợp đồng vé & an toàn bãi xe (DEL-04)"
        variant="warning"
        confirmText="Đã hiểu"
        showCloseButton={true}
        onConfirm={onClose}
      >
        <div className="space-y-3 text-sm text-slate-600">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium leading-relaxed">
            {blockReason}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5 border border-slate-100">
            <p>
              Mã vé: <span className="font-bold text-slate-900 font-mono">{ticket.ticketCode}</span>
            </p>
            <p>
              Biển số xe: <span className="font-semibold text-slate-800 font-mono">{ticket.licensePlate}</span>
            </p>
            <p>
              Khách hàng: <span className="font-medium text-slate-800">{ticket.customerCode}</span>
            </p>
            <p>
              Thời hạn hiệu lực:{" "}
              <span className="font-semibold text-slate-800 font-mono">
                {ticket.startDate} - {ticket.endDate}
              </span>
            </p>
            <p>
              Trạng thái vé:{" "}
              <span className="font-semibold text-blue-600">
                {ticket.statusText || ticket.status}
              </span>
            </p>
          </div>

          <p className="text-xs text-slate-500 italic">
            * Theo quy định nghiệp vụ SRS 4.6.4 & Quyết định TL-25: Chỉ cho phép người quản lý xóa vé đã quá hạn sử dụng, không gia hạn và xe không còn đỗ trong bãi.
          </p>
        </div>
      </ConfirmModal>
    );
  }

  // TRƯỜNG HỢP 2: Vé hợp lệ để xóa mềm (Expired / Cancelled)
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      title={TICKET_DELETE_MESSAGES.TITLE_CONFIRM}
      description={TICKET_DELETE_MESSAGES.DESC_CONFIRM}
      variant="error"
      confirmText="Xác nhận xóa vé"
      cancelText="Hủy"
      loading={loading}
      onConfirm={() => onConfirmDelete(ticket)}
      showCloseButton={true}
    >
      <div className="space-y-3 text-sm text-slate-600">
        <p className="font-medium text-slate-800">{TICKET_DELETE_MESSAGES.CONFIRM_QUESTION}</p>

        <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5 border border-slate-100">
          <p>
            Mã vé: <span className="font-bold text-slate-900 font-mono">{ticket.ticketCode}</span>
          </p>
          <p>
            Biển số: <span className="font-semibold text-slate-800 font-mono">{ticket.licensePlate}</span>
          </p>
          <p>
            Khách hàng: <span className="font-medium text-slate-800">{ticket.customerCode}</span>
          </p>
          <p>
            Loại vé: <span className="font-semibold text-slate-800">{ticket.ticketType}</span>
          </p>
          <p>
            Ngày hết hạn: <span className="font-semibold text-red-600 font-mono">{ticket.endDate}</span>
          </p>
        </div>

        <p className="text-xs text-slate-500 italic leading-relaxed">
          {TICKET_DELETE_MESSAGES.ACCOUNTING_NOTE}
        </p>
      </div>
    </ConfirmModal>
  );
}
