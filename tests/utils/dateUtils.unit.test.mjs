import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  isLeapYear,
  getDaysInMonth,
  isValidDateFormat,
  formatDateToDisplay,
  parseDisplayToApiDate,
  formatDateTimeDisplay,
  maskDateInput,
  formatDisplayDateToIso,
  formatIsoDateToDisplay,
  MIN_VALID_YEAR,
  MAX_VALID_YEAR,
  LEAP_FEBRUARY_DAYS,
  REGULAR_FEBRUARY_DAYS,
} from "#src/utils/dateUtils.js";
import * as formatDateTimeModule from "#src/utils/formatDateTime.js";
import { mapCustomerFormToBackendPayload } from "#src/utils/customer/customerFormMapper.js";
import { CustomerBirthdaySchema } from "#src/schemas/customerSchema.js";
import { createVisualAuditor } from "../helpers/testVisualReporter.mjs";

const auditor = createVisualAuditor("dateUtils & Calendar Validation Matrix", { after });

test("DATE-01: isLeapYear correctly determines leap and common years", () => {
  // Năm chia hết cho 4 nhưng không chia hết cho 100
  auditor.verify("isLeapYear: 2024 (Chia hết cho 4)", 2024, isLeapYear(2024), true);
  auditor.verify("isLeapYear: 2028 (Chia hết cho 4)", 2028, isLeapYear(2028), true);
  auditor.verify("isLeapYear: '2024' (String)", "2024", isLeapYear("2024"), true);

  // Năm chia hết cho 400
  auditor.verify("isLeapYear: 2000 (Thế kỷ chia hết cho 400)", 2000, isLeapYear(2000), true);
  auditor.verify("isLeapYear: 2400 (Thế kỷ chia hết cho 400)", 2400, isLeapYear(2400), true);

  // Năm không chia hết cho 4
  auditor.verify("isLeapYear: 2023 (Năm thường)", 2023, isLeapYear(2023), false);
  auditor.verify("isLeapYear: 2025 (Năm thường)", 2025, isLeapYear(2025), false);

  // Năm chia hết cho 100 nhưng không chia hết cho 400
  auditor.verify("isLeapYear: 1900 (Thế kỷ chia hết cho 100 ko 400)", 1900, isLeapYear(1900), false);
  auditor.verify("isLeapYear: 2100 (Thế kỷ chia hết cho 100 ko 400)", 2100, isLeapYear(2100), false);

  // Edge cases
  auditor.verify("isLeapYear: null", null, isLeapYear(null), false);
  auditor.verify("isLeapYear: 'abc' (Chuỗi rác)", "abc", isLeapYear("abc"), false);
  auditor.verify("isLeapYear: undefined", undefined, isLeapYear(undefined), false);
});

test("DATE-02: getDaysInMonth returns accurate calendar days for all months", () => {
  // Tháng 2 năm nhuận vs thường
  auditor.verify("getDaysInMonth: Tháng 2 năm nhuận 2024", { year: 2024, month: 2 }, getDaysInMonth(2024, 2), LEAP_FEBRUARY_DAYS);
  auditor.verify("getDaysInMonth: Tháng 2 năm thường 2023", { year: 2023, month: 2 }, getDaysInMonth(2023, 2), REGULAR_FEBRUARY_DAYS);
  auditor.verify("getDaysInMonth: Tháng 2 thế kỷ nhuận 2000", { year: 2000, month: 2 }, getDaysInMonth(2000, 2), LEAP_FEBRUARY_DAYS);
  auditor.verify("getDaysInMonth: Tháng 2 thế kỷ thường 1900", { year: 1900, month: 2 }, getDaysInMonth(1900, 2), REGULAR_FEBRUARY_DAYS);

  // Tháng 31 ngày
  const months31 = [1, 3, 5, 7, 8, 10, 12];
  for (const m of months31) {
    assert.equal(getDaysInMonth(2026, m), 31, `Tháng ${m} phải có 31 ngày`);
  }
  auditor.verify("getDaysInMonth: Tháng 1 (31 ngày chuẩn)", { year: 2026, month: 1 }, getDaysInMonth(2026, 1), 31);
  auditor.verify("getDaysInMonth: Tháng 12 (31 ngày chuẩn)", { year: 2026, month: 12 }, getDaysInMonth(2026, 12), 31);

  // Tháng 30 ngày
  const months30 = [4, 6, 9, 11];
  for (const m of months30) {
    assert.equal(getDaysInMonth(2026, m), 30, `Tháng ${m} phải có 30 ngày`);
  }
  auditor.verify("getDaysInMonth: Tháng 4 (30 ngày chuẩn)", { year: 2026, month: 4 }, getDaysInMonth(2026, 4), 30);

  // Invalid months
  auditor.verify("getDaysInMonth: Tháng 0 không hợp lệ", { year: 2026, month: 0 }, getDaysInMonth(2026, 0), 0);
  auditor.verify("getDaysInMonth: Tháng 13 không hợp lệ", { year: 2026, month: 13 }, getDaysInMonth(2026, 13), 0);
  auditor.verify("getDaysInMonth: Tháng 'invalid'", { year: 2026, month: "invalid" }, getDaysInMonth(2026, "invalid"), 0);
});

