import { ParkingSessionSchema } from "../../schemas/parkingSessionSchema.js";
import { formatIsoDateToDisplay } from "../formatDateTime.js";

/**
 * Hằng số cấu hình mặc định dùng chung cho mapper
 */
export const MAPPER_DEFAULTS = {
  EMPTY_PLACEHOLDER: "—",
  UNASSIGNED_SLOT: "Chưa xếp chỗ",
  GUEST_CUSTOMER: "Khách vãng lai",
  UNREGISTERED_CUSTOMER: "Chưa đăng ký",
  DEFAULT_TICKET_TYPE: "Vé lượt",
  DEFAULT_VEHICLE_TYPE: "Ô tô",
  DEFAULT_VEHICLE_TYPE_CODE: "CAR",
  DEFAULT_VEHICLE_TYPE_ID: 1,
  ENTRY_GATE_DEFAULT: "Cổng vào",
  EXIT_GATE_DEFAULT: "Cổng ra",
  STATUS_IN_PROGRESS: "in_progress",
  STATUS_COMPLETED: "completed",
  STATUS_PARKED: "parked",
  STATUS_ACTIVE: "active",
  STATUS_EXPIRED: "expired",
  STATUS_NONE: "none",
  DURATION_ONGOING: "Đang gửi",
};

/**
 * Định dạng datetime sang tiếng Việt (dd/MM/yyyy HH:mm)
 */
export function formatDateTime(value) {
  if (!value) return MAPPER_DEFAULTS.EMPTY_PLACEHOLDER;
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
  if (!value) return MAPPER_DEFAULTS.EMPTY_PLACEHOLDER;
  return formatIsoDateToDisplay(value) || value;
}

/**
 * Chuẩn hoá URL hình ảnh
 */
export function resolveMediaUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (
    !trimmed ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "none" ||
    trimmed === "N/A" ||
    trimmed === "-" ||
    trimmed === "[object Object]"
  ) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const backendBaseUrl =
    (typeof import.meta !== "undefined" && import.meta?.env?.VITE_BACKEND_URL?.trim()) ||
    (typeof globalThis !== "undefined" && globalThis.process?.env?.VITE_BACKEND_URL?.trim()) ||
    "";
  const cleanBase = backendBaseUrl ? backendBaseUrl.replace(/\/+$/, "") : "";
  const slashPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return cleanBase ? `${cleanBase}${slashPath}` : slashPath;
}

/**
 * Helper tách biệt logic tính toán phí gửi xe
 */
function parseFee(rawFee) {
  let feeNumber = 0;
  let feeDisplay = MAPPER_DEFAULTS.EMPTY_PLACEHOLDER;

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

  return { feeNumber, feeDisplay };
}

/**
 * Helper chuẩn hóa thông tin khách hàng (Customer Information)
 */
function extractCustomer(rawCustomer = {}, rawVehicle = {}) {
  const id = rawCustomer.id || rawVehicle.customer_id || null;
  const name =
    rawCustomer.full_name ||
    rawCustomer.name ||
    rawVehicle.customer_name ||
    MAPPER_DEFAULTS.GUEST_CUSTOMER;
  const phone =
    rawCustomer.phone ||
    rawVehicle.customer_phone ||
    MAPPER_DEFAULTS.EMPTY_PLACEHOLDER;
  const code = rawCustomer.code || rawCustomer.customerCode || "";

  return { id, name, phone, code };
}

/**
 * Helper chuẩn hóa thông tin vé (Ticket Information)
 */
