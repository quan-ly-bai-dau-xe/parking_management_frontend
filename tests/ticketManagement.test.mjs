import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeTicket } from "../src/services/ticketService.js";

describe("Ticket Management & Ticket Service Unit Tests", () => {
  test("TICKET-01: normalizeTicket converts backend raw ticket payload to camelCase UI model", () => {
    const rawBackendTicket = {
      id: 10,
      code: "VT0010",
      customer_id: 10,
      customer_code: "KH0010",
      customer_name: "Nguyễn Văn An",
      customer_phone: "0905111222",
      vehicle_id: 5,
      license_plate: "43A-123.45",
      vehicle_type: "Xe ô tô con",
      ticket_type: "Vé tháng",
      ticket_type_code: "MONTHLY",
      ticket_type_id: 2,
      effective_from: "2026-11-01T00:00:00Z",
      effective_to: "2026-11-30T23:59:59Z",
      price: "500000.00",
      slot_id: 3,
      slot_location: "Tầng B1 - A03",
      status: "ACTIVE",
      status_display: "Đang hoạt động",
      notes: "Vé đăng ký định kỳ",
      row_version: 3,
      renewals: [
        {
          id: 1,
          old_effective_to: "2026-10-31T23:59:59Z",
          new_effective_to: "2026-11-30T23:59:59Z",
          additional_price: "500000.00",
          notes: "Gia hạn tháng 11",
          renewed_at: "2026-10-30T10:00:00Z",
        },
      ],
    };

    const normalized = normalizeTicket(rawBackendTicket);

    assert.equal(normalized.id, 10);
    assert.equal(normalized.ticketCode, "VT0010");
    assert.equal(normalized.customerName, "Nguyễn Văn An");
    assert.equal(normalized.customerCode, "KH0010");
    assert.equal(normalized.customerPhone, "0905111222");
    assert.equal(normalized.licensePlate, "43A-123.45");
    assert.equal(normalized.ticketType, "Vé tháng");
    assert.equal(normalized.ticketTypeCode, "MONTHLY");
    assert.equal(normalized.status, "active");
    assert.equal(normalized.statusText, "Đang hoạt động");
    assert.equal(normalized.price, "500.000đ");
    assert.equal(normalized.rawPrice, "500000.00");
    assert.equal(normalized.slotLocation, "Tầng B1 - A03");
    assert.equal(normalized.row_version, 3);
    assert.equal(normalized.renewals.length, 1);
  });

  test("TICKET-02: normalizeTicket handles edge cases (null, empty fields, fallbacks)", () => {
    assert.equal(normalizeTicket(null), null);
    assert.equal(normalizeTicket(undefined), null);

    const sparseTicket = {
      id: 99,
      code: "VT0099",
      price: null,
      effective_from: null,
      effective_to: null,
    };

    const result = normalizeTicket(sparseTicket);
    assert.equal(result.id, 99);
    assert.equal(result.customerName, "—");
    assert.equal(result.licensePlate, "—");
    assert.equal(result.slotLocation, "Chưa có vị trí");
    assert.equal(result.price, "0đ");
    assert.equal(result.row_version, 1);
  });

  test("TICKET-03: normalizeTicket classifies statuses correctly (active, expired, renewing, cancelled)", () => {
    assert.equal(normalizeTicket({ id: 1, status: "ACTIVE" }).status, "active");
    assert.equal(normalizeTicket({ id: 2, status: "EXPIRED" }).status, "expired");
    assert.equal(normalizeTicket({ id: 3, status: "RENEWING" }).status, "renewing");
    assert.equal(normalizeTicket({ id: 4, status: "TERMINATED" }).status, "cancelled");
    assert.equal(normalizeTicket({ id: 5, status: "CANCELLED" }).status, "cancelled");
  });
});
