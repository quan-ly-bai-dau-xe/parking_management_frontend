import test from "node:test";
import assert from "node:assert/strict";

import {
  TRANSACTION_KIND_LABELS,
  generateIdempotencyKey,
  normalizeWallet,
  normalizeWalletTransaction,
  extractApiErrorInfo,
} from "../src/services/walletService.js";
import * as paymentConstants from "../src/constants/paymentConstants.js";
import { ROUTES } from "../src/config/navigation.js";
import {
  CustomerListItemSchema,
  CustomerDetailSchema,
} from "../src/schemas/customerSchema.js";
import {
  getLocalDateIso,
  buildEffectiveFromIso,
} from "../src/utils/formatDateTime.js";

test("normalizeWallet converts backend decimal strings and status labels", () => {
  const wallet = normalizeWallet({
    id: 5,
    customer_id: 1,
    customer_code: "KH0001",
    balance: "1000000.00",
    currency: "VND",
    status: "ACTIVE",
    status_display: "Đang hoạt động",
    row_version: 3,
  });

  assert.equal(wallet.id, 5);
  assert.equal(wallet.customerCode, "KH0001");
  assert.equal(wallet.balance, 1000000);
  assert.equal(wallet.balanceRaw, "1000000.00");
  assert.equal(wallet.currency, "VND");
  assert.equal(wallet.status, "ACTIVE");
  assert.equal(wallet.rowVersion, 3);

  const locked = normalizeWallet({ status: "LOCKED", balance: "0.00" });
  assert.equal(locked.statusDisplay, "Tạm khóa");
  assert.equal(locked.balance, 0);
});

test("normalizeWalletTransaction handles CREDIT and signed DEBIT amounts", () => {
  const creditTx = normalizeWalletTransaction({
    id: 11,
    wallet_id: 5,
    amount: "500000.00",
    balance_after: "1500000.00",
    transaction_type: "CREDIT",
    kind: "TOPUP_VIETQR",
    idempotency_key: "qr-001",
    note: "Topup",
  });
  assert.equal(creditTx.amount, 500000);
  assert.equal(creditTx.balanceAfter, 1500000);
  assert.equal(creditTx.direction, "IN");
  assert.equal(creditTx.kindDisplay, "Nạp ví VietQR (Mô phỏng)");

  const debitTx = normalizeWalletTransaction({
    id: 12,
    wallet_id: 5,
    amount: "-1200000.00",
    balance_after: "300000.00",
    transaction_type: "DEBIT",
    kind: "TICKET_PURCHASE",
    idempotency_key: "buy-001",
    reference_type: "TICKET",
    reference_id: 99,
  });
  assert.equal(debitTx.amount, -1200000);
  assert.equal(debitTx.balanceAfter, 300000);
  assert.equal(debitTx.direction, "OUT");
  assert.equal(debitTx.referenceType, "TICKET");
  assert.equal(debitTx.referenceId, 99);

  assert.equal(TRANSACTION_KIND_LABELS.TOPUP_VNPAY, "Nạp tiền qua VNPAY");
  const vnpayTx = normalizeWalletTransaction({
    id: 13,
    wallet_id: 5,
    amount: "250000.00",
    balance_after: "550000.00",
    transaction_type: "CREDIT",
    kind: "TOPUP_VNPAY",
    idempotency_key: "vnpay-VP1-test",
    reference_type: "VNPAY_TXN",
  });
  assert.equal(vnpayTx.kind, "TOPUP_VNPAY");
  assert.equal(vnpayTx.kindDisplay, "Nạp tiền qua VNPAY");
  assert.equal(vnpayTx.direction, "IN");
});

test("generateIdempotencyKey produces distinct bounded keys", () => {
  const key1 = generateIdempotencyKey("buy-ticket");
  const key2 = generateIdempotencyKey("buy-ticket");
  assert.notEqual(key1, key2);
  assert.ok(key1.startsWith("buy-ticket-"));
  assert.ok(key1.length <= 100);
});

test("extractApiErrorInfo extracts structured business rule codes cleanly", () => {
  const err = Object.assign(new Error("HTTP Error 409"), {
    status: 409,
    data: {
      code: "PROP-WALLET-INSUFFICIENT",
      message: "Số dư ví không đủ để thực hiện giao dịch này.",
    },
  });
  const info = extractApiErrorInfo(err, "Fallback");
  assert.equal(info.status, 409);
  assert.equal(info.code, "PROP-WALLET-INSUFFICIENT");
  assert.equal(info.message, "Số dư ví không đủ để thực hiện giao dịch này.");
});

test("paymentConstants removes mock flags and keeps preset amounts and disclaimer", () => {
  assert.equal("IS_PAYMENT_SIMULATION" in paymentConstants, false);
  assert.equal("DEFAULT_INITIAL_BALANCE_VND" in paymentConstants.WALLET_CONFIG, false);
  assert.ok(paymentConstants.SIMULATED_TOPUP_DISCLAIMER.length > 0);
  assert.ok(paymentConstants.WALLET_CONFIG.DEPOSIT_PRESET_AMOUNTS_VND.includes(100000));
});

test("navigation ROUTES fixes CUSTOMER_TICKET typo", () => {
  assert.equal(ROUTES.CUSTOMER_TICKET, "/customerTicket");
  assert.equal("CUSTOEMR_TICKET" in ROUTES, false);
});

test("customerSchema accepts backend wallet_balance and wallet_status fields", () => {
  const parsedList = CustomerListItemSchema.parse({
    id: 1,
    code: "KH0001",
    full_name: "Nguyễn Văn A",
    wallet_balance: "1000000.00",
    wallet_status: "ACTIVE",
  });
  assert.equal(parsedList.wallet_balance, "1000000.00");
  assert.equal(parsedList.wallet_status, "ACTIVE");

  const parsedDetail = CustomerDetailSchema.parse({
    id: 1,
    code: "KH0001",
    full_name: "Nguyễn Văn A",
    wallet_balance: 500000,
    wallet_status: "LOCKED",
  });
  assert.equal(parsedDetail.wallet_balance, 500000);
  assert.equal(parsedDetail.wallet_status, "LOCKED");
});

test("buildEffectiveFromIso sends current timestamp for local today and timezone-aware midnight for future dates", () => {
  // Simulate 01:30 AM local time (where UTC date might still be yesterday in UTC+7)
  const fakeNow = new Date(2026, 10, 18, 1, 30, 0, 0);
  const localToday = getLocalDateIso(fakeNow);
  assert.equal(localToday, "2026-11-18");

  const sameDayPayload = buildEffectiveFromIso(localToday, fakeNow);
  assert.equal(sameDayPayload, fakeNow.toISOString());

  const futurePayload = buildEffectiveFromIso("2026-11-20", fakeNow);
  assert.match(futurePayload, /^2026-11-20T00:00:00[+-]\d{2}:\d{2}$/);
});