function extractTicket(rawTicket = {}, source = {}, hasPlate = false) {
  const defaultFallbackType = hasPlate
    ? MAPPER_DEFAULTS.DEFAULT_TICKET_TYPE
    : MAPPER_DEFAULTS.UNREGISTERED_CUSTOMER;

  const ticketType =
    source.ticket_type ||
    rawTicket.package_name ||
    rawTicket.ticket_type_name ||
    rawTicket.type_display ||
    defaultFallbackType;

  let ticketStatus = MAPPER_DEFAULTS.STATUS_NONE;
  if (rawTicket.status) {
    ticketStatus = String(rawTicket.status).toLowerCase();
  } else if (
    rawTicket.is_active ||
    source.has_active_ticket ||
    (typeof rawTicket.status === "string" && rawTicket.status.toUpperCase() === "ACTIVE")
  ) {
    ticketStatus = MAPPER_DEFAULTS.STATUS_ACTIVE;
  } else if (rawTicket.is_expired) {
    ticketStatus = MAPPER_DEFAULTS.STATUS_EXPIRED;
  }

  const effectiveTo = rawTicket.effective_to ? formatDate(rawTicket.effective_to) : null;
  const hasActiveTicket = Boolean(
    source.has_active_ticket ||
    rawTicket.is_active ||
    ticketStatus === MAPPER_DEFAULTS.STATUS_ACTIVE
  );

  return {
    type: ticketType,
    status: ticketStatus,
    effectiveTo,
    hasActiveTicket,
  };
}

/**
 * Helper chuẩn hóa thông tin vị trí đỗ xe (Parking Slot & Position)
 */
function extractParkingSlot(parkingPosition, source = {}, rawSession = {}, rawVehicle = {}, rawTicket = {}) {
  const slotCode =
    parkingPosition?.slot_code ||
    parkingPosition?.display_text ||
    rawSession.slot_display ||
    rawSession.slot_code ||
    source.slot_code ||
    rawVehicle.slot_code ||
    rawTicket.slot_code ||
    rawTicket.slot?.code ||
    MAPPER_DEFAULTS.UNASSIGNED_SLOT;

  const slotId =
    parkingPosition?.slot_id ||
    rawSession.slot_id ||
    rawSession.slotId ||
    rawTicket.slot_id ||
    rawTicket.slot?.id ||
    null;

  return {
    slotCode,
    parkingPosition: parkingPosition || null,
    parkingSlot: {
      slot: slotCode,
      display:
        parkingPosition?.display_text ||
        rawSession.slot_display ||
        (slotCode !== MAPPER_DEFAULTS.UNASSIGNED_SLOT ? slotCode : "Chưa có vị trí"),
      slotId,
      floorName: parkingPosition?.floor_name || rawSession.floor_name || "",
      zoneCode: parkingPosition?.zone_code || rawSession.zone_code || "",
    },
  };
}

/**
 * mapParkingSession: Chuẩn hóa phiên đỗ xe từ Backend API sang FE Model
 */
export function mapParkingSession(raw) {
  if (!raw) return null;

  const sessionCode = raw.session_code || raw.sessionCode || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER;
  const licensePlate = raw.license_plate || raw.licensePlate || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER;

  const rawEntryImage =
    raw.entry_image_url ||
    raw.plate_image_url ||
    raw.entry_plate_image_url ||
    raw.plateImageUrl;

  const rawExitImage =
    raw.exit_image_url ||
    raw.exit_plate_image_url ||
    raw.exitPlateImageUrl;

  const { feeNumber, feeDisplay } = parseFee(raw.fee ?? raw.fee_amount ?? raw.feeNumber);

  const entryTime = raw.entryTime || formatDateTime(raw.entry_time);
  const exitTime = raw.exitTime || (raw.exit_time ? formatDateTime(raw.exit_time) : null);

  const duration =
    raw.duration ||
    raw.duration_text ||
    raw.durationText ||
    (raw.duration_minutes !== undefined && raw.duration_minutes !== null
      ? `${raw.duration_minutes} phút`
      : exitTime
        ? MAPPER_DEFAULTS.EMPTY_PLACEHOLDER
        : MAPPER_DEFAULTS.DURATION_ONGOING);

  let status = MAPPER_DEFAULTS.STATUS_IN_PROGRESS;
  const rawStatus = (raw.status || "").toLowerCase();
  if (
    rawStatus === "completed" ||
    rawStatus === "closed" ||
    rawStatus === "left" ||
    raw.is_completed
  ) {
    status = MAPPER_DEFAULTS.STATUS_COMPLETED;
  } else if (rawStatus === "in_progress" || rawStatus === "open") {
    status = MAPPER_DEFAULTS.STATUS_IN_PROGRESS;
  } else if (raw.status) {
    status = raw.status;
  } else if (exitTime || raw.exit_time) {
    status = MAPPER_DEFAULTS.STATUS_COMPLETED;
  }

  return {
    id: String(raw.id || sessionCode),
    sessionCode,
    licensePlate,
    vehicleType: raw.vehicleType || raw.vehicle_type_name || (raw.vehicle_type_id === 1 ? "Ô tô" : "Ô tô điện"),
    entryTime,
    exitTime,
    entryGate: raw.entry_gate_name || raw.entry_gate || raw.entryGate || MAPPER_DEFAULTS.ENTRY_GATE_DEFAULT,
    exitGate: raw.exit_gate_name || raw.exit_gate || raw.exitGate || (exitTime ? MAPPER_DEFAULTS.EXIT_GATE_DEFAULT : MAPPER_DEFAULTS.EMPTY_PLACEHOLDER),
    slotCode: raw.slot_code || raw.slotCode || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER,
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
    ticketType: raw.ticket_type_name || raw.ticketType || MAPPER_DEFAULTS.DEFAULT_TICKET_TYPE,
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
    const parsed = item && typeof item === "object" ? ParkingSessionSchema.safeParse(item) : null;
    return parsed?.success ? mapParkingSession(parsed.data) : null;
  }).filter(Boolean);
}

