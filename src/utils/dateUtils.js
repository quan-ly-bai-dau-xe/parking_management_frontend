/**
 * dateUtils.js
 * Utility chuẩn hóa xử lý ngày tháng cho toàn bộ ứng dụng Frontend.
 * Tuân thủ AI Clean Code: Zero Magic Numbers, Pure Functions, bảo toàn ISO Date cho Backend Django.
 */

// --- Constants (Zero Magic Numbers) ---
export const MIN_VALID_YEAR = 1900;
export const MAX_VALID_YEAR = 2100;
export const DAYS_IN_MONTHS = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
export const LEAP_FEBRUARY_DAYS = 29;
export const REGULAR_FEBRUARY_DAYS = 28;
export const PAD_LENGTH = 2;
export const PAD_CHAR = "0";

export const DISPLAY_DATE_SEPARATOR = "/";
export const API_DATE_SEPARATOR = "-";

export const REGEX_ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const REGEX_DMY_DATE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
export const MAX_DATE_DIGITS = 8;

/**
 * Kiểm tra xem một năm có phải là năm nhuận không.
 * @param {number|string} year Năm cần kiểm tra
 * @returns {boolean} true nếu là năm nhuận
 */
export function isLeapYear(year) {
  if (year === null || year === undefined || year === "") return false;
  const y = Number(year);
  if (!Number.isInteger(y) || y <= 0) return false;
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Lấy số ngày tối đa của một tháng trong năm (tính cả năm nhuận).
 * @param {number|string} year
 * @param {number|string} month Tháng (1 - 12)
 * @returns {number} Số ngày của tháng
 */
export function getDaysInMonth(year, month) {
  if (year === null || year === undefined || month === null || month === undefined) return 0;
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) return 0;
  if (!Number.isInteger(y) || y <= 0) return 0;
  if (m === 2) {
    return isLeapYear(y) ? LEAP_FEBRUARY_DAYS : REGULAR_FEBRUARY_DAYS;
  }
  return DAYS_IN_MONTHS[m - 1];
}

/**
 * Kiểm tra xem chuỗi ngày có đúng định dạng DD/MM/YYYY (hoặc DD-MM-YYYY / ISO YYYY-MM-DD)
 * và có phải là ngày thực tế hợp lệ trên lịch hay không.
 *
 * @param {string} dateStr Chuỗi ngày nhập vào
 * @returns {boolean} true nếu hợp lệ
 */
export function isValidDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;
  const trimmed = dateStr.trim();
  if (!trimmed) return false;

  // Kiểm tra định dạng DD/MM/YYYY hoặc DD-MM-YYYY
  const dmyMatch = trimmed.match(REGEX_DMY_DATE);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    if (year < MIN_VALID_YEAR || year > MAX_VALID_YEAR) return false;
    if (month < 1 || month > 12) return false;
    const maxDays = getDaysInMonth(year, month);
    return day >= 1 && day <= maxDays;
  }

  // Kiểm tra định dạng ISO YYYY-MM-DD
  const isoMatch = trimmed.match(REGEX_ISO_DATE);
  if (isoMatch) {
    const [yearStr, monthStr, dayStr] = trimmed.split(API_DATE_SEPARATOR);
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (year < MIN_VALID_YEAR || year > MAX_VALID_YEAR) return false;
    if (month < 1 || month > 12) return false;
    const maxDays = getDaysInMonth(year, month);
    return day >= 1 && day <= maxDays;
  }

  return false;
}

/**
 * Chuyển đổi ngày từ nhiều nguồn (Date object, ISO YYYY-MM-DD, ISO timestamp) sang định dạng hiển thị chuẩn DD/MM/YYYY.
 *
 * @param {string|Date|null|undefined} dateInput
 * @param {string} [fallback=""] Giá trị trả về nếu dateInput rỗng hoặc không hợp lệ
 * @returns {string} Chuỗi định dạng "DD/MM/YYYY" hoặc fallback
 */