test("DATE-03: isValidDateFormat validates calendar correctness and edge cases", () => {
  // Hợp lệ định dạng DD/MM/YYYY
  auditor.verify("isValidDate: Ngày chuẩn '23/11/2026'", "23/11/2026", isValidDateFormat("23/11/2026"), true);
  auditor.verify("isValidDate: Ngày đầu năm '01/01/2000'", "01/01/2000", isValidDateFormat("01/01/2000"), true);
  auditor.verify("isValidDate: Ngày cuối năm '31/12/1999'", "31/12/1999", isValidDateFormat("31/12/1999"), true);
  auditor.verify("isValidDate: Rút gọn '5/8/1995'", "5/8/1995", isValidDateFormat("5/8/1995"), true);

  // Hợp lệ định dạng DD-MM-YYYY
  auditor.verify("isValidDate: Dấu gạch ngang '23-11-2026'", "23-11-2026", isValidDateFormat("23-11-2026"), true);
  auditor.verify("isValidDate: Dấu gạch ngang '01-01-2000'", "01-01-2000", isValidDateFormat("01-01-2000"), true);

  // Hợp lệ ngày nhuận 29/02/2024 & 29/02/2000
  auditor.verify("isValidDate: Nhuận '29/02/2024'", "29/02/2024", isValidDateFormat("29/02/2024"), true);
  auditor.verify("isValidDate: Nhuận thế kỷ '29/02/2000'", "29/02/2000", isValidDateFormat("29/02/2000"), true);

  // Không hợp lệ: 29/02 năm không nhuận
  auditor.verify("isValidDate: Vô lý '29/02/2023' (năm thường)", "29/02/2023", isValidDateFormat("29/02/2023"), false);
  auditor.verify("isValidDate: Vô lý '29/02/1900' (thế kỷ thường)", "29/02/1900", isValidDateFormat("29/02/1900"), false);
  auditor.verify("isValidDate: Vô lý '29/02/2026'", "29/02/2026", isValidDateFormat("29/02/2026"), false);

  // Không hợp lệ: ngày vượt quá số ngày của tháng
  auditor.verify("isValidDate: Vô lý '31/04/2026' (tháng 4 có 30 ngày)", "31/04/2026", isValidDateFormat("31/04/2026"), false);
  auditor.verify("isValidDate: Vô lý '31/06/2026' (tháng 6 có 30 ngày)", "31/06/2026", isValidDateFormat("31/06/2026"), false);
  auditor.verify("isValidDate: Vô lý '32/01/2026' (vượt ngày)", "32/01/2026", isValidDateFormat("32/01/2026"), false);
  auditor.verify("isValidDate: Vô lý '00/01/2026' (ngày 0)", "00/01/2026", isValidDateFormat("00/01/2026"), false);

  // Không hợp lệ: tháng ngoài 1-12
  auditor.verify("isValidDate: Vô lý '15/13/2026' (tháng 13)", "15/13/2026", isValidDateFormat("15/13/2026"), false);
  auditor.verify("isValidDate: Vô lý '15/00/2026' (tháng 0)", "15/00/2026", isValidDateFormat("15/00/2026"), false);

  // Hợp lệ định dạng ISO YYYY-MM-DD
  auditor.verify("isValidDate: ISO chuẩn '2026-11-23'", "2026-11-23", isValidDateFormat("2026-11-23"), true);
  auditor.verify("isValidDate: ISO nhuận '2024-02-29'", "2024-02-29", isValidDateFormat("2024-02-29"), true);
  auditor.verify("isValidDate: ISO không nhuận '2023-02-29'", "2023-02-29", isValidDateFormat("2023-02-29"), false);

  // Năm ngoài giới hạn MIN_VALID_YEAR - MAX_VALID_YEAR
  auditor.verify(`isValidDate: Năm < MIN '${MIN_VALID_YEAR - 1}'`, `15/08/${MIN_VALID_YEAR - 1}`, isValidDateFormat(`15/08/${MIN_VALID_YEAR - 1}`), false);
  auditor.verify(`isValidDate: Năm > MAX '${MAX_VALID_YEAR + 1}'`, `15/08/${MAX_VALID_YEAR + 1}`, isValidDateFormat(`15/08/${MAX_VALID_YEAR + 1}`), false);

  // Chuỗi rỗng, null, undefined, format rác
  auditor.verify("isValidDate: Chuỗi rỗng ''", "", isValidDateFormat(""), false);
  auditor.verify("isValidDate: null", null, isValidDateFormat(null), false);
  auditor.verify("isValidDate: undefined", undefined, isValidDateFormat(undefined), false);
  auditor.verify("isValidDate: Chuỗi rác 'abc'", "abc", isValidDateFormat("abc"), false);
  auditor.verify("isValidDate: Format '2026/11/23' (gạch chéo ngược)", "2026/11/23", isValidDateFormat("2026/11/23"), false);
});

