/**
 * File thử nghiệm độc lập: Demo Experiment Helper
 * Đường dẫn: parking_management_frontend/src/experiments/demo_experiment.ts
 *
 * Mục đích:
 * Thử nghiệm hàm định dạng biển số xe (License Plate Formatter) chuẩn hóa theo định dạng Việt Nam thông dụng.
 * File hoàn toàn độc lập, không phụ thuộc vào các module khác trong dự án.
 */

const STANDARD_PLATE_REGEX = /^([0-9]{2}[A-Z]{1,2})([0-9]{4,5})$/;
const SEPARATOR = '-';
const DOT = '.';

export interface FormattedLicensePlate {
  raw: string;
  formatted: string;
  isValid: boolean;
}

/**
 * Chuẩn hóa và định dạng chuỗi biển số xe mẫu.
 * Ví dụ: '29A12345' -> '29A-123.45', '51F1234' -> '51F-1234'
 *
 * @param input Chuỗi biển số xe thô cần định dạng
 * @returns Object chứa biển số thô, biển số đã format và cờ kiểm tra hợp lệ
 */
export function formatLicensePlate(input: string): FormattedLicensePlate {
  if (!input || typeof input !== 'string') {
    return {
      raw: '',
      formatted: '',
      isValid: false,
    };
  }

  // Loại bỏ khoảng trắng và ký tự đặc biệt, chuyển thành chữ hoa
  const cleanStr = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const match = cleanStr.match(STANDARD_PLATE_REGEX);

  if (!match) {
    return {
      raw: input,
      formatted: cleanStr,
      isValid: false,
    };
  }

  const [, prefix, numbers] = match;

  let formattedNumber = numbers;
  if (numbers.length === 5) {
    // Định dạng 5 số: 123.45
    formattedNumber = `${numbers.slice(0, 3)}${DOT}${numbers.slice(3)}`;
  }

  return {
    raw: input,
    formatted: `${prefix}${SEPARATOR}${formattedNumber}`,
    isValid: true,
  };
}

/**
 * Thử nghiệm tính toán thời gian đỗ xe mẫu (theo phút).
 *
 * @param entryTime Thời điểm vào (chuỗi ISO hoặc Date)
 * @param exitTime Thời điểm ra (chuỗi ISO hoặc Date)
 * @returns Tổng số phút đã đỗ (làm tròn lên), hoặc 0 nếu thời gian không hợp lệ
 */
export function calculateParkingDurationMinutes(
  entryTime: string | Date,
  exitTime: string | Date = new Date()
): number {
  const start = new Date(entryTime).getTime();
  const end = new Date(exitTime).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0;
  }

  const MILLISECONDS_PER_MINUTE = 60 * 1000;
  const diffMs = end - start;

  return Math.ceil(diffMs / MILLISECONDS_PER_MINUTE);
}
