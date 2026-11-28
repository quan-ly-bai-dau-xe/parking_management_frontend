import { useState, useEffect, useMemo } from "react";
import { BaseModal } from "../common/modal";
import { FormInput, FormSelect, SearchableCombobox, Button } from "../common";
import { parkingLotService } from "../../services/parkingLotService";
import {
  calculateAutoRenewPrice,
  computeDefaultRenewalValues,
  DEFAULT_TICKET_TYPE_NAME,
  diffDaysIsoDate,
  getRenewalBaseDateIso,
  getTicketOldEndDateIso,
  MIN_RENEW_PRICE_VND,
  resolveTicketTypeMeta,
  validateRenewTicketForm,
} from "../../utils/ticket/renewTicketUtils";

const TICKET_TYPE_OPTIONS = [
  { value: "Vé ngày", label: "Vé ngày" },
  { value: "Vé tháng", label: "Vé tháng" },
  { value: "Vé quý", label: "Vé quý" },
  { value: "Vé năm", label: "Vé năm" },
];

function RenewTicketModalContent({ onClose, ticket, onConfirm }) {
  const initialType = ticket?.ticketType || DEFAULT_TICKET_TYPE_NAME;
  const initialDefaults = computeDefaultRenewalValues(ticket, initialType);

  const [ticketType, setTicketType] = useState(initialType);
  const [slot, setSlot] = useState(ticket?.slotLocation || "");
  const [newEndDate, setNewEndDate] = useState(initialDefaults.newEndDate);
  const [renewPrice, setRenewPrice] = useState(initialDefaults.renewPrice);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [parkingFloors, setParkingFloors] = useState([]);

  useEffect(() => {
    let isMounted = true;
    parkingLotService.getParkingStructure()
      .then((res) => {
        if (!isMounted) return;
        const floors = Array.isArray(res) ? res : res?.floors || [];
        setParkingFloors(floors);
      })
      .catch((err) => {
        console.warn("[RenewTicketModal] Không thể tải sơ đồ bãi xe:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const baseDateIso = useMemo(() => getRenewalBaseDateIso(ticket), [ticket]);
  const minNewEndDate = useMemo(
    () => computeDefaultRenewalValues(ticket, ticketType).minNewEndDate,
    [ticket, ticketType],
  );
  const oldEndDateIso = useMemo(() => getTicketOldEndDateIso(ticket), [ticket]);

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

    parkingFloors.forEach((floor) => {
      (floor.zones || []).forEach((zone) => {
        (zone.slots || []).forEach((s) => {
          const slotIdentifier = s.slotCode || s.slotId || s.id;
          const val = `${floor.floorName || floor.name} - ${slotIdentifier}`;
          if (val !== ticket?.slotLocation) {
            const typeName =
              s.type === "EV_CHARGING"
                ? "Sạc điện"
                : s.type === "RESERVED"
                ? "Ưu tiên"
                : "Tiêu chuẩn";
            options.push({
              value: val,
              label: `${floor.floorName || floor.name} - Ô ${slotIdentifier}`,
              badge: typeName,
              subLabel: `${zone.zoneName || zone.name}`,
            });
          }
        });
      });
    });

    return options;
  }, [ticket, parkingFloors]);

  const handleTicketTypeChange = (e) => {
    const nextType = e.target.value;
    const defaults = computeDefaultRenewalValues(ticket, nextType);
    setTicketType(nextType);
    setNewEndDate(defaults.newEndDate);
    setRenewPrice(defaults.renewPrice);
    setErrors((prev) => ({
      ...prev,
      newEndDate: "",
      renewPrice: "",
      form: "",
    }));
  };

  const handleEndDateChange = (e) => {
    const nextDate = e.target.value;
    setNewEndDate(nextDate);
    const autoPrice = calculateAutoRenewPrice({
      ticketTypeName: ticketType,
      baseDateIso,
      newEndDateIso: nextDate,
    });
    if (autoPrice) {
      setRenewPrice(autoPrice);
    }
    setErrors((prev) => ({
      ...prev,
      newEndDate: "",
      renewPrice: autoPrice ? "" : prev.renewPrice,
      form: "",
    }));
  };

  const handlePriceChange = (e) => {
    setRenewPrice(e.target.value);
    if (errors.renewPrice) {
      setErrors((prev) => ({ ...prev, renewPrice: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateRenewTicketForm({
      ticket,
      newEndDate,
      renewPrice,
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const meta = resolveTicketTypeMeta(ticketType);
    const extendDays = Math.max(1, diffDaysIsoDate(baseDateIso, newEndDate));

    if (onConfirm) {
      onConfirm({
        ticketId: ticket?.id ?? ticket?.ticketCode,
        ticketCode: ticket?.ticketCode,
        ticket_type_id: meta.id,
        newTicketType: ticketType,
        newSlot: slot,
        newEndDate,
        extend_days: extendDays,
        renewPrice: String(Number(renewPrice)),
        note,
      });
    }
    onClose();
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Gia hạn vé"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        {errors.form && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errors.form}
          </div>
        )}

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
          onChange={handleTicketTypeChange}
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
            min={minNewEndDate}
            onChange={handleEndDateChange}
            error={errors.newEndDate}
            helperText={
              oldEndDateIso
                ? `Hết hạn cũ: ${ticket?.endDate || oldEndDateIso}`
                : ""
            }
            required
          />

          <FormInput
            type="number"
            label="Giá gia hạn (VNĐ)"
            value={renewPrice}
            min={MIN_RENEW_PRICE_VND}
            onChange={handlePriceChange}
            error={errors.renewPrice}
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

export default function RenewTicketModal({ isOpen, onClose, ticket, onConfirm }) {
  if (!isOpen) return null;

  return (
    <RenewTicketModalContent
      key={`${ticket?.id ?? ticket?.ticketCode ?? "none"}-${ticket?.endDate ?? ""}`}
      onClose={onClose}
      ticket={ticket}
      onConfirm={onConfirm}
    />
  );
}
