/**
 * mockConfig.js
 * Cấu hình chế độ Mock dữ liệu cho toàn bộ Frontend.
 * 
 * Cho phép:
 * 1. Bật / tắt mock toàn cục mặc định (DEFAULT_MOCK_ALL).
 * 2. Cấu hình mock chi tiết (override) theo từng module/file riêng biệt.
 * 3. Đọc biến môi trường VITE_USE_MOCK hoặc lưu cấu hình tạm vào localStorage để dev dễ switch.
 */

// Chế độ mặc định toàn cục khi module đó không được chỉ định riêng:
// - true: Mặc định tất cả dùng mock (trừ các module đặt false)
// - false: Mặc định tất cả gọi backend thật (trừ các module đặt true)
const ENV_MOCK = import.meta.env?.VITE_USE_MOCK?.trim().toLowerCase();
export const DEFAULT_MOCK_ALL = ENV_MOCK === "true";

/**
 * Cấu hình mock theo từng phân hệ / chức năng cụ thể.
 * Các giá trị hợp lệ cho từng module:
 * - true:  Luôn luôn dùng mock cho module này.
 * - false: Luôn luôn gọi API Backend thật cho module này.
 * - undefined / null: Kế thừa giá trị mặc định của DEFAULT_MOCK_ALL (hoặc fallback tự động khi backend 404).
 */
export const MODULE_MOCK_CONFIG = {
  // 1. Quản lý phương tiện (Vehicle Management)
  vehicles: false,

  // 2. Quản lý vé đỗ xe (Ticket Management)
  tickets: false,

  // 3. Sơ đồ & vị trí bãi đỗ xe (Parking Lot & Slots)
  parkingLot: false,

  // 4. Tổng hợp & Báo cáo Dashboard (Reports & Analytics)
  dashboard: false,

  // 5. Quản lý khách hàng (Customer Management)
  customers: false,

  // 6. Phiên đỗ xe & Barrier Check-in/Check-out (Sessions)
  parkingSessions: false,

  // 7. Nhận diện biển số xe (Plate Scans & OCR)
  plateScans: false,

  // 8. Quản lý nhân viên (Employee Management)
  employees: false,

  // 9. Ví khách hàng (Customer Wallet - Mô phỏng an toàn vì backend chưa có DB ví)
  wallet: false,
};

/**
 * Hàm kiểm tra một module cụ thể có đang bật chế độ mock hay không.
 * @param {string} moduleKey - Tên module trong MODULE_MOCK_CONFIG (vd: 'vehicles', 'tickets', ...)
 * @returns {boolean} true nếu dùng mock, false nếu gọi API thật.
 */
export function isMockEnabled(moduleKey) {
  // 1. Kiểm tra cấu hình cụ thể trong MODULE_MOCK_CONFIG trước (Định nghĩa trong code là ưu tiên số 1)
  if (moduleKey && typeof MODULE_MOCK_CONFIG[moduleKey] === "boolean") {
    return MODULE_MOCK_CONFIG[moduleKey];
  }

  // 2. Kiểm tra override trong localStorage nếu có (tiện cho dev test nhanh trên trình duyệt khi module chưa được set cố định)
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const localOverride = window.localStorage.getItem(`MOCK_${moduleKey.toUpperCase()}`);
      if (localOverride === "true") return true;
      if (localOverride === "false") return false;

      const globalOverride = window.localStorage.getItem("MOCK_ALL");
      if (globalOverride === "true") return true;
      if (globalOverride === "false") return false;
    }
  } catch {
    // Ignore storage errors in test or restricted environments
  }

  // 3. Kế thừa cờ cấu hình toàn cục
  return DEFAULT_MOCK_ALL;
}
