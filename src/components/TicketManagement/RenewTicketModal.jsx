import { useState, useEffect, useMemo } from "react";
import { BaseModal } from "../common/modal";
import { FormInput, FormSelect, SearchableCombobox, Button } from "../common";
import { mockParkingFloors } from "../../mocks/parkingLotData";

export default function RenewTicketModal({ isOpen, onClose, ticket, onConfirm }) {
  const [ticketType, setTicketType] = useState(ticket?.ticketType || "Vé tháng");
  const [slot, setSlot] = useState(ticket?.slotLocation || "");
  const [newEndDate, setNewEndDate] = useState("2026-12-07");
  const [renewPrice, setRenewPrice] = useState("500000");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (ticket) {
      setTicketType(ticket.ticketType || "Vé tháng");
      setSlot(ticket.slotLocation || "");
    }
  }, [ticket]);

  // Danh sách vị trí đỗ xe dạng SearchableCombobox
  const parkingSlotOptions = useMemo(() => {
    const options = [
      {
        value: ticket?.slotLocation || "",
        label: `${ticket?.slotLocation || "Vị trí hiện tại"} (Giữ nguyên)`,
        badge: "Hiện tại",
        subLabel: "Không thay đổi vị trí đỗ",
      },
    ];

    mockParkingFloors.forEach((floor) => {
      (floor.zones || []).forEach((zone) => {
        (zone.slots || []).forEach((s) => {
          const val = `${floor.floorName} - ${s.slotId}`;
          if (val !== ticket?.slotLocation) {
            const typeName =
              s.type === "EV_CHARGING"
                ? "Sạc điện"
                : s.type === "RESERVED"
                ? "Ưu tiên"
                : "Tiêu chuẩn";
            options.push({
              value: val,
              label: `${floor.floorName} - Ô ${s.slotId}`,
              badge: typeName,
              subLabel: `${zone.zoneName}`,
            });
          }
        });
      });
    });

    return options;
  }, [ticket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onConfirm) {
      onConfirm({
        ticketId: ticket?.ticketCode,
        newTicketType: ticketType,
        newSlot: slot,
        newEndDate,
        renewPrice,
        note,
      });
    }
    onClose();
  };

  const TICKET_TYPE_OPTIONS = [
    { value: "Vé ngày", label: "Vé ngày" },
    { value: "Vé tháng", label: "Vé tháng" },
    { value: "Vé quý", label: "Vé quý" },
    { value: "Vé năm", label: "Vé năm" },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Gia hạn vé"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <FormInput
          label="Mã vé"
          readOnly
          disabled
          value={ticket ? `${ticket.ticketCode} - ${ticket.licensePlate}` : ""}
          className="font-mono font-semibold"
        />

        <FormSelect
          label="Loại vé mới"
          value={ticketType}
          onChange={(e) => setTicketType(e.target.value)}
          options={TICKET_TYPE_OPTIONS}
          placeholder=""
          required
        />

        <SearchableCombobox
          label="Vị trí đỗ xe mới"
          options={parkingSlotOptions}
          value={slot}
          onChange={(val) => setSlot(val)}
          placeholder="Tìm theo tầng, khu, mã ô..."
          emptyText="Không tìm thấy vị trí đỗ nào"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormInput
            type="date"
            label="Ngày hết hạn mới"
            value={newEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
            required
          />

          <FormInput
            type="number"
            label="Giá gia hạn (VNĐ)"
            value={renewPrice}
            onChange={(e) => setRenewPrice(e.target.value)}
            className="font-mono"
            required
          />
        </div>

        <FormInput
          label="Ghi chú"
          placeholder="Nhập ghi chú gia hạn..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary">
            Xác nhận gia hạn
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
