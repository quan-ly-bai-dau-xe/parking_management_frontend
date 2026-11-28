import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { axiosInstance } from "../src/services/apiClient.js";
import { authService } from "../src/services/authService.js";
import { registerService } from "../src/services/registerService.js";
import {
  cancelReservation,
  getCustomerParkingSlots,
  getCustomerParkingStructure,
  getReservations,
  reserveSlot,
} from "../src/services/parkingLotService.js";
import {
  generateQrMatrix,
  generateQrSvgDataUrl,
  generateQrSvgString,
} from "../src/utils/qrCodeSvg.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, "../src");

test("WP5-QR-01: Pure-JS QR SVG generator produces valid SVG for walk-in register URL", () => {
  const url = "http://localhost:5173/register?plate=51A-897.14";
  const matrix = generateQrMatrix(url);
  assert.ok(matrix.size >= 21 && matrix.size <= 57);
  assert.equal(matrix.modules.length, matrix.size);
  assert.equal(matrix.modules[0].length, matrix.size);
  // Top-left finder pattern corner must be dark
  assert.equal(matrix.modules[0][0], true);
  assert.equal(matrix.modules[0][6], true);
  assert.equal(matrix.modules[6][0], true);

  const svg = generateQrSvgString(url, { size: 140 });
  assert.ok(svg.startsWith("<svg "));
  assert.ok(svg.includes('shape-rendering="crispEdges"'));
  assert.ok(svg.includes("<path d=\"M"));
  assert.ok(svg.endsWith("</svg>"));

  const dataUrl = generateQrSvgDataUrl(url);
  assert.ok(dataUrl.startsWith("data:image/svg+xml;utf8,"));
});

test("WP5-QR-02: QR generator produces valid ISO/IEC 18004 alignment patterns for Versions 7-10", () => {
  const assertAlignmentIntact = (modules, centerR, centerC) => {
    for (let dr = -2; dr <= 2; dr += 1) {
      for (let dc = -2; dc <= 2; dc += 1) {
        const expected =
          Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
        assert.equal(
          modules[centerR + dr][centerC + dc],
          expected,
          `Alignment module mismatch at (${centerR + dr}, ${centerC + dc}) for center (${centerR}, ${centerC})`
        );
      }
    }
  };

  const cases = [
    {
      label: "v7_113_bytes_complex_query",
      payload:
        "https://park.vn/register?plate=51A-897.14&redirect=%2Fme%2Fvehicles%3Ftab%3Dnew&tags=a,b;c&x=<1>&y=\"2\"&z='3'#hash",
      expectedVersion: 7,
      expectedSize: 45,
      midCenter: 22,
    },
    {
      label: "v8_150_bytes",
      payload: "https://park.vn/register?plate=51A-897.14&note=" + "a".repeat(103),
      expectedVersion: 8,
      expectedSize: 49,
      midCenter: 24,
    },
    {
      label: "v9_180_bytes",
      payload: "https://park.vn/register?plate=51A-897.14&note=" + "b".repeat(133),
      expectedVersion: 9,
      expectedSize: 53,
      midCenter: 26,
    },
    {
      label: "v10_213_bytes",
      payload: "https://park.vn/register?plate=51A-897.14&note=" + "c".repeat(166),
      expectedVersion: 10,
      expectedSize: 57,
      midCenter: 28,
    },
  ];

  for (const tc of cases) {
    const matrix = generateQrMatrix(tc.payload);
    assert.equal(matrix.version, tc.expectedVersion, `${tc.label} version`);
    assert.equal(matrix.size, tc.expectedSize, `${tc.label} size`);
    // Both timing-intersecting alignment patterns (6, mid) and (mid, 6) must remain intact
    assertAlignmentIntact(matrix.modules, 6, tc.midCenter);
    assertAlignmentIntact(matrix.modules, tc.midCenter, 6);
    assertAlignmentIntact(matrix.modules, tc.midCenter, tc.midCenter);

    const svg = generateQrSvgString(tc.payload, { size: 160 });
    assert.ok(svg.startsWith("<svg "));
    assert.ok(svg.includes(`viewBox="0 0 ${tc.expectedSize + 4} ${tc.expectedSize + 4}"`));
    assert.ok(svg.endsWith("</svg>"));
  }
});

test("WP5-AUTH-01: authService SMS OTP methods call real backend endpoints without /customers/", async () => {
  const originalRequest = axiosInstance.request;
  const calls = [];

  try {
    axiosInstance.request = async (config) => {
      calls.push(config);
      if (config.url === "/api/v1/auth/register/sms/request/") {
        return { data: { detail: "OTP sent", session_info: "sess_1", phone: "0912345678" } };
      }
      if (config.url === "/api/v1/auth/register/sms/confirm/") {
        return {
          data: {
            detail: "Registered",
            account: { id: 10, role: "CUSTOMER" },
            customer: { id: 20, code: "KH0010" },
          },
        };
      }
      throw new Error(`Unexpected URL: ${config.url}`);
    };

    const reqRes = await authService.requestRegisterSmsOtp({ phone: "0912345678" });
    assert.equal(reqRes.session_info, "sess_1");

    const confRes = await registerService.confirmRegisterSms({
      phone: "0912345678",
      otp: "123456",
      password: "SecurePassword123!",
      confirmPassword: "SecurePassword123!",
      fullName: "Nguyen Van A",
      identityCardNumber: "012345678901",
      email: "a@example.com",
      sessionInfo: "sess_1",
    });
    assert.equal(confRes.account.role, "CUSTOMER");

    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, "/api/v1/auth/register/sms/request/");
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[1].url, "/api/v1/auth/register/sms/confirm/");
    assert.equal(calls[1].method, "POST");
    const confirmBody = JSON.parse(calls[1].data);
    assert.equal(confirmBody.full_name, "Nguyen Van A");
    assert.equal(confirmBody.confirm_password, "SecurePassword123!");
    assert.equal(confirmBody.session_info, "sess_1");
  } finally {
    axiosInstance.request = originalRequest;
  }

  const registerServiceSrc = fs.readFileSync(
    path.join(SRC_ROOT, "services/registerService.js"),
    "utf-8"
  );
  assert.equal(registerServiceSrc.includes("/api/v1/customers/"), false);
});

