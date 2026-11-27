import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { authService } from "#src/services/authService.js";
import { axiosInstance } from "#src/services/apiClient.js";
import {
  calculateAutoRenewPrice,
  computeDefaultRenewalValues,
  validateRenewTicketForm,
} from "#src/utils/ticket/renewTicketUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    has: (k) => store.has(k),
  };
}

test("GUARD-01: VehicleTable enforces isManager checks on Edit and Assign/Change Slot", () => {
  const filePath = path.resolve(
    __dirname,
    "../../../src/components/VehicleManagement/VehicleTable.jsx",
  );
  const code = fs.readFileSync(filePath, "utf-8");

  assert.ok(code.includes("useCurrentUser"), "VehicleTable must use useCurrentUser");
  assert.ok(code.includes("disabled={!isManager}"), "Inline slot buttons must check !isManager");
  assert.ok(
    (code.match(/disabled:\s*!isManager/g) || []).length >= 3,
    "Change slot, Edit, and Delete actions must all disable when !isManager",
  );
});

test("GUARD-02: authService.logout calls POST /api/v1/auth/logout/ and clears storages even on API error", async () => {
  const originalLocal = globalThis.localStorage;
  const originalSession = globalThis.sessionStorage;
  const originalRequest = axiosInstance.request;

  const local = createMemoryStorage({ sp_user: '{"id":1}', sp_auth_token: "t1" });
  const session = createMemoryStorage({ sp_user: '{"id":1}', sp_auth_token: "t2" });
  globalThis.localStorage = local;
  globalThis.sessionStorage = session;

  const calls = [];
  try {
    axiosInstance.request = async (config) => {
      calls.push({ url: config.url, method: config.method });
      return { data: { detail: "Logged out" } };
    };

    const res = await authService.logout();
    assert.equal(res, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/v1/auth/logout/");
    assert.equal(calls[0].method, "POST");
    assert.equal(local.getItem("sp_user"), null);
    assert.equal(local.getItem("sp_auth_token"), null);
    assert.equal(session.getItem("sp_user"), null);
    assert.equal(session.getItem("sp_auth_token"), null);

    // Also verify storages are cleared even if backend fails
    local.setItem("sp_user", '{"id":2}');
    session.setItem("sp_auth_token", "t3");
    axiosInstance.request = async () => {
      throw new Error("Network error");
    };
    const resErr = await authService.logout();
    assert.equal(resErr, true);
    assert.equal(local.getItem("sp_user"), null);
    assert.equal(session.getItem("sp_auth_token"), null);
  } finally {
    axiosInstance.request = originalRequest;
    globalThis.localStorage = originalLocal;
    globalThis.sessionStorage = originalSession;
  }
});

test("GUARD-03: TicketTable disables Renew action for cancelled or invalid statuses", () => {
  const filePath = path.resolve(
    __dirname,
    "../../../src/components/TicketManagement/TicketTable.jsx",
  );
  const code = fs.readFileSync(filePath, "utf-8");

  assert.ok(code.includes("RENEWABLE_TICKET_STATUSES"), "Must define renewable ticket statuses");
  assert.ok(code.includes("disabled: !canRenew"), "Renew button must be disabled when !canRenew");
});

test("GUARD-04: renewTicketUtils validates dates after old expiry, computes auto-price, and blocks 0đ", () => {
  const ticket = {
    ticketCode: "VT0001",
    ticketType: "Vé tháng",
    endDate: "01/12/2026",
    status: "active",
  };
  const todayIso = "2026-11-24";

  const defaults = computeDefaultRenewalValues(ticket, "Vé tháng", todayIso);
  assert.equal(defaults.newEndDate, "2026-12-31");
  assert.equal(defaults.minNewEndDate, "2026-12-02");
  assert.equal(defaults.renewPrice, "500000");

  // Auto price for 60 days monthly ticket -> 1,000,000đ
  const sixtyDaysPrice = calculateAutoRenewPrice({
    ticketTypeName: "Vé tháng",
    baseDateIso: "2026-12-01",
    newEndDateIso: "2027-01-30",
  });
  assert.equal(sixtyDaysPrice, "1000000");

  // Reject newEndDate <= oldEndDate
  const sameDayRes = validateRenewTicketForm(
    { ticket, newEndDate: "2026-12-01", renewPrice: "500000" },
    todayIso,
  );
  assert.equal(sameDayRes.valid, false);
  assert.ok(sameDayRes.errors.newEndDate);

  // Reject 0đ price
  const zeroPriceRes = validateRenewTicketForm(
    { ticket, newEndDate: "2026-12-31", renewPrice: "0" },
    todayIso,
  );
  assert.equal(zeroPriceRes.valid, false);
  assert.ok(zeroPriceRes.errors.renewPrice);

  // Reject cancelled ticket
  const cancelledRes = validateRenewTicketForm(
    { ticket: { ...ticket, status: "cancelled" }, newEndDate: "2026-12-31", renewPrice: "500000" },
    todayIso,
  );
  assert.equal(cancelledRes.valid, false);
  assert.ok(cancelledRes.errors.form);

  // Valid renewal passes
  const validRes = validateRenewTicketForm(
    { ticket, newEndDate: "2026-12-31", renewPrice: "500000" },
    todayIso,
  );
  assert.equal(validRes.valid, true);
});

test("GUARD-05: EmployeeModal includes rowVersion in formData when editing employee", () => {
  const filePath = path.resolve(
    __dirname,
    "../../../src/components/EmployeeManagement/EmployeeModal.jsx",
  );
  const code = fs.readFileSync(filePath, "utf-8");

  assert.ok(
    code.includes("rowVersion: employee?.rowVersion ?? employee?.row_version"),
    "EmployeeModal must preserve rowVersion from initial employee data",
  );
});

test("GUARD-06: Financial Integrity - CreateTicketModal dynamically loads ticket types without hardcoded price", () => {
  const filePath = path.resolve(
    __dirname,
    "../../../src/components/TicketManagement/CreateTicketModal.jsx",
  );
  const code = fs.readFileSync(filePath, "utf-8");

  assert.ok(
    code.includes("ticketService.getTicketTypes"),
    "CreateTicketModal must load ticket types via ticketService.getTicketTypes()",
  );
  assert.ok(
    code.includes("FALLBACK_TICKET_TYPES"),
    "CreateTicketModal must have fallback to FALLBACK_TICKET_TYPES",
  );
  assert.ok(
    code.includes("handleTicketTypeChange"),
    "CreateTicketModal must handle ticketType changes with automatic price/endDate calculation",
  );
  assert.ok(
    !code.includes('price: "500000",'),
    "CreateTicketModal must not hardcode static price: '500000'",
  );
});

test("GUARD-07: Financial Safety - Customer modal & profile enforce simulation disclaimer and constants", () => {
  const buyModalPath = path.resolve(
    __dirname,
    "../../../src/components/CustomerManagement/CustomerBuyTicketModal.jsx",
  );
  const buyModalCode = fs.readFileSync(buyModalPath, "utf-8");

  assert.ok(
    buyModalCode.includes("BASE_MONTHLY_RATES"),
    "CustomerBuyTicketModal must use BASE_MONTHLY_RATES from constants",
  );
  assert.ok(
    buyModalCode.includes("SIMULATION_DISCLAIMER_TEXT"),
    "CustomerBuyTicketModal must use SIMULATION_DISCLAIMER_TEXT from paymentConstants",
  );
  assert.ok(
    buyModalCode.includes("Mô phỏng"),
    "CustomerBuyTicketModal must display simulation label for wallet",
  );

  const profilePath = path.resolve(
    __dirname,
    "../../../src/pages/CustomerProfilePage.jsx",
  );
  const profileCode = fs.readFileSync(profilePath, "utf-8");

  assert.ok(
    profileCode.includes("SIMULATION_DISCLAIMER_TEXT"),
    "CustomerProfilePage must import and display SIMULATION_DISCLAIMER_TEXT",
  );
});

