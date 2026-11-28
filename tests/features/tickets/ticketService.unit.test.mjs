import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  ticketService,
  mapTicketItem,
  formatCurrencyVND,
  normalizeTicketStatus,
} from "#src/services/ticketService.js";
import { axiosInstance } from "#src/services/apiClient.js";
import { createVisualAuditor } from "../../helpers/testVisualReporter.mjs";

const auditor = createVisualAuditor("Ticket Service Decision Matrix", { after });

// ============================================================================
// 1. SINGLE SOURCE OF TRUTH: BẢNG QUYẾT ĐỊNH (DECISION MATRICES)
// ============================================================================

const CURRENCY_CASES = [
  { branch: "Số nguyên dương", input: 500000, expected: "500.000đ" },
  { branch: "Chuỗi số hợp lệ", input: "1200000", expected: "1.200.000đ" },
  { branch: "Đã có hậu tố 'đ'", input: "500.000đ", expected: "500.000đ" },
  { branch: "Giá trị 0 (biên)", input: 0, expected: "0đ" },
  { branch: "Null / Rỗng", input: null, expected: "—" },
  { branch: "Chuỗi rỗng", input: "", expected: "—" },
];

const STATUS_CASES = [
  { branch: "ACTIVE -> active", input: "ACTIVE", expected: "active" },
  { branch: "EXPIRED -> expired", input: "EXPIRED", expected: "expired" },
  { branch: "RENEWING -> renewing", input: "RENEWING", expected: "renewing" },
  { branch: "EXPIRING -> expiring", input: "EXPIRING", expected: "expiring" },
  { branch: "TERMINATED -> cancelled", input: "TERMINATED", expected: "cancelled" },
  { branch: "CANCELLED -> cancelled", input: "CANCELLED", expected: "cancelled" },
  { branch: "Null -> mặc định active", input: null, expected: "active" },
];

const MAP_TICKET_CASES = [
  {
    branch: "Payload chuẩn từ Backend",
    input: {
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
    },
    expectedSubset: {
      id: 10,
      ticketCode: "VT0010",
      customerCode: "KH0001",
      customerName: "Nguyễn Văn A",
      licensePlate: "43A-123.45",
      ticketType: "Vé tháng",
      slotLocation: "Tầng B1 - A-01",
      price: "500.000đ",
      status: "active",
      statusText: "Đang hoạt động",
      rowVersion: 2,
      notes: "Vé xe nhân viên",
    },
  },
];

// ============================================================================
// 2. ENGINE THỰC THI CÂY QUYẾT ĐỊNH (PURE FUNCTIONS)
// ============================================================================

test("TICKET-01: formatCurrencyVND (Decision Table)", async (t) => {
  for (const c of CURRENCY_CASES) {
    await t.test(`[${c.branch}] input=${JSON.stringify(c.input)} -> ${c.expected}`, () => {
      const actual = formatCurrencyVND(c.input);
      auditor.verify(`formatCurrencyVND: ${c.branch}`, c.input, actual, c.expected);
    });
  }
});

test("TICKET-02: normalizeTicketStatus (Decision Table)", async (t) => {
  for (const c of STATUS_CASES) {
    await t.test(`[${c.branch}] input=${JSON.stringify(c.input)} -> ${c.expected}`, () => {
      const actual = normalizeTicketStatus(c.input);
      auditor.verify(`normalizeTicketStatus: ${c.branch}`, c.input, actual, c.expected);
    });
  }
});

test("TICKET-03: mapTicketItem (Contract Fact-Check)", async (t) => {
  for (const c of MAP_TICKET_CASES) {
    await t.test(`[${c.branch}]`, () => {
      const mapped = mapTicketItem(c.input, 0);
      const actualSubset = Object.fromEntries(
        Object.keys(c.expectedSubset).map((k) => [k, mapped[k]])
      );
      auditor.verify(`mapTicketItem: ${c.branch}`, c.input.code, actualSubset, c.expectedSubset);
      assert.deepStrictEqual(actualSubset, c.expectedSubset);
    });
  }
});