test("WP5-RSV-01: parkingLotService reservation and customer map API contracts", async () => {
  const originalRequest = axiosInstance.request;
  const calls = [];

  try {
    axiosInstance.request = async (config) => {
      calls.push(config);
      if (config.url === "/api/v1/parking/slots/12/reserve/") {
        return { data: { id: 99, code: "RSV-2026-0099", status: "ACTIVE" } };
      }
      if (config.url === "/api/v1/parking/reservations/") {
        return { data: { results: [{ id: 99, code: "RSV-2026-0099" }] } };
      }
      if (config.url === "/api/v1/parking/reservations/99/cancel/") {
        return { data: { id: 99, status: "CANCELLED" } };
      }
      if (config.url === "/api/v1/me/parking-structure/") {
        return { data: [{ id: 1, code: "B1", zones: [] }] };
      }
      if (config.url === "/api/v1/me/parking-slots/") {
        return { data: { results: [{ id: 12, code: "A-01", status: "AVAILABLE" }] } };
      }
      throw new Error(`Unexpected URL: ${config.url}`);
    };

    const created = await reserveSlot(12, {
      vehicle_id: 5,
      reserved_from: "2026-11-18T10:00:00Z",
      reserved_until: "2026-11-18T12:00:00Z",
    });
    assert.equal(created.code, "RSV-2026-0099");

    const list = await getReservations({ status: "ACTIVE" });
    assert.equal(list.length, 1);

    const cancelled = await cancelReservation(99);
    assert.equal(cancelled.status, "CANCELLED");

    const struct = await getCustomerParkingStructure();
    assert.equal(struct[0].code, "B1");

    const custSlots = await getCustomerParkingSlots({ floor: "B1" });
    assert.equal(custSlots[0].code, "A-01");
    assert.equal(calls.length, 5);
    assert.equal(calls[4].params.page_size, 100);
    assert.equal(calls[4].params.floor, "B1");

    const custSlotsCustomPage = await getCustomerParkingSlots({ page_size: 50 });
    assert.equal(custSlotsCustomPage[0].code, "A-01");
    assert.equal(calls[5].params.page_size, 50);
  } finally {
    axiosInstance.request = originalRequest;
  }
});

test("WP5-UI-01: Walk-in QR, 15m countdown, 5s lookup, and Slot Reservation UI wiring checks", () => {
  const gateModalSrc = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/GateCameraControlModal.jsx"),
    "utf-8"
  );
  assert.ok(gateModalSrc.includes("REASON_UNREGISTERED_VEHICLE"));
  assert.ok(gateModalSrc.includes("pendingEntryInfo"));
  assert.ok(
    gateModalSrc.includes("lookupVehicleByPlate") &&
      gateModalSrc.includes("pendingEntryInfoRef")
  );

  const entryPanelSrc = fs.readFileSync(
    path.join(SRC_ROOT, "components/VehicleManagement/scanPlate/EntryLanePanel.jsx"),
    "utf-8"
  );
  assert.ok(entryPanelSrc.includes("QrCodeSvg"));
  assert.ok(entryPanelSrc.includes("pending-entry-countdown"));

  const registerSrc = fs.readFileSync(path.join(SRC_ROOT, "pages/RegisterPage.jsx"), "utf-8");
  assert.ok(registerSrc.includes("requestRegisterSmsOtp"));
  assert.ok(registerSrc.includes('searchParams.get("plate")'));
  // Per R94-UI Team Lead Decision #3, dark left panel remains visible (stacked) on 375px mobile
  assert.equal(registerSrc.includes("hidden md:flex"), false);

  const onboardSrc = fs.readFileSync(path.join(SRC_ROOT, "pages/OnBoardProfile.jsx"), "utf-8");
  assert.ok(onboardSrc.includes("confirmRegisterSms"));
  assert.ok(onboardSrc.includes("authService.login"));
  assert.ok(onboardSrc.includes("getMyVehicleTypes"));
  assert.ok(onboardSrc.includes("createMyVehicle"));

  const matrixSrc = fs.readFileSync(
    path.join(SRC_ROOT, "components/ParkingLotManagement/ParkingSlotMatrix.jsx"),
    "utf-8"
  );
  assert.ok(matrixSrc.includes("Xem thông tin phương tiện"));
  assert.ok(matrixSrc.includes("Đăng ký đỗ xe"));
  assert.ok(matrixSrc.includes("ReserveSlotModal"));

  const headerSrc = fs.readFileSync(
    path.join(SRC_ROOT, "components/layout/AppTopHeader.jsx"),
    "utf-8"
  );
  assert.ok(headerSrc.includes("Sơ đồ bãi đậu xe"));
});
