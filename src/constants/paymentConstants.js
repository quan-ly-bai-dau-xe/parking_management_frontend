/**
 * paymentConstants.js
 * Payment methods, VietQR simulation banner copy, wallet UI presets, and VND formatting.
 */

export const SIMULATED_TOPUP_DISCLAIMER =
  "Giao dịch nạp tiền qua VietQR đang ở chế độ mô phỏng thanh toán trực tuyến.";

export const VNPAY_SANDBOX_DISCLAIMER =
  "Môi trường kiểm thử VNPAY SANDBOX. Vui lòng chỉ sử dụng thẻ test NCB / thông tin thử nghiệm của VNPAY, không dùng thẻ ngân hàng thật.";

export const VNPAY_DISABLED_MESSAGE =
  "Cổng thanh toán VNPAY hiện chưa được cấu hình hoặc tạm ngừng hoạt động.";

export const VNPAY_TOPUP_LIMITS = {
  MIN_VND: 10000,
  MAX_VND: 50000000,
};

export function parseTopupAmountParam(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }
  const str = String(raw).trim();
  if (!/^\d+$/.test(str)) return null;
  const parsed = Number(str);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export const PAYMENT_METHODS = {
  WALLET: "WALLET",
  VNPAY: "VNPAY",
  VIETQR: "VIETQR",
  CASH: "CASH",
};

export const WALLET_CONFIG = {
  LOW_BALANCE_THRESHOLD_VND: 20000,
  DEPOSIT_PRESET_AMOUNTS_VND: [50000, 100000, 200000, 500000, 1000000, 2000000],
  DEFAULT_DEPOSIT_AMOUNT_VND: 100000,
};

export function formatCurrencyVND(amount) {
  const num = Math.round(Number(amount) || 0);
  return `${new Intl.NumberFormat("vi-VN").format(num)}đ`;
}

