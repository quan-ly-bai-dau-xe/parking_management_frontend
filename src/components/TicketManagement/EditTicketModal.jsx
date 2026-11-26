import { useState, useMemo } from "react";
import { BaseModal } from "../common/modal";
import { FormInput, FormSelect, Button } from "../common";

function EditTicketForm({
  ticket,
  onConfirmUpdate,
  ticketTypes = [],
  loading = false,
  onClose,
}) {
  const initialDate = useMemo(() => {
    if (ticket?.effectiveTo) {
      const d = new Date(ticket.effectiveTo);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }
    return "";
  }, [ticket]);

  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState(
    ticket?.ticketTypeId ? String(ticket.ticketTypeId) : ""
  );
  const [newEndDate, setNewEndDate] = useState(initialDate);
  const [price, setPrice] = useState(
    ticket?.rawPrice != null ? String(ticket.rawPrice) : ""
  );
  const [notes, setNotes] = useState(ticket?.notes || "");
  const [errorMsg, setErrorMsg] = useState("");

  const typeOptions = useMemo(() => {
    if (ticketTypes.length > 0) {
      return ticketTypes.map((t) => ({
        value: String(t.id),
        label: `${t.name} (${t.code})`,
      }));
    }
    return [
      { value: "1", label: "Vé ngày (DAILY)" },
      { value: "2", label: "Vé tháng (MONTHLY)" },
      { value: "3", label: "Vé quý (QUARTERLY)" },
      { value: "4", label: "Vé năm (YEARLY)" },
    ];
  }, [ticketTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!ticket) return;

    if (newEndDate && ticket.effectiveTo) {
      const oldTime = new Date(ticket.effectiveTo).getTime();
      const newTime = new Date(`${newEndDate}T23:59:59Z`).getTime();
      if (newTime <= oldTime) {
        setErrorMsg("Ngày hết hạn mới phải lớn hơn ngày kết thúc hiện tại của vé.");
        return;
      }
    }

    const payload = {
      row_version: ticket.row_version,
      notes: notes.trim(),
    };

    if (newEndDate) {
      payload.effective_to = new Date(`${newEndDate}T23:59:59Z`).toISOString();
    }
    if (selectedTicketTypeId) {
      payload.ticket_type_id = parseInt(selectedTicketTypeId, 10);
    }
    if (price !== "" && !isNaN(Number(price))) {
      payload.price = parseFloat(price);
    }

    try {
      if (onConfirmUpdate) {
        await onConfirmUpdate(ticket.code || ticket.id, payload);
      }
      onClose();
    } catch (err) {
      if (err?.status === 409 || err?.data?.code === "PROP-4.6.3-P03") {
        setErrorMsg("Dữ liệu vé đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.");
      } else {
        setErrorMsg(err?.data?.message || err?.message || "Cập nhật vé thất bại.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Thông tin cố định (Read-only) theo SRS 4.6.3 */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 text-xs">
        <p className="font-semibold text-slate-700 text-2xs uppercase tracking-wider mb-1">
          Thông tin cố định (Không được phép sửa)
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div>
            <span className="text-slate-500">Mã vé:</span>{" "}
            <span className="font-bold text-slate-900 font-mono">
              {ticket?.ticketCode}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Biển số xe:</span>{" "}
            <span className="font-bold text-slate-900 font-mono">
              {ticket?.licensePlate}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Khách hàng:</span>{" "}
            <span className="font-medium text-slate-800">
              {ticket?.customerName} ({ticket?.customerCode})
            </span>
          </div>
          <div>
            <span className="text-slate-500">Số điện thoại:</span>{" "}
            <span className="font-medium text-slate-800">
              {ticket?.customerPhone}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Ngày bắt đầu:</span>{" "}
            <span className="font-medium text-slate-800">
              {ticket?.startDate}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Hết hạn hiện tại:</span>{" "}
            <span className="font-semibold text-amber-700">
              {ticket?.endDate}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">Vị trí đỗ hiện tại:</span>{" "}
            <span className="font-medium text-slate-800">
              {ticket?.slotLocation}
            </span>
          </div>
        </div>
      </div>

      {/* Các trường cho phép chỉnh sửa */}
      <div className="space-y-3 pt-1">
        <FormSelect
          label="Loại vé mới"
          value={selectedTicketTypeId}
          onChange={(e) => setSelectedTicketTypeId(e.target.value)}
          options={typeOptions}
          placeholder="Chọn loại vé mới"
        />

        <FormInput
          label="Ngày hết hạn mới (Gia hạn)"
          type="date"
          value={newEndDate}
          onChange={(e) => setNewEndDate(e.target.value)}
          helperText="Quy tắc SRS 4.6.3: Ngày hết hạn mới phải lớn hơn ngày hết hạn cũ."
          required
        />

        <FormInput
          label="Giá vé (VNĐ)"
          type="number"
          min="0"
          step="1000"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Ví dụ: 500000"
        />

        <FormInput
          label="Ghi chú điều chỉnh"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Lý do điều chỉnh hoặc gia hạn vé..."
        />
      </div>

      {/* Nút hành động */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
        <Button variant="secondary" size="md" type="button" className="min-h-[44px]" onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button variant="primary" size="md" type="submit" className="min-h-[44px]" loading={loading}>
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}

/**
 * Modal Chỉnh sửa vé / Gia hạn vé (SRS 4.6.3).
 */
export default function EditTicketModal({
  isOpen,
  onClose,
  ticket,
  onConfirmUpdate,
  ticketTypes = [],
  loading = false,
}) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      isBusy={loading}
      title="Chỉnh sửa vé đỗ xe"
      size="lg"
    >
      {ticket ? (
        <EditTicketForm
          key={ticket.id || ticket.ticketCode}
          ticket={ticket}
          onConfirmUpdate={onConfirmUpdate}
          ticketTypes={ticketTypes}
          loading={loading}
          onClose={onClose}
        />
      ) : null}
    </BaseModal>
  );
}