test("DATE-04: formatDateToDisplay formats various inputs to DD/MM/YYYY", () => {
  // ISO date string YYYY-MM-DD
  auditor.verify("formatDateToDisplay: ISO '2026-11-23'", "2026-11-23", formatDateToDisplay("2026-11-23"), "23/11/2026");
  auditor.verify("formatDateToDisplay: ISO '1995-08-05'", "1995-08-05", formatDateToDisplay("1995-08-05"), "05/08/1995");

  // Đã là DD/MM/YYYY
  auditor.verify("formatDateToDisplay: Giữ nguyên '23/11/2026'", "23/11/2026", formatDateToDisplay("23/11/2026"), "23/11/2026");

  // Rút gọn D/M/YYYY -> chuẩn hóa thêm 0 phía trước
  auditor.verify("formatDateToDisplay: Chuẩn hóa '5/8/1995'", "5/8/1995", formatDateToDisplay("5/8/1995"), "05/08/1995");
  auditor.verify("formatDateToDisplay: Chuẩn hóa '5-8-1995'", "5-8-1995", formatDateToDisplay("5-8-1995"), "05/08/1995");

  // Date instance
  const d = new Date(2026, 10, 23); // Tháng 11 (0-indexed 10)
  auditor.verify("formatDateToDisplay: Date instance (23/11/2026)", d, formatDateToDisplay(d), "23/11/2026");

  // Date instance invalid
  auditor.verify("formatDateToDisplay: Invalid Date", new Date("invalid"), formatDateToDisplay(new Date("invalid")), "");
  auditor.verify("formatDateToDisplay: Invalid Date với fallback '—'", new Date("invalid"), formatDateToDisplay(new Date("invalid"), "—"), "—");

  // Chuỗi rỗng, null, undefined trả về fallback
  auditor.verify("formatDateToDisplay: Chuỗi rỗng", "", formatDateToDisplay(""), "");
  auditor.verify("formatDateToDisplay: null", null, formatDateToDisplay(null), "");
  auditor.verify("formatDateToDisplay: undefined", undefined, formatDateToDisplay(undefined), "");
  auditor.verify("formatDateToDisplay: null với fallback '—'", null, formatDateToDisplay(null, "—"), "—");
  auditor.verify("formatDateToDisplay: Chuỗi rỗng với fallback '—'", "", formatDateToDisplay("", "—"), "—");
});

