export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

function isValidCalendarDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

function parseDateValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : { type: "instant", date: value };
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Date-only ISO: YYYY-MM-DD (keep exact calendar date without timezone shift)
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    if (!isValidCalendarDate(year, month, day)) return null;
    return {
      type: "date-only",
      year: String(year).padStart(4, "0"),
      month: String(month).padStart(2, "0"),
      day: String(day).padStart(2, "0"),
    };
  }

  // Already-formatted dd/MM/yyyy
  const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (!isValidCalendarDate(year, month, day)) return null;
    return {
      type: "date-only",
      year: String(year).padStart(4, "0"),
      month: String(month).padStart(2, "0"),
      day: String(day).padStart(2, "0"),
    };
  }

  // Truncate >3 microsecond digits so JS Date parses reliably across runtimes
  const normalized = trimmed.replace(/(\.\d{3})\d+/, "$1");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return { type: "instant", date: parsed };
}

function getVnParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  const hour = map.hour === "24" ? "00" : map.hour;
  return {
    day: map.day,
    month: map.month,
    year: map.year,
    hour,
    minute: map.minute,
    second: map.second,
  };
}

/**
 * Format ISO date or timestamp into "dd/MM/yyyy" in Asia/Ho_Chi_Minh.
 */
export function formatDateVN(value, fallback = "") {
  const parsed = parseDateValue(value);
  if (!parsed) return fallback;
  if (parsed.type === "date-only") {
    return `${parsed.day}/${parsed.month}/${parsed.year}`;
  }
  const { day, month, year } = getVnParts(parsed.date);
  return `${day}/${month}/${year}`;
}

/**
 * Format ISO date or timestamp into "HH:mm dd/MM/yyyy" in Asia/Ho_Chi_Minh.
 */
export function formatDateTimeVN(value, fallback = "") {
  const parsed = parseDateValue(value);
  if (!parsed) return fallback;
  if (parsed.type === "date-only") {
    return `00:00 ${parsed.day}/${parsed.month}/${parsed.year}`;
  }
  const { day, month, year, hour, minute } = getVnParts(parsed.date);
  return `${hour}:${minute} ${day}/${month}/${year}`;
}

/**
 * Format ISO timestamp into "HH:mm" in Asia/Ho_Chi_Minh.
 */
export function formatTimeVN(value, fallback = "") {
  const parsed = parseDateValue(value);
  if (!parsed) return fallback;
  if (parsed.type === "date-only") {
    return "00:00";
  }
  const { hour, minute } = getVnParts(parsed.date);
  return `${hour}:${minute}`;
}

/**
 * Format ISO timestamp into "HH:mm:ss" in Asia/Ho_Chi_Minh.
 */
export function formatTimeWithSecondsVN(value, fallback = "") {
  const parsed = parseDateValue(value);
  if (!parsed) return fallback;
  if (parsed.type === "date-only") {
    return "00:00:00";
  }
  const { hour, minute, second } = getVnParts(parsed.date);
  return `${hour}:${minute}:${second}`;
}

/**
 * Format slot reserved time: preserves short mock "HH:mm" strings while formatting ISO timestamps.
 */
export function formatReservedTimeDisplay(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return formatDateTimeVN(trimmed, fallback);
}

/**
 * Format string "dd/mm/yyyy" sang "YYYY-MM-DD" chuẩn ISO cho Backend API
 */
export function formatDisplayDateToIso(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * Format string "YYYY-MM-DD" hoặc ISO timestamp sang "dd/MM/yyyy" (Asia/Ho_Chi_Minh)
 */
export function formatIsoDateToDisplay(dateStr) {
  return formatDateVN(dateStr, "");
}

/**
 * Return local calendar date as "YYYY-MM-DD" without UTC day-shift.
 */
export function getLocalDateIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format effective_from for POST /api/v1/me/tickets/:
 * - Today (local): current ISO-8601 timestamp with UTC timezone so backend never treats midnight UTC as past.
 * - Future/other date "YYYY-MM-DD": local midnight with explicit timezone offset (e.g. T00:00:00+07:00).
 */
export function buildEffectiveFromIso(dateStr, now = new Date()) {
  if (!dateStr || typeof dateStr !== "string") {
    return now.toISOString();
  }
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return now.toISOString();
  }
  const todayLocal = getLocalDateIso(now);
  if (trimmed === todayLocal) {
    return now.toISOString();
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return trimmed;
  }
  const [, y, m, d] = match;
  const localMidnight = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
  if (Number.isNaN(localMidnight.getTime())) {
    return trimmed;
  }
  const offsetMinutes = -localMidnight.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offMins = String(absOffset % 60).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00${sign}${offHours}:${offMins}`;
}
