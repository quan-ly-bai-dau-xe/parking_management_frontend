import { formatIsoDateToDisplay } from "../formatDateTime";
import { DEFAULT_UNASSIGNED_SLOT_LABEL } from "../../constants/vehicleConstants";

/**
 * formatDate helper
 */
export function formatDate(value) {
  if (!value) return "—";
  return formatIsoDateToDisplay(value) || value;
}

/**
 * mapVehicleSearchItem
 * Map backend vehicle list or search item to standard frontend vehicle model
 */
export function mapVehicleSearchItem(item) {
  if (!item) return null;

  const rawTicket = item.current_ticket || item.currentTicket || item.ticket;
  const rawSession =
    item.active_session ||
    item.activeSession ||
    item.session ||
    item.open_session;
  const rawCustomer = item.customer || {};

  const rawTypeName =
    typeof rawTicket?.type === "object"
      ? (rawTicket.type?.name || rawTicket.type?.code)
      : rawTicket?.type;

  const ticketType =
    item.ticket_type_display ||
    item.ticket_type_name ||
    rawTicket?.ticket_type_name ||
    item.ticketType ||
    rawTicket?.type_display ||
    rawTypeName ||
    rawTicket?.package_name ||
    "Vé lượt";

  const customerName =
    item.customer_name ||
    rawCustomer.full_name ||
    rawCustomer.name ||
    item.owner_name ||
    "—";

  const customerPhone =
    item.customer_phone ||
    rawCustomer.phone ||
    "—";

  let status = "left";
  const rawStatus = (item.status || "").toLowerCase();
  const isSessionOpen = Boolean(
    rawSession &&
    !rawSession.exit_time &&
    rawSession.status !== "completed" &&
    rawSession.status !== "closed" &&
    !rawSession.is_closed
  );
  if (rawStatus === "parked" || isSessionOpen || item.is_parked) {
    status = "parked";
  } else if (rawStatus === "active" || rawTicket?.is_active) {
    status = "active";
  } else if (rawStatus === "left") {
    status = "left";
  }

  const statusDisplay =
    item.status_display ||
    (status === "parked"
      ? "Đang đỗ"
      : status === "active"
      ? "Đang hoạt động"
      : "Đã rời bãi");

  let ticketStatus = "none";
  if (rawTicket) {
    const rawTStatus = (rawTicket.status || rawTicket.state || "").toLowerCase();
    if (
      rawTStatus === "active" ||
      rawTStatus === "valid" ||
      rawTicket.is_active ||
      rawTicket.is_valid
    ) {
      ticketStatus = "active";
    } else if (rawTStatus === "expired" || rawTicket.is_expired) {
      ticketStatus = "expired";
    } else if (
      rawTStatus === "expiring" ||
      rawTStatus === "expiring_soon" ||
      rawTStatus === "warning" ||
      rawTicket.is_expiring
    ) {
      ticketStatus = "warning";
    }
  }

  const ticketExpiresAt = formatDate(
    rawTicket?.effective_to || rawTicket?.expires_at
  );
  const ticketRegisteredAt = formatDate(
    rawTicket?.effective_from || rawTicket?.registered_at || rawTicket?.created_at
  );

  let remainingDays = 0;
  if (rawTicket?.days_remaining !== undefined) {
    remainingDays = rawTicket.days_remaining;
  } else if (rawTicket?.remainingDays !== undefined) {
    remainingDays = rawTicket.remainingDays;
  } else if (rawTicket?.effective_to || rawTicket?.expires_at) {
    const expDate = new Date(rawTicket.effective_to || rawTicket.expires_at);
    if (!isNaN(expDate.getTime())) {
      remainingDays = Math.max(0, Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24)));
    }
  }

  const ticketObj = {
    type: ticketType,
    status: ticketStatus,
    expiresAt: ticketExpiresAt,
    registeredAt: ticketRegisteredAt,
    remainingDays: remainingDays,
    note: rawTicket?.notes || rawTicket?.note || "",
  };

  const slotCode =
    item.current_slot ||
    item.parking_slot_code ||
    rawSession?.slot_display ||
    rawSession?.display_text ||
    rawSession?.slot_code ||
    rawTicket?.slot_code ||
    item.parking_position?.display_text ||
    item.parking_position?.slot_code ||
    "";

  const rawVehicleType = item.vehicle_type;
  const vehicleTypeName =
    typeof rawVehicleType === "object"
      ? (rawVehicleType?.name || rawVehicleType?.code)
      : (item.vehicle_type_name || (typeof rawVehicleType === "string" ? rawVehicleType : null));

  const vehicleTypeId =
    (typeof rawVehicleType === "object" ? rawVehicleType?.id : null) ||
    item.vehicle_type_id ||
    1;

  const vehicleTypeCode =
    (typeof rawVehicleType === "object" ? rawVehicleType?.code : null) ||
    item.vehicle_type_code ||
    (vehicleTypeId === 2 ? "EV" : "CAR");

  const resolvedVehicleType =
    vehicleTypeName || (vehicleTypeId === 2 ? "Ô tô điện" : "Ô tô");

  return {
    id: item.id || item.code,
    backendId: item.id,
    code: item.code || `XE${String(item.id).padStart(4, "0")}`,
    licensePlate: item.license_plate || item.plate || item.licensePlate || "—",
    brand: item.brand || "—",
    model: item.model_name || item.model || "—",
    color: item.color || "—",
    vehicleType: resolvedVehicleType,
    vehicleTypeId,
    vehicleTypeCode,
    ticket: ticketObj,
    ticketType,
    ticketState: ticketStatus,
    ticketExpiration: ticketExpiresAt,
    status,
    statusDisplay,
    customer: {
      id: rawCustomer.id || item.customer_id,
      code: rawCustomer.code || (item.customer_id ? `KH${String(item.customer_id).padStart(4, "0")}` : ""),
      name: customerName,
      phone: customerPhone,
      email: rawCustomer.email || item.customer_email || "—",
      totalVehicles: rawCustomer.totalVehicles ?? rawCustomer.vehicles_count ?? (item.customer_id ? 1 : 0),
    },
    parkingSlot: {
      slotId: item.parking_position?.slot_id || rawSession?.slot_id || rawSession?.slotId || null,
      slot: slotCode || DEFAULT_UNASSIGNED_SLOT_LABEL,
      display: slotCode || DEFAULT_UNASSIGNED_SLOT_LABEL,
      floor: item.parking_position?.floor_name || rawSession?.floor_name || "",
      zone: item.parking_position?.zone_code || rawSession?.zone_code || "",
    },
    entryTime: formatDate(rawSession?.entry_time || item.entry_time),
    exitTime: formatDate(rawSession?.exit_time || item.exit_time),
    rowVersion: item.row_version || 1,
    note: item.notes || item.note || "",
  };
}