test("DATE-05: parseDisplayToApiDate converts DD/MM/YYYY to ISO YYYY-MM-DD for Django Backend", () => {
  // Chuẩn DD/MM/YYYY -> YYYY-MM-DD
  auditor.verify("parseDisplayToApiDate: Chuẩn '23/11/2026'", "23/11/2026", parseDisplayToApiDate("23/11/2026"), "2026-11-23");
  auditor.verify("parseDisplayToApiDate: Chuẩn '15/08/1995'", "15/08/1995", parseDisplayToApiDate("15/08/1995"), "1995-08-15");
  auditor.verify("parseDisplayToApiDate: Chuẩn '01/01/2000'", "01/01/2000", parseDisplayToApiDate("01/01/2000"), "2000-01-01");

  // D/M/YYYY với 1 chữ số
  auditor.verify("parseDisplayToApiDate: Rút gọn '5/8/1995'", "5/8/1995", parseDisplayToApiDate("5/8/1995"), "1995-08-05");
  auditor.verify("parseDisplayToApiDate: Rút gọn '1/1/2000'", "1/1/2000", parseDisplayToApiDate("1/1/2000"), "2000-01-01");

  // DD-MM-YYYY
  auditor.verify("parseDisplayToApiDate: Gạch ngang '23-11-2026'", "23-11-2026", parseDisplayToApiDate("23-11-2026"), "2026-11-23");

  // Đã là ISO YYYY-MM-DD hợp lệ -> giữ nguyên
  auditor.verify("parseDisplayToApiDate: ISO '2026-11-23'", "2026-11-23", parseDisplayToApiDate("2026-11-23"), "2026-11-23");

  // Năm nhuận 29/02/2024
  auditor.verify("parseDisplayToApiDate: Nhuận '29/02/2024'", "29/02/2024", parseDisplayToApiDate("29/02/2024"), "2024-02-29");

  // Ngày không hợp lệ trên lịch -> trả về null để không gửi rác lên backend
  auditor.verify("parseDisplayToApiDate: Vô lý '29/02/2023' (null)", "29/02/2023", parseDisplayToApiDate("29/02/2023"), null);
  auditor.verify("parseDisplayToApiDate: Vô lý '31/04/2026' (null)", "31/04/2026", parseDisplayToApiDate("31/04/2026"), null);
  auditor.verify("parseDisplayToApiDate: Rác '99/99/9999' (null)", "99/99/9999", parseDisplayToApiDate("99/99/9999"), null);
  auditor.verify("parseDisplayToApiDate: Rác 'abc' (null)", "abc", parseDisplayToApiDate("abc"), null);
  auditor.verify("parseDisplayToApiDate: Rỗng '' (null)", "", parseDisplayToApiDate(""), null);
  auditor.verify("parseDisplayToApiDate: null", null, parseDisplayToApiDate(null), null);
  auditor.verify("parseDisplayToApiDate: undefined", undefined, parseDisplayToApiDate(undefined), null);
});

test("DATE-06: maskDateInput auto-formats keyboard typing into dd/mm/yyyy", () => {
  // Gõ từng số
  auditor.verify("maskDateInput: Gõ 1 số '1'", "1", maskDateInput("1"), "1");
  auditor.verify("maskDateInput: Gõ 2 số '15'", "15", maskDateInput("15"), "15");
  auditor.verify("maskDateInput: Gõ '15/'", "15/", maskDateInput("15/"), "15/");
  auditor.verify("maskDateInput: Gõ 3 số '150'", "150", maskDateInput("150"), "15/0");
  auditor.verify("maskDateInput: Gõ 4 số '1508'", "1508", maskDateInput("1508"), "15/08");
  auditor.verify("maskDateInput: Gõ '15/08/'", "15/08/", maskDateInput("15/08/"), "15/08/");
  auditor.verify("maskDateInput: Gõ 5 số '15081'", "15081", maskDateInput("15081"), "15/08/1");
  auditor.verify("maskDateInput: Đủ 8 số '15081995'", "15081995", maskDateInput("15081995"), "15/08/1995");

  // Không vượt quá 8 chữ số
  auditor.verify("maskDateInput: Chặn vượt 8 số '15081995999'", "15081995999", maskDateInput("15081995999"), "15/08/1995");

  // Paste định dạng ISO YYYY-MM-DD
  auditor.verify("maskDateInput: Paste ISO '1995-08-15'", "1995-08-15", maskDateInput("1995-08-15"), "15/08/1995");

  // Chuỗi rỗng / null / undefined
  auditor.verify("maskDateInput: Rỗng ''", "", maskDateInput(""), "");
  auditor.verify("maskDateInput: null", null, maskDateInput(null), "");
  auditor.verify("maskDateInput: undefined", undefined, maskDateInput(undefined), "");
});

