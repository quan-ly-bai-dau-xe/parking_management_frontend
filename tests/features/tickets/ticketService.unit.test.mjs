import test from "node:test";
import assert from "node:assert/strict";
import {
  ticketService,
  mapTicketItem,
  formatCurrencyVND,
  normalizeTicketStatus,
  FALLBACK_TICKET_TYPES,
} from "#src/services/ticketService.js";

test("TICKET-01: formatCurrencyVND formats amounts correctly", () => {
  assert.equal(formatCurrencyVND(500000), "500.000đ");
  assert.equal(formatCurrencyVND("1200000"), "1.200.000đ");
  assert.equal(formatCurrencyVND("500.000đ"), "500.000đ");
  assert.equal(formatCurrencyVND(null), "—");
  assert.equal(formatCurrencyVND(""), "—");
});

test("TICKET-02: normalizeTicketStatus normalizes various status codes", () => {
  assert.equal(normalizeTicketStatus("ACTIVE"), "active");
  assert.equal(normalizeTicketStatus("EXPIRED"), "expired");
  assert.equal(normalizeTicketStatus("RENEWING"), "renewing");
  assert.equal(normalizeTicketStatus("EXPIRING"), "expiring");
  assert.equal(normalizeTicketStatus("TERMINATED"), "cancelled");
  assert.equal(normalizeTicketStatus("CANCELLED"), "cancelled");
  assert.equal(normalizeTicketStatus(null), "active");
});

test("TICKET-03: mapTicketItem transforms backend response correctly", () => {
  const backendTicket = {
    id: 10,
    code: "VT0010",
    ticket_type: "Vé tháng",
    ticket_type_code: "MONTHLY",
    customer_code: "KH0001",
    customer_name: "Nguyễn Văn A",
    customer_phone: "0901234567",
    license_plate: "43A-123.45",
    slot_location: "Tầng B1 - A-01",
    price: 500000,
    effective_from: "2026-05-01T00:00:00Z",
    effective_to: "2026-06-01T23:59:59Z",
    status: "ACTIVE",
    status_display: "Đang hoạt động",
    row_version: 2,
    notes: "Vé xe nhân viên",
  };

  const mapped = mapTicketItem(backendTicket, 0);

  assert.equal(mapped.id, 10);
  assert.equal(mapped.ticketCode, "VT0010");
  assert.equal(mapped.customerCode, "KH0001");
  assert.equal(mapped.customerName, "Nguyễn Văn A");
  assert.equal(mapped.licensePlate, "43A-123.45");
  assert.equal(mapped.ticketType, "Vé tháng");
  assert.equal(mapped.slotLocation, "Tầng B1 - A-01");
  assert.equal(mapped.price, "500.000đ");
  assert.equal(mapped.status, "active");
  assert.equal(mapped.statusText, "Đang hoạt động");
  assert.equal(mapped.rowVersion, 2);
  assert.equal(mapped.notes, "Vé xe nhân viên");
});

test("TICKET-04: ticketService throws error without silent fallback when mock is disabled and backend is unreachable", async () => {
  // Khi mockConfig có tickets: false / undefined, không được nuốt lỗi mà phải ném lỗi ra ngoài
  await assert.rejects(
    async () => {
      await ticketService.getTicketTypes();
    },
    (err) => {
      assert.ok(err);
      return true;
    },
    "getTicketTypes must reject when backend is unreachable without silent fallback"
  );

  await assert.rejects(
    async () => {
      await ticketService.getTickets();
    },
    (err) => {
      assert.ok(err);
      return true;
    },
    "getTickets must reject when backend is unreachable without silent fallback to memoryTickets"
  );
});

test("TICKET-05: ticketService executes mock CRUD flow when mock is explicitly enabled", async () => {
  // Bật mock tường minh qua localStorage override (isMockEnabled("tickets") === true)
  globalThis.window = {
    localStorage: {
      getItem: (key) => (key === "MOCK_TICKETS" ? "true" : null),
    },
  };

  try {
    // 1. Get ticket types
    const types = await ticketService.getTicketTypes();
    assert.ok(Array.isArray(types));
    assert.ok(types.length >= 4);
    const daily = types.find((t) => t.code === "DAILY");
    assert.ok(daily);
    assert.equal(daily.name, "Vé ngày");

    // 2. Get tickets list
    const initialList = await ticketService.getTickets();
    assert.ok(Array.isArray(initialList));
    assert.ok(initialList.length > 0);

    // 3. Create ticket
    const newTicket = await ticketService.createTicket({
      customer: "KH9999",
      customerName: "Test Customer",
      vehicle: "43B-999.99",
      ticketType: "Vé tháng",
      price: 500000,
      parkingSlot: "Tầng B1 - A-99",
    });
    assert.ok(newTicket);
    assert.equal(newTicket.customerCode, "KH9999");
    assert.equal(newTicket.licensePlate, "43B-999.99");

    // 4. Renew ticket
    const renewed = await ticketService.renewTicket(newTicket.ticketCode, {
      newTicketType: "Vé quý",
      renewPrice: 1200000,
      newSlot: "Tầng B1 - B-01",
    });
    assert.ok(renewed);
    assert.equal(renewed.ticketType, "Vé quý");
    assert.equal(renewed.price, "1.200.000đ");

    // 5. Delete ticket
    const deleteRes = await ticketService.deleteTicket(newTicket.ticketCode);
    assert.ok(deleteRes);

    const afterDeleteList = await ticketService.getTickets();
    const found = afterDeleteList.find((t) => t.ticketCode === newTicket.ticketCode);
    assert.equal(found, undefined, "Deleted ticket must not exist in list");
  } finally {
    delete globalThis.window;
  }
});