/**
 * mapVehicleResults
 */
export function mapVehicleResults(payload) {
  const results = Array.isArray(payload) ? payload : payload?.results || [];
  return results.map(mapVehicleSearchItem);
}

/**
 * toCreatePayload
 */
export function toCreatePayload(vehicle) {
  const model = (vehicle.model || vehicle.model_name || "").trim() || "Ô tô";
  const payload = {
    license_plate: (vehicle.licensePlate || vehicle.license_plate || "").trim(),
    model_name: model,
    vehicle_type_id: Number(vehicle.vehicleTypeId || vehicle.vehicle_type_id || 1),
  };
  if (vehicle.code && vehicle.code.trim()) {
    payload.code = vehicle.code.trim();
  }
  const rawCustId =
    vehicle.customerId ??
    vehicle.customer_id ??
    vehicle.customer?.id ??
    vehicle.customer?.backendId;
  const custId = Number(rawCustId);
  if (!isNaN(custId) && custId > 0) {
    payload.customer_id = custId;
  }
  if (vehicle.brand && vehicle.brand.trim() && vehicle.brand !== "—") {
    payload.brand = vehicle.brand.trim();
  }
  if (vehicle.color && vehicle.color.trim()) {
    payload.color = vehicle.color.trim();
  }
  if (vehicle.imageUrl || vehicle.image_url) {
    payload.image_url = vehicle.imageUrl || vehicle.image_url;
  }
  const note = (vehicle.note || vehicle.notes || "").trim();
  if (note) {
    payload.notes = note;
  }
  return payload;
}

/**
 * toUpdatePayload
 */
export function toUpdatePayload(vehicle) {
  const payload = {
    row_version: Number(vehicle.rowVersion || vehicle.row_version || 1),
  };
  if (vehicle.model !== undefined || vehicle.model_name !== undefined) {
    payload.model_name = (vehicle.model || vehicle.model_name || "").trim();
  }
  if (vehicle.brand !== undefined && vehicle.brand !== "—") {
    payload.brand = (vehicle.brand || "").trim();
  }
  if (vehicle.color !== undefined) {
    payload.color = (vehicle.color || "").trim();
  }
  const rawCustId =
    vehicle.customerId ??
    vehicle.customer_id ??
    vehicle.customer?.id ??
    vehicle.customer?.backendId;
  const custId = Number(rawCustId);
  if (!isNaN(custId) && custId > 0) {
    payload.customer_id = custId;
  }
  if (vehicle.imageUrl || vehicle.image_url) {
    payload.image_url = vehicle.imageUrl || vehicle.image_url;
  }
  const note = (vehicle.note || vehicle.notes || "").trim();
  if (note) {
    payload.notes = note;
  }
  return payload;
}