test("DATE-07: formatDateTimeDisplay formats datetime correctly", () => {
  auditor.verify("formatDateTimeDisplay: Rỗng ''", "", formatDateTimeDisplay(""), "");
  auditor.verify("formatDateTimeDisplay: null với '—'", null, formatDateTimeDisplay(null, "—"), "—");
  auditor.verify("formatDateTimeDisplay: 'invalid-date' với '—'", "invalid-date", formatDateTimeDisplay("invalid-date", "—"), "—");

  const d = new Date(2026, 10, 23, 14, 30);
  auditor.verify("formatDateTimeDisplay: Date(2026-11-23 14:30)", d, formatDateTimeDisplay(d), "23/11/2026 14:30");
});

test("DATE-08: formatDateTime.js maintains 100% backward compatibility", () => {
  auditor.verify("formatDisplayDateToIso: '23/11/2026'", "23/11/2026", formatDateTimeModule.formatDisplayDateToIso("23/11/2026"), "2026-11-23");
  auditor.verify("formatIsoDateToDisplay: '2026-11-23'", "2026-11-23", formatDateTimeModule.formatIsoDateToDisplay("2026-11-23"), "23/11/2026");
  assert.equal(typeof formatDateTimeModule.isValidDateFormat, "function");
  assert.equal(typeof formatDateTimeModule.formatDateToDisplay, "function");
  assert.equal(typeof formatDateTimeModule.parseDisplayToApiDate, "function");
  assert.equal(typeof formatDateTimeModule.maskDateInput, "function");
});

test("DATE-09: mapCustomerFormToBackendPayload correctly handles display date dd/mm/yyyy", () => {
  const formStateWithDmy = {
    name: "Trần Thị B",
    phone: "0912345678",
    idNumber: "079195001234",
    birthday: "15/08/1995",
    gender: "Nữ",
    status: "Đang hoạt động",
  };

  const payload = mapCustomerFormToBackendPayload(formStateWithDmy);
  auditor.verify("mapCustomerPayload: full_name", formStateWithDmy.name, payload.full_name, "Trần Thị B");
  auditor.verify("mapCustomerPayload: date_of_birth DD/MM/YYYY -> ISO", formStateWithDmy.birthday, payload.date_of_birth, "1995-08-15");
  auditor.verify("mapCustomerPayload: status", formStateWithDmy.status, payload.status, "ACTIVE");

  // Với ngày sinh rỗng
  const formStateNoDob = {
    name: "Nguyễn Văn C",
    phone: "0909888777",
    idNumber: "079195009999",
    birthday: "",
  };
  const payloadNoDob = mapCustomerFormToBackendPayload(formStateNoDob);
  auditor.verify("mapCustomerPayload: date_of_birth rỗng -> undefined", formStateNoDob.birthday, payloadNoDob.date_of_birth, undefined);

  // Với ngày sinh không hợp lệ trên lịch (vd: 31/02/1995)
  const formStateInvalidDob = {
    name: "Lê Văn D",
    phone: "0909111222",
    idNumber: "079195008888",
    birthday: "31/02/1995",
  };
  const payloadInvalidDob = mapCustomerFormToBackendPayload(formStateInvalidDob);
  auditor.verify("mapCustomerPayload: 31/02/1995 không gửi lên backend", formStateInvalidDob.birthday, payloadInvalidDob.date_of_birth, undefined);
});

test("DATE-10: CustomerBirthdaySchema validates with Zod", () => {
  auditor.verify("CustomerBirthdaySchema: Hợp lệ '15/08/1995'", "15/08/1995", CustomerBirthdaySchema.parse("15/08/1995"), "15/08/1995");
  auditor.verify("CustomerBirthdaySchema: Chuỗi rỗng ''", "", CustomerBirthdaySchema.parse(""), "");
  auditor.verify("CustomerBirthdaySchema: Khoảng trắng '   '", "   ", CustomerBirthdaySchema.parse("   "), "");

  auditor.verifyThrows(
    "CustomerBirthdaySchema: Bắt lỗi '31/02/2024'",
    "31/02/2024",
    () => CustomerBirthdaySchema.parse("31/02/2024"),
    /Ngày sinh không đúng định dạng dd\/mm\/yyyy hoặc ngày không hợp lệ trên lịch/
  );
  auditor.verifyThrows(
    "CustomerBirthdaySchema: Bắt lỗi '99/99/9999'",
    "99/99/9999",
    () => CustomerBirthdaySchema.parse("99/99/9999"),
    /Ngày sinh không đúng định dạng dd\/mm\/yyyy hoặc ngày không hợp lệ trên lịch/
  );
});
