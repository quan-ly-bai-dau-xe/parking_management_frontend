import { WALLET_CONFIG } from "../constants/paymentConstants";

const STORAGE_KEY_WALLET_BALANCES = "smart_parking_customer_wallets";

/**
 * Lấy danh sách số dư ví của khách hàng từ localStorage (hoặc giá trị mặc định)
 */
function getStoredWallets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WALLET_BALANCES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Lưu danh sách số dư ví vào localStorage
 */
function saveStoredWallets(wallets) {
  try {
    localStorage.setItem(STORAGE_KEY_WALLET_BALANCES, JSON.stringify(wallets));
  } catch (err) {
    console.warn("Could not save wallet balances:", err);
  }
}

/**
 * Lấy số dư ví của khách hàng dựa trên customerId hoặc licensePlate
 */
export function getCustomerWalletBalance({ customerId, licensePlate }) {
  const wallets = getStoredWallets();
  const key = customerId ? `cust_${customerId}` : licensePlate ? `plate_${licensePlate}` : null;
  if (!key) return WALLET_CONFIG.DEFAULT_INITIAL_BALANCE_VND;

  if (wallets[key] !== undefined) {
    return Number(wallets[key]) || 0;
  }
  return WALLET_CONFIG.DEFAULT_INITIAL_BALANCE_VND;
}

/**
 * Nạp tiền vào ví của khách hàng
 */
export function depositToCustomerWallet({ customerId, licensePlate, amount }) {
  const wallets = getStoredWallets();
  const key = customerId ? `cust_${customerId}` : licensePlate ? `plate_${licensePlate}` : null;
  if (!key) throw new Error("Cần customerId hoặc licensePlate để nạp tiền.");

  const current = wallets[key] !== undefined ? Number(wallets[key]) || 0 : WALLET_CONFIG.DEFAULT_INITIAL_BALANCE_VND;
  const newBalance = current + Number(amount);
  wallets[key] = newBalance;
  saveStoredWallets(wallets);
  return newBalance;
}

/**
 * Trừ tiền từ ví của khách hàng khi xe ra bãi
 */
export function deductFromCustomerWallet({ customerId, licensePlate, amount, sessionCode }) {
  const wallets = getStoredWallets();
  const key = customerId ? `cust_${customerId}` : licensePlate ? `plate_${licensePlate}` : null;
  if (!key) throw new Error("Cần customerId hoặc licensePlate để trừ tiền ví.");

  const current = wallets[key] !== undefined ? Number(wallets[key]) || 0 : WALLET_CONFIG.DEFAULT_INITIAL_BALANCE_VND;
  const numAmount = Number(amount) || 0;

  if (current < numAmount) {
    return {
      success: false,
      currentBalance: current,
      shortfall: numAmount - current,
      message: `Số dư ví không đủ (Còn ${current.toLocaleString("vi-VN")}đ, cần ${numAmount.toLocaleString("vi-VN")}đ)`,
    };
  }

  const newBalance = current - numAmount;
  wallets[key] = newBalance;
  saveStoredWallets(wallets);

  return {
    success: true,
    previousBalance: current,
    newBalance,
    amountDeducted: numAmount,
    sessionCode,
    message: `Đã trừ thành công ${numAmount.toLocaleString("vi-VN")}đ từ Ví App. Số dư mới: ${newBalance.toLocaleString("vi-VN")}đ`,
  };
}