/**
 * mapPlateScanToVehicle: Chuẩn hóa kết quả quét OCR biển số xe
 */
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

  // AI confidence: không tự sinh số ảo, giữ nguyên hoặc tính phần trăm chính xác
  const rawConfidence = scanResult.best_candidate?.confidence ?? scanResult.confidence;
  let confidence = null;
  if (rawConfidence !== undefined && rawConfidence !== null) {
    const num = Number(rawConfidence);
    if (!Number.isNaN(num)) {
      confidence = Math.round(num <= 1.0 ? num * 100 : num);
    }
  }

  const isRecognized = Boolean(rawPlate && rawPlate !== MAPPER_DEFAULTS.EMPTY_PLACEHOLDER);
  const vehicleId = rawVehicle.id || scanResult.vehicle_id || null;

  // Trích xuất Customer, Ticket và Parking Slot qua helper dùng chung
  const customer = extractCustomer(rawCustomer, rawVehicle);
  const ticket = extractTicket(rawTicket, scanResult, Boolean(rawPlate));
  const parkingPosition = lookup.parking_position || scanResult.parking_position || rawSession.parking_position || null;
  const { slotCode, parkingSlot } = extractParkingSlot(parkingPosition, scanResult, rawSession, rawVehicle, rawTicket);

  const model = rawVehicle.model_name || rawVehicle.model || (rawPlate ? "Xe vãng lai" : MAPPER_DEFAULTS.EMPTY_PLACEHOLDER);
  const brand = rawVehicle.brand || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER;
  const color = rawVehicle.color || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER;

  return {
    licensePlate: rawPlate || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER,
    confidence,
    isRecognized,
    vehicleId,
    // Đồng bộ flat keys trực tiếp từ Single Source of Truth
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerCode: customer.code,
    customer,
    model,
    brand,
    color,
    vehicleType: rawVehicle.vehicle_type_name || rawVehicle.vehicle_type || scanResult.vehicle_type || MAPPER_DEFAULTS.DEFAULT_VEHICLE_TYPE,
    vehicleTypeId: rawVehicle.vehicle_type_id || scanResult.vehicle_type_id || MAPPER_DEFAULTS.DEFAULT_VEHICLE_TYPE_ID,
    vehicleTypeCode: rawVehicle.vehicle_type_code || MAPPER_DEFAULTS.DEFAULT_VEHICLE_TYPE_CODE,
    ticketType: ticket.type,
    ticketStatus: ticket.status,
    ticketExpiration: ticket.effectiveTo,
    ticket: {
      type: ticket.type,
      status: ticket.status,
      effectiveTo: ticket.effectiveTo,
    },
    hasActiveTicket: ticket.hasActiveTicket,
    slotCode,
    parkingPosition,
    parkingSlot,
    status:
      scanResult.vehicle_status ||
      rawVehicle.status ||
      (rawSession.id && !rawSession.exit_time && rawSession.status !== "completed" && rawSession.status !== "closed"
        ? MAPPER_DEFAULTS.STATUS_PARKED
        : ticket.hasActiveTicket
        ? MAPPER_DEFAULTS.STATUS_ACTIVE
        : MAPPER_DEFAULTS.STATUS_LEFT),
    imageUrl: resolveMediaUrl(scanResult.image_url || scanResult.plate_image_url),
    rawScan: scanResult,
  };
}

