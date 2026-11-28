import { apiClient } from "./apiClient.js";

const WALLET_STATUS_LABELS = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Tạm khóa",
  CLOSED: "Đã đóng",
};

const TRANSACTION_TYPE_LABELS = {
  CREDIT: "Cộng tiền",
  DEBIT: "Trừ tiền",
};

export const TRANSACTION_KIND_LABELS = {
  TOPUP_CASH: "Nạp tiền mặt tại quầy",
  TOPUP_VIETQR: "Nạp ví VietQR (Mô phỏng)",
  TOPUP_VNPAY: "Nạp tiền qua VNPAY",
  TICKET_PURCHASE: "Mua vé gửi xe",
  TICKET_RENEWAL: "Gia hạn vé",
  PARKING_FEE: "Thanh toán phí gửi xe",
  REFUND: "Hoàn tiền",
  ADJUSTMENT: "Điều chỉnh số dư",
};

export function generateIdempotencyKey(prefix = "wp3") {
  const safePrefix = String(prefix || "wp3").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "wp3";
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${safePrefix}-${globalThis.crypto.randomUUID()}`.slice(0, 100);
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${safePrefix}-${Date.now()}-${rand}`.slice(0, 100);
}

export function normalizeWallet(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      id: null,
      customerId: null,
      customerCode: "",
      balance: 0,
      balanceRaw: "0.00",
      currency: "VND",
      status: "ACTIVE",
      statusDisplay: WALLET_STATUS_LABELS.ACTIVE,
      rowVersion: 1,
      createdAt: null,
      updatedAt: null,
      vnpayEnabled: null,
      vnpaySandbox: true,
      vnpayMinAmount: 10000,
      vnpayMaxAmount: 50000000,
      simulatedTopupEnabled: null,
    };
  }
  const balanceNumber = Number(raw.balance ?? 0);
  const status = raw.status || "ACTIVE";
  const channels = raw.topup_channels || raw.topupChannels || null;
  const vnpayEnabledRaw =
    channels?.vnpay_enabled ?? raw.vnpay_enabled ?? raw.vnpayEnabled ?? null;
  const vnpaySandboxRaw =
    channels?.vnpay_is_sandbox ?? raw.vnpay_is_sandbox ?? raw.vnpaySandbox ?? true;
  const vnpayMinRaw = Number(
    channels?.vnpay_topup_min ?? raw.vnpay_topup_min ?? raw.vnpayMinAmount ?? 10000
  );
  const vnpayMaxRaw = Number(
    channels?.vnpay_topup_max ?? raw.vnpay_topup_max ?? raw.vnpayMaxAmount ?? 50000000
  );
  const simulatedRaw =
    channels?.simulated_vietqr_enabled ??
    raw.simulated_vietqr_enabled ??
    raw.simulatedTopupEnabled ??
    null;

  return {
    id: raw.id ?? null,
    customerId: raw.customer_id ?? raw.customerId ?? null,
    customerCode: raw.customer_code ?? raw.customerCode ?? "",
    balance: Number.isFinite(balanceNumber) ? balanceNumber : 0,
    balanceRaw: String(raw.balance ?? "0.00"),
    currency: raw.currency || "VND",
    status,
    statusDisplay: raw.status_display || WALLET_STATUS_LABELS[status] || status,
    rowVersion: Number(raw.row_version ?? raw.rowVersion ?? 1),
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
    vnpayEnabled: typeof vnpayEnabledRaw === "boolean" ? vnpayEnabledRaw : null,
    vnpaySandbox: Boolean(vnpaySandboxRaw),
    vnpayMinAmount: Number.isFinite(vnpayMinRaw) && vnpayMinRaw > 0 ? vnpayMinRaw : 10000,
    vnpayMaxAmount: Number.isFinite(vnpayMaxRaw) && vnpayMaxRaw > 0 ? vnpayMaxRaw : 50000000,
    simulatedTopupEnabled: typeof simulatedRaw === "boolean" ? simulatedRaw : null,
  };
}

