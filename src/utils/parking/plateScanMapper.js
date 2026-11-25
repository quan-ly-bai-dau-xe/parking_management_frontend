import { ParkingSessionSchema } from "../../schemas/parkingSessionSchema.js";
import { formatIsoDateToDisplay } from "../formatDateTime.js";
import { calculateParkingFee } from "./parkingFeeCalculator.js";

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
    code: rawTicket.code || rawTicket.ticket_code || source.ticket_code || null,
    type: ticketType,
    status: ticketStatus,
    effectiveTo,
    hasActiveTicket,
  };
}

/**
 * isVehicleTicketActive: Kiểm tra trạng thái hiệu lực của vé phương tiện (Vé tháng / Vé đăng ký)
 * Ngăn chặn hoàn toàn false-positive đối với vé lượt hoặc xe vãng lai.
 */
export function isVehicleTicketActive(matchedVehicle, hasValidTicket = false) {
  if (Boolean(hasValidTicket)) return true;
  if (!matchedVehicle) return false;
  if (matchedVehicle.hasActiveTicket) return true;
  if (matchedVehicle.ticketState === "active") return true;
  if (matchedVehicle.ticket?.is_valid === true) return true;
  if (
    matchedVehicle.ticket?.type &&
    matchedVehicle.ticket?.type !== MAPPER_DEFAULTS.DEFAULT_TICKET_TYPE &&
    matchedVehicle.ticket?.status === "active"
  ) {
    return true;
  }
  return false;
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
  const entryTimeRaw = raw.entryTimeRaw || raw.entry_time || null;
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

  // Tự động tính cước phí tạm tính & cảnh báo lưu bãi quá lâu nếu xe đang đỗ (in_progress)
  let estimatedFee = null;
  let overstayLevel = "normal";
  const hasActiveTicket = Boolean(raw.has_active_ticket ?? raw.hasActiveTicket);

  if (status === MAPPER_DEFAULTS.STATUS_IN_PROGRESS && entryTimeRaw) {
    try {
      const entryDate = new Date(entryTimeRaw);
      if (!Number.isNaN(entryDate.getTime())) {
        const elapsedMinutes = Math.max(0, Math.round((Date.now() - entryDate.getTime()) / (1000 * 60)));
        estimatedFee = calculateParkingFee({
          vehicleType: raw.vehicleType || "CAR",
          durationMinutes: elapsedMinutes,
          hasActiveTicket,
        });
        overstayLevel = estimatedFee.overstayLevel || "normal";
      }
    } catch {
      // Fallback an toàn nếu thời gian vào không hợp lệ
    }
  }

  return {
    id: String(raw.id || sessionCode),
    sessionCode,
    licensePlate,
    vehicleType: raw.vehicleType || raw.vehicle_type_name || (raw.vehicle_type_id === 1 ? "Ô tô" : "Ô tô điện"),
    entryTime,
    entryTimeRaw,
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
    estimatedFee,
    overstayLevel,
    status,
    hasActiveTicket,
    ticketType: raw.ticket_type_name || raw.ticketType || MAPPER_DEFAULTS.DEFAULT_TICKET_TYPE,
    notes: raw.notes || raw.feeBreakdown || null,
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
    ticketCode: ticket.code,
    ticketStatus: ticket.status,
    ticketExpiration: ticket.effectiveTo,
    ticket: {
      code: ticket.code,
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
    isBlacklisted: Boolean(
      scanResult.is_blacklisted ||
      scanResult.vehicle_lookup?.is_blacklisted ||
      rawVehicle.is_blacklisted ||
      rawVehicle.status === "BLACKLISTED"
    ),
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
    ticketCode: ticket.code,
    ticketStatus: ticket.status,
    ticketExpiration: ticket.effectiveTo,
    ticket: {
      code: ticket.code,
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
    isBlacklisted: Boolean(
      lookupResult.is_blacklisted ||
      lookupResult.details?.is_blacklisted ||
      rawVehicle.is_blacklisted ||
      rawVehicle.status === "BLACKLISTED"
    ),
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

/**
 * parseEntryTimeToDate: Chuyển đổi chuỗi thời gian vào (entry_time) sang đối tượng Date.
 * Hỗ trợ các định dạng: HH:mm dd/MM/yyyy, dd/MM/yyyy HH:mm, ISO 8601 string.
 */
export const parseEntryTimeToDate = (entryTimeStr) => {
  if (!entryTimeStr) return null;
  const str = String(entryTimeStr).trim();
  const timeFirst = str.match(/^(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (timeFirst) {
    const [, hour, min, day, month, year] = timeFirst;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const dateFirst = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  if (dateFirst) {
    const [, day, month, year, hour = "0", min = "0"] = dateFirst;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
};

/**
 * normalizePlate: Chuẩn hóa biển số xe thành chữ in hoa và loại bỏ ký tự đặc biệt.
 */
export const normalizePlate = (str) =>
  (str || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

/**
 * createWalkInVehicle: Tạo đối tượng phương tiện vãng lai (khách vãng lai / vé lượt) chuẩn hóa.
 * Đảm bảo đầy đủ các trường dữ liệu tương thích hoàn toàn với model Vehicle của hệ thống.
 */
export function createWalkInVehicle(rawPlate, options = {}) {
  const { isBlacklisted = false, openSession = null, customId = null } = options;
  const cleanPlate = (rawPlate || "").trim().toUpperCase();
  const customer = {
    id: null,
    name: `${MAPPER_DEFAULTS.GUEST_CUSTOMER} (Vé lượt)`,
    phone: MAPPER_DEFAULTS.EMPTY_PLACEHOLDER,
    code: "",
  };
  const ticket = {
    type: MAPPER_DEFAULTS.DEFAULT_TICKET_TYPE,
    status: MAPPER_DEFAULTS.STATUS_NONE,
    effectiveTo: null,
    hasActiveTicket: false,
  };
  const isSessionOpen = Boolean(
    openSession?.id &&
    !openSession.exit_time &&
    openSession.status !== "completed" &&
    openSession.status !== "closed"
  );
  const slotCode = openSession?.slot_code || MAPPER_DEFAULTS.UNASSIGNED_SLOT;

  return {
    id: customId || `WALK_IN_${Date.now()}`,
    vehicleId: null,
    licensePlate: cleanPlate || MAPPER_DEFAULTS.EMPTY_PLACEHOLDER,
    confidence: 100,
    isRecognized: Boolean(cleanPlate),
    customerId: null,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerCode: "",
    customer,
    model: MAPPER_DEFAULTS.GUEST_CUSTOMER,
    brand: MAPPER_DEFAULTS.EMPTY_PLACEHOLDER,
    color: MAPPER_DEFAULTS.EMPTY_PLACEHOLDER,
    vehicleType: MAPPER_DEFAULTS.DEFAULT_VEHICLE_TYPE,
    vehicleTypeId: MAPPER_DEFAULTS.DEFAULT_VEHICLE_TYPE_ID,
    vehicleTypeCode: MAPPER_DEFAULTS.DEFAULT_VEHICLE_TYPE_CODE,
    ticketType: ticket.type,
    ticketStatus: ticket.status,
    ticketExpiration: null,
    ticket,
    hasActiveTicket: false,
    slotCode,
    parkingPosition: null,
    parkingSlot: {
      slot: slotCode,
      display: slotCode !== MAPPER_DEFAULTS.UNASSIGNED_SLOT ? slotCode : "Chưa có vị trí",
      slotId: null,
      floorName: "",
      zoneCode: "",
    },
    status: isBlacklisted
      ? "BLACKLISTED"
      : isSessionOpen
      ? MAPPER_DEFAULTS.STATUS_PARKED
      : MAPPER_DEFAULTS.STATUS_ACTIVE,
    isBlacklisted: Boolean(isBlacklisted),
    rawLookup: {
      ...(openSession ? { open_session: openSession } : {}),
      is_blacklisted: Boolean(isBlacklisted),
      status: isBlacklisted ? "BLACKLISTED" : undefined,
    },
  };
}