/**
 * mapVehicleLookupToVehicle: Chuẩn hóa kết quả tra cứu phương tiện theo biển số
 */
export function mapVehicleLookupToVehicle(lookupResult) {
  if (!lookupResult) return null;

  const rawVehicle = lookupResult.vehicle || {};
  const rawPlate = rawVehicle.license_plate || lookupResult.license_plate || lookupResult.plate || "";
  const rawCustomer = lookupResult.customer || rawVehicle.customer || {};
  const rawTicket = lookupResult.active_ticket || lookupResult.current_ticket || {};
  const rawSession = lookupResult.open_session || lookupResult.active_session || {};
  const parkingPosition = lookupResult.parking_position || rawSession.parking_position || null;

  // Trích xuất Customer, Ticket và Parking Slot
  const customer = extractCustomer(rawCustomer, rawVehicle);
  const ticket = extractTicket(rawTicket, lookupResult, Boolean(rawPlate));
  const { slotCode, parkingSlot } = extractParkingSlot(parkingPosition, lookupResult, rawSession, rawVehicle, rawTicket);

  const isSessionOpen = Boolean(
    rawSession.id &&
    !rawSession.exit_time &&
    rawSession.status !== "completed" &&
    rawSession.status !== "closed"
  );

  return {
    licensePlate: rawPlate || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER,
    confidence: 100,
    isRecognized: Boolean(rawPlate),
    vehicleId: rawVehicle.id || lookupResult.id,
    // Đồng bộ flat keys trực tiếp từ Single Source of Truth
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerCode: customer.code,
    customer,
    model: rawVehicle.model_name || rawVehicle.model || lookupResult.model_name || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER,
    brand: rawVehicle.brand || lookupResult.brand || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER,
    color: rawVehicle.color || lookupResult.color || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER,
    vehicleType: rawVehicle.vehicle_type || lookupResult.vehicle_type_name || MAPPER_DEFAULTS.DEFAULT_VEHICLE_TYPE,
    vehicleTypeId: rawVehicle.vehicle_type_id || lookupResult.vehicle_type_id || MAPPER_DEFAULTS.DEFAULT_VEHICLE_TYPE_ID,
    vehicleTypeCode: rawVehicle.vehicle_type_code || lookupResult.vehicle_type_code || MAPPER_DEFAULTS.DEFAULT_VEHICLE_TYPE_CODE,
    ticketType: ticket.type,
    ticketStatus: ticket.status,
    ticketExpiration: ticket.effectiveTo,
    ticket: {
      type: ticket.type,
      status: ticket.status,
      effectiveTo: ticket.effectiveTo,
    },
    hasActiveTicket: ticket.hasActiveTicket,
    slotCode,
    parkingPosition,
    parkingSlot,
    status: isSessionOpen
      ? MAPPER_DEFAULTS.STATUS_PARKED
      : (lookupResult.status || (ticket.hasActiveTicket ? MAPPER_DEFAULTS.STATUS_ACTIVE : MAPPER_DEFAULTS.STATUS_LEFT)),
    rawLookup: lookupResult,
  };
}

/**
 * mapSessionToFrontend: Adapter đảm bảo tương thích dữ liệu phiên đỗ xe cho màn hình Frontend.
 * Tận dụng trực tiếp mapParkingSession để tránh duplicate key và duplicate mapping logic.
 */
export function mapSessionToFrontend(session) {
  if (!session) return null;

  // Tránh re-mapping nếu đối tượng đã được chuẩn hóa bởi mapParkingSession
  if (session.sessionCode !== undefined && session.plateImageUrl !== undefined) {
    return session;
  }

  return mapParkingSession(session);
}
