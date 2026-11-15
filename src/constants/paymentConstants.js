/**
 * paymentConstants.js
 * Tập trung hóa toàn bộ hằng số về tài chính, số dư ví, các gói nạp và phương thức thanh toán.
 * 
 * ⚠️ QUAN TRỌNG VỀ AN TOÀN TÀI CHÍNH (FINANCIAL SAFETY GUARDRAIL):
 * - Toàn bộ dữ liệu số dư ví (Wallet Balance), tiền nạp (Deposit) ở Frontend HIỆN TẠI LÀ DỮ LIỆU MÔ PHỎNG (MOCK/SIMULATION).
 * - Backend chưa triển khai bảng ví điện tử và API thanh toán thật (PostgreSQL chỉ hỗ trợ CASH và VIETQR tĩnh).
 * - Mọi giao dịch trừ ví ở Frontend chỉ có giá trị mô phỏng UI/UX, KHÔNG ĐƯỢC coi là giao dịch tiền tệ thật.
 * - Khi kết nối Backend thật, BẮT BUỘC phải lấy số dư và trừ tiền thông qua API Backend có chữ ký số / idempotency token,
 *   tuyệt đối không tin cậy state cục bộ của client.
 */

// Cờ đánh dấu chế độ mô phỏng tài chính cho môi trường hiện tại
export const IS_PAYMENT_SIMULATION = true;
export const SIMULATION_DISCLAIMER_TEXT = "Dữ liệu ví mô phỏng (Chưa kết nối cổng thanh toán thật)";

// Phương thức thanh toán được hỗ trợ trên hệ thống
export const PAYMENT_METHODS = {
  WALLET: "WALLET", // Mô phỏng ví Smart Parking
  VNPAY: "VNPAY",   // Quẹt POS / VNPAY-QR
  VIETQR: "VIETQR", // VietQR Napas 247
  CASH: "CASH",     // Tiền mặt tại barrier
};

// Cấu hình ví điện tử mô phỏng Smart Parking
export const WALLET_CONFIG = {
  // Số dư mặc định hiển thị cho người dùng đã liên kết app (Mô phỏng - KHÔNG PHẢI TIỀN THẬT)
  DEFAULT_INITIAL_BALANCE_VND: 250000,
  // Số dư tối thiểu để cảnh báo người dùng cần nạp tiền
  LOW_BALANCE_THRESHOLD_VND: 20000,
  // Các mệnh giá nạp tiền nhanh đề xuất qua cổng VNPAY mô phỏng
  DEPOSIT_PRESET_AMOUNTS_VND: [50000, 100000, 200000, 500000, 1000000, 2000000],
  // Mệnh giá nạp mặc định khi mở modal
  DEFAULT_DEPOSIT_AMOUNT_VND: 100000,
};

// Định dạng tiền tệ VND chuẩn thống nhất toàn ứng dụng
export function formatCurrencyVND(amount) {
  const num = Number(amount) || 0;
  return `${new Intl.NumberFormat("vi-VN").format(num)}đ`;
}