export function formatDateToDisplay(dateInput, fallback = "") {
  if (!dateInput) return fallback;

  if (dateInput instanceof Date) {
    if (Number.isNaN(dateInput.getTime())) return fallback;
    const day = String(dateInput.getDate()).padStart(PAD_LENGTH, PAD_CHAR);
    const month = String(dateInput.getMonth() + 1).padStart(PAD_LENGTH, PAD_CHAR);
    const year = dateInput.getFullYear();
    return `${day}${DISPLAY_DATE_SEPARATOR}${month}${DISPLAY_DATE_SEPARATOR}${year}`;
  }

  if (typeof dateInput !== "string") return fallback;
  const trimmed = dateInput.trim();
  if (!trimmed) return fallback;

  // Nếu là dạng ISO YYYY-MM-DD
  if (REGEX_ISO_DATE.test(trimmed)) {
    const [year, month, day] = trimmed.split(API_DATE_SEPARATOR);
    return `${day}${DISPLAY_DATE_SEPARATOR}${month}${DISPLAY_DATE_SEPARATOR}${year}`;
  }

  // Nếu đã là DD/MM/YYYY hoặc D/M/YYYY
  const dmyMatch = trimmed.match(REGEX_DMY_DATE);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(PAD_LENGTH, PAD_CHAR);
    const month = dmyMatch[2].padStart(PAD_LENGTH, PAD_CHAR);
    const year = dmyMatch[3];
    return `${day}${DISPLAY_DATE_SEPARATOR}${month}${DISPLAY_DATE_SEPARATOR}${year}`;
  }

  // Parse thử ISO datetime string
  const parsedDate = new Date(trimmed);
  if (!Number.isNaN(parsedDate.getTime())) {
    const day = String(parsedDate.getDate()).padStart(PAD_LENGTH, PAD_CHAR);
    const month = String(parsedDate.getMonth() + 1).padStart(PAD_LENGTH, PAD_CHAR);
    const year = parsedDate.getFullYear();
    return `${day}${DISPLAY_DATE_SEPARATOR}${month}${DISPLAY_DATE_SEPARATOR}${year}`;
  }

  return fallback || trimmed;
}

/**
 * Chuyển đổi chuỗi ngày hiển thị DD/MM/YYYY sang chuẩn ISO YYYY-MM-DD cho Backend API.
 * Kiểm tra chặt chẽ tính hợp lệ trên lịch (bao gồm năm nhuận).
 * Trả về null nếu không hợp lệ hoặc rỗng.
 *
 * @param {string|null|undefined} displayString
 * @returns {string|null} Chuỗi ISO "YYYY-MM-DD" hoặc null
 */
export function parseDisplayToApiDate(displayString) {
  if (!displayString || typeof displayString !== "string") return null;
  const trimmed = displayString.trim();
  if (!trimmed) return null;

  // Nếu đã ở dạng ISO YYYY-MM-DD
  if (REGEX_ISO_DATE.test(trimmed)) {
    return isValidDateFormat(trimmed) ? trimmed : null;
  }

  // Định dạng DD/MM/YYYY hoặc DD-MM-YYYY
  const dmyMatch = trimmed.match(REGEX_DMY_DATE);
  if (dmyMatch) {
    if (!isValidDateFormat(trimmed)) {
      return null;
    }
    const day = dmyMatch[1].padStart(PAD_LENGTH, PAD_CHAR);
    const month = dmyMatch[2].padStart(PAD_LENGTH, PAD_CHAR);
    const year = dmyMatch[3];
    return `${year}${API_DATE_SEPARATOR}${month}${API_DATE_SEPARATOR}${day}`;
  }

  return null;
}

/**
 * Định dạng ngày giờ hiển thị dạng "DD/MM/YYYY HH:mm".
 *
 * @param {string|Date|null|undefined} dateInput
 * @param {string} [fallback=""]
 * @returns {string} Chuỗi "DD/MM/YYYY HH:mm"
 */
export function formatDateTimeDisplay(dateInput, fallback = "") {
  if (!dateInput) return fallback;
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(date.getTime())) return fallback || String(dateInput);
    const day = String(date.getDate()).padStart(PAD_LENGTH, PAD_CHAR);
    const month = String(date.getMonth() + 1).padStart(PAD_LENGTH, PAD_CHAR);
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(PAD_LENGTH, PAD_CHAR);
    const minutes = String(date.getMinutes()).padStart(PAD_LENGTH, PAD_CHAR);
    return `${day}${DISPLAY_DATE_SEPARATOR}${month}${DISPLAY_DATE_SEPARATOR}${year} ${hours}:${minutes}`;
  } catch {
    return fallback || String(dateInput);
  }
}

/**
 * Tự động tạo mask "dd/mm/yyyy" khi người dùng nhập trên bàn phím.
 * Hỗ trợ tự động chèn dấu "/", xóa lùi (backspace), và paste ngày ISO YYYY-MM-DD.
 *
 * @param {string} rawInput Giá trị từ e.target.value
 * @returns {string} Chuỗi ngày đã được định dạng
 */
export function maskDateInput(rawInput) {
  if (!rawInput || typeof rawInput !== "string") return "";

  const trimmed = rawInput.trim();
  if (REGEX_ISO_DATE.test(trimmed)) {
    return formatDateToDisplay(trimmed);
  }

  const endsWithSlash = rawInput.endsWith("/") || rawInput.endsWith("-");
  const digits = rawInput.replace(/\D/g, "").slice(0, MAX_DATE_DIGITS);

  if (digits.length === 0) return "";

  if (digits.length <= 2) {
    return digits.length === 2 && endsWithSlash ? `${digits}/` : digits;
  }
  if (digits.length <= 4) {
    const formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits.length === 4 && endsWithSlash ? `${formatted}/` : formatted;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Aliases cho tương thích ngược 100% với các module hiện tại
export const formatDisplayDateToIso = parseDisplayToApiDate;
export const formatIsoDateToDisplay = formatDateToDisplay;
