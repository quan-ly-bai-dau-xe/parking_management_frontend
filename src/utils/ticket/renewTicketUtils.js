import { FALLBACK_TICKET_TYPES } from "../../services/ticketService.js";
import {
  formatDateToDisplay,
  isValidDateFormat,
  parseDisplayToApiDate,
  REGEX_ISO_DATE,
} from "../dateUtils.js";

export const MS_PER_DAY = 86_400_000;
export const DEFAULT_TICKET_TYPE_NAME = "Vé tháng";
export const DEFAULT_EXTEND_DAYS = 30;
export const MIN_RENEW_PRICE_VND = 1;
export const AUTO_PRICE_ROUNDING_UNIT = 1000;
export const NON_RENEWABLE_STATUSES = Object.freeze(["cancelled", "terminated"]);

/**
 * Chuẩn hóa chuỗi ngày (ISO datetime, ISO YYYY-MM-DD hoặc DD/MM/YYYY) về dạng ISO YYYY-MM-DD.
 */
export function extractIsoDate(dateInput) {
  if (!dateInput || typeof dateInput !== "string") return "";
  const trimmed = dateInput.trim();
  if (!trimmed) return "";

  const isoPrefix = trimmed.slice(0, 10);
  if (REGEX_ISO_DATE.test(isoPrefix) && isValidDateFormat(isoPrefix)) {
    return isoPrefix;
  }

  return parseDisplayToApiDate(trimmed) || "";
}

/**
 * Lấy ngày hiện tại theo giờ địa phương ở định dạng ISO YYYY-MM-DD.
 */
export function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Cộng thêm số ngày vào chuỗi ISO YYYY-MM-DD theo lịch UTC thuần (không lệch múi giờ).
 */
export function addDaysToIsoDate(isoDate, days) {
  if (!isoDate || !REGEX_ISO_DATE.test(isoDate)) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d) + Number(days || 0) * MS_PER_DAY;
  const next = new Date(utcMs);
  const year = next.getUTCFullYear();
  const month = String(next.getUTCMonth() + 1).padStart(2, "0");
  const day = String(next.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Tính số ngày chênh lệch (toIso - fromIso).
 */
export function diffDaysIsoDate(fromIso, toIso) {
  if (!REGEX_ISO_DATE.test(fromIso || "") || !REGEX_ISO_DATE.test(toIso || "")) {
    return 0;
  }
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd);
  const toMs = Date.UTC(ty, tm - 1, td);
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

/**
 * Tra cứu cấu hình thời hạn & đơn giá mặc định theo tên hoặc mã loại vé.
 */
export function resolveTicketTypeMeta(ticketType) {
  const key = String(ticketType || DEFAULT_TICKET_TYPE_NAME).trim().toLowerCase();
  const found = FALLBACK_TICKET_TYPES.find(
    (item) =>
      item.name.toLowerCase() === key || item.code.toLowerCase() === key,
  );
  const target =
    found ||
    FALLBACK_TICKET_TYPES.find((item) => item.name === DEFAULT_TICKET_TYPE_NAME) ||
    FALLBACK_TICKET_TYPES[0];

  return {
    id: target.id,
    code: target.code,
    name: target.name,
    durationDays: target.duration_days || DEFAULT_EXTEND_DAYS,
    defaultPrice: Number(target.default_price) || 500_000,
  };
}

/**
 * Lấy ngày hết hạn cũ của vé ở dạng ISO YYYY-MM-DD.
 */
export function getTicketOldEndDateIso(ticket) {
  if (!ticket) return "";
  return (
    extractIsoDate(ticket.raw?.effective_to) ||
    extractIsoDate(ticket.endDate) ||
    ""
  );
}

/**
 * Lấy ngày mốc cơ sở để tính gia hạn: max(ngày hết hạn cũ, hôm nay).
 */
export function getRenewalBaseDateIso(ticket, todayIso = getTodayIsoDate()) {
  const oldEndIso = getTicketOldEndDateIso(ticket);
  if (oldEndIso && oldEndIso > todayIso) {
    return oldEndIso;
  }
  return todayIso;
}

/**
 * Tính toán giá trị mặc định (ngày hết hạn mới, giá gia hạn, ngày tối thiểu) khi mở modal hoặc đổi loại vé.
 */
export function computeDefaultRenewalValues(
  ticket,
  ticketTypeName,
  todayIso = getTodayIsoDate(),
) {
  const meta = resolveTicketTypeMeta(ticketTypeName || ticket?.ticketType);
  const baseDateIso = getRenewalBaseDateIso(ticket, todayIso);
  const defaultNewEndDate = addDaysToIsoDate(baseDateIso, meta.durationDays);
  const minNewEndDate = addDaysToIsoDate(baseDateIso, 1);

  return {
    ticketTypeId: meta.id,
    newEndDate: defaultNewEndDate,
    minNewEndDate,
    renewPrice: String(meta.defaultPrice),
    extendDays: meta.durationDays,
  };
}

/**
 * Tự động tính giá gia hạn dựa trên loại vé và số ngày gia hạn thực tế.
 */
export function calculateAutoRenewPrice({
  ticketTypeName,
  baseDateIso,
  newEndDateIso,
}) {
  const meta = resolveTicketTypeMeta(ticketTypeName);
  const days = diffDaysIsoDate(baseDateIso, newEndDateIso);
  if (days <= 0) return "";
  if (days === meta.durationDays) {
    return String(meta.defaultPrice);
  }
  const rawPrice = (meta.defaultPrice * days) / meta.durationDays;
  const rounded = Math.max(
    AUTO_PRICE_ROUNDING_UNIT,
    Math.round(rawPrice / AUTO_PRICE_ROUNDING_UNIT) * AUTO_PRICE_ROUNDING_UNIT,
  );
  return String(rounded);
}

/**
 * Kiểm tra hợp lệ dữ liệu gia hạn vé.
 */
export function validateRenewTicketForm(
  { ticket, newEndDate, renewPrice },
  todayIso = getTodayIsoDate(),
) {
  const errors = {};
  const ticketStatus = String(ticket?.status || "").trim().toLowerCase();

  if (NON_RENEWABLE_STATUSES.includes(ticketStatus)) {
    errors.form = "Vé đã hủy, không thể thực hiện gia hạn.";
  }

  const oldEndIso = getTicketOldEndDateIso(ticket);
  const normalizedNewEnd = extractIsoDate(newEndDate);

  if (!normalizedNewEnd) {
    errors.newEndDate = "Vui lòng chọn ngày hết hạn mới hợp lệ.";
  } else if (oldEndIso && normalizedNewEnd <= oldEndIso) {
    errors.newEndDate = `Ngày hết hạn mới phải sau ngày hết hạn cũ (${formatDateToDisplay(oldEndIso)}).`;
  } else if (normalizedNewEnd <= todayIso) {
    errors.newEndDate = `Ngày hết hạn mới phải sau ngày hôm nay (${formatDateToDisplay(todayIso)}).`;
  }

  const numericPrice = Number(renewPrice);
  if (
    renewPrice === "" ||
    renewPrice === null ||
    renewPrice === undefined ||
    !Number.isFinite(numericPrice) ||
    numericPrice < MIN_RENEW_PRICE_VND
  ) {
    errors.renewPrice = "Giá gia hạn phải lớn hơn 0đ.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