// ============================================================================
// 3. ENGINE THỰC THI SERVICE (STUB AXIOS - FACT-CHECK 2 CHIỀU REQUEST/RESPONSE)
// ============================================================================

test("TICKET-04: ticketService xử lý lỗi HTTP/Network thực tế (không pass ảo)", async (t) => {
  const ERROR_CASES = [
    {
      branch: "Backend trả HTTP 500",
      mockError: Object.assign(new Error("Internal Server Error"), {
        response: { status: 500, data: { detail: "DB down" } },
      }),
      expectedUrl: "/api/v1/tickets/",
      expectedStatus: 500,
    },
    {
      branch: "Mất kết nối mạng (ECONNREFUSED)",
      mockError: Object.assign(new Error("connect ECONNREFUSED"), {
        code: "ECONNREFUSED",
      }),
      expectedUrl: "/api/v1/tickets/",
      expectedCode: "ECONNREFUSED",
    },
  ];

  for (const c of ERROR_CASES) {
    await t.test(`[${c.branch}]`, async () => {
      const originalRequest = axiosInstance.request;
      let capturedConfig = null;
      axiosInstance.request = async (config) => {
        capturedConfig = config;
        throw c.mockError;
      };

      try {
        let caughtErr = null;
        try {
          await ticketService.getTickets();
        } catch (err) {
          caughtErr = err;
        }

        assert.ok(caughtErr, "Service phải ném lỗi ra ngoài thay vì nuốt lỗi");
        assert.equal(capturedConfig?.url, c.expectedUrl, "Phải gọi đúng endpoint");

        if (c.expectedStatus) {
          const actualStatus = caughtErr.response?.status ?? caughtErr.status;
          auditor.verify(`Error Status: ${c.branch}`, c.expectedUrl, actualStatus, c.expectedStatus);
        }
        if (c.expectedCode) {
          const actualCode = caughtErr.code;
          auditor.verify(`Error Code: ${c.branch}`, c.expectedUrl, actualCode, c.expectedCode);
        }
      } finally {
        axiosInstance.request = originalRequest;
      }
    });
  }
});

test("TICKET-05: ticketService.getTicketTypes & getTickets (Stub Axios 200 OK)", async (t) => {
  const originalRequest = axiosInstance.request;
  const calls = [];

  axiosInstance.request = async (config) => {
    calls.push({ method: (config.method || "GET").toUpperCase(), url: config.url });
    if (config.url === "/api/v1/tickets/types/") {
      return {
        data: [
          { id: 1, code: "DAILY", name: "Vé ngày", duration_days: 1, default_price: 50000 },
        ],
      };
    }
    if (config.url === "/api/v1/tickets/") {
      return {
        data: {
          results: [MAP_TICKET_CASES[0].input],
        },
      };
    }
    throw new Error(`Unexpected URL: ${config.url}`);
  };

  try {
    await t.test("[GET /api/v1/tickets/types/] Trả về đúng danh sách loại vé", async () => {
      const types = await ticketService.getTicketTypes();
      auditor.verify("getTicketTypes count", "/api/v1/tickets/types/", types.length, 1);
      auditor.verify("getTicketTypes[0].code", types[0], types[0].code, "DAILY");
    });

    await t.test("[GET /api/v1/tickets/] Map đúng danh sách vé từ backend", async () => {
      const tickets = await ticketService.getTickets();
      auditor.verify("getTickets count", "/api/v1/tickets/", tickets.length, 1);
      auditor.verify("getTickets[0].ticketCode", tickets[0].ticketCode, tickets[0].ticketCode, "VT0010");
      auditor.verify("getTickets[0].price", tickets[0].price, tickets[0].price, "500.000đ");
    });
  } finally {
    axiosInstance.request = originalRequest;
  }
});
