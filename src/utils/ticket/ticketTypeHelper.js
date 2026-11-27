/**
 * ticketTypeHelper.js
 * Chuẩn hóa tên loại vé và nhãn cước phí miễn trừ cho phương tiện có vé định kỳ
 * Hỗ trợ Vé năm, Vé quý, Vé tháng, Vé ngày, Vé lượt và fallback an toàn.
 */

export const TICKET_TYPE_NAMES = {
  DAILY: "Vé ngày",
  MONTHLY: "Vé tháng",
  QUARTERLY: "Vé quý",
  YEARLY: "Vé năm",
  ONE_TIME: "Vé lượt",
  PERIODIC_FALLBACK: "Vé định kỳ",
};

/**
 * Chuẩn hóa mã hoặc tên loại vé thành tên hiển thị chuẩn tiếng Việt
 * @param {string|object|null|undefined} rawType 
 * @param {boolean} hasActiveTicket
 * @returns {string}
 */
export function normalizeTicketTypeName(rawType, hasActiveTicket = false) {
  if (!rawType || rawType === "—") {
    return hasActiveTicket ? TICKET_TYPE_NAMES.PERIODIC_FALLBACK : TICKET_TYPE_NAMES.ONE_TIME;
  }

  const typeStr = typeof rawType === "object"
    ? (rawType.ticket_type_name || rawType.name || rawType.label || rawType.code || rawType.type || "")
    : String(rawType);

  const trimmed = typeStr.trim();
  if (!trimmed || trimmed === "—") {
    return hasActiveTicket ? TICKET_TYPE_NAMES.PERIODIC_FALLBACK : TICKET_TYPE_NAMES.ONE_TIME;
  }

  const upper = trimmed.toUpperCase();
  if (upper === "DAILY") return TICKET_TYPE_NAMES.DAILY;
  if (upper === "MONTHLY") return TICKET_TYPE_NAMES.MONTHLY;
  if (upper === "QUARTERLY") return TICKET_TYPE_NAMES.QUARTERLY;
  if (upper === "YEARLY") return TICKET_TYPE_NAMES.YEARLY;
  if (upper === "ONE_TIME" || upper === "SINGLE") return TICKET_TYPE_NAMES.ONE_TIME;

  return trimmed;
}

/**
 * Trích xuất tên loại vé chính xác nhất từ nhiều nguồn dữ liệu (backend fee preview, vehicle, session, scan)
 * @param {object} sources
 * @returns {string|null} Tên loại vé nếu tìm thấy, null nếu không có
 */
export function resolveTicketTypeName({
  backendFeePreview = null,
  matchedVehicle = null,
  rawLookup = null,
  scanDetails = null,
  session = null,
  hasValidTicket = false,
} = {}) {
  const isTicketActive = Boolean(
    backendFeePreview?.has_active_ticket ||
    backendFeePreview?.is_exempt ||
    matchedVehicle?.hasActiveTicket ||
    matchedVehicle?.ticketState === "active" ||
    matchedVehicle?.ticket?.status === "active" ||
    matchedVehicle?.ticket?.is_valid === true ||
    session?.hasActiveTicket ||
    hasValidTicket
  );

  const candidateType =
    backendFeePreview?.ticket_type_name ||
    backendFeePreview?.ticket_type ||
    backendFeePreview?.ticketType ||
    session?.ticketType ||
    session?.ticket_type_name ||
    session?.ticket_type ||
    session?.ticket?.ticket_type_name ||
    session?.ticket?.type ||
    matchedVehicle?.ticket?.ticket_type_name ||
    matchedVehicle?.ticketType ||
    matchedVehicle?.ticket?.type ||
    rawLookup?.ticket_info?.ticket_type_name ||
    rawLookup?.ticket_info?.type ||
    rawLookup?.open_session?.ticket_type_name ||
    rawLookup?.open_session?.ticket_type ||
    scanDetails?.ticketType ||
    scanDetails?.ticket_type_name ||
    null;

  if (candidateType) {
    return normalizeTicketTypeName(candidateType, isTicketActive);
  }

  return isTicketActive ? TICKET_TYPE_NAMES.PERIODIC_FALLBACK : null;
}

/**
 * Tạo nhãn hiển thị cước phí 0đ cho xe có vé hiệu lực
 * Ví dụ: "0đ (Vé năm có hiệu lực)", "0đ (Vé quý có hiệu lực)", "0đ (Vé định kỳ có hiệu lực)"
 * @param {string|null|undefined} ticketTypeName 
 * @returns {string}
 */
export function formatActiveTicketFeeLabel(ticketTypeName) {
  const typeName = ticketTypeName && ticketTypeName !== "—"
    ? ticketTypeName
    : TICKET_TYPE_NAMES.PERIODIC_FALLBACK;
  return `0đ (${typeName} có hiệu lực)`;
}

/**
 * Tạo mô tả breakdown cước phí cho xe có vé hiệu lực
 * @param {string|null|undefined} ticketTypeName 
 * @returns {string}
 */
export function formatActiveTicketBreakdown(ticketTypeName) {
  const typeName = ticketTypeName && ticketTypeName !== "—"
    ? ticketTypeName
    : TICKET_TYPE_NAMES.PERIODIC_FALLBACK;
  return `Được đài thọ bởi ${typeName.toLowerCase()} hiệu lực`;
}