export function normalizeWalletTransaction(raw) {
  if (!raw || typeof raw !== "object") return null;
  const amountNum = Number(raw.amount ?? 0);
  const balanceAfterNum = Number(raw.balance_after ?? raw.balanceAfter ?? 0);
  const txType = raw.transaction_type || (amountNum >= 0 ? "CREDIT" : "DEBIT");
  const kind = raw.kind || "ADJUSTMENT";

  return {
    id: raw.id,
    walletId: raw.wallet_id ?? raw.walletId ?? null,
    amount: Number.isFinite(amountNum) ? amountNum : 0,
    amountRaw: String(raw.amount ?? "0.00"),
    balanceAfter: Number.isFinite(balanceAfterNum) ? balanceAfterNum : 0,
    balanceAfterRaw: String(raw.balance_after ?? raw.balanceAfter ?? "0.00"),
    transactionType: txType,
    transactionTypeDisplay:
      raw.transaction_type_display || TRANSACTION_TYPE_LABELS[txType] || txType,
    direction: raw.direction || (txType === "CREDIT" ? "IN" : "OUT"),
    kind,
    kindDisplay: raw.kind_display || TRANSACTION_KIND_LABELS[kind] || kind,
    idempotencyKey: raw.idempotency_key ?? raw.idempotencyKey ?? "",
    referenceType: raw.reference_type ?? raw.referenceType ?? null,
    referenceId: raw.reference_id ?? raw.referenceId ?? null,
    note: raw.note || "",
    createdById: raw.created_by_id ?? raw.createdById ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
  };
}

export function extractApiErrorInfo(error, fallbackMessage = "Đã xảy ra lỗi không xác định.") {
  const data = error?.data;
  const code = (typeof data === "object" && data?.code) || error?.code || "";
  let message = fallbackMessage;

  if (typeof data === "object" && data) {
    if (typeof data.message === "string" && data.message.trim()) {
      message = data.message.trim();
    } else if (typeof data.detail === "string" && data.detail.trim()) {
      message = data.detail.trim();
    } else if (error?.message) {
      message = error.message;
    }
  } else if (error?.message) {
    message = error.message;
  }

  return {
    status: error?.status ?? null,
    code,
    message,
  };
}

function normalizePaginatedTransactions(response) {
  const results = Array.isArray(response?.results)
    ? response.results.map(normalizeWalletTransaction).filter(Boolean)
    : Array.isArray(response)
      ? response.map(normalizeWalletTransaction).filter(Boolean)
      : [];

  return {
    count: Number(response?.count ?? results.length),
    totalPages: Number(response?.total_pages ?? response?.totalPages ?? 1),
    currentPage: Number(response?.current_page ?? response?.currentPage ?? 1),
    results,
  };
}

