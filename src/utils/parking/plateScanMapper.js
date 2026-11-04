import { ParkingSessionSchema } from "../../schemas/parkingSessionSchema.js";
import { formatIsoDateToDisplay } from "../formatDateTime.js";

/**
 * Định dạng datetime sang tiếng Việt (dd/MM/yyyy HH:mm)
 */
export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");
}

export function formatDate(value) {
  if (!value) return "—";
  return formatIsoDateToDisplay(value) || value;
}

/**
 * Chuẩn hoá URL hình ảnh
 */
export function resolveMediaUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const backendBaseUrl =
    import.meta.env.VITE_BACKEND_URL?.trim();

  const cleanBase = backendBaseUrl.replace(/\/+$/, "");
  const slashPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${cleanBase}${slashPath}`;
}

/**
 * mapParkingSession
 */
export function mapParkingSession(raw) {
  const sessionCode = raw.session_code || raw.sessionCode || "—";
  const licensePlate = raw.license_plate || raw.licensePlate || "—";

  const rawEntryImage =
    raw.entry_image_url ||
    raw.plate_image_url ||
    raw.entry_plate_image_url ||
    raw.plateImageUrl;

  const rawExitImage =
    raw.exit_image_url ||
    raw.exit_plate_image_url ||
    raw.exitPlateImageUrl;

  const rawFee = raw.fee ?? raw.fee_amount ?? raw.feeNumber;
  let feeNumber = 0;
  let feeDisplay = "—";

  if (rawFee !== null && rawFee !== undefined) {
    if (typeof rawFee === "number") {
      feeNumber = rawFee;
      feeDisplay = `${feeNumber.toLocaleString("vi-VN")}đ`;
    } else if (typeof rawFee === "string") {
      const parsed = Number(rawFee.replace(/[^\d.-]/g, ""));
      feeNumber = Number.isNaN(parsed) ? 0 : parsed;
      feeDisplay = rawFee.includes("đ") ? rawFee : `${feeNumber.toLocaleString("vi-VN")}đ`;
    }
  }

  const entryTime = raw.entryTime || formatDateTime(raw.entry_time);
  const exitTime = raw.exitTime || (raw.exit_time ? formatDateTime(raw.exit_time) : null);

  const duration =
    raw.duration ||
    (raw.duration_minutes !== undefined && raw.duration_minutes !== null
      ? `${raw.duration_minutes} phút`
      : exitTime
        ? "—"
        : "Đang gửi");

  let status = "in_progress";
  if (raw.status) {
    status = raw.status;
  } else if (exitTime || raw.exit_time) {
    status = "completed";
  }

  return {
    id: String(raw.id || sessionCode),
    sessionCode,
    licensePlate,
    vehicleType: raw.vehicleType || raw.vehicle_type_name || (raw.vehicle_type_id === 1 ? "Ô tô" : "Ô tô điện"),
    entryTime,
    exitTime,
    entryGate: raw.entry_gate_name || raw.entry_gate || raw.entryGate || "Cổng vào",
    exitGate: raw.exit_gate_name || raw.exit_gate || raw.exitGate || (exitTime ? "Cổng ra" : "—"),
    slotCode: raw.slot_code || raw.slotCode || "—",
    floorName: raw.floor_name || raw.floorName || "",
    zoneName: raw.zone_code || raw.zoneName || "",
    plateImageUrl: resolveMediaUrl(rawEntryImage),
    exitPlateImageUrl: resolveMediaUrl(rawExitImage),
    duration,
    durationMinutes: raw.duration_minutes ?? null,
    fee: feeDisplay,
    feeNumber,
    status,
    hasActiveTicket: Boolean(raw.has_active_ticket ?? raw.hasActiveTicket),
    ticketType: raw.ticket_type_name || raw.ticketType || "Vé lượt",
  };
}

export function validateAndMapSessions(rawData) {
  const list = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.results)
      ? rawData.results
      : null;

  if (!list) {
    throw new Error("Phản hồi từ máy chủ không đúng định dạng danh sách phiên đỗ xe");
  }

  return list.map((item) => {
    const validItem = ParkingSessionSchema.parse(item);
    return mapParkingSession(validItem);
  });
}

export function mapPlateScanToVehicle(scanResult) {
  if (!scanResult) return null;

  const lookup = scanResult.vehicle_lookup || {};
  const rawVehicle = lookup.vehicle || scanResult.vehicle || {};
  const rawTicket = lookup.active_ticket || scanResult.ticket || scanResult.active_ticket || rawVehicle.current_ticket || {};
  const rawSession = lookup.open_session || scanResult.session || scanResult.active_session || rawVehicle.active_session || {};
  const rawCustomer = lookup.customer || scanResult.customer || rawVehicle.customer || {};

  const rawPlate =
    rawVehicle.license_plate ||
    scanResult.plate_final ||
    scanResult.best_candidate?.plate_text ||
    scanResult.plate_raw ||
    scanResult.plate ||
    scanResult.license_plate ||
    scanResult.detected_plate ||
    "";

  const rawConfidence = scanResult.best_candidate?.confidence ?? scanResult.confidence ?? 0.95;
  const numConfidence = Number(rawConfidence);
  const confidencePercent = !Number.isNaN(numConfidence)
    ? numConfidence <= 1.0
      ? numConfidence * 100
      : numConfidence
    : 95;
  const confidence = Math.round(confidencePercent);

  const isRecognized = Boolean(rawPlate && rawPlate !== "—");

  const vehicleId = rawVehicle.id || scanResult.vehicle_id || null;
  const customerId = rawCustomer.id || rawVehicle.customer_id || null;

  const ticketType =
    scanResult.ticket_type ||
    rawTicket.package_name ||
    rawTicket.type_display ||
    rawTicket.ticket_type_name ||
    (rawPlate ? "Vé lượt" : "Chưa đăng ký");

  let ticketStatus = "none";
  if (rawTicket.status) {
    ticketStatus = rawTicket.status.toLowerCase();
  } else if (rawTicket.is_active || scanResult.has_active_ticket) {
    ticketStatus = "active";
  } else if (rawTicket.is_expired) {
    ticketStatus = "expired";
  }

  const parkingPosition = lookup.parking_position || scanResult.parking_position || rawSession.parking_position || null;
  const slotCode =
    parkingPosition?.slot_code ||
    scanResult.slot_code ||
    rawSession.slot_code ||
    rawVehicle.slot_code ||
    rawTicket.slot_code ||
    "Chưa xếp chỗ";

  const customerName = rawCustomer.full_name || rawCustomer.name || rawVehicle.customer_name || "Khách vãng lai";
  const customerPhone = rawCustomer.phone || rawVehicle.customer_phone || "—";
  const model = rawVehicle.model_name || rawVehicle.model || (rawPlate ? "Xe vãng lai" : "—");
  const brand = rawVehicle.brand || "—";
  const color = rawVehicle.color || "—";

  return {
    licensePlate: rawPlate || "—",
    confidence,
    isRecognized,
    vehicleId,
    customerId,
    customerName,
    customerPhone,
    customer: {
      id: customerId,
      name: customerName,
      phone: customerPhone,
      code: rawCustomer.code || "",
    },
    model,
    brand,
    color,
    vehicleType: rawVehicle.vehicle_type_name || rawVehicle.vehicle_type || scanResult.vehicle_type || "Ô tô",
    vehicleTypeId: rawVehicle.vehicle_type_id || scanResult.vehicle_type_id || 1,
    vehicleTypeCode: rawVehicle.vehicle_type_code || "CAR",
    ticketType,
    ticketStatus,
    ticket: {
      type: ticketType,
      status: ticketStatus,
      effectiveTo: rawTicket.effective_to ? formatDate(rawTicket.effective_to) : null,
    },
    ticketExpiration: rawTicket.effective_to ? formatDate(rawTicket.effective_to) : null,
    hasActiveTicket: Boolean(scanResult.has_active_ticket || rawTicket.is_active),
    slotCode,
    parkingPosition,
    status: scanResult.vehicle_status || rawVehicle.status || (rawSession.id ? "parked" : "active"),
    imageUrl: resolveMediaUrl(scanResult.image_url || scanResult.plate_image_url),
    rawScan: scanResult,
  };
}

export function mapVehicleLookupToVehicle(lookupResult) {
  if (!lookupResult) return null;

  const rawVehicle = lookupResult.vehicle || {};
  const rawPlate = rawVehicle.license_plate || lookupResult.license_plate || lookupResult.plate || "";
  const rawCustomer = lookupResult.customer || rawVehicle.customer || {};
  const rawTicket = lookupResult.active_ticket || lookupResult.current_ticket || {};
  const rawSession = lookupResult.open_session || lookupResult.active_session || {};
  const parkingPosition = lookupResult.parking_position || rawSession.parking_position || null;

  const ticketType =
    rawTicket.package_name ||
    rawTicket.ticket_type_name ||
    rawTicket.type_display ||
    "Vé lượt";

  let ticketStatus = "none";
  if (rawTicket.status) {
    ticketStatus = rawTicket.status.toLowerCase();
  } else if (rawTicket.is_active || lookupResult.has_active_ticket) {
    ticketStatus = "active";
  } else if (rawTicket.is_expired) {
    ticketStatus = "expired";
  }

  const slotCode =
    parkingPosition?.slot_code ||
    parkingPosition?.display_text ||
    rawSession.slot_code ||
    rawTicket.slot_code ||
    lookupResult.slot_code ||
    "Chưa xếp chỗ";

  return {
    licensePlate: rawPlate || "—",
    confidence: 100,
    isRecognized: Boolean(rawPlate),
    vehicleId: rawVehicle.id || lookupResult.id,
    customerId: rawCustomer.id,
    customerName: rawCustomer.full_name || rawCustomer.name || "Khách vãng lai",
    customerPhone: rawCustomer.phone || "—",
    customerCode: rawCustomer.code || "",
    customer: {
      id: rawCustomer.id,
      name: rawCustomer.full_name || rawCustomer.name || "Khách vãng lai",
      phone: rawCustomer.phone || "—",
      code: rawCustomer.code || "",
    },
    model: rawVehicle.model_name || rawVehicle.model || lookupResult.model_name || "—",
    brand: rawVehicle.brand || lookupResult.brand || "—",
    color: rawVehicle.color || lookupResult.color || "—",
    vehicleType: rawVehicle.vehicle_type || lookupResult.vehicle_type_name || "Ô tô",
    vehicleTypeId: rawVehicle.vehicle_type_id || lookupResult.vehicle_type_id || 1,
    vehicleTypeCode: rawVehicle.vehicle_type_code || lookupResult.vehicle_type_code || "CAR",
    ticketType,
    ticketStatus,
    ticket: {
      type: ticketType,
      status: ticketStatus,
      effectiveTo: rawTicket.effective_to ? formatDate(rawTicket.effective_to) : null,
    },
    ticketExpiration: rawTicket.effective_to ? formatDate(rawTicket.effective_to) : null,
    hasActiveTicket: Boolean(lookupResult.has_active_ticket || rawTicket.is_active || (rawTicket.status && rawTicket.status.toUpperCase() === "ACTIVE")),
    slotCode,
    parkingPosition: parkingPosition,
    parkingSlot: {
      slot: slotCode,
      display: parkingPosition?.display_text || slotCode,
      slotId: parkingPosition?.slot_id || null,
      floorName: parkingPosition?.floor_name || "",
      zoneCode: parkingPosition?.zone_code || "",
    },
    status: rawSession.id ? "parked" : (lookupResult.status || "active"),
    rawLookup: lookupResult,
  };
}

export function mapSessionToFrontend(session) {
  if (!session) return null;
  return {
    id: session.id,
    sessionCode: session.sessionCode || session.session_code,
    licensePlate: session.licensePlate || session.license_plate,
    entryTime: session.entryTime || formatDate(session.entry_time),
    exitTime: session.exitTime || (session.exit_time ? formatDate(session.exit_time) : null),
    slotCode: session.slotCode || session.slot_code || "—",
    fee: session.fee,
    status: session.status,
  };
}