export const walletService = {
  async getMyWallet() {
    const res = await apiClient("/api/v1/me/wallet/");
    return normalizeWallet(res);
  },

  async getMyTransactions({ page = 1, pageSize = 10, kind = "", direction = "" } = {}) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    if (kind) params.set("kind", kind);
    if (direction) params.set("direction", direction);
    const res = await apiClient(`/api/v1/me/wallet/transactions/?${params.toString()}`);
    return normalizePaginatedTransactions(res);
  },

  async topupMyWallet({ amount, idempotencyKey, note = "" }) {
    const payload = {
      amount: String(amount),
      idempotency_key: idempotencyKey || generateIdempotencyKey("topup-qr"),
    };
    if (note && note.trim()) {
      payload.note = note.trim();
    }
    const res = await apiClient("/api/v1/me/wallet/topups/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return {
      wallet: normalizeWallet(res?.wallet),
      transaction: normalizeWalletTransaction(res?.transaction),
      replayed: Boolean(res?.replayed),
      simulatedQr: res?.simulated_qr || null,
    };
  },

  async createVnpayTopup({ amount, orderInfo = "", locale = "vn", bankCode = "" }) {
    const numericAmount = Number(amount);
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      throw new Error("Số tiền nạp qua VNPAY phải là số nguyên VND hợp lệ.");
    }
    const payload = {
      amount: numericAmount,
      locale: locale === "en" ? "en" : "vn",
    };
    if (orderInfo && String(orderInfo).trim()) {
      payload.order_info = String(orderInfo).trim();
    }
    if (bankCode && String(bankCode).trim()) {
      payload.bank_code = String(bankCode).trim();
    }
    const res = await apiClient("/api/v1/me/wallet/topups/vnpay/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return {
      paymentUrl: res?.payment_url || "",
      txnRef: res?.txn_ref || "",
      amount: Number(res?.amount ?? numericAmount),
      expiresAt: res?.expires_at || null,
      isSandbox: res?.is_sandbox ?? true,
    };
  },

  async getVnpayTopupStatus(txnRef) {
    const res = await apiClient(
      `/api/v1/me/wallet/topups/vnpay/${encodeURIComponent(String(txnRef))}/`,
    );
    return {
      txnRef: res?.txn_ref || String(txnRef),
      status: String(res?.status || "PENDING").toUpperCase(),
      amount: Number(res?.amount ?? 0),
      balance: Number(res?.balance ?? 0),
      walletTransactionId: res?.wallet_transaction_id ?? null,
      creditedAt: res?.credited_at ?? null,
    };
  },

  async verifyVnpayReturn(searchString) {
    const query = String(searchString || "");
    const suffix = query.startsWith("?") ? query : `?${query}`;
    return await apiClient(`/api/v1/payments/vnpay/return/${suffix}`);
  },

  async getMyProfile() {
    return await apiClient("/api/v1/me/profile/");
  },

  async updateMyProfile(payload) {
    return await apiClient("/api/v1/me/profile/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async getMyVehicles() {
    const res = await apiClient("/api/v1/me/vehicles/");
    return Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : [];
  },

  async createMyVehicle(payload) {
    return await apiClient("/api/v1/me/vehicles/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateMyVehicle(lookup, payload) {
    return await apiClient(`/api/v1/me/vehicles/${encodeURIComponent(String(lookup))}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteMyVehicle(lookup) {
    return await apiClient(`/api/v1/me/vehicles/${encodeURIComponent(String(lookup))}/`, {
      method: "DELETE",
    });
  },

  async getMyTickets(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `/api/v1/me/tickets/${query ? `?${query}` : ""}`;
    const res = await apiClient(url);
    return Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : [];
  },

  async buyMyTicket({
    vehicleCode,
    vehicleId,
    ticketTypeCode,
    ticketTypeId,
    idempotencyKey,
    effectiveFrom,
    notes,
  }) {
    const payload = {
      idempotency_key: idempotencyKey || generateIdempotencyKey("buy-ticket"),
    };
    if (vehicleCode) payload.vehicle_code = vehicleCode;
    else if (vehicleId) payload.vehicle_id = Number(vehicleId);
    if (ticketTypeCode) payload.ticket_type_code = ticketTypeCode;
    else if (ticketTypeId) payload.ticket_type_id = Number(ticketTypeId);
    if (effectiveFrom) payload.effective_from = effectiveFrom;
    if (notes && notes.trim()) payload.notes = notes.trim();

    const res = await apiClient("/api/v1/me/tickets/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return {
      ticket: res?.ticket || null,
      transaction: normalizeWalletTransaction(res?.transaction),
      replayed: Boolean(res?.replayed),
    };
  },

  async cancelMyTicket(lookup) {
    return await apiClient(`/api/v1/me/tickets/${encodeURIComponent(String(lookup))}/cancel/`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async getMyTicketTypes() {
    const res = await apiClient("/api/v1/me/ticket-types/");
    return Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : [];
  },

  async getMyVehicleTypes() {
    const res = await apiClient("/api/v1/me/vehicle-types/");
    return Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : [];
  },

  async getCustomerWallet(customerId) {
    const res = await apiClient(`/api/v1/customers/${encodeURIComponent(String(customerId))}/wallet/`);
    return normalizeWallet(res);
  },

  async getCustomerTransactions(customerId, { page = 1, pageSize = 10, kind = "", direction = "" } = {}) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    if (kind) params.set("kind", kind);
    if (direction) params.set("direction", direction);
    const res = await apiClient(
      `/api/v1/customers/${encodeURIComponent(String(customerId))}/wallet/transactions/?${params.toString()}`,
    );
    return normalizePaginatedTransactions(res);
  },

  async staffTopupCustomerWallet(customerId, { amount, idempotencyKey, note = "" }) {
    const payload = {
      amount: String(amount),
      payment_method: "CASH",
      idempotency_key: idempotencyKey || generateIdempotencyKey("cash-topup"),
    };
    if (note && note.trim()) {
      payload.note = note.trim();
    }
    const res = await apiClient(
      `/api/v1/customers/${encodeURIComponent(String(customerId))}/wallet/topup/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return {
      wallet: normalizeWallet(res?.wallet),
      transaction: normalizeWalletTransaction(res?.transaction),
      replayed: Boolean(res?.replayed),
    };
  },
};
